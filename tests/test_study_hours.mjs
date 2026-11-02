// Testes isolados da sincronização, sem navegador ou API reais.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const path = new URL('../frontend/js/study-hours.js', import.meta.url);
const source = fs.readFileSync(path, 'utf8')
  .replace(/^import \{ api, state \} from "\.\/app\.js";\s*$/m, '')
  .replaceAll('export ', '');
const els = Object.fromEntries(['stat-year-hours','profile-year-hours','stat-hours'].map(k=>[k,{textContent:''}]));
const state = {user:{id:12},calendarYear:2026, calendarMonth:10,yearHours:0,monthHours:0,
  hoursSummaryLoaded:false,hoursSummaryFailed:false,hoursMonthYm:null};
let api = async () => {throw new Error('defina mock');};
const document = {getElementById: (id) => els[id] ?? null};
const ctx = vm.createContext({state,document,console,encodeURIComponent,Date,
  api:(...args)=>api(...args)});
vm.runInContext(source + '\n;globalThis.testMethods = {refreshStudyHours,paintStudyHours,hoursLabel,viewedMonthKey};',ctx);
const {refreshStudyHours,paintStudyHours,hoursLabel,viewedMonthKey} = ctx.testMethods;
const yr = new Date().getFullYear();
api = async path => {
  assert.match(path,new RegExp(`year=${yr}`));
  return {year:yr,ym:'2026-11',yearHours:10.5,monthHours:4};
};
assert.equal(await refreshStudyHours(),true);
assert.equal(state.yearHours,10.5);
assert.equal(state.monthHours,4);
assert.equal(els['profile-year-hours'].textContent, '10,5h');
assert.equal(els['stat-year-hours'].textContent, '10,5h');
assert.equal(els['stat-hours'].textContent, '4h');

// O mês selecionado muda, mas o total anual continua o ano atual.
state.calendarYear = 2025; state.calendarMonth=0;
api = async () => ({year:yr,ym:'2025-01',yearHours:10.5,monthHours:7.5});
await refreshStudyHours();
assert.equal(els['profile-year-hours'].textContent, '10,5h');
assert.equal(els['stat-hours'].textContent, '7,5h');

// Falha de servidor nunca vira "0h" falso.
api=async()=>{throw new Error('simulated offline');};
await assert.rejects(()=>refreshStudyHours(), /simulated offline/);
assert.equal(els['profile-year-hours'].textContent, '—');
assert.equal(els['stat-hours'].textContent,'—');

// Resposta de outro usuário não pode contaminar os dados da sessão atual.
let release;
api=()=>new Promise(resolve=>{release=resolve;});
const pending=refreshStudyHours();
state.user = {id:99};
release({year:yr,ym:'2025-01',yearHours:999,monthHours:999});
assert.equal(await pending,false);
assert.notEqual(state.yearHours,999);
console.log('OK: ano atual, mês selecionado, formatação, erro e isolamento entre sessões.');
