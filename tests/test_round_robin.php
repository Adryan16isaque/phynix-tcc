<?php
declare(strict_types=1);
/** Teste offline do seletor; usa APENAS credenciais fictícias. */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once __DIR__ . '/../backend/services/GroqKeyPool.php';

if (in_array('--worker', $argv ?? [], true)) {
    echo GroqKeyPool::nextKey(), "\n";
    exit(0);
}

$path = sys_get_temp_dir() . '/phynix-rr-test-' . bin2hex(random_bytes(6));
putenv('GROQ_ROTATION_STATE=' . $path);
putenv('GROQ_API_KEY=FAKE_FALLBACK');

try {
    // Quantidade arbitrária: nada no código fixa o número de chaves.
    $seven = array_map(static fn(int $i): string => 'FAKE_' . chr(65 + $i), range(0, 6));
    putenv('GROQ_API_KEYS=' . implode(',', $seven));
    if (GroqKeyPool::configuredCount() !== 7) throw new RuntimeException('Esperadas sete chaves.');

    for ($i = 0; $i < 17; ++$i) {
        if (GroqKeyPool::nextKey() !== $seven[$i % 7]) {
            throw new RuntimeException('Falha na seleção sequencial ' . $i);
        }
    }
    echo "OK: 17 seleções sequenciais; sete chaves e retorno circular.\n";

    // 28 processos simultâneos com o MESMO estado compartilhado.
    if (!function_exists('proc_open')) {
        throw new RuntimeException('O teste de concorrência precisa de proc_open no PHP CLI.');
    }
    $processes = [];
    $command = [PHP_BINARY, __FILE__, '--worker'];
    for ($i = 0; $i < 28; ++$i) {
        $pipes = [];
        $proc = proc_open($command, [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        if (!is_resource($proc)) throw new RuntimeException('Falha ao abrir worker ' . $i);
        $processes[] = [$proc, $pipes];
    }
    $found = [];
    foreach ($processes as [$proc, $pipes]) {
        $stdout = trim((string) stream_get_contents($pipes[1])); fclose($pipes[1]);
        $stderr = trim((string) stream_get_contents($pipes[2])); fclose($pipes[2]);
        if (proc_close($proc) !== 0) throw new RuntimeException('Worker falhou: ' . $stderr);
        $found[] = $stdout;
    }
    $counts = array_count_values($found);
    if (count($counts) !== 7 || min($counts) !== 4 || max($counts) !== 4) {
        throw new RuntimeException('Distribuição concorrente incorreta.');
    }
    echo "OK: 28 processos simultâneos; quatro seleções por chave.\n";

    // Lista com 11 credenciais: sem limite fixo de cinco ou sete.
    @unlink($path);
    $eleven = array_map(static fn(int $i): string => 'FAKE_NUM_' . $i, range(1, 11));
    putenv('GROQ_API_KEYS=' . implode(',', $eleven));
    for ($i = 0; $i < 33; ++$i) {
        if (GroqKeyPool::nextKey() !== $eleven[$i % 11]) {
            throw new RuntimeException('Falha na lista de 11 chaves.');
        }
    }
    echo "OK: 11 chaves configuráveis, sem máximo fixo.\n";

    // Duplicatas são ignoradas e a configuração anterior continua compatível.
    putenv('GROQ_API_KEYS=FAKE_A,,FAKE_A,FAKE_B');
    if (GroqKeyPool::configuredCount() !== 2) throw new RuntimeException('Deduplicação falhou.');
    putenv('GROQ_API_KEYS=');
    if (GroqKeyPool::configuredCount() !== 1 || GroqKeyPool::nextKey() !== 'FAKE_FALLBACK') {
        throw new RuntimeException('Fallback para GROQ_API_KEY falhou.');
    }
    echo "OK: duplicatas descartadas e fallback para configuração antiga.\n";
    echo "OK: teste offline; nenhuma chamada Groq, nenhum acesso ao MySQL.\n";
} finally {
    @unlink($path);
}
