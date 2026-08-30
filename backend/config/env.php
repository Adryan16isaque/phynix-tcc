<?php
/* ═══════════════════════════════════════════════════════════
   ENV.PHP — Loader simples de arquivo .env (sem dependências)
   Lê backend/.env e expõe os valores via getenv()/env().
   ═══════════════════════════════════════════════════════════ */

function loadEnv(string $path): void
{
    if (!file_exists($path)) return;

    foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) continue;
        if (!str_contains($line, '=')) continue;

        [$key, $value] = array_map('trim', explode('=', $line, 2));

        // Remove aspas simples/duplas ao redor do valor, se houver
        $value = trim($value, "\"'");

        if ($key !== '' && getenv($key) === false) {
            putenv("{$key}={$value}");
        }
    }
}

/** Lê uma variável de ambiente com valor padrão opcional. */
function env(string $key, $default = null)
{
    $value = getenv($key);
    return $value !== false ? $value : $default;
}

loadEnv(__DIR__ . '/../.env');
