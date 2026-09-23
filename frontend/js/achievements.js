/* ═══════════════════════════════════════════════════════════
   ACHIEVEMENTS.JS — Conquistas.
   A lista completa (ícones, nomes, descrições) vem do servidor
   em GET /api/achievements.php — é a mesma fonte de verdade
   usada para desbloquear, então front e back nunca ficam
   dessincronizados.
   ═══════════════════════════════════════════════════════════ */

import { api } from "./api.js";
import { state } from "./state.js";
import { escapeHtml, showToast, fireConfetti } from "./ui.js";

export async function loadAchievements() {
  try {
    const { achievements } = await api("/achievements.php");
    state.achievements = achievements;
  } catch (err) {
    state.achievementsError = err.message;
  }
}

function mergeUnlocked(list, unlockedAchievements) {
  const ids = new Set(unlockedAchievements.map((a) => a.id));
  return list.map((a) => (ids.has(a.id) ? { ...a, unlocked: true } : a));
}

/** Chamado após qualquer ação do backend que devolva `unlocked` (novas conquistas). */
export function handleUnlocked(unlocked) {
  if (!unlocked || !unlocked.length) return;
  state.achievements = mergeUnlocked(state.achievements, unlocked);
  renderAchievements();
  unlocked.forEach((a) => showAchievementToast(a));
}

function showAchievementToast(ach) {
  showToast(ach.icon, "Conquista desbloqueada! " + ach.name, ach.desc);
  fireConfetti();
}

export function renderAchievements() {
  const grid = document.getElementById("ach-grid");

  if (state.achievementsError) {
    grid.innerHTML = `<div style="color:var(--text-muted);padding:20px">Não foi possível carregar as conquistas: ${escapeHtml(state.achievementsError)}</div>`;
    return;
  }
  if (!state.achievements.length) {
    grid.innerHTML = '<div style="color:var(--text-muted);padding:20px">Carregando conquistas…</div>';
    return;
  }

  grid.innerHTML = state.achievements
    .map((a) => {
      // Conquistas secretas ficam com nome/descrição ocultos até desbloquear
      const hidden = a.secret && !a.unlocked;
      const name = hidden ? "???" : a.name;
      const desc = hidden
        ? "Conquista secreta — continue estudando para descobrir!"
        : a.desc;
      const icon = hidden ? "🔒" : a.icon;

      return `
      <div class="ach-card ${a.unlocked ? "unlocked" : "locked"}"
        aria-label="${escapeHtml(name)} — ${a.unlocked ? "Desbloqueada" : "Bloqueada"}">
        <span class="ach-badge">${a.unlocked ? "✓ Obtida" : "Bloqueada"}</span>
        <div class="ach-icon">${icon}</div>
        <div class="ach-name">${escapeHtml(name)}</div>
        <div class="ach-desc">${escapeHtml(desc)}</div>
      </div>`;
    })
    .join("");
}
