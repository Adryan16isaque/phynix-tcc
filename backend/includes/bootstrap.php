<?php
/* ═══════════════════════════════════════════════════════════
   BOOTSTRAP.PHP — Incluído no topo de todo endpoint da API.
   Cuida de CORS, sessão e expõe requireAuth().
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/response.php';

// ── CORS ─────────────────────────────────────────────────────
// Só ecoa a origem da requisição se ela estiver na whitelist
// definida em ALLOWED_ORIGINS (backend/.env). Isso evita aceitar
// credenciais (cookie de sessão) de qualquer site.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Requisição de preflight — responde e encerra
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ── Sessão ───────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/** Garante que existe um usuário logado; devolve o user_id ou encerra com 401. */
function requireAuth(): int
{
    if (empty($_SESSION['user_id'])) {
        jsonError('Não autenticado. Faça login novamente.', 401);
    }
    return (int) $_SESSION['user_id'];
}
