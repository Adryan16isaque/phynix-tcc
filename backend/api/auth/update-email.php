<?php
/**
 * PHYNIX — atualização do e-mail da conta autenticada.
 * PATCH /backend/api/auth/update-email.php
 * JSON: { "email": "novo@exemplo.com", "password": "senha atual" }
 * Atualização imediata mediante senha; NÃO verifica posse da caixa de e-mail.
 * NÃO registrar senhas, cookies ou o conteúdo do corpo nos logs.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'PATCH') {
    jsonError('Método não permitido.', 405);
}

// Proteção para o fluxo browser/sessão: apenas requisições do próprio site.
// Headers Origin ou Referer são obrigatórios e precisam apontar ao mesmo host.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$source = $origin !== '' ? $origin : $referer;
$host = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
$sourceHost = is_string($source) ? parse_url($source, PHP_URL_HOST) : null;
$sourceScheme = is_string($source) ? parse_url($source, PHP_URL_SCHEME) : null;
if (!is_string($host) || !is_string($sourceHost) || !is_string($sourceScheme)
    || !in_array(strtolower($sourceScheme), ['http', 'https'], true)
    || strcasecmp($host, $sourceHost) !== 0) {
    jsonError('Origem não permitida.', 403);
}

$contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($contentType !== 'application/json') {
    jsonError('Envie os dados em JSON.', 415);
}

$userId = requireAuth();
$body = readJsonBody();
if (!is_array($body) || !isset($body['email'], $body['password'])
    || !is_string($body['email']) || !is_string($body['password'])) {
    jsonError('Informe o novo e-mail e sua senha atual.', 400);
}

$email = strtolower(trim($body['email']));
$password = $body['password'];
if (strlen($email) > 190 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonError('Informe um e-mail válido de até 190 caracteres.', 400);
}
if ($password === '' || strlen($password) > 1024) {
    jsonError('Senha atual inválida.', 400);
}

// Limite simples por sessão para reduzir tentativas repetidas de senha.
$now = time();
$attempts = $_SESSION['email_change_failed_attempts'] ?? [];
if (!is_array($attempts)) $attempts = [];
$attempts = array_values(array_filter($attempts, static function ($ts) use ($now) {
    return is_int($ts) && $ts >= ($now - 900);
}));
$_SESSION['email_change_failed_attempts'] = $attempts;
if (count($attempts) >= 5) {
    jsonError('Muitas tentativas. Tente novamente em até 15 minutos.', 429);
}

$pdo = getDB();
$stmt = $pdo->prepare('SELECT id, name, email, password_hash, created_at FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    jsonError('Conta não encontrada.', 404);
}
if (!password_verify($password, $user['password_hash'])) {
    $_SESSION['email_change_failed_attempts'][] = $now;
    jsonError('Senha atual incorreta.', 401);
}
unset($_SESSION['email_change_failed_attempts']);

// Preserva o e-mail original quando nenhum valor foi alterado.
if (strcasecmp($email, (string) $user['email']) !== 0) {
    try {
        // A restrição UNIQUE de users.email impede e-mails duplicados, inclusive
        // quando duas contas tentam usar o endereço simultaneamente.
        $stmt = $pdo->prepare('UPDATE users SET email = ? WHERE id = ?');
        $stmt->execute([$email, $userId]);
    } catch (PDOException $e) {
        $duplicate = ($e->getCode() === '23000') ||
            ((int) ($e->errorInfo[1] ?? 0) === 1062);
        if ($duplicate) {
            jsonError('Este e-mail já está cadastrado.', 409);
        }
        error_log('[auth/update-email] Falha ao atualizar o registro da conta.');
        jsonError('Não foi possível alterar o e-mail agora.', 500);
    }
}

$stmt = $pdo->prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
$stmt->execute([$userId]);
$updated = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$updated) {
    jsonError('Conta não encontrada.', 404);
}
jsonResponse(['user' => $updated]);
