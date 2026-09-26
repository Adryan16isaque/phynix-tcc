/* ═══════════════════════════════════════════════════════════
   PROFILE.JS — Aba de Perfil: dados da conta, meta diária de
   estudo e opção de apagar a conta.
   ═══════════════════════════════════════════════════════════ */

import { state } from "./state.js";
import { api } from "./api.js";
import { escapeHtml } from "./ui.js";
import { handleLogout } from "./auth.js";

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
}

export async function renderProfile() {
  const panel = document.getElementById("profile-panel");
  const unlockedCount = state.achievements.filter((a) => a.unlocked).length;
  const user = state.user || {};

  panel.innerHTML = `
    <div class="profile-card">
      <div class="profile-field">
        <span>Nome</span><strong>${escapeHtml(user.name || "")}</strong>
      </div>
      <div class="profile-field">
        <span>E-mail</span><strong>${escapeHtml(user.email || "")}</strong>
      </div>
      <div class="profile-field">
        <span>Conta criada em</span><strong>${fmtDate(user.created_at)}</strong>
      </div>
    </div>

    <div class="profile-card">
      <label class="auth-label" for="goal-input">Meta diária de estudo (horas)</label>
      <div class="goal-row">
        <input class="inp" type="number" id="goal-input" min="1" max="24" value="4">
        <button class="btn btn-primary" onclick="saveGoal()">Salvar</button>
      </div>
      <div id="goal-feedback" class="auth-hint"></div>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-ico">📚</div>
        <div class="stat-val">${state.subjects.length}</div>
        <div class="stat-lbl">matérias cadastradas</div>
      </div>
      <div class="stat-card">
        <div class="stat-ico">🔥</div>
        <div class="stat-val">${state.streak}</div>
        <div class="stat-lbl">dias de sequência</div>
      </div>
      <div class="stat-card">
        <div class="stat-ico">🏆</div>
        <div class="stat-val">${unlockedCount}/${state.achievements.length}</div>
        <div class="stat-lbl">conquistas</div>
      </div>
      <div class="stat-card">
        <div class="stat-ico">⏱</div>
        <div class="stat-val">${state.yearHours}h</div>
        <div class="stat-lbl">estudadas este ano</div>
      </div>
    </div>

    <div class="profile-card profile-danger">
      <div>
        <strong>Apagar minha conta</strong>
        <p class="auth-hint">
          Essa ação é irreversível. Todas as suas matérias, horas,
          conquistas e conversas serão apagadas.
        </p>
      </div>
      <button class="btn btn-danger" onclick="confirmDeleteAccount()">
        Apagar conta
      </button>
    </div>
  `;

  try {
    const { goal } = await api("/settings.php");
    document.getElementById("goal-input").value = goal;
  } catch (err) {
    // Se não conseguir carregar, mantém o padrão (4h) já preenchido.
  }
}

export async function saveGoal() {
  const input = document.getElementById("goal-input");
  const feedback = document.getElementById("goal-feedback");
  const goal = parseInt(input.value, 10);

  try {
    await api("/settings.php", {
      method: "POST",
      body: JSON.stringify({ goal }),
    });
    feedback.textContent = "Meta salva!";
    feedback.style.color = "var(--accent3)";
  } catch (err) {
    feedback.textContent = err.message;
    feedback.style.color = "var(--danger)";
  }
}

export async function confirmDeleteAccount() {
  const sure = confirm(
    "Tem certeza que quer apagar sua conta? Essa ação NÃO pode ser desfeita.",
  );
  if (!sure) return;

  const password = prompt("Digite sua senha para confirmar:");
  if (!password) return;

  try {
    await api("/auth/delete-account.php", {
      method: "DELETE",
      body: JSON.stringify({ password }),
    });
    alert("Conta apagada. Sentiremos sua falta!");
    await handleLogout();
  } catch (err) {
    alert("Não foi possível apagar a conta: " + err.message);
  }
}
