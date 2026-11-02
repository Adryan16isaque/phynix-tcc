<?php
/** Testa o endpoint sem credenciais, Docker ou MySQL, simulando PDO. */
declare(strict_types=1);
$root = dirname(__DIR__);
$tmp = sys_get_temp_dir() . '/phynix-hours-test-' . bin2hex(random_bytes(5));
mkdir($tmp . '/backend/api', 0700, true);
mkdir($tmp . '/backend/includes', 0700, true);
copy($root . '/backend/api/hours-summary.php', $tmp . '/backend/api/hours-summary.php');
$fake = <<<'MOCK'
<?php
final class MockStatement extends PDOStatement {
    private string $query;
    private array $params = [];
    public function __construct(string $query) { $this->query = $query; }
    public function execute(?array $params = null): bool { $this->params = $params ?? []; return true; }
    public function fetchColumn(int $column = 0): mixed {
        $rows = [
            ['user_id'=>12, 'ym'=>'2026-01','hours'=>3.0],
            ['user_id'=>12, 'ym'=>'2026-11','hours'=>1.5],
            ['user_id'=>12, 'ym'=>'2026-11','hours'=>2.5],
            ['user_id'=>12, 'ym'=>'2026-12','hours'=>0.5],
            ['user_id'=>12, 'ym'=>'2025-11','hours'=>18.0],
            ['user_id'=>99, 'ym'=>'2026-11','hours'=>90.0],
        ];
        $sum = 0.0;
        foreach ($rows as $r) {
            if ($r['user_id'] !== $this->params[0]) continue;
            if (str_contains($this->query, 'BETWEEN')) {
                if ($r['ym'] >= $this->params[1] && $r['ym'] <= $this->params[2]) $sum += $r['hours'];
            } else {
                if ($r['ym'] === $this->params[1]) $sum += $r['hours'];
            }
        }
        return $sum;
    }
}
final class MockPDO extends PDO {
    public function __construct() {}
    public function prepare(string $query, array $options = []): PDOStatement|false {
        return new MockStatement($query);
    }
}
function getDB(): PDO { return new MockPDO(); }
function requireAuth(): int { return 12; }
function jsonError(string $message, int $status = 400): never {
    throw new RuntimeException($status . ' ' . $message);
}
function jsonResponse(array $data): void { echo json_encode($data, JSON_UNESCAPED_UNICODE); }
MOCK;
file_put_contents($tmp . '/backend/includes/bootstrap.php', $fake);
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = ['year'=>'2026','ym'=>'2026-11'];
ob_start();
require $tmp . '/backend/api/hours-summary.php';
$json = (string)ob_get_clean();
$data = json_decode($json, true, 512, JSON_THROW_ON_ERROR);
if ((float)$data['yearHours'] !== 7.5 || (float)$data['monthHours'] !== 4.0 ||
    $data['year'] !== 2026 || $data['ym'] !== '2026-11') {
    throw new RuntimeException('Falha de soma/isolamento/ano: ' . $json);
}
unlink($tmp . '/backend/api/hours-summary.php');
unlink($tmp . '/backend/includes/bootstrap.php');
rmdir($tmp . '/backend/api'); rmdir($tmp . '/backend/includes'); rmdir($tmp . '/backend'); rmdir($tmp);
echo "OK: soma anual, mês selecionado, isolamento por usuário e ano anterior.\n";
