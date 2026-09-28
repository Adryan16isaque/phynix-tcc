/* ═══════════════════════════════════════════════════════════
   APP.JS — Núcleo do front-end.

   Este arquivo junta o que antes estava espalhado em 5 arquivos
   menores (state.js, api.js, ui.js, tabs.js, main.js). A ideia é
   simples: tudo que é "estrutura geral do site" (não pertence a
   uma aba específica) mora aqui, dividido em 4 seções:

     1. ESTADO GLOBAL      → os dados que o app guarda em memória
     2. COMUNICAÇÃO COM O BACKEND → o "telefone" que fala com o PHP
     3. UTILITÁRIOS DE INTERFACE  → funções pequenas usadas em várias abas
     4. NAVEGAÇÃO ENTRE ABAS      → troca de aba + liga os onclick="" do HTML

   Cada ABA (chat, planner, calendário, conquistas, histórico,
   perfil) continua no seu próprio arquivo — auth.js, chat.js,
   planner.js, calendar.js, achievements.js, profile.js — porque
   cada um é uma funcionalidade fechada, fácil de explicar sozinha.
   Esses arquivos importam o que precisam DESTE arquivo (a linha
   `import { api, state, ... } from "./app.js"` no topo deles).
   ═══════════════════════════════════════════════════════════ */

/* ───────────────────────────────────────────────────────────
   1. ESTADO GLOBAL
   Um objeto só, em memória, que guarda tudo que veio do servidor
   (matérias, conquistas, etc). Como é `export const`, todo módulo
   que importar `state` está enxergando o MESMO objeto — mudar
   `state.subjects` num arquivo aparece nos outros também, sem
   precisar passar essa informação de função em função.
   ─────────────────────────────────────────────────────────── */
export const state = {
  user: null,
  subjects: [],
  studyLog: {}, // { 'YYYY-MM-DD': { hours, completions } }
  studiedDays: [], // ['YYYY-MM-DD', ...]
  firesByDay: {}, // { 'YYYY-MM-DD': count }
  achievements: [], // lista completa vinda do servidor, com .unlocked
  achievementsError: null, // mensagem de erro, se a última tentativa de carregar falhou
  streak: 0,
  yearHours: 0,
  chatSessionId: null,
  historySessions: [],
  historyOffset: 0,
  historyHasMore: false,
  calendarMonth: new Date().getMonth(),
  calendarYear: new Date().getFullYear(),
};

/** Zera o state pro estado "deslogado" — chamado no logout e antes
 *  de carregar os dados de uma nova sessão, pra garantir que nada
 *  da conta anterior fique "grudado" em memória (foi exatamente
 *  esse esquecimento que causava o chat de uma conta aparecer em
 *  outra, quando o logout só limpava `state.user`). */
export function resetState() {
  state.user = null;
  state.subjects = [];
  state.studyLog = {};
  state.studiedDays = [];
  state.firesByDay = {};
  state.achievements = [];
  state.achievementsError = null;
  state.streak = 0;
  state.yearHours = 0;
  state.chatSessionId = null;
  state.historySessions = [];
  state.historyOffset = 0;
  state.historyHasMore = false;
}

/* ───────────────────────────────────────────────────────────
   2. COMUNICAÇÃO COM O BACKEND
   Todo o front fala com o PHP só por essa função — em vez de
   cada aba chamar fetch() do seu próprio jeito, todas usam este
   "telefone único", que já cuida de 3 coisas repetitivas:
     - mandar o cookie de sessão (credentials: "include")
     - montar o corpo como JSON
     - transformar uma resposta de erro do PHP numa exceção JS
       (pra poder usar try/catch normalmente em quem chama)
   ─────────────────────────────────────────────────────────── */

// Caminho relativo: frontend/index.html → ../backend/api
// (funciona em qualquer domínio/porta, contanto que front e back
// estejam na mesma pasta, como no XAMPP/Laragon ou no Dockerfile
// de produção — ver README.md)
export const API_BASE = "../backend/api";

export async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    /* corpo vazio, ok (ex: DELETE sem retorno) */
  }

  if (!res.ok) {
    throw new Error(data.error || `Erro na requisição (${res.status})`);
  }
  return data;
}

/* ───────────────────────────────────────────────────────────
   3. UTILITÁRIOS DE INTERFACE
   Funções pequenas, sem relação com nenhuma aba específica, que
   várias abas precisam. Ficam aqui pra não duplicar código.
   ─────────────────────────────────────────────────────────── */

/** Transforma texto do usuário em HTML seguro pra exibir na tela.
 *  Sem isso, alguém poderia digitar algo como <script>...</script>
 *  no nome de uma matéria ou numa mensagem do chat, e esse código
 *  rodaria no navegador de quem visse aquele dado (ataque XSS). O
 *  truque: cria uma <div> escondida, coloca o texto nela via
 *  `.textContent` (que NUNCA interpreta HTML) e lê de volta via
 *  `.innerHTML` — o navegador já devolve os símbolos escapados
 *  (< vira &lt;, etc). */
export function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

let toastTimeout;

/** Mostra um aviso temporário no canto da tela (ex: "Erro ao salvar"). */
export function showToast(icon, title, sub) {
  clearTimeout(toastTimeout);
  document.getElementById("toast-icon").textContent = icon;
  document.getElementById("toast-title").textContent = title;
  document.getElementById("toast-sub").textContent = sub;
  document.getElementById("toast").classList.add("show");
  toastTimeout = setTimeout(
    () => document.getElementById("toast").classList.remove("show"),
    4000,
  );
}

/** Chuvinha de confete ao desbloquear uma conquista — puramente
 *  visual, cria 50 quadradinhos/bolinhas coloridas que caem e
 *  se removem sozinhas depois de alguns segundos. */
export function fireConfetti() {
  const COLORS = [
    "#4f8aff",
    "#a78bfa",
    "#34d399",
    "#f59e0b",
    "#f87171",
    "#60a5fa",
    "#fbbf24",
  ];

  for (let i = 0; i < 50; i++) {
    const el = document.createElement("div");
    el.className = "confetti-piece";
    el.style.cssText = `
      left:${Math.random() * 100}vw;
      background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
      width:${6 + Math.random() * 8}px;
      height:${6 + Math.random() * 8}px;
      animation-duration:${1.5 + Math.random() * 1.5}s;
      animation-delay:${Math.random() * 0.6}s;
      border-radius:${Math.random() > 0.5 ? "50%" : "2px"};
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

/* ───────────────────────────────────────────────────────────
   4. NAVEGAÇÃO ENTRE ABAS
   Cada botão de aba (sidebar e barra de cima) já tem
   onclick="switchTab('nome-da-aba')" no HTML — em vez de decidir
   qual botão marcar como ativo contando POSIÇÃO na lista (o que
   quebra se um botão faltar, estiver fora de ordem, ou duplicado),
   a busca abaixo lê esse mesmo "nome-da-aba" direto do atributo
   onclick. Assim funciona não importa a ordem/quantidade de
   botões no HTML — só precisa existir um elemento
   id="<aba>-panel" com class="panel" pra cada aba.
   ─────────────────────────────────────────────────────────── */
export function switchTab(tab) {
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".tab, .nav-btn")
    .forEach((b) => b.classList.remove("active"));

  const panel = document.getElementById(tab + "-panel");
  if (!panel) {
    console.error(`switchTab: não existe elemento #${tab}-panel no HTML.`);
    return;
  }
  panel.classList.add("active");

  document
    .querySelectorAll(`.tab[onclick*="switchTab('${tab}')"], .nav-btn[onclick*="switchTab('${tab}')"]`)
    .forEach((btn) => btn.classList.add("active"));

  // Cada aba recarrega/redesenha seu próprio conteúdo ao ser aberta
  // (cada uma dessas funções vive no arquivo daquela funcionalidade).
  if (tab === "planner") renderPlanner();
  if (tab === "calendar") renderCalendar();
  if (tab === "achievements") renderAchievements();
  if (tab === "history") loadHistoryList();
  if (tab === "profile") renderProfile();
}

/* ───────────────────────────────────────────────────────────
   INICIALIZAÇÃO DO APP
   Daqui pra baixo: importa de cada aba só o que o HTML precisa
   chamar diretamente (os atributos onclick="..." espalhados pelo
   index.html) e a função de cada aba que switchTab() usa acima.

   Por que os onclick="" ficam no HTML em vez de addEventListener
   no JS? É a forma mais direta de ler "esse botão faz aquilo" só
   olhando o HTML — só que, como cada uma dessas funções vive
   dentro de um módulo ES (import/export), ela não fica disponível
   pro HTML sozinha. O Object.assign(window, {...}) no final deste
   arquivo resolve isso: "pendura" cada função no objeto global
   `window`, que é onde o navegador procura quando o HTML chama
   onclick="nomeDaFuncao()".
   ─────────────────────────────────────────────────────────── */
import {
  checkSession,
  switchAuthTab,
  handleLogin,
  handleRegister,
  handleLogout,
} from "./auth.js";
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
  loadHistoryList,
} from "./chat.js";
import {
  addSubject,
  removeSubject,
  updateDone,
  completeSubject,
  renderPlanner,
} from "./planner.js";
import { markToday, changeMonth, renderCalendar } from "./calendar.js";
import { renderAchievements } from "./achievements.js";
import { saveGoal, confirmDeleteAccount, renderProfile } from "./profile.js";

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
  // Perfil
  saveGoal,
  confirmDeleteAccount,
});

// Última linha: verifica se já existe uma sessão de login ativa
// (cookie do PHP) assim que a página carrega. Fica por último de
// propósito — só roda depois que todo o resto deste arquivo (e de
// todo o grafo de módulos importados) já foi processado.
checkSession();
