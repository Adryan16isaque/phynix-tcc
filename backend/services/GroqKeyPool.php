<?php
declare(strict_types=1);

/**
 * PHYNIX — seletor circular de credenciais Groq.
 *
 * - Lista em GROQ_API_KEYS (separada por vírgula), quantidade variável.
 * - Compatibilidade com GROQ_API_KEY quando a lista não está definida.
 * - Estado compartilhado em arquivo, com flock(LOCK_EX).
 * - Não registra nem devolve chaves para o navegador.
 * - Não faz novas tentativas com outras credenciais após HTTP 429.
 *
 * O rodízio só deve ser habilitado para credenciais cujo uso conjunto
 * esteja autorizado pelo provedor.
 */
final class GroqKeyPool
{
    /** @return list<string> */
    private static function configuredKeys(): array
    {
        $raw = getenv('GROQ_API_KEYS');
        if ($raw === false || trim($raw) === '') {
            $fallback = getenv('GROQ_API_KEY');
            if (($fallback === false || trim($fallback) === '') && defined('GROQ_API_KEY')) {
                $fallback = (string) GROQ_API_KEY;
            }
            $raw = is_string($fallback) ? $fallback : '';
        }

        // A chave Groq não contém vírgula; entradas vazias são descartadas.
        $keys = [];
        foreach (explode(',', $raw) as $part) {
            $key = trim($part);
            if ($key === '') {
                continue;
            }
            // Nunca incluir caracteres de controle nem separadores inválidos.
            if (preg_match('/[\x00-\x20\x7F,]/', $key)) {
                throw new RuntimeException('config');
            }
            if (!in_array($key, $keys, true)) {
                $keys[] = $key;
            }
        }
        if ($keys === []) {
            throw new RuntimeException('config');
        }
        return $keys;
    }

    public static function configuredCount(): int
    {
        return count(self::configuredKeys());
    }

    /** Seleciona uma credencial e avança o índice de forma atômica entre processos PHP. */
    public static function nextKey(): string
    {
        $keys = self::configuredKeys();
        $count = count($keys);
        if ($count === 1) {
            return $keys[0];
        }

        $path = getenv('GROQ_ROTATION_STATE');
        $path = is_string($path) && trim($path) !== ''
            ? trim($path)
            : sys_get_temp_dir() . '/phynix-groq-rotation.state';
        $dir = dirname($path);
        if (!is_dir($dir) || !is_writable($dir)) {
            error_log('[groq_pool] diretorio_estado_indisponivel');
            throw new RuntimeException('config');
        }

        $oldUmask = umask(0077);
        $stream = @fopen($path, 'c+');
        umask($oldUmask);
        if ($stream === false) {
            error_log('[groq_pool] arquivo_estado_indisponivel');
            throw new RuntimeException('config');
        }
        try {
            if (!flock($stream, LOCK_EX)) {
                throw new RuntimeException('config');
            }
            rewind($stream);
            $raw = stream_get_contents($stream);
            $state = is_string($raw) ? json_decode($raw, true) : null;
            $next = is_array($state) && isset($state['next']) && is_int($state['next'])
                ? max(0, $state['next']) : 0;
            $index = $next % $count;
            $updated = json_encode(['next' => ($index + 1) % $count], JSON_THROW_ON_ERROR);
            rewind($stream);
            if (!ftruncate($stream, 0) || fwrite($stream, $updated . "\n") !== strlen($updated) + 1 || !fflush($stream)) {
                throw new RuntimeException('config');
            }
            // Não manter o lock durante a requisição HTTP à Groq.
            flock($stream, LOCK_UN);
            return $keys[$index];
        } catch (Throwable $error) {
            error_log('[groq_pool] falha_estado');
            throw new RuntimeException('config');
        } finally {
            fclose($stream);
        }
    }
}
