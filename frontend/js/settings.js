/* ═══════════════════════════════════════════════════════════
   SETTINGS.JS — Meta diária de horas de estudo (modal).
   ═══════════════════════════════════════════════════════════ */

import { api } from './api.js';
import { state } from './state.js';
import { showToast } from './ui.js';

export async function loadSettings() {
  const { goal } = await api('/settings.php');
  state.dailyGoalHours = goal;
}

export function openModal() {
  document.getElementById('goal-inp').value = state.dailyGoalHours || '';
  document.getElementById('modal').classList.add('open');
}

export function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

export async function saveGoal() {
  const v = parseInt(document.getElementById('goal-inp').value);
  if (!v || v < 1 || v > 24) {
    showToast('⚠️', 'Valor inválido', 'Informe um número entre 1 e 24 horas.');
    return;
  }
  try {
    await api('/settings.php', { method: 'POST', body: JSON.stringify({ goal: v }) });
    state.dailyGoalHours = v;
    closeModal();
    showToast('🎯', 'Meta atualizada!', `${v}h por dia definidas.`);
  } catch (err) {
    showToast('⚠️', 'Erro ao salvar meta', err.message);
  }
}

document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});
