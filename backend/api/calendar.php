<?php
/* ═══════════════════════════════════════════════════════════
   /api/calendar.php
   GET ?year=2026&month=6 (mês 1-12) → dados do mês + estatísticas
   POST { date: 'YYYY-MM-DD' }       → alterna dia marcado manualmente
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/stats.php';
require_once __DIR__ . '/../includes/achievements.php';

/** GET ?year=2026&month=6 (mês 1-12) → dados do mês + estatísticas. */
function handleGetCalendar(PDO $pdo, int $userId): void
{
    $year  = (int) ($_GET['year']  ?? date('Y'));
    $month = (int) ($_GET['month'] ?? date('n')); // 1-12
    $ym    = sprintf('%04d-%02d', $year, $month);

    $stmt = $pdo->prepare('SELECT day FROM studied_days WHERE user_id=?');
    $stmt->execute([$userId]);
    $studiedDays = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare("SELECT day, hours, completions FROM study_log WHERE user_id=? AND day LIKE ?");
    $stmt->execute([$userId, $ym . '-%']);
    $logRows = $stmt->fetchAll();
    $studyLog = [];
    foreach ($logRows as $r) {
        $studyLog[$r['day']] = ['hours' => (float) $r['hours'], 'completions' => (int) $r['completions']];
    }

    $stmt = $pdo->prepare("SELECT day, subject_id FROM daily_completions WHERE user_id=? AND day LIKE ?");
    $stmt->execute([$userId, $ym . '-%']);
    $fireRows = $stmt->fetchAll();
    $firesByDay = [];
    foreach ($fireRows as $r) {
        $firesByDay[$r['day']] = ($firesByDay[$r['day']] ?? 0) + 1;
    }

    jsonResponse([
        'studiedDays' => $studiedDays,
        'studyLog'    => $studyLog,
        'firesByDay'  => $firesByDay,
        'stats' => [
            'streak'     => getStreak($pdo, $userId),
            'totalDays'  => getTotalStudiedDays($pdo, $userId),
            'monthHours' => getMonthHours($pdo, $userId, $ym),
            'yearHours'  => getYearHours($pdo, $userId, $year),
        ],
    ]);
}

/** POST { date: 'YYYY-MM-DD' } → alterna dia marcado manualmente. */
function handleToggleDay(PDO $pdo, int $userId): void
{
    $body = readJsonBody();
    $date = trim($body['date'] ?? '');
    if (!$date || !DateTime::createFromFormat('Y-m-d', $date)) {
        jsonError('Data inválida.');
    }

    $stmt = $pdo->prepare('SELECT id FROM studied_days WHERE user_id=? AND day=?');
    $stmt->execute([$userId, $date]);
    $existing = $stmt->fetch();

    if ($existing) {
        $pdo->prepare('DELETE FROM studied_days WHERE id=?')->execute([$existing['id']]);
        $marked = false;
    } else {
        $pdo->prepare('INSERT INTO studied_days (user_id, day) VALUES (?,?)')->execute([$userId, $date]);
        $marked = true;
    }

    $unlocked = $marked ? checkCalendarAchievements($pdo, $userId) : [];

    // 'streak' vai junto pro frontend atualizar a sidebar/calendário sem
    // precisar chamar GET /calendar.php de novo para um toggle de um dia só.
    jsonResponse([
        'ok'       => true,
        'marked'   => $marked,
        'streak'   => getStreak($pdo, $userId),
        'unlocked' => $unlocked,
    ]);
}

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGetCalendar($pdo, $userId);
} elseif ($method === 'POST') {
    handleToggleDay($pdo, $userId);
} else {
    jsonError('Método não permitido', 405);
}
