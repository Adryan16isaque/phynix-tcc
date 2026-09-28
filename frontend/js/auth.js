/* ═══════════════════════════════════════════════════════════
   AUTH.JS — Login, registro, logout e o carregamento geral
   dos dados do usuário logo após autenticar.
   ═══════════════════════════════════════════════════════════ */

import { api, state, resetState, switchTab } from "./app.js";
import { startNewChat } from "./chat.js";
import { loadSubjects, renderPlanner } from "./planner.js";
import { loadCalendar, renderCalendar } from "./calendar.js";
import { loadAchievements, renderAchievements } from "./achievements.js";

export function switchAuthTab(tab) {
  document
    .getElementById("tab-login-btn")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("tab-register-btn")
    .classList.toggle("active", tab === "register");
  document
    .getElementById("login-form")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("register-form")
    .classList.toggle("active", tab === "register");
  hideAuthError();
}

function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  el.textContent = msg;
  el.classList.add("show");
}

function hideAuthError() {
  document.getElementById("auth-error").classList.remove("show");
}

export async function handleLogin(e) {
  e.preventDefault();
  hideAuthError();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const user = await api("/auth/login.php", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await onLoginSuccess(user);
  } catch (err) {
    showAuthError(err.message);
  }
  return false;
}

export async function handleRegister(e) {
  e.preventDefault();
  hideAuthError();
  const name = document.getElementById("register-name").value.trim();
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    const user = await api("/auth/register.php", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
    await onLoginSuccess(user);
  } catch (err) {
    showAuthError(err.message);
  }
  return false;
}

/** Esvazia o HTML de TODOS os painéis que mostram dados da conta.
 *  resetState() só limpa a memória (JS); o que já foi desenhado na
 *  tela (innerHTML) continua lá, e alguns painéis (Perfil, Histórico)
 *  só são redesenhados quando a aba é aberta — então, sem esta
 *  limpeza, a conta seguinte via os dados da anterior. Ao criar um
 *  painel novo que dependa do usuário, inclua o id dele nesta lista. */
function clearUserUI() {
  [
    "profile-panel",
    "history-list",
    "planner-body",
    "cal-grid",
    "ach-grid",
    "sidebar-user-name",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = "";
  });
  document.getElementById("sidebar-streak").textContent = "0";
}

/** Sai da conta: avisa o servidor (destrói a sessão PHP) e limpa
 *  TUDO que ficou em memória no navegador — o state inteiro e a
 *  janela do chat. É essa limpeza que garante que, ao logar com
 *  outra conta na mesma aba (sem dar F5), nada da conta anterior
 *  continua aparecendo na tela. */
export async function handleLogout() {
  try {
    await api("/auth/logout.php", { method: "POST" });
  } catch (e) {
    /* ignora — mesmo se a chamada falhar, ainda assim limpa o front */
  }
  resetState();
  startNewChat();
  clearUserUI();
  switchTab("chat"); // a próxima conta nunca abre numa aba com dados da anterior
  document.getElementById("app").style.display = "none";
  document.getElementById("auth-screen").style.display = "flex";
  document.getElementById("login-email").value = "";
  document.getElementById("login-password").value = "";
}

async function onLoginSuccess(user) {
  resetState();
  state.user = user; // resetState() zera state.user — repõe depois
  clearUserUI();
  switchTab("chat"); // sempre começa no chat, nunca numa aba de outra conta
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("app").style.display = "";
  document.getElementById("sidebar-user-name").textContent =
    user.name || user.email;
  await loadEverything();
}

/** Verifica se já existe sessão ativa (cookie) ao carregar a página. */
export async function checkSession() {
  try {
    const { user } = await api("/auth/me.php");
    if (user) {
      await onLoginSuccess(user);
    } else {
      document.getElementById("auth-screen").style.display = "flex";
    }
  } catch (err) {
    // back-end fora do ar, banco não configurado, etc.
    document.getElementById("auth-screen").style.display = "flex";
    showAuthError(
      "Não foi possível falar com o servidor. Verifique se o back-end (XAMPP/Laragon) está rodando.",
    );
  }
}

/** Carrega em paralelo os 3 blocos de dados da conta. Usa
 *  Promise.allSettled (não Promise.all) de propósito: se UMA
 *  chamada falhar (ex: erro de rede só no /achievements.php), as
 *  outras duas ainda terminam e suas abas são desenhadas — com
 *  Promise.all, uma falha sozinha travaria as três abas com a
 *  tela de "Carregando..." pra sempre, sem mostrar nada de errado. */
async function loadEverything() {
  const [subjectsR, calendarR, achievementsR] = await Promise.allSettled([
    loadSubjects(),
    loadCalendar(),
    loadAchievements(),
  ]);

  renderPlanner();
  renderCalendar();
  renderAchievements();
  document.getElementById("sidebar-streak").textContent = state.streak;

  [subjectsR, calendarR, achievementsR].forEach((r) => {
    if (r.status === "rejected")
      console.error("Falha ao carregar dados:", r.reason);
  });
}
