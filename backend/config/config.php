<?php
/* ═══════════════════════════════════════════════════════════
   CONFIG.PHP — Configurações centrais do backend
   Os segredos (senha do banco, chave da Groq) NÃO ficam mais
   aqui — eles vêm do arquivo backend/.env (nunca versionado).
   Para configurar seu ambiente, copie backend/.env.example
   para backend/.env e preencha os valores.
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/env.php';

// ── Banco de dados ──────────────────────────────────────────
define('DB_HOST', env('DB_HOST', 'localhost'));
define('DB_NAME', env('DB_NAME', 'phynix'));
define('DB_USER', env('DB_USER', 'root'));
define('DB_PASS', env('DB_PASS', ''));

// ── Groq API (a chave fica só aqui, nunca no front-end) ─────
define('GROQ_API_KEY', env('GROQ_API_KEY', ''));
define('GROQ_MODEL', env('GROQ_MODEL', 'llama-3.3-70b-versatile'));

// ── CORS ─────────────────────────────────────────────────────
// Lista de origens permitidas, separadas por vírgula no .env.
// Ex.: ALLOWED_ORIGINS=http://localhost:5500,https://seusite.com
// Deixe vazio se front e back forem servidos pelo mesmo domínio.
define('ALLOWED_ORIGINS', array_filter(array_map('trim', explode(',', env('ALLOWED_ORIGINS', '')))));

// ── Ambiente ─────────────────────────────────────────────────
define('APP_ENV', env('APP_ENV', 'development'));

if (APP_ENV === 'production') {
    ini_set('display_errors', '0');
    error_reporting(0);
} else {
    ini_set('display_errors', '1');
    error_reporting(E_ALL);
}

// ── Sessão ───────────────────────────────────────────────────
ini_set('session.cookie_httponly', 1);
ini_set('session.use_strict_mode', 1);
ini_set('session.cookie_samesite', 'Lax');
if (APP_ENV === 'production') {
    ini_set('session.cookie_secure', 1);
}
