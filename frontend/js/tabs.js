/* ═══════════════════════════════════════════════════════════
   TABS.JS — Navegação entre as abas do app (chat/planner/
   calendário/conquistas), re-renderizando a aba ao entrar nela.
   ═══════════════════════════════════════════════════════════ */

import { renderPlanner } from './planner.js';
import { renderCalendar } from './calendar.js';
import { renderAchievements } from './achievements.js';
import { loadHistoryList } from './chat.js';

const TAB_ORDER = ['chat', 'planner', 'calendar', 'achievements', 'history'];

export function switchTab(tab) {
  document.querySelectorAll('.panel').forEach(p  => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t    => t.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

  document.getElementById(tab + '-panel').classList.add('active');

  const idx = TAB_ORDER.indexOf(tab);
  document.querySelectorAll('.tab')[idx].classList.add('active');
  document.querySelectorAll('.nav-btn')[idx].classList.add('active');

  if (tab === 'planner')      renderPlanner();
  if (tab === 'calendar')     renderCalendar();
  if (tab === 'achievements') renderAchievements();
  if (tab === 'history')      loadHistoryList();
}
