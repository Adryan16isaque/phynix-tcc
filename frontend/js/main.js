/* ═══════════════════════════════════════════════════════════
   MAIN.JS — Ponto de entrada do app.
   Como o HTML usa atributos onclick="..." (mais simples de ler
   e manter do que addEventListener espalhado), e módulos ES não
   expõem funções no escopo global automaticamente, este arquivo
   pendura no `window` só as funções que o index.html realmente
   chama inline. Toda a lógica de fato mora nos outros módulos.
   ═══════════════════════════════════════════════════════════ */

import {
  checkSession,
  switchAuthTab,
  handleLogin,
  handleRegister,
  handleLogout,
} from "./auth.js";
import { switchTab } from "./tabs.js";
import {
  sendMessage,
  sendQuick,
  handleKey,
  startNewChat,
  openSession,
  deleteSession,
  loadMoreHistory,
  startEditMessage,
  cancelEditMessage,
  saveEditedMessage,
} from "./chat.js";
import {
  addSubject,
  removeSubject,
  updateDone,
  completeSubject,
} from "./planner.js";
import { markToday, changeMonth } from "./calendar.js";

Object.assign(window, {
  // Autenticação
  switchAuthTab,
  handleLogin,
  handleRegister,
  handleLogout,
  // Navegação por abas
  switchTab,
  // Chat
  sendMessage,
  sendQuick,
  handleKey,
  startNewChat,
  openSession,
  deleteSession,
  loadMoreHistory,
  startEditMessage,
  cancelEditMessage,
  saveEditedMessage,
  // Planner
  addSubject,
  removeSubject,
  updateDone,
  completeSubject,
  // Calendário
  markToday,
  changeMonth,
});

checkSession();
