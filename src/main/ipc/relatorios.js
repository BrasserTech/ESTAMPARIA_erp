const { ipcMain, dialog, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');
const db = require('../../database'); // Importando sua conexão do database/index.js

/**
 * Gera o conteúdo HTML completo para o relatório de vendas.
 * @param {Array} dadosVendas - Os resultados da consulta ao banco de dados.
 * @param {string} dataInicial - A data inicial do filtro.
 * @param {string} dataFinal - A data final do filtro.
 * @returns {string} - O HTML completo como uma string.
 */
function gerarHtmlDoRelatorio(dadosVendas, dataInicial, dataFinal) {
  const dataGeracao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Converte as datas para o formato brasileiro para exibição
  const formatarData = (data) => new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');

  // Gera uma linha de tabela (<tr>) para cada venda
  const linhasTabela = dadosVendas
    .map(
      (venda) => `
    <tr>
      <td>${venda.codigo_venda}</td>
      <td>${venda.data_venda}</td>
      <td>${venda.nome_cliente}</td>
      <td class="valor">R$ ${venda.valor_total}</td>
    </tr>
  `
    )
    .join('');

  const totalGeral = dadosVendas
    .reduce((acc, venda) => acc + parseFloat(venda.valor_total), 0)
    .toFixed(2)
    .replace('.', ',');

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8" />
        <title>Relatório de Vendas</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
          .header h1 { margin: 0; color: #0056b3; }
          .header p { margin: 5px 0 0; }
          .content { margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f2f2f2; }
          .valor { text-align: right; }
          .footer { text-align: center; font-size: 0.8em; color: #777; border-top: 1px solid #ccc; padding-top: 10px; margin-top: 20px; position: fixed; bottom: 10px; width: 95%; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>BT Estamparia ERP - Relatório de Vendas</h1>
          <p>Período de ${formatarData(dataInicial)} a ${formatarData(dataFinal)}</p>
        </div>
        <div class="content">
          <table>
            <thead>
              <tr>
                <th>Cód. Venda</th>
                <th>Data</th>
                <th>Cliente</th>
                <th class="valor">Valor Total (R$)</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" class="valor">TOTAL GERAL</td>
                <td class="valor">R$ ${totalGeral}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="footer">
          Relatório gerado em ${dataGeracao}
        </div>
      </body>
    </html>
  `;
}

// Handler principal que cuida de todo o processo
ipcMain.handle('relatorio:gerar-pdf-vendas', async (event, { dataInicial, dataFinal }) => {
  try {
    // 1. Buscar os dados no banco
    const query = `
      SELECT
        s.codigo AS codigo_venda,
        TO_CHAR(s.datahoracad, 'DD/MM/YYYY') AS data_venda,
        c.nome AS nome_cliente,
        REPLACE(s.total::text, '.', ',') AS valor_total
      FROM
        public.saidas AS s
        JOIN public.clifor AS c ON s.chaveclifor = c.chave
      WHERE
        s.ativo = 2 -- Apenas vendas finalizadas
        AND s.datahoracad::date BETWEEN $1::date AND $2::date
      ORDER BY
        s.datahoracad;
    `;
    const { rows: dadosVendas } = await db.query(query, [dataInicial, dataFinal]);

    if (dadosVendas.length === 0) {
      dialog.showInfoBox('Nenhum dado', 'Não foram encontradas vendas para o período selecionado.');
      return { sucesso: false, erro: 'Nenhum dado encontrado' };
    }

    // 2. Gerar o HTML
    const htmlContent = gerarHtmlDoRelatorio(dadosVendas, dataInicial, dataFinal);

    // 3. Criar uma janela invisível para carregar o HTML
    const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
    
    // Carregar o HTML como uma URL de dados
    win.loadURL('data:text/html;charset=UTF-8,' + encodeURIComponent(htmlContent));

    // 4. Aguardar o carregamento e imprimir para PDF
    const pdfPromise = new Promise((resolve, reject) => {
      win.webContents.on('did-finish-load', async () => {
        try {
          const pdfData = await win.webContents.printToPDF({
            margins: { top: 20, bottom: 20, left: 20, right: 20 },
            printBackground: true,
          });
          win.close(); // Fechar a janela invisível
          resolve(pdfData);
        } catch (error) {
          win.close();
          reject(error);
        }
      });
    });

    const pdfBuffer = await pdfPromise;

    // 5. Perguntar ao usuário onde salvar o arquivo
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar Relatório de Vendas',
      defaultPath: path.join(require('os').homedir(), `Relatorio_Vendas_${Date.now()}.pdf`),
      filters: [{ name: 'Arquivos PDF', extensions: ['pdf'] }],
    });

    if (canceled) {
      return { sucesso: false, cancelado: true };
    }

    // 6. Salvar o arquivo PDF
    fs.writeFileSync(filePath, pdfBuffer);

    return { sucesso: true, caminhoArquivo: filePath };
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    dialog.showErrorBox('Erro', `Não foi possível gerar o relatório: ${error.message}`);
    return { sucesso: false, erro: error.message };
  }
});