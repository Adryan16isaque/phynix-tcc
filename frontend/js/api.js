/* ═══════════════════════════════════════════════════════════
   API.JS — Wrapper de fetch() para falar com o backend PHP.
   Caminho relativo: frontend/index.html → ../backend/api
   (funciona em qualquer domínio/porta, contanto que front e
   back estejam na mesma pasta "phynix", como no XAMPP/Laragon)
   ═══════════════════════════════════════════════════════════ */

export const API_BASE = '../backend/api';

export async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  let data = {};
  try { data = await res.json(); } catch (e) { /* corpo vazio, ok */ }

  if (!res.ok) {
    throw new Error(data.error || `Erro na requisição (${res.status})`);
  }
  return data;
}
