// src/renderer/ui-prefs.js
// Preferências de UI (exibição de telas) – renderer side
// Usa IPC quando disponível; caso contrário, fallback para localStorage.

(function () {
  let ipcRenderer = null;
  try { ipcRenderer = require('electron').ipcRenderer; } catch (_) {}

  const READ_CH  = 'prefs:read';
  const WRITE_CH = 'prefs:write';
  const LS_KEY   = 'ui_prefs_v1'; // fallback localStorage

  // ---- CSS util: força ocultação com !important ----
  function ensureHideCSS() {
    if (document.getElementById('__uiprefs_hide_css__')) return;
    const style = document.createElement('style');
    style.id = '__uiprefs_hide_css__';
    style.textContent = `
      .ui-hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }
  ensureHideCSS();

  // ---------- persistência ----------
  async function read(section = 'ui') {
    // 1) IPC
    if (ipcRenderer) {
      try {
        const prefs = await ipcRenderer.invoke(READ_CH, section);
        if (prefs && typeof prefs === 'object') return prefs;
      } catch (e) { console.warn('[UIPrefs] Falha ao ler via IPC:', e); }
    }
    // 2) localStorage
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      const val = data && typeof data === 'object' ? data[section] : null;
      return (val && typeof val === 'object') ? val : {};
    } catch (e) {
      console.warn('[UIPrefs] Falha ao ler via localStorage:', e);
      return {};
    }
  }

  async function write(obj, section = 'ui') {
    let ok = false;

    // 1) IPC
    if (ipcRenderer) {
      try { await ipcRenderer.invoke(WRITE_CH, section, obj || {}); ok = true; }
      catch (e) { console.error('[UIPrefs] Falha ao gravar via IPC:', e); }
    }

    // 2) espelha em localStorage (garante persistência mínima)
    try {
      const raw  = localStorage.getItem(LS_KEY);
      const data = raw ? (JSON.parse(raw) || {}) : {};
      data[section] = obj || {};
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      ok = ok || true;
    } catch (e) { console.error('[UIPrefs] Falha ao gravar via localStorage:', e); }

    return ok;
  }

  // ---------- aplicação no menu ----------
  function applyToMenu(prefs) {
    try {
      const all = document.querySelectorAll('[data-menu]');
      const map = prefs || {};

      // Aplica visibilidade (classe com !important)
      all.forEach(el => {
        const key  = el.getAttribute('data-menu');
        const show = Object.prototype.hasOwnProperty.call(map, key) ? !!map[key] : true;
        el.classList.toggle('ui-hidden', !show);
      });

      // Esconde/mostra grupos quando todos os filhos estão ocultos
      const triggers = document.querySelectorAll('.nav-item[data-submenu]');
      triggers.forEach(trigger => {
        const id  = trigger.getAttribute('data-submenu');
        const box = document.getElementById(id);
        if (!box) return;

        const children = Array.from(box.querySelectorAll('.submenu-link'));
        const anyVisible = children.some(a => {
          // usa estilo calculado para considerar .ui-hidden
          const cs = window.getComputedStyle(a);
          return cs && cs.display !== 'none';
        });

        trigger.classList.toggle('ui-hidden', !anyVisible);
        box.classList.toggle('ui-hidden', !anyVisible);
      });
    } catch (e) {
      console.warn('[UIPrefs] applyToMenu error:', e);
    }
  }

  async function initAndApply(section = 'ui') {
    const p = await read(section);
    applyToMenu(p);
    return p;
  }

  // ---------- utilitário de toast ----------
  function toast(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // expõe global
  window.UIPrefs = { read, write, applyToMenu, initAndApply, toast };

  // primeira aplicação
  initAndApply().catch(() => {});
})();
