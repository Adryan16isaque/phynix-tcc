<?php
/* ═══════════════════════════════════════════════════════════
   /api/settings.php
   GET  → meta diária atual               { goal }
   POST → salva a meta diária { goal }    (1 a 24 horas)
   ═══════════════════════════════════════════════════════════ */

require_once __DIR__ . '/../includes/bootstrap.php';

$userId = requireAuth();
$pdo    = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare('SELECT daily_goal_hours FROM settings WHERE user_id=?');
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    jsonResponse(['goal' => $row ? (int) $row['daily_goal_hours'] : 4]);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = readJsonBody();
    $goal = (int) ($body['goal'] ?? 0);

    if ($goal < 1 || $goal > 24) {
        jsonError('A meta diária deve ser entre 1 e 24 horas.');
    }

    // INSERT ... ON DUPLICATE KEY UPDATE: cria a linha na primeira vez
    // que o usuário define uma meta, ou atualiza se já existir.
    $stmt = $pdo->prepare(
        'INSERT INTO settings (user_id, daily_goal_hours) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE daily_goal_hours = VALUES(daily_goal_hours)'
    );
    $stmt->execute([$userId, $goal]);

    jsonResponse(['goal' => $goal]);
}

jsonError('Método não permitido', 405);
