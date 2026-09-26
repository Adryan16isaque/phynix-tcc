<?php
/* ═══════════════════════════════════════════════════════════
   /api/auth/delete-account.php
   DELETE → apaga a conta do usuário logado (irreversível).
   Corpo: { password } — exige a senha atual como confirmação,
   pra evitar que uma sessão esquecida aberta apague a conta
   sem a pessoa querer.

   Todos os dados relacionados (matérias, horas, dias estudados,
   conquistas, conversas, configurações) são apagados sozinhos
   pelo banco via ON DELETE CASCADE — não precisa deletar linha
   por linha aqui.
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/../../includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') jsonError('Método não permitido', 405);

$userId   = requireAuth();
$body     = readJsonBody();
$password = (string) ($body['password'] ?? '');

if ($password === '') {
    jsonError('Confirme sua senha para apagar a conta.');
}

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id=?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    jsonError('Senha incorreta.', 401);
}

$stmt = $pdo->prepare('DELETE FROM users WHERE id=?');
$stmt->execute([$userId]);

// A conta não existe mais — encerra a sessão também.
$_SESSION = [];
session_destroy();

jsonResponse(['deleted' => true]);
