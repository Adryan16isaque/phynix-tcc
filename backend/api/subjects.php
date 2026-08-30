<?php
/* ═══════════════════════════════════════════════════════════
   /api/subjects.php
   GET    → lista matérias com horas/progresso calculados
   POST   → cria matéria            { name, targetHours, days, color }
   PUT    → registra horas do mês   { id, monthHours }
   DELETE ?id=123 → remove matéria
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/../includes/bootstrap.php';
require_once __DIR__ . '/../includes/stats.php';
require_once __DIR__ . '/../includes/achievements.php';

/** GET → lista matérias com horas/progresso calculados. */
function handleGetSubjects(PDO $pdo, int $userId): void
{
    $stmt = $pdo->prepare('SELECT * FROM subjects WHERE user_id=? ORDER BY created_at ASC');
    $stmt->execute([$userId]);
    $subjects = $stmt->fetchAll();

    $ym       = currentYM();
    $today    = date('Y-m-d');
    $todayIds = getTodayCompletionIds($pdo, $userId, $today);

    $result = array_map(function ($s) use ($pdo, $userId, $ym, $todayIds) {
        $id      = (int) $s['id'];
        $monthH  = getSubjectMonthHours($pdo, $userId, $id, $ym);
        $totalH  = getSubjectTotalHours($pdo, $userId, $id);
        $target  = (float) $s['target_hours'];
        $pct     = $target > 0 ? min(100, round(($totalH / $target) * 100)) : 0;

        return [
            'id'          => $id,
            'name'        => $s['name'],
            'targetHours' => $target,
            'days'        => $s['days_per_week'],
            'color'       => $s['color'],
            'monthHours'  => $monthH,
            'doneHours'   => $totalH,
            'progressPct' => $pct,
            'doneToday'   => in_array($id, $todayIds, true),
            'totalFires'  => getSubjectFireCount($pdo, $userId, $id),
        ];
    }, $subjects);

    jsonResponse(['subjects' => $result]);
}

/** POST → cria matéria { name, targetHours, days, color }. */
function handleCreateSubject(PDO $pdo, int $userId): void
{
    $body   = readJsonBody();
    $name   = trim($body['name'] ?? '');
    $target = (float) ($body['targetHours'] ?? 0);
    $days   = (int) ($body['days'] ?? 5);
    $color  = trim($body['color'] ?? '#4f8aff');

    if ($name === '' || $target <= 0) {
        jsonError('Informe o nome da matéria e a meta de horas.');
    }
    if (mb_strlen($name) > 120) {
        jsonError('Nome da matéria muito longo (máx. 120 caracteres).');
    }
    if ($days < 1 || $days > 7) {
        jsonError('Dias por semana deve ser entre 1 e 7.');
    }
    if (!preg_match('/^#[0-9a-fA-F]{6}$/', $color)) {
        jsonError('Cor inválida. Use um valor hexadecimal, ex: #4f8aff.');
    }

    $stmt = $pdo->prepare('INSERT INTO subjects (user_id, name, target_hours, days_per_week, color) VALUES (?,?,?,?,?)');
    $stmt->execute([$userId, $name, $target, $days, $color]);
    $newId = (int) $pdo->lastInsertId();

    $unlocked = checkPlannerAchievements($pdo, $userId);

    jsonResponse(['id' => $newId, 'unlocked' => $unlocked], 201);
}

/** PUT → registra horas do mês { id, monthHours }. */
function handleUpdateHours(PDO $pdo, int $userId): void
{
    $body      = readJsonBody();
    $id        = (int) ($body['id'] ?? 0);
    $newMonthH = max(0, (float) ($body['monthHours'] ?? 0));

    $stmt = $pdo->prepare('SELECT target_hours FROM subjects WHERE id=? AND user_id=?');
    $stmt->execute([$id, $userId]);
    $subjectRow = $stmt->fetch();
    if (!$subjectRow) jsonError('Matéria não encontrada.', 404);
    $target = (float) $subjectRow['target_hours'];

    $ym        = currentYM();
    $prevMonth = getSubjectMonthHours($pdo, $userId, $id, $ym);
    $delta     = $newMonthH - $prevMonth;

    if ($delta != 0) {
        $stmt = $pdo->prepare('
            INSERT INTO hours_log (user_id, subject_id, ym, hours) VALUES (?,?,?,?)
            ON DUPLICATE KEY UPDATE hours = VALUES(hours)
        ');
        $stmt->execute([$userId, $id, $ym, $newMonthH]);

        $today = date('Y-m-d');
        touchStudyLog($pdo, $userId, $today, $delta);

        $dayStats = getDayStats($pdo, $userId, $today);
        if ($dayStats['hours'] > 0) {
            $pdo->prepare('INSERT IGNORE INTO studied_days (user_id, day) VALUES (?,?)')->execute([$userId, $today]);
        } elseif ($dayStats['hours'] == 0 && count(getTodayCompletionIds($pdo, $userId, $today)) === 0) {
            $pdo->prepare('DELETE FROM studied_days WHERE user_id=? AND day=?')->execute([$userId, $today]);
        }
    }

    $unlocked = array_merge(
        checkCalendarAchievements($pdo, $userId),
        checkHoursAchievements($pdo, $userId)
    );

    $totalH = getSubjectTotalHours($pdo, $userId, $id);
    $pct    = $target > 0 ? min(100, round(($totalH / $target) * 100)) : 0;

    // 'progressPct' vai junto para o frontend atualizar a barra/badge da
    // matéria direto com a resposta, sem chamar GET /subjects.php de novo.
    jsonResponse([
        'ok'          => true,
        'monthHours'  => $newMonthH,
        'totalHours'  => $totalH,
        'progressPct' => $pct,
        'unlocked'    => $unlocked,
    ]);
}

/** DELETE ?id=123 → remove matéria. */
function handleDeleteSubject(PDO $pdo, int $userId): void
{
    $id = (int) ($_GET['id'] ?? 0);
    if (!$id) jsonError('Informe o id da matéria.');

    $stmt = $pdo->prepare('DELETE FROM subjects WHERE id=? AND user_id=?');
    $stmt->execute([$id, $userId]);

    jsonResponse(['ok' => true]);
}

$userId = requireAuth();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        handleGetSubjects($pdo, $userId);
        break;

    case 'POST':
        handleCreateSubject($pdo, $userId);
        break;

    case 'PUT':
        handleUpdateHours($pdo, $userId);
        break;

    case 'DELETE':
        handleDeleteSubject($pdo, $userId);
        break;

    default:
        jsonError('Método não permitido', 405);
}
