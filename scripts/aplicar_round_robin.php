<?php
declare(strict_types=1);
/**
 * PHYNIX — instalador PHP CLI da seleção Round-Robin.
 * Uso: php scripts/aplicar_round_robin.php [caminho_raiz]
 *
 * Altera SOMENTE a importação de GroqKeyPool e a origem de $apiKey.
 * Não modifica Docker, .env, banco nem outros fluxos do chatbot.
 * Faz backup fora da raiz pública e valida a sintaxe ANTES da substituição.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

function abortInstall(string $message): never
{
    fwrite(STDERR, "ERRO: $message\n");
    exit(1);
}

$project = realpath($argv[1] ?? dirname(__DIR__));
if ($project === false || !is_dir($project)) abortInstall('Raiz do projeto não encontrada.');
$chatPath = $project . '/backend/api/chat.php';
$poolPath = $project . '/backend/services/GroqKeyPool.php';
if (!is_file($chatPath) || !is_file($poolPath)) {
    abortInstall('É necessário ter backend/api/chat.php e backend/services/GroqKeyPool.php.');
}

$original = file_get_contents($chatPath);
if ($original === false) abortInstall('Não foi possível ler chat.php.');
if (str_contains($original, 'GroqKeyPool::nextKey()')) {
    fwrite(STDOUT, "JÁ INSTALADO: chat.php já utiliza GroqKeyPool::nextKey().\n");
    exit(0);
}

$bootstrapPattern = '~(?m)^\s*require_once\s+__DIR__\s*\.\s*[\'\"]/\.\./includes/bootstrap\.php[\'\"]\s*;~';
$bootstrapCount = preg_match_all($bootstrapPattern, $original);
if ($bootstrapCount !== 1) {
    abortInstall('Import padrão de bootstrap.php não encontrado de forma inequívoca; nada alterado.');
}

$import = "require_once __DIR__ . '/../services/GroqKeyPool.php';";
$modified = $original;
if (!str_contains($modified, $import)) {
    $modified = preg_replace_callback(
        $bootstrapPattern,
        static fn(array $m): string => $m[0] . "\n" . $import,
        $modified,
        1,
        $matches
    );
    if ($modified === null || $matches !== 1) abortInstall('Falha ao adicionar importação.');
}

// Código do último pacote do EstudaAI (com $apiKey local).
$localKeyPattern = '~\$apiKey\s*=\s*defined\(\s*[\'\"]GROQ_API_KEY[\'\"]\s*\)\s*\?\s*trim\(\s*\(string\)\s*GROQ_API_KEY\s*\)\s*:\s*[\'\"][\'\"]\s*;~';
if (preg_match_all($localKeyPattern, $modified) === 1) {
    $modified = preg_replace($localKeyPattern, '$apiKey = GroqKeyPool::nextKey();', $modified, 1);
    if ($modified === null || !preg_match('~Authorization:\s*Bearer\s*[\'\"]\s*\.\s*\$apiKey~', $modified)) {
        abortInstall('Cabeçalho Authorization não corresponde ao padrão previsto.');
    }
} else {
    // Compatibilidade com a versão do repositório que usa a constante direto no header.
    $headerPattern = '~([\'\"]Authorization:\s*Bearer\s*[\'\"]\s*\.\s*)GROQ_API_KEY\b~';
    if (preg_match_all($headerPattern, $modified) !== 1) {
        abortInstall('Formato de seleção de chave desconhecido. chat.php não foi modificado.');
    }
    $modified = preg_replace($headerPattern, '$1$apiKey', $modified, 1);
    if ($modified === null) abortInstall('Falha ao adaptar cabeçalho HTTP.');
    $functionPattern = '~function\s+callGroq\s*\([^)]*\)\s*(?::\s*string\s*)?\{~';
    if (preg_match_all($functionPattern, $modified) !== 1) {
        abortInstall('Função callGroq não encontrada de forma inequívoca.');
    }
    $modified = preg_replace_callback(
        $functionPattern,
        static fn(array $m): string => $m[0] . "\n    \$apiKey = GroqKeyPool::nextKey();",
        $modified,
        1
    );
    if ($modified === null) abortInstall('Falha ao inserir seleção.');
}

if (substr_count($modified, 'GroqKeyPool::nextKey()') !== 1 || substr_count($modified, $import) !== 1) {
    abortInstall('Alteração ambígua detectada; nenhum arquivo sobrescrito.');
}

// Cria arquivo temporário junto ao original para substituir no mesmo filesystem.
$temp = tempnam(dirname($chatPath), '.chat-rr-');
if ($temp === false) abortInstall('Não foi possível criar arquivo temporário.');
try {
    if (file_put_contents($temp, $modified, LOCK_EX) !== strlen($modified)) {
        abortInstall('Escrita parcial do arquivo temporário.');
    }
    if (!function_exists('proc_open')) abortInstall('PHP CLI precisa permitir proc_open para checar sintaxe.');
    $cmd = [PHP_BINARY, '-l', $temp];
    $pipes = [];
    $proc = proc_open($cmd, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
    if (!is_resource($proc)) abortInstall('Não foi possível validar a sintaxe do arquivo alterado.');
    $out = stream_get_contents($pipes[1]); fclose($pipes[1]);
    $err = stream_get_contents($pipes[2]); fclose($pipes[2]);
    if (proc_close($proc) !== 0) {
        abortInstall('Falha na validação PHP do chat.php: ' . trim($out . ' ' . $err));
    }

    // O backup não fica em diretório servido pelo Apache nem dentro do Git.
    $backupDir = dirname($project) . '/phynix-backups';
    if (!is_dir($backupDir) && !mkdir($backupDir, 0700, true) && !is_dir($backupDir)) {
        abortInstall('Não foi possível criar a pasta de backups fora do projeto.');
    }
    chmod($backupDir, 0700);
    $backup = $backupDir . '/chat.php-before-round-robin-' . date('Ymd-His') . '-' . bin2hex(random_bytes(3)) . '.bak';
    if (!copy($chatPath, $backup) || !chmod($backup, 0600)) {
        abortInstall('Falha no backup: instalação interrompida.');
    }
    $permissions = fileperms($chatPath);
    if ($permissions !== false) chmod($temp, $permissions & 0777);
    if (!rename($temp, $chatPath)) abortInstall('Não foi possível substituir chat.php. O backup foi preservado.');
    fwrite(STDOUT, "OK: chat.php passou a usar GroqKeyPool em PHP.\n");
    fwrite(STDOUT, "Backup protegido: $backup\n");
    fwrite(STDOUT, "Nenhum arquivo Python foi necessário.\n");
} finally {
    if (is_file($temp)) unlink($temp);
}
