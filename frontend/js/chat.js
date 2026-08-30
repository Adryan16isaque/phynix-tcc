/* ═══════════════════════════════════════════════════════════
   CHAT.JS — Chat com a IA (via /api/chat.php no servidor, que
   fala com a Groq — a chave de API nunca fica exposta no
   navegador). Suporta histórico persistente de conversas
   (listar, abrir, excluir) e edição de mensagens já enviadas
   (que regenera a resposta da IA a partir do ponto editado).
   ═══════════════════════════════════════════════════════════ */

import { api } from './api.js';
import { state } from './state.js';
import { escapeHtml, showToast } from './ui.js';
import { handleUnlocked } from './achievements.js';

const WELCOME_HTML = `
  <div class="msg ai">
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      Olá! 👋 Sou o seu assistente de estudos para <strong>concursos e vestibulares</strong>. Posso te ajudar com:<br><br>
      • Explicações de matérias (Matemática, Português, História...)<br>
      • Questões e exercícios<br>
      • Técnicas de memorização<br>
      • Estratégias para provas<br>
      • Montagem de cronograma<br><br>
      Por qual matéria quer começar hoje? 🎯
    </div>
  </div>`;

export async function sendMessage() {
  const inp  = document.getElementById('user-input');
  const text = inp.value.trim();
  if (!text) return;

  inp.value = '';
  inp.style.height = '';
  document.getElementById('send-btn').disabled = true;

  const userMsgEl = appendMsg('user', text);
  const typingEl  = appendTyping();

  try {
    const data = await api('/chat.php', {
      method: 'POST',
      body: JSON.stringify({ message: text, sessionId: state.chatSessionId }),
    });

    typingEl.remove();
    state.chatSessionId = data.sessionId;
    userMsgEl.dataset.msgId = data.userMessageId;
    appendMsg('ai', data.reply, data.assistantMessageId);
    handleUnlocked(data.unlocked);
  } catch (err) {
    typingEl.remove();
    appendMsg('ai', '⚠️ ' + (err.message || 'Não foi possível conectar à IA agora. Tente novamente em instantes.'));
  } finally {
    document.getElementById('send-btn').disabled = false;
  }
}

function appendMsg(role, text, msgId = null) {
  const normRole = role === 'assistant' ? 'ai' : role;
  const wrap = document.getElementById('messages');
  const div  = document.createElement('div');
  div.className = 'msg ' + normRole;
  if (msgId) div.dataset.msgId = msgId;

  const editBtn = normRole === 'user'
    ? `<button class="msg-edit-btn" onclick="startEditMessage(this)" aria-label="Editar mensagem" title="Editar mensagem">✏️</button>`
    : '';

  div.innerHTML = `
    <div class="msg-avatar">${normRole === 'ai' ? '🤖' : '👤'}</div>
    <div class="msg-bubble">
      ${editBtn}
      <div class="msg-bubble-content">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
    </div>
  `;
  div.querySelector('.msg-bubble').dataset.raw = text;

  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

function appendTyping() {
  const wrap = document.getElementById('messages');
  const div  = document.createElement('div');
  div.className = 'msg ai';
  div.innerHTML = `
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">
      <div class="typing"><span></span><span></span><span></span></div>
    </div>
  `;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
  return div;
}

export function sendQuick(text) {
  document.getElementById('user-input').value = text;
  sendMessage();
}

export function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

// Auto-resize do textarea
document.getElementById('user-input').addEventListener('input', function () {
  this.style.height = '';
  this.style.height = Math.min(this.scrollHeight, 120) + 'px';
});


/* ── Edição de mensagens já enviadas ─────────────────────── */
export function startEditMessage(btnEl) {
  const msgEl = btnEl.closest('.msg');
  const msgId = msgEl.dataset.msgId;
  if (!msgId) return; // ainda sem confirmação do servidor, espera terminar de enviar

  const bubble   = msgEl.querySelector('.msg-bubble');
  const original = bubble.dataset.raw;

  bubble.innerHTML = `
    <div class="msg-edit-area">
      <textarea class="msg-edit-textarea">${escapeHtml(original)}</textarea>
      <div class="msg-edit-hint">Isso vai apagar as respostas depois dessa mensagem e gerar uma nova resposta.</div>
      <div class="msg-edit-actions">
        <button type="button" onclick="cancelEditMessage(this)">Cancelar</button>
        <button type="button" class="msg-edit-save" onclick="saveEditedMessage(this)">Salvar e reenviar</button>
      </div>
    </div>
  `;

  const ta = bubble.querySelector('textarea');
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
}

export function cancelEditMessage(btnEl) {
  const bubble = btnEl.closest('.msg-bubble');
  restoreBubble(bubble, bubble.dataset.raw);
}

function restoreBubble(bubble, text) {
  const msgEl  = bubble.closest('.msg');
  const isUser = msgEl.classList.contains('user');
  bubble.innerHTML = `
    ${isUser ? '<button class="msg-edit-btn" onclick="startEditMessage(this)" aria-label="Editar mensagem" title="Editar mensagem">✏️</button>' : ''}
    <div class="msg-bubble-content">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
  `;
  bubble.dataset.raw = text;
}

export async function saveEditedMessage(btnEl) {
  const bubble  = btnEl.closest('.msg-bubble');
  const msgEl   = bubble.closest('.msg');
  const msgId   = msgEl.dataset.msgId;
  const ta      = bubble.querySelector('textarea');
  const newText = ta.value.trim();
  if (!newText) return;

  btnEl.disabled = true;
  btnEl.textContent = 'Enviando…';

  try {
    const data = await api('/chat.php', {
      method: 'PUT',
      body: JSON.stringify({ sessionId: state.chatSessionId, messageId: msgId, content: newText }),
    });

    restoreBubble(bubble, newText);

    // Remove do DOM tudo que veio depois dessa mensagem
    // (respostas antigas ficaram obsoletas — o servidor já apagou do banco)
    let next = msgEl.nextElementSibling;
    while (next) {
      const toRemove = next;
      next = next.nextElementSibling;
      toRemove.remove();
    }

    appendMsg('ai', data.reply, data.assistantMessageId);
  } catch (err) {
    showToast('⚠️', 'Erro ao editar', err.message);
    btnEl.disabled = false;
    btnEl.textContent = 'Salvar e reenviar';
  }
}


/* ── Histórico de conversas ───────────────────────────────── */
export function toggleHistory() {
  document.getElementById('history-panel').classList.contains('open') ? closeHistory() : openHistory();
}

async function openHistory() {
  document.getElementById('history-panel').classList.add('open');
  document.getElementById('history-overlay').classList.add('open');
  await loadHistoryList();
}

export function closeHistory() {
  document.getElementById('history-panel').classList.remove('open');
  document.getElementById('history-overlay').classList.remove('open');
}

async function loadHistoryList() {
  const list = document.getElementById('history-list');
  list.innerHTML = '<div class="history-empty">Carregando…</div>';
  try {
    const { sessions } = await api('/chat.php?list=1');
    renderHistoryList(sessions);
  } catch (err) {
    list.innerHTML = '<div class="history-empty">Erro ao carregar histórico.</div>';
  }
}

function renderHistoryList(sessions) {
  const list = document.getElementById('history-list');

  if (!sessions.length) {
    list.innerHTML = '<div class="history-empty">Nenhuma conversa ainda.<br>Envie uma mensagem pra começar!</div>';
    return;
  }

  list.innerHTML = sessions.map(s => {
    const active = String(s.id) === String(state.chatSessionId);
    const dt = new Date((s.updated_at || s.created_at).replace(' ', 'T'));
    const date = isNaN(dt) ? '' : dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    return `
      <div class="history-item ${active ? 'active' : ''}" onclick="openSession(${s.id})">
        <div class="history-item-text">
          <div class="history-item-preview">${escapeHtml(s.preview || 'Conversa')}</div>
          <div class="history-item-date">${date}</div>
        </div>
        <button class="history-item-delete" onclick="deleteSession(event, ${s.id})" aria-label="Excluir conversa">🗑️</button>
      </div>`;
  }).join('');
}

export async function openSession(id) {
  try {
    const { messages } = await api(`/chat.php?id=${id}`);
    state.chatSessionId = id;

    const wrap = document.getElementById('messages');
    wrap.innerHTML = '';
    if (!messages.length) {
      wrap.innerHTML = WELCOME_HTML;
    } else {
      messages.forEach(m => appendMsg(m.role, m.content, m.id));
    }
    closeHistory();
  } catch (err) {
    showToast('⚠️', 'Erro', err.message);
  }
}

export async function deleteSession(evt, id) {
  evt.stopPropagation();
  if (!confirm('Excluir essa conversa? Essa ação não pode ser desfeita.')) return;

  try {
    await api(`/chat.php?id=${id}`, { method: 'DELETE' });
    if (String(state.chatSessionId) === String(id)) startNewChat();
    await loadHistoryList();
  } catch (err) {
    showToast('⚠️', 'Erro ao excluir', err.message);
  }
}

export function startNewChat() {
  state.chatSessionId = null;
  document.getElementById('messages').innerHTML = WELCOME_HTML;
  closeHistory();
}
