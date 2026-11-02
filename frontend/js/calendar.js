/* ═══════════════════════════════════════════════════════════
   CALENDAR.JS — Calendário, streak e marcação de dias estudados.
   Mantém os endpoints existentes; melhora feedback, acessibilidade,
   prevenção de cliques duplicados e navegação entre os meses.
   ═══════════════════════════════════════════════════════════ */

import { api, state, showToast } from "./app.js";
import { handleUnlocked } from "./achievements.js";
import { refreshStudyHours, paintStudyHours } from "./study-hours.js";

const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

let pendingDay = null;
let changingMonth = false;

export function fmtDate(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
    + "-" + String(d.getDate()).padStart(2, "0");
}

export async function loadCalendar() {
  const y = state.calendarYear;
  const m = state.calendarMonth + 1;
  const data = await api(`/calendar.php?year=${y}&month=${m}`);
  state.studiedDays = Array.isArray(data.studiedDays) ? data.studiedDays : [];
  state.studyLog = data.studyLog && typeof data.studyLog === "object" ? data.studyLog : {};
  state.firesByDay = data.firesByDay && typeof data.firesByDay === "object" ? data.firesByDay : {};
  state.streak = Number(data.stats?.streak) || 0;
  // A API antiga fornece estatísticas do calendário. Horas vêm de
  // hours_log em /hours-summary.php, evitando totais divergentes.
  try {
    await refreshStudyHours();
  } catch (err) {
    console.warn("Não foi possível carregar os totais de horas.", err);
  }
}

function applyDayToggle(key, marked, streak) {
  if (marked) {
    if (!state.studiedDays.includes(key)) state.studiedDays.push(key);
  } else {
    state.studiedDays = state.studiedDays.filter((d) => d !== key);
  }
  state.streak = Number(streak) || 0;
}

function isCurrentMonth() {
  const now = new Date();
  return state.calendarMonth === now.getMonth() && state.calendarYear === now.getFullYear();
}

// O endpoint /calendar.php alterna o estado; travamos cliques simultâneos
// para não haver uma segunda requisição desmarcando a primeira.
async function toggleDay(key) {
  if (pendingDay !== null || changingMonth) return;
  if (key > fmtDate(new Date())) {
    showToast("📅", "Data futura", "Você só pode registrar hoje ou dias anteriores.");
    return;
  }
  pendingDay = key;
  renderCalendar();
  try {
    const data = await api("/calendar.php", {
      method: "POST",
      body: JSON.stringify({ date: key }),
    });
    applyDayToggle(key, Boolean(data.marked), data.streak);
    showToast(data.marked ? "✅" : "↩️",
      data.marked ? "Dia registrado" : "Registro desfeito",
      data.marked ? `Estudo registrado em ${key.split("-").reverse().join("/")}.`
        : "O dia foi desmarcado no calendário.");
    handleUnlocked(data.unlocked);
  } catch (err) {
    showToast("⚠️", "Não foi possível salvar", err.message);
  } finally {
    pendingDay = null;
    renderCalendar();
  }
}

async function goToMonth(year, month) {
  if (changingMonth || pendingDay !== null) return;
  const previousYear = state.calendarYear;
  const previousMonth = state.calendarMonth;
  changingMonth = true;
  document.querySelectorAll("#calendar-panel .cal-arrow").forEach(b => { b.disabled = true; });
  const hint = document.getElementById("cal-today-hint");
  if (hint) hint.textContent = "Carregando calendário…";
  state.calendarYear = year;
  state.calendarMonth = month;
  try {
    await loadCalendar();
  } catch (err) {
    state.calendarYear = previousYear;
    state.calendarMonth = previousMonth;
    showToast("⚠️", "Erro ao mudar mês", err.message);
    // Os dados do mês anterior continuam em memória.
  } finally {
    changingMonth = false;
    renderCalendar();
  }
}

export async function changeMonth(dir) {
  if (changingMonth || pendingDay !== null) return;
  const target = new Date(state.calendarYear, state.calendarMonth + dir, 1);
  await goToMonth(target.getFullYear(), target.getMonth());
}

export async function markToday() {
  if (changingMonth || pendingDay !== null) return;
  const today = new Date();
  // Se estiver olhando outro mês, o botão passa a ser 'Voltar ao mês atual',
  // em vez de alterar silenciosamente um dia que não está na tela.
  if (!isCurrentMonth()) {
    await goToMonth(today.getFullYear(), today.getMonth());
    return;
  }
  await toggleDay(fmtDate(today));
}

export function renderCalendar() {
  const monthLabel = document.getElementById("cal-month-label");
  const grid = document.getElementById("cal-grid");
  if (!monthLabel || !grid) return;

  monthLabel.textContent = `${MONTHS[state.calendarMonth]} ${state.calendarYear}`;
  const streak = document.getElementById("stat-streak");
  const sidebarStreak = document.getElementById("sidebar-streak");
  const total = document.getElementById("stat-total");
  if (streak) streak.textContent = state.streak;
  if (sidebarStreak) sidebarStreak.textContent = state.streak;
  if (total) total.textContent = state.studiedDays.length;

  // Ambos os cartões utilizam a mesma agregação que o Perfil/Planner.
  // Sem dados válidos, exibem "—", não um zero incorreto.
  paintStudyHours();
  // A navegação pode exibir um mês diferente do mês atual.
  const monthStatLabel = document.getElementById("stat-hours")?.nextElementSibling;
  if (monthStatLabel?.classList.contains("stat-lbl")) {
    monthStatLabel.textContent = "Horas do mês exibido";
  }

  grid.replaceChildren();
  DAY_NAMES.forEach((name) => {
    const el = document.createElement("div");
    el.className = "cal-day-name";
    el.textContent = name;
    grid.appendChild(el);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = fmtDate(today);
  const firstDay = new Date(state.calendarYear, state.calendarMonth, 1);
  const lastDay = new Date(state.calendarYear, state.calendarMonth + 1, 0);
  const studiedSet = new Set(state.studiedDays);

  for (let i = 0; i < firstDay.getDay(); i++) {
    const prev = new Date(state.calendarYear, state.calendarMonth, i - firstDay.getDay() + 1);
    const spacer = document.createElement("div");
    spacer.className = "cal-day other-month";
    spacer.textContent = prev.getDate();
    spacer.setAttribute("aria-hidden", "true");
    grid.appendChild(spacer);
  }

  const streakDays = new Set();
  const d = new Date(today);
  for (let i = 0; i < state.streak; i++) {
    streakDays.add(fmtDate(d));
    d.setDate(d.getDate() - 1);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    const date = new Date(state.calendarYear, state.calendarMonth, day);
    const key = fmtDate(date);
    const isToday = key === todayKey;
    const isStudied = studiedSet.has(key);
    const isStreak = streakDays.has(key) && isStudied;
    const isFuture = key > todayKey;
    const el = document.createElement("button");
    el.type = "button";
    el.className = "cal-day";
    if (isToday) el.classList.add("today");
    if (isStreak) el.classList.add("streak-day");
    else if (isStudied) el.classList.add("studied");
    if (pendingDay === key) el.classList.add("saving");
    el.disabled = isFuture || pendingDay !== null || changingMonth;
    el.setAttribute("aria-pressed", String(isStudied));
    el.setAttribute("aria-label", `${day} de ${MONTHS[state.calendarMonth]} de ${state.calendarYear}`
      + (isStudied ? ", estudado; clique para desmarcar" : isFuture ? ", data futura" : ", clique para marcar"));
    el.title = isFuture ? "Data futura: indisponível" : isStudied ? "Desmarcar dia" : "Marcar dia estudado";
    el.innerHTML = `${day}<span class="dot"></span>`;
    el.addEventListener("click", () => toggleDay(key));
    grid.appendChild(el);
  }

  const action = document.getElementById("cal-today-btn");
  const hint = document.getElementById("cal-today-hint");
  if (action) {
    const isMarked = studiedSet.has(todayKey);
    action.disabled = pendingDay !== null || changingMonth;
    action.classList.toggle("cal-action-done", isCurrentMonth() && isMarked);
    action.textContent = changingMonth ? "Carregando…" : pendingDay !== null ? "Salvando…"
      : !isCurrentMonth() ? "↩ Voltar ao mês atual"
      : isMarked ? "✓ Hoje registrado — desmarcar" : "✅ Marcar hoje como estudado";
    action.setAttribute("aria-pressed", String(isCurrentMonth() && isMarked));
  }
  if (hint) {
    hint.textContent = changingMonth ? "Carregando calendário…"
      : pendingDay !== null ? "Salvando seu registro…"
      : !isCurrentMonth() ? "Volte ao mês atual para registrar hoje."
      : studiedSet.has(todayKey) ? "Seu dia de hoje já está registrado."
      : "Marque hoje após estudar; você pode desfazer se precisar.";
  }
  document.querySelectorAll("#calendar-panel .cal-arrow").forEach(b => {
    b.disabled = changingMonth || pendingDay !== null;
  });
}
