/* ═══════════════════════════════════════════════════════════
   UI.JS — Utilidades de interface usadas por vários módulos:
   toast de notificação, animação de confete e escape de HTML.
   ═══════════════════════════════════════════════════════════ */

export function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

let toastTimeout;

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
