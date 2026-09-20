/* ═══════════════════════════════════════════════════════════
   AUTH.JS — Login, registro, logout e o carregamento geral
   dos dados do usuário logo após autenticar.
   ═══════════════════════════════════════════════════════════ */

import { api } from './api.js';
import { state } from './state.js';
import { loadSubjects, renderPlanner } from './planner.js';
import { loadCalendar, renderCalendar } from './calendar.js';
import { loadAchievements, renderAchievements } from './achievements.js';

export function switchAuthTab(tab) {
  document.getElementById('tab-login-btn').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register-btn').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('active', tab === 'login');
  document.getElementById('register-form').classList.toggle('active', tab === 'register');
  hideAuthError();
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.classList.add('show');
}

function hideAuthError() {
  document.getElementById('auth-error').classList.remove('show');
}

export async function handleLogin(e) {
  e.preventDefault();
  hideAuthError();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const user = await api('/auth/login.php', {
      method: 'POST',
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
  const name     = document.getElementById('register-name').value.trim();
  const email    = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;

  try {
    const user = await api('/auth/register.php', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await onLoginSuccess(user);
  } catch (err) {
    showAuthError(err.message);
  }
  return false;
}

export async function handleLogout() {
  try { await api('/auth/logout.php', { method: 'POST' }); } catch (e) { /* ignora */ }
  state.user = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
}

async function onLoginSuccess(user) {
  state.user = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = '';
  document.getElementById('sidebar-user-name').textContent = user.name || user.email;
  await loadEverything();
}

/** Verifica se já existe sessão ativa (cookie) ao carregar a página. */
export async function checkSession() {
  try {
    const { user } = await api('/auth/me.php');
    if (user) {
      await onLoginSuccess(user);
    } else {
      document.getElementById('auth-screen').style.display = 'flex';
    }
  } catch (err) {
    // back-end fora do ar, banco não configurado, etc.
    document.getElementById('auth-screen').style.display = 'flex';
    showAuthError('Não foi possível falar com o servidor. Verifique se o back-end (XAMPP/Laragon) está rodando.');
  }
}

async function loadEverything() {
  await Promise.all([
    loadSubjects(),
    loadCalendar(),
    loadAchievements(),
  ]);
  renderPlanner();
  renderCalendar();
  renderAchievements();
  document.getElementById('sidebar-streak').textContent = state.streak;
}
