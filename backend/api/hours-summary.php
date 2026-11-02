<?php
/**
 * PHYNIX — resumo dos registros de horas do Planner.
 * GET /backend/api/hours-summary.php?year=2026&ym=2026-11
 * Retorna o ano civil atual do usuário (fornecido pelo navegador) e o
 * mês selecionado no Calendário. Não modifica o banco de dados.
 *
 * Fonte ÚNICA: hours_log.hours. O botão "concluir hoje" e os dias
 * marcados não contam como horas automaticamente.
 */
require_once __DIR__ . '/../includes/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonError('Método não permitido.', 405);
}

$userId = requireAuth();
$yearInput = $_GET['year'] ?? null;
$ymInput = $_GET['ym'] ?? null;

if (!is_string($yearInput) || !preg_match('/^20\d{2}$/D', $yearInput)) {
    jsonError('Ano inválido.', 400);
}
if (!is_string($ymInput) ||
    !preg_match('/^20\d{2}-(?:0[1-9]|1[0-2])$/D', $ymInput)) {
    jsonError('Mês inválido. Utilize YYYY-MM.', 400);
}

try {
    $pdo = getDB();
    // A chave (user_id, subject_id, ym) assegura um registro mensal
    // por matéria. Somar por usuário+ano inclui todas as disciplinas.
    $yearStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(hours), 0) FROM hours_log '
        . 'WHERE user_id = ? AND ym BETWEEN ? AND ?'
    );
    $yearStmt->execute([(int) $userId, $yearInput . '-01', $yearInput . '-12']);
    $yearHours = round((float) $yearStmt->fetchColumn(), 1);

    $monthStmt = $pdo->prepare(
        'SELECT COALESCE(SUM(hours), 0) FROM hours_log '
        . 'WHERE user_id = ? AND ym = ?'
    );
    $monthStmt->execute([(int) $userId, $ymInput]);
    $monthHours = round((float) $monthStmt->fetchColumn(), 1);
} catch (PDOException $e) {
    error_log('[hours-summary] Falha ao consultar horas do usuário autenticado.');
    jsonError('Não foi possível consultar as horas de estudo.', 500);
}

header('Cache-Control: no-store, private');
jsonResponse([
    'year' => (int) $yearInput,
    'ym' => $ymInput,
    'yearHours' => $yearHours,
    'monthHours' => $monthHours,
]);
