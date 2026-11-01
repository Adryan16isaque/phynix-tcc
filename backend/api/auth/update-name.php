<?php
/**
 * PHYNIX — alteração do nome do usuário autenticado.
 * PATCH /backend/api/auth/update-name.php
 * Body JSON: { "name": "Novo nome" }
 * Resposta: { "user": { id, name, email, created_at } }
 *
 * Não altera e-mail, senha ou dados de outros usuários.
 */
require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Método não permitido.', 405);
}

// Evita submissões cruzadas quando um navegador envia Origin.
// A requisição legítima vem do mesmo domínio do PHYNIX.
if (!empty($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $requestHost = parse_url('http://' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    if (!$originHost || !$requestHost || strcasecmp($originHost, $requestHost) !== 0) {
        jsonError('Origem não permitida.', 403);
    }
}

$contentType = strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]));
if ($contentType !== 'application/json') {
    jsonError('Envie os dados em JSON.', 415);
}

$userId = requireAuth();
$data = readJsonBody();

if (!is_array($data) || !isset($data['name']) || !is_string($data['name'])) {
    jsonError('Informe um nome válido.', 400);
}

$name = preg_replace('/\s+/u', ' ', trim($data['name']));
if (!is_string($name) || strlen($name) > 400) {
    jsonError('Nome inválido.', 400);
}

// Contagem Unicode, inclusive em instalações sem mbstring.
$count = preg_match_all('/./us', $name);
if ($count === false || $count < 3 || $count > 100 || preg_match('/[\x00-\x1F\x7F]/u', $name)) {
    jsonError('O nome deve ter entre 3 e 100 caracteres válidos.', 400);
}

$pdo = getDB();
$stmt = $pdo->prepare('UPDATE users SET name = ? WHERE id = ?');
$stmt->execute([$name, $userId]);

// Releitura da conta, sempre pelo ID guardado na sessão.
$stmt = $pdo->prepare('SELECT id, name, email, created_at FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();
if (!$user) {
    jsonError('Conta não encontrada.', 404);
}

jsonResponse(['user' => $user]);
