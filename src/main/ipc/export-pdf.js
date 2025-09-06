// src/main/ipc/export-pdf.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function sanitizeFilename(name) {
  return String(name || 'relatorio')
    .replace(/[^\w\-]+/g, '_')
    .substring(0, 60);
}

ipcMain.handle('report:pdf', async (_e, { html, title = 'Relatório' } = {}) => {
  if (!html || typeof html !== 'string') {
    throw new Error('HTML do relatório não recebido.');
  }

  const win = new BrowserWindow({
    show: false,
    width: 1024,
    height: 768,
    webPreferences: { offscreen: true }
  });

  try {
    const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
    await win.loadURL(dataUrl);

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      landscape: false,
      marginsType: 0,     // Default (custom via CSS)
      pageSize: 'A4'
    });

    const filename = `${sanitizeFilename(title)}-${Date.now()}.pdf`;
    const outPath = path.join(app.getPath('downloads'), filename);
    fs.writeFileSync(outPath, pdf);

    return { path: outPath, filename };
  } finally {
    if (!win.isDestroyed()) win.destroy();
  }
});
