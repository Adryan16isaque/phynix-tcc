/* ═══════════════════════════════════════════════════════════
   STATE.JS — Estado global (cache do que vem do servidor).
   Um único objeto, importado por referência em todos os
   módulos que precisam ler ou atualizar o estado da UI.
   ═══════════════════════════════════════════════════════════ */

export const state = {
  user:           null,
  subjects:       [],
  studyLog:       {},   // { 'YYYY-MM-DD': { hours, completions } }
  studiedDays:    [],   // ['YYYY-MM-DD', ...]
  firesByDay:     {},   // { 'YYYY-MM-DD': count }
  achievements:   [],   // lista completa vinda do servidor, com .unlocked
  dailyGoalHours: 4,
  streak:         0,
  chatSessionId:  null,
  calendarMonth:  new Date().getMonth(),
  calendarYear:   new Date().getFullYear(),
};
