/* ═══════════════════════════════════════════════════════════
   CALENDAR.JS — Calendário, streak e marcação de dias estudados.
   ═══════════════════════════════════════════════════════════ */

import { api } from './api.js';
import { state } from './state.js';
import { showToast } from './ui.js';
import { handleUnlocked } from './achievements.js';

export function fmtDate(d) {
  return d.getFullYear()
    + '-' + String(d.getMonth() + 1).padStart(2, '0')
    + '-' + String(d.getDate()).padStart(2, '0');
}

export async function loadCalendar() {
  const y = state.calendarYear, m = state.calendarMonth + 1;
  const data = await api(`/calendar.php?year=${y}&month=${m}`);
  state.studiedDays = data.studiedDays;
  state.studyLog    = data.studyLog;
  state.firesByDay  = data.firesByDay;
  state.streak      = data.stats.streak;
  state.yearHours   = data.stats.yearHours;
}

// Aplica no estado local o resultado de um toggle de dia (marcar/
// desmarcar), sem precisar recarregar /calendar.php inteiro — a própria
// resposta do POST já devolve 'marked' e o novo 'streak'.
function applyDayToggle(key, marked, streak) {
  if (marked) {
    if (!state.studiedDays.includes(key)) state.studiedDays.push(key);
  } else {
    state.studiedDays = state.studiedDays.filter(d => d !== key);
  }
  state.streak = streak;
}

export async function markToday() {
  const key = fmtDate(new Date());
  try {
    const data = await api('/calendar.php', {
      method: 'POST',
      body: JSON.stringify({ date: key }),
    });
    applyDayToggle(key, data.marked, data.streak);
    renderCalendar();
    document.getElementById('sidebar-streak').textContent = state.streak;

    showToast(data.marked ? '✅' : '↩️',
      data.marked ? 'Dia marcado!' : 'Desmarcado',
      data.marked ? 'Continue assim, você está indo muito bem!' : 'Dia de hoje desmarcado.');

    handleUnlocked(data.unlocked);
  } catch (err) {
    showToast('⚠️', 'Erro', err.message);
  }
}

export async function changeMonth(dir) {
  state.calendarMonth += dir;
  if (state.calendarMonth > 11) { state.calendarMonth = 0;  state.calendarYear++; }
  if (state.calendarMonth < 0)  { state.calendarMonth = 11; state.calendarYear--; }
  await loadCalendar();
  renderCalendar();
}

async function toggleDay(key) {
  try {
    const data = await api('/calendar.php', {
      method: 'POST',
      body: JSON.stringify({ date: key }),
    });
    applyDayToggle(key, data.marked, data.streak);
    renderCalendar();
    document.getElementById('sidebar-streak').textContent = state.streak;
    handleUnlocked(data.unlocked);
  } catch (err) {
    showToast('⚠️', 'Erro', err.message);
  }
}

export function renderCalendar() {
  const MONTHS = [
    'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
  ];
  const DAY_NAMES = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  document.getElementById('cal-month-label').textContent = `${MONTHS[state.calendarMonth]} ${state.calendarYear}`;
  document.getElementById('stat-streak').textContent     = state.streak;
  document.getElementById('sidebar-streak').textContent  = state.streak;
  document.getElementById('stat-total').textContent      = state.studiedDays.length;

  const ym = `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, '0')}`;
  const monthHours = Object.entries(state.studyLog)
    .filter(([day]) => day.startsWith(ym))
    .reduce((acc, [, v]) => acc + v.hours, 0);
  document.getElementById('stat-hours').textContent = monthHours + 'h';
  document.getElementById('stat-year-hours').textContent = state.yearHours + 'h';

  const grid     = document.getElementById('cal-grid');
  grid.innerHTML = '';

  DAY_NAMES.forEach(name => {
    const el = document.createElement('div');
    el.className   = 'cal-day-name';
    el.textContent = name;
    grid.appendChild(el);
  });

  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const firstDay = new Date(state.calendarYear, state.calendarMonth, 1);
  const lastDay  = new Date(state.calendarYear, state.calendarMonth + 1, 0);

  for (let i = 0; i < firstDay.getDay(); i++) {
    const prev = new Date(state.calendarYear, state.calendarMonth, -firstDay.getDay() + i + 1);
    const el   = document.createElement('div');
    el.className   = 'cal-day other-month';
    el.textContent = prev.getDate();
    grid.appendChild(el);
  }

  const streakDays = new Set();
  const d = new Date(today);
  for (let i = 0; i < state.streak; i++) {
    streakDays.add(fmtDate(d));
    d.setDate(d.getDate() - 1);
  }

  const studiedSet = new Set(state.studiedDays);

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date      = new Date(state.calendarYear, state.calendarMonth, day);
    const key       = fmtDate(date);
    const isToday   = date.getTime() === today.getTime();
    const isStudied = studiedSet.has(key);
    const isStreak  = streakDays.has(key);

    const el = document.createElement('div');
    el.className = 'cal-day';
    if (isToday)               el.classList.add('today');
    if (isStreak && isStudied) el.classList.add('streak-day');
    else if (isStudied)        el.classList.add('studied');

    el.innerHTML = `${day}<span class="dot"></span>`;
    el.setAttribute('aria-label', `${day} de ${MONTHS[state.calendarMonth]}${isStudied ? ' — estudado' : ''}`);
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    el.onclick   = () => toggleDay(key);
    el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') toggleDay(key); };

    grid.appendChild(el);
  }
}
