/* ═══════════════════════════════════════════════════════════
   STUDY-HOURS.JS — Totais canônicos de horas registradas no Planner.
   A fonte é hours_log (MySQL), consultada por /hours-summary.php.
   Marcar dias e concluir matérias NÃO soma horas automaticamente.
   ═══════════════════════════════════════════════════════════ */

import { api, state } from "./app.js";

let latestRequest = 0;

export function viewedMonthKey() {
  return `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, "0")}`;
}

export function hoursLabel(hours) {
  if (!Number.isFinite(Number(hours))) return "—";
  const value = Math.round(Number(hours) * 10) / 10;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}

// Atualiza texto sem redesenhar o Perfil; isso preserva formulários em edição.
export function paintStudyHours() {
  const valid = state.hoursSummaryLoaded && !state.hoursSummaryFailed;
  const yearText = valid ? hoursLabel(state.yearHours) : "—";
  for (const id of ["stat-year-hours", "profile-year-hours"]) {
    const el = document.getElementById(id);
    if (el) el.textContent = yearText;
  }

  const monthEl = document.getElementById("stat-hours");
  if (monthEl) {
    monthEl.textContent = valid && state.hoursMonthYm === viewedMonthKey()
      ? hoursLabel(state.monthHours) : "—";
  }
}

/**
 * Sempre lê o banco: nunca acrescenta nem subtrai horas no navegador.
 * A resposta pode chegar fora de ordem durante navegação rápida;
 * somente a solicitação mais recente atualiza o estado.
 */
export async function refreshStudyHours() {
  const requestNumber = ++latestRequest;
  const userId = state.user?.id == null ? null : String(state.user.id);
  const year = new Date().getFullYear(); // ano local do estudante, não o ano da página do calendário
  const ym = viewedMonthKey();

  try {
    const data = await api(`/hours-summary.php?year=${year}&ym=${encodeURIComponent(ym)}`);
    const yearHours = Number(data.yearHours);
    const monthHours = Number(data.monthHours);
    if (!Number.isFinite(yearHours) || yearHours < 0 ||
        !Number.isFinite(monthHours) || monthHours < 0 ||
        String(data.ym) !== ym || Number(data.year) !== year) {
      throw new Error("O servidor retornou estatísticas inválidas.");
    }

    // Não escrever na sessão seguinte, nem substituir uma consulta mais recente.
    if (requestNumber !== latestRequest || (state.user?.id == null ? null : String(state.user.id)) !== userId) return false;
    state.yearHours = yearHours;
    state.monthHours = monthHours;
    state.hoursMonthYm = ym;
    state.hoursSummaryLoaded = true;
    state.hoursSummaryFailed = false;
    paintStudyHours();
    return true;
  } catch (err) {
    if (requestNumber === latestRequest && (state.user?.id == null ? null : String(state.user.id)) === userId) {
      state.hoursSummaryFailed = true;
      paintStudyHours(); // nunca mostrar 0h como se a consulta tivesse funcionado
    }
    throw err;
  }
}
