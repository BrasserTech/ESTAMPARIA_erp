// src/renderer/ui-prefs.js
// Preferências de UI (exibição de telas) – renderer side
// Requer IPC no main:  prefs:read  /  prefs:write

(function () {
  const { ipcRenderer } = require('electron');

  const READ_CH = 'prefs:read';
  const WRITE_CH = 'prefs:write';

  // ---- API interna ----
  async function read(section = 'ui') {
    try {
      const prefs = await ipcRenderer.invoke(READ_CH, section);
      return prefs || {};
    } catch (e) {
      console.warn('[UIPrefs] Falha ao ler prefs:', e);
      return {};
    }
  }

  async function write(obj, section = 'ui') {
    try {
      await ipcRenderer.invoke(WRITE_CH, section, obj || {});
      return true;
    } catch (e) {
      console.error('[UIPrefs] Falha ao gravar prefs:', e);
      return false;
    }
  }

  // Aplica no menu: todo elemento com [data-menu]
  function applyToMenu(prefs) {
    try {
      const all = document.querySelectorAll('[data-menu]');
      const map = prefs || {};
      all.forEach(el => {
        const key = el.getAttribute('data-menu');
        // padrão é "mostrar" quando não há preferência
        const show = Object.prototype.hasOwnProperty.call(map, key)
          ? !!map[key]
          : true;
        el.style.display = show ? '' : 'none';
      });
    } catch (e) {
      console.warn('[UIPrefs] applyToMenu error:', e);
    }
  }

  // Le e aplica
  async function initAndApply() {
    const p = await read('ui');
    applyToMenu(p);
    return p;
  }

  // Utilitário de toast simples (mesmo estilo de outras telas)
  function toast(msg, isErr = false) {
    const t = document.createElement('div');
    t.className = 'toast' + (isErr ? ' err' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2200);
  }

  // expõe global
  window.UIPrefs = {
    read,
    write,
    applyToMenu,
    initAndApply,
    toast
  };
})();
