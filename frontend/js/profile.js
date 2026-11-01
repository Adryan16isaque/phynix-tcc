/* ═══════════════════════════════════════════════════════════
   PROFILE.JS — Perfil do estudante PHYNIX.
   Edita o nome e permite alteração de e-mail com senha atual,
   preservando estatísticas, saída mobile e exclusão de conta.
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
/** Valida e normaliza o novo endereço; o PHP é a fonte de verdade. */
function validateEmail(value) {
  const email = String(value).trim().toLowerCase();
  if (!email || email.length > 190 || /\s/u.test(email) ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(email)) {
    return { valid: false, message: "Digite um e-mail válido de até 190 caracteres." };
  }
  return { valid: true, email };
}

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
          <p class="profile-account-hint">Consulte seus dados, corrija seu nome ou altere o e-mail de acesso.</p>
        </div>
        <button type="button" class="btn profile-edit-trigger"
          id="profile-edit-name-btn" aria-expanded="false"
          aria-controls="profile-name-form">✎ Editar perfil</button>
      </div>

      <div class="profile-field">
        <span>Nome</span>
        <strong id="profile-display-name">${escapeHtml(user.name || "")}</strong>
      </div>
      <div class="profile-field profile-email-row">
        <span>E-mail</span>
        <div class="profile-email-line">
          <strong id="profile-display-email">${escapeHtml(user.email || "")}</strong>
          <button type="button" class="btn profile-email-trigger"
            id="profile-edit-email-btn" aria-expanded="false"
            aria-controls="profile-email-form">Alterar e-mail</button>
        </div>
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
      <form class="profile-edit-form profile-email-form" id="profile-email-form" hidden novalidate>
        <label for="profile-email-input">Novo e-mail</label>
        <input class="inp profile-name-input" id="profile-email-input" type="email"
          inputmode="email" autocomplete="email" maxlength="190" required
          aria-describedby="profile-email-help profile-email-error" />
        <label for="profile-email-confirm">Confirme o novo e-mail</label>
        <input class="inp profile-name-input" id="profile-email-confirm" type="email"
          inputmode="email" autocomplete="off" maxlength="190" required />
        <label for="profile-email-password">Senha atual</label>
        <input class="inp profile-name-input" id="profile-email-password"
          type="password" autocomplete="current-password" maxlength="1024" required />
        <p id="profile-email-help" class="profile-input-help">
          A senha confirma que a conta é sua. O novo e-mail será utilizado no próximo login.
          Este projeto ainda não envia uma mensagem para verificar a posse do endereço informado.
        </p>
        <p id="profile-email-error" class="profile-input-error" role="alert" hidden></p>
        <div class="profile-edit-actions">
          <button type="button" class="btn profile-cancel-btn"
            id="profile-cancel-email-btn">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="profile-save-email-btn">
            Confirmar alteração
          </button>
        </div>
      </form>
      <p class="profile-edit-status" id="profile-email-status" role="status"
        aria-live="polite" hidden></p>
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
  const emailTrigger = panel.querySelector("#profile-edit-email-btn");
  const emailForm = panel.querySelector("#profile-email-form");
  const emailInput = panel.querySelector("#profile-email-input");
  const emailConfirm = panel.querySelector("#profile-email-confirm");
  const emailPassword = panel.querySelector("#profile-email-password");
  const emailCancel = panel.querySelector("#profile-cancel-email-btn");
  const emailSave = panel.querySelector("#profile-save-email-btn");
  const emailError = panel.querySelector("#profile-email-error");
  const emailStatus = panel.querySelector("#profile-email-status");
  const displayEmail = panel.querySelector("#profile-display-email");
  let saving = false;
  let savingEmail = false;

  function setEmailError(message = "") {
    emailError.textContent = message;
    emailError.hidden = !message;
    emailInput.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function closeEmailEditor() {
    emailForm.hidden = true;
    emailTrigger.hidden = false;
    emailTrigger.setAttribute("aria-expanded", "false");
    emailPassword.value = "";
    setEmailError();
  }

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
    if (savingEmail) return;
    closeEmailEditor();
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

  emailTrigger.addEventListener("click", () => {
    if (saving) return;
    closeEditor();
    emailStatus.hidden = true;
    emailStatus.textContent = "";
    setEmailError();
    emailInput.value = "";
    emailConfirm.value = "";
    emailPassword.value = "";
    emailForm.hidden = false;
    emailTrigger.hidden = true;
    emailTrigger.setAttribute("aria-expanded", "true");
    emailInput.focus();
  });

  emailCancel.addEventListener("click", () => {
    if (savingEmail) return;
    closeEmailEditor();
    emailTrigger.focus();
  });

  for (const element of [emailInput, emailConfirm, emailPassword]) {
    element.addEventListener("input", () => setEmailError());
  }

  emailForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (savingEmail) return;

    const validation = validateEmail(emailInput.value);
    if (!validation.valid) {
      setEmailError(validation.message);
      emailInput.focus();
      return;
    }
    if (validation.email !== emailConfirm.value.trim().toLowerCase()) {
      setEmailError("Os endereços de e-mail não coincidem.");
      emailConfirm.focus();
      return;
    }
    if (validation.email === (state.user?.email || "").toLowerCase()) {
      setEmailError("Este já é o e-mail cadastrado.");
      return;
    }
    if (!emailPassword.value) {
      setEmailError("Informe sua senha atual para confirmar.");
      emailPassword.focus();
      return;
    }

    savingEmail = true;
    emailSave.disabled = true;
    emailCancel.disabled = true;
    emailSave.textContent = "Salvando…";
    setEmailError();
    try {
      const { user: updated } = await api("/auth/update-email.php", {
        method: "PATCH",
        body: JSON.stringify({ email: validation.email, password: emailPassword.value }),
      });
      if (!updated || typeof updated.email !== "string") {
        throw new Error("O servidor não confirmou a alteração do e-mail.");
      }
      state.user = { ...(state.user || {}), ...updated };
      displayEmail.textContent = updated.email;
      closeEmailEditor();
      emailStatus.textContent = "✓ E-mail alterado. Utilize o novo endereço no próximo login.";
      emailStatus.hidden = false;
    } catch (err) {
      emailPassword.value = "";
      setEmailError(err.message || "Não foi possível alterar o e-mail.");
    } finally {
      savingEmail = false;
      emailSave.disabled = false;
      emailCancel.disabled = false;
      emailSave.textContent = "Confirmar alteração";
    }
  });

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
