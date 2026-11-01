/* ═══════════════════════════════════════════════════════════
   PROFILE.JS — Perfil do estudante PHYNIX.
   Edita apenas o nome, preservando e-mail, estatísticas,
   saída mobile e exclusão de conta.
   ═══════════════════════════════════════════════════════════ */

import { state, api, escapeHtml } from "./app.js";
import { handleLogout } from "./auth.js";

function fmtDate(value) {
  if (!value) return "—";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

/** Remove espaços repetidos e não aceita caracteres de controle. */
function validateName(value) {
  const name = String(value).replace(/\s+/gu, " ").trim();
  const length = [...name].length;
  if (length < 3 || length > 100) {
    return { valid: false, message: "O nome deve ter entre 3 e 100 caracteres." };
  }
  if (/[\u0000-\u001F\u007F]/u.test(name)) {
    return { valid: false, message: "O nome contém caracteres inválidos." };
  }
  return { valid: true, name };
}

export async function renderProfile() {
  const panel = document.getElementById("profile-panel");
  if (!panel) return;

  // A rota /auth/me.php inclui a data de criação da conta.
  try {
    const { user } = await api("/auth/me.php");
    if (user) state.user = { ...(state.user || {}), ...user };
  } catch (err) {
    // Erro temporário: ainda podemos mostrar o usuário em memória.
    console.warn("Não foi possível atualizar os dados do perfil.", err);
  }

  const user = state.user || {};
  const unlockedCount = state.achievements.filter((item) => item.unlocked).length;

  panel.innerHTML = `
    <div class="profile-card profile-account">
      <div class="profile-account-header">
        <div>
          <strong class="profile-account-title">Informações da conta</strong>
          <p class="profile-account-hint">Consulte seus dados ou corrija seu nome.</p>
        </div>
        <button type="button" class="btn profile-edit-trigger"
          id="profile-edit-name-btn" aria-expanded="false"
          aria-controls="profile-name-form">✎ Editar perfil</button>
      </div>

      <div class="profile-field">
        <span>Nome</span>
        <strong id="profile-display-name">${escapeHtml(user.name || "")}</strong>
      </div>
      <div class="profile-field">
        <span>E-mail</span><strong>${escapeHtml(user.email || "")}</strong>
      </div>
      <div class="profile-field">
        <span>Conta criada em</span><strong>${fmtDate(user.created_at)}</strong>
      </div>

      <form class="profile-edit-form" id="profile-name-form" hidden novalidate>
        <label for="profile-name-input">Novo nome</label>
        <input class="inp profile-name-input" id="profile-name-input"
          type="text" autocomplete="name" maxlength="100" required
          aria-describedby="profile-name-help profile-name-error" />
        <p id="profile-name-help" class="profile-input-help">Use entre 3 e 100 caracteres.</p>
        <p id="profile-name-error" class="profile-input-error" role="alert" hidden></p>
        <div class="profile-edit-actions">
          <button type="button" class="btn profile-cancel-btn"
            id="profile-cancel-name-btn">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="profile-save-name-btn">
            Salvar alterações
          </button>
        </div>
      </form>
      <p class="profile-edit-status" id="profile-edit-status" role="status"
        aria-live="polite" hidden></p>
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
      <button class="btn" type="button" style="width:100%" onclick="handleLogout()">
        🚪 Sair da conta
      </button>
    </div>

    <div class="profile-card profile-danger">
      <div>
        <strong>Apagar minha conta</strong>
        <p class="auth-hint">Essa ação é irreversível. Todas as suas matérias,
          horas, conquistas e conversas serão apagadas.</p>
      </div>
      <button class="btn btn-danger" type="button" onclick="confirmDeleteAccount()">
        Apagar conta
      </button>
    </div>
  `;

  const editBtn = panel.querySelector("#profile-edit-name-btn");
  const cancelBtn = panel.querySelector("#profile-cancel-name-btn");
  const form = panel.querySelector("#profile-name-form");
  const input = panel.querySelector("#profile-name-input");
  const error = panel.querySelector("#profile-name-error");
  const saveBtn = panel.querySelector("#profile-save-name-btn");
  const status = panel.querySelector("#profile-edit-status");
  const displayName = panel.querySelector("#profile-display-name");
  let saving = false;

  function setError(message = "") {
    error.textContent = message;
    error.hidden = !message;
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function closeEditor() {
    form.hidden = true;
    editBtn.hidden = false;
    editBtn.setAttribute("aria-expanded", "false");
    setError();
  }

  editBtn.addEventListener("click", () => {
    status.hidden = true;
    status.textContent = "";
    setError();
    input.value = state.user?.name || "";
    form.hidden = false;
    editBtn.hidden = true;
    editBtn.setAttribute("aria-expanded", "true");
    input.focus();
    input.select();
  });

  cancelBtn.addEventListener("click", () => {
    if (saving) return;
    closeEditor();
    editBtn.focus();
  });

  input.addEventListener("input", () => setError());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (saving) return;

    const validation = validateName(input.value);
    if (!validation.valid) {
      setError(validation.message);
      input.focus();
      return;
    }
    if (validation.name === (state.user?.name || "")) {
      closeEditor();
      return;
    }

    saving = true;
    saveBtn.disabled = true;
    cancelBtn.disabled = true;
    saveBtn.textContent = "Salvando…";
    setError();

    try {
      // O servidor usa apenas o ID da sessão — nunca recebe user_id do cliente.
      const { user: updated } = await api("/auth/update-name.php", {
        method: "PATCH",
        body: JSON.stringify({ name: validation.name }),
      });
      if (!updated || typeof updated.name !== "string") {
        throw new Error("O servidor não confirmou a alteração do nome.");
      }

      state.user = { ...(state.user || {}), ...updated };
      displayName.textContent = updated.name; // textContent evita interpretar HTML.
      const sidebarName = document.getElementById("sidebar-user-name");
      if (sidebarName) sidebarName.textContent = updated.name || updated.email;

      closeEditor();
      status.textContent = "✓ Nome atualizado com sucesso!";
      status.hidden = false;
    } catch (err) {
      setError(err.message || "Não foi possível salvar. Tente novamente.");
    } finally {
      saving = false;
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.textContent = "Salvar alterações";
    }
  });
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
