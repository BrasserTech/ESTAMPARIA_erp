// src/renderer/views/configuracoes.js
window.renderConfiguracoes = function () {
  // Catálogo das telas (chaves devem bater com data-menu do index.html/sidebar)
  const MENU_DEFINITION = [
    {
      group: 'Cadastrar (principais)',
      bold: true,
      items: [
        { key: 'cad:produtos',  label: 'Produtos' },
        { key: 'cad:clientes',  label: 'Clientes' },
        { key: 'cad:servicos',  label: 'Serviços' },
      ]
    },
    {
      group: 'Cadastrar • Entradas/Saídas (subitens)',
      bold: false,
      items: [
        { key: 'cad:ent:prod',  label: 'Entrada (Produtos)' },
        { key: 'cad:ent:serv',  label: 'Entrada (Serviços)' },
        { key: 'cad:sai:prod',  label: 'Saída (Produtos)' },
        { key: 'cad:sai:serv',  label: 'Saída (Serviços)' },
      ]
    },
    {
      group: 'Consultar (principais)',
      bold: true,
      items: [
        { key: 'con:produtos',  label: 'Produtos' },
        { key: 'con:clientes',  label: 'Clientes' },
        { key: 'con:servicos',  label: 'Serviços' },
        { key: 'con:entradas',  label: 'Entradas' },
        { key: 'con:saidas',    label: 'Saídas' },
      ]
    },
    {
      group: 'Relatórios (principais)',
      bold: true,
      items: [
        { key: 'rel:faturamento',      label: 'Faturamento' },
        { key: 'rel:fat-por-cliente',  label: 'Faturamento por Cliente' },
        { key: 'rel:historico',        label: 'Histórico Comercial' },
      ]
    },
    {
      group: 'Outros',
      bold: true,
      items: [
        { key: 'dash',   label: 'Dashboard' },
        { key: 'cfg',    label: 'Configurações' },
        { key: 'perfil', label: 'Perfil' }
      ]
    }
  ];

  const html = `
  <div class="grid" style="display:grid;gap:14px;">
    <!-- Banco de Dados -->
    <div class="card">
      <h3>Banco de Dados</h3>
      <div class="actions" style="gap:8px;margin:8px 0 6px">
        <button class="button" id="btn-ping">Testar Conexão</button>
        <button class="button outline" id="btn-init">Criar/Atualizar Tabelas</button>
      </div>
      <div class="form" style="grid-template-columns:1fr 1fr">
        <div class="full">
          <label class="label">Conexão Ativa</label>
          <pre id="db-info" style="background:#f6f8fb;padding:10px;border-radius:8px;min-height:44px;max-height:160px;overflow:auto"></pre>
        </div>
        <div class="full">
          <label class="label">Saída</label>
          <pre id="db-out" style="background:#f6f8fb;padding:10px;border-radius:8px;min-height:44px;max-height:160px;overflow:auto"></pre>
        </div>
      </div>
      <p style="margin-top:8px;color:#667085;font-size:12px">
        <strong>“Criar/Atualizar Tabelas”</strong> executa <code>src/database/schema.sql</code> de forma idempotente,
        ajustando o esquema (clientes, fornecedores, produtos, serviços, entradas/saídas etc.) sem perder dados existentes.
      </p>
    </div>

    <!-- Exibição de telas -->
    <div class="card">
      <h3>Exibição de telas</h3>
      <p style="color:#667085;margin:6px 0 12px">
        Marque/desmarque as telas que deseja exibir no menu lateral. Itens de grupo aparecem em <strong>negrito</strong>
        e subitens em estilo normal.
      </p>

      <div id="prefs-groups"></div>

      <div class="form-actions" style="justify-content:space-between;margin-top:12px">
        <div style="display:flex;gap:8px">
          <button type="button" class="button outline" id="btn-all">Marcar tudo</button>
          <button type="button" class="button outline" id="btn-none">Desmarcar tudo</button>
          <button type="button" class="button outline" id="btn-reset">Restaurar padrão</button>
        </div>
        <button type="button" class="button" id="btn-save-prefs">Salvar preferências</button>
      </div>
    </div>
  </div>
  `;

  return {
    title: 'Configurações',
    html,
    afterRender() {
      const { ipcRenderer } = require('electron');

      // ---------- helpers ----------
      function $(id) { return document.getElementById(id); }
      function toast(msg, err = false) {
        if (window.UIPrefs?.toast) return window.UIPrefs.toast(msg, err);
        const t = document.createElement('div');
        t.className = 'toast' + (err ? ' err' : '');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2200);
      }

      // Renderiza os grupos/checkboxes
      function renderGroups(prefs) {
        const wrap = $('prefs-groups');
        const map = prefs || {};

        wrap.innerHTML = MENU_DEFINITION.map(group => {
          const items = group.items.map(it => {
            const checked = Object.prototype.hasOwnProperty.call(map, it.key)
              ? !!map[it.key] : true; // padrão: visível
            return `
              <label style="display:flex;align-items:center;gap:10px;margin:6px 0;">
                <input type="checkbox" class="menu-box" data-key="${it.key}" ${checked ? 'checked' : ''}/>
                <span style="font-weight:${group.bold ? 700 : 400}">${it.label}</span>
                <small style="color:#94a3b8;margin-left:6px">(${it.key})</small>
              </label>
            `;
          }).join('');

          return `
            <div class="card" style="padding:12px;margin-bottom:10px;border:1px dashed #e5e7eb;">
              <div style="font-weight:700;margin-bottom:6px">${group.group}</div>
              <div>${items}</div>
            </div>
          `;
        }).join('');
      }

      // Lê todos os checkboxes => objeto de prefs
      function collectPrefs() {
        const boxes = document.querySelectorAll('.menu-box');
        const out = {};
        boxes.forEach(b => { out[b.getAttribute('data-key')] = b.checked; });
        return out;
      }

      // Aplica na UI imediatamente
      function applyNow(prefs) {
        if (window.UIPrefs) window.UIPrefs.applyToMenu(prefs);
      }

      // ---------- DB (compacto) ----------
      async function loadInfo() {
        try {
          const info = await ipcRenderer.invoke('db:info');
          $('db-info').textContent = JSON.stringify(info || {}, null, 2);
        } catch (e) {
          $('db-info').textContent = 'Não foi possível obter informações: ' + e.message;
        }
      }

      $('btn-ping').addEventListener('click', async () => {
        $('db-out').textContent = 'Testando...';
        try {
          const r = await ipcRenderer.invoke('db:ping');
          $('db-out').textContent = JSON.stringify(r, null, 2);
        } catch (e) {
          $('db-out').textContent = 'Falha no ping: ' + e.message;
        }
      });

      $('btn-init').addEventListener('click', async () => {
        $('db-out').textContent = 'Aplicando schema...';
        try {
          await ipcRenderer.invoke('db:init');
          $('db-out').textContent = 'Esquema aplicado com sucesso.';
        } catch (e) {
          $('db-out').textContent = 'Erro ao aplicar schema: ' + e.message;
        }
      });

      // ---------- Exibição de telas ----------
      (async () => {
        const prefs = (window.UIPrefs)
          ? await window.UIPrefs.read('ui')
          : {};
        renderGroups(prefs);
      })();

      $('btn-all').addEventListener('click', () => {
        document.querySelectorAll('.menu-box').forEach(b => b.checked = true);
      });

      $('btn-none').addEventListener('click', () => {
        document.querySelectorAll('.menu-box').forEach(b => b.checked = false);
      });

      $('btn-reset').addEventListener('click', async () => {
        // padrão: tudo true
        document.querySelectorAll('.menu-box').forEach(b => b.checked = true);
        const obj = collectPrefs();
        if (window.UIPrefs) {
          await window.UIPrefs.write(obj, 'ui');
          applyNow(obj);
        }
        toast('Preferências restauradas para o padrão (tudo visível).');
      });

      $('btn-save-prefs').addEventListener('click', async () => {
        const obj = collectPrefs();
        // grava INI via IPC e aplica
        if (window.UIPrefs) {
          const ok = await window.UIPrefs.write(obj, 'ui');
          if (ok) {
            applyNow(obj);
            toast('Preferências salvas.');
          } else {
            toast('Falha ao salvar preferências.', true);
          }
        }
      });

      loadInfo();
    }
  };
};
