/* ═══════════════════════════════════════════════════════════
   PLANNER.JS — Matérias, metas de horas e conclusões diárias.
   ═══════════════════════════════════════════════════════════ */

import { api } from "./api.js";
import { state } from "./state.js";
import { escapeHtml, showToast } from "./ui.js";
import { handleUnlocked } from "./achievements.js";
import { renderCalendar, fmtDate } from "./calendar.js";

export async function loadSubjects() {
  const { subjects } = await api("/subjects.php");
  state.subjects = subjects;
}

export async function addSubject() {
  const name = document.getElementById("inp-subject").value.trim();
  const hours = parseFloat(document.getElementById("inp-hours").value);
  const days = document.getElementById("inp-days").value.trim() || "5";
  const color = document.getElementById("inp-color").value;

  if (!name || !hours) {
    showToast(
      "⚠️",
      "Campos obrigatórios",
      "Preencha a matéria e a meta de horas.",
    );
    return;
  }

  try {
    const data = await api("/subjects.php", {
      method: "POST",
      body: JSON.stringify({ name, targetHours: hours, days, color }),
    });

    document.getElementById("inp-subject").value = "";
    document.getElementById("inp-hours").value = "";
    document.getElementById("inp-days").value = "";

    // Matéria recém-criada sempre começa zerada — monta o objeto local
    // com os dados que a própria resposta e o formulário já dão, sem
    // precisar recarregar a lista inteira de /subjects.php.
    state.subjects.push({
      id: data.id,
      name,
      targetHours: hours,
      days,
      color,
      monthHours: 0,
      doneHours: 0,
      progressPct: 0,
      doneToday: false,
      totalFires: 0,
    });
    renderPlanner();
    handleUnlocked(data.unlocked);
  } catch (err) {
    showToast("⚠️", "Erro ao adicionar", err.message);
  }
}

export async function removeSubject(id) {
  try {
    await api(`/subjects.php?id=${id}`, { method: "DELETE" });
    state.subjects = state.subjects.filter((s) => s.id !== id);
    renderPlanner();
  } catch (err) {
    showToast("⚠️", "Erro ao remover", err.message);
  }
}

export async function updateDone(id, val) {
  const monthHours = Math.max(0, parseFloat(val) || 0);
  try {
    const data = await api("/subjects.php", {
      method: "PUT",
      body: JSON.stringify({ id, monthHours }),
    });
    const subject = state.subjects.find((s) => s.id === id);
    if (subject) {
      subject.monthHours = data.monthHours;
      subject.doneHours = data.totalHours;
      subject.progressPct = data.progressPct;
    }
    renderPlanner();
    handleUnlocked(data.unlocked);
  } catch (err) {
    showToast("⚠️", "Erro ao atualizar horas", err.message);
    renderPlanner();
  }
}

export async function completeSubject(id) {
  try {
    const data = await api("/complete.php", {
      method: "POST",
      body: JSON.stringify({ subjectId: id }),
    });

    const subject = state.subjects.find((s) => s.id === id);
    if (subject) {
      subject.doneToday = !data.removed;
      subject.totalFires = Math.max(
        0,
        subject.totalFires + (data.removed ? -1 : 1),
      );
    }

    // 'studiedToday' e 'streak' já vêm prontos na resposta do /complete.php
    // — atualiza o calendário/streak com eles em vez de chamar loadCalendar().
    const today = fmtDate(new Date());
    if (data.studiedToday) {
      if (!state.studiedDays.includes(today)) state.studiedDays.push(today);
    } else {
      state.studiedDays = state.studiedDays.filter((d) => d !== today);
    }
    state.streak = data.streak;

    renderPlanner();
    renderCalendar();
    document.getElementById("sidebar-streak").textContent = state.streak;
    showToast(
      data.removed ? "↩️" : "🔥",
      data.removed ? "Desmarcado" : "Concluído!",
      data.removed
        ? `${data.subjectName} desmarcada de hoje.`
        : `${data.subjectName} concluída hoje!`,
    );
    handleUnlocked(data.unlocked);
  } catch (err) {
    showToast("⚠️", "Erro", err.message);
  }
}

// Segunda camada de defesa: só aceita cor no formato #rrggbb;
// qualquer outra coisa cai no azul padrão, evitando quebrar o
// atributo style="" caso algum dado inesperado chegue do servidor.
function safeColor(c) {
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#4f8aff";
}

export function renderPlanner() {
  const tbody = document.getElementById("planner-body");

  if (!state.subjects.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;color:var(--text-muted);padding:30px">
          Adicione sua primeira matéria acima 👆
        </td>
      </tr>`;
    return;
  }

  const todayIds = new Set(
    state.subjects.filter((s) => s.doneToday).map((s) => s.id),
  );

  tbody.innerHTML = state.subjects
    .map((s) => {
      const pct = s.progressPct;
      const badge =
        pct >= 100
          ? '<span class="badge badge-green">✅ Meta atingida</span>'
          : pct >= 50
            ? '<span class="badge badge-yellow">⏳ Em andamento</span>'
            : '<span class="badge badge-blue">🎯 Iniciando</span>';

      return `
      <tr>
        <td>
          <span style="display:inline-flex;align-items:center;gap:8px">
            <span style="width:10px;height:10px;border-radius:50%;background:${safeColor(s.color)};
                         flex-shrink:0;display:inline-block"></span>
            <strong>${escapeHtml(s.name)}</strong>
          </span>
        </td>
        <td>${s.targetHours}h</td>
        <td>
          <input type="number" class="prog-inp"
            value="${s.monthHours}" min="0" max="${s.targetHours * 4}"
            onchange="updateDone(${s.id}, this.value)"
            aria-label="Horas feitas de ${escapeHtml(s.name)} este mês">h
        </td>
        <td style="min-width:140px">
          ${badge}
          <div class="prog-bar">
            <div class="prog-fill" style="width:${pct}%;background:${safeColor(s.color)}"></div>
          </div>
          <small style="color:var(--text-muted);font-size:11px">${pct}% (${s.doneHours}h no total)</small>
        </td>
        <td>${escapeHtml(String(s.days))}x/semana</td>
        <td style="white-space:nowrap">
          <button class="btn btn-fire ${todayIds.has(s.id) ? "done" : ""}" onclick="completeSubject(${s.id})"
            aria-label="Marcar ${escapeHtml(s.name)} como concluída hoje">
            ${todayIds.has(s.id) ? "🔥 Feito hoje" : "🔥 Concluir hoje"}
          </button>
          <button class="btn btn-danger" onclick="removeSubject(${s.id})"
            aria-label="Remover ${escapeHtml(s.name)}">🗑️</button>
        </td>
      </tr>`;
    })
    .join("");
}
