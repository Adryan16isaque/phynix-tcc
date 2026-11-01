
/* ═══════════════════════════════════════════════════════════
   PROFILE.JS — Aba de Perfil: informações da conta,
   estatísticas e opção de apagar a conta.
   A antiga meta diária foi removida do projeto.
   ═══════════════════════════════════════════════════════════ */

import { state, api, escapeHtml } from "./app.js";
import { handleLogout } from "./auth.js";

function fmtDate(value) {
  if (!value) return "—";

  const d = new Date(String(value).replace(" ", "T"));
  if (isNaN(d.getTime())) return "—";

  return d.toLocaleDateString("pt-BR");
}

export async function renderProfile() {
  const panel = document.getElementById("profile-panel");
  if (!panel) return;

  // O endpoint de autenticação fornece a data de criação da conta.
  // Se falhar, mostramos os dados já disponíveis na sessão.
  try {
    const { user: fresh } = await api("/auth/me.php");
    if (fresh) state.user = fresh;
  } catch (err) {
    // Não impede a renderização do perfil.
  }

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

    <div class="profile-card profile-logout-mobile">
      <button class="btn" style="width:100%" onclick="handleLogout()">
        🚪 Sair da conta
      </button>
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
}

// Compatibilidade temporária: caso app.js ainda importe saveGoal,
// esta exportação evita quebrar o carregamento dos módulos.
// Não há campo, botão ou chamada à API de configurações no perfil.
export function saveGoal() {
  // A meta diária foi descontinuada.
}

export async function confirmDeleteAccount() {
  const sure = confirm(
    "Tem certeza que quer apagar sua conta? Essa ação NÃO pode ser desfeita."
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
