import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
const APP_URL = pathToFileURL(resolve(RAIZ, 'src', 'app.js')).href;

async function montarAplicacao(storage) {
  const dom = criarAmbienteDom({ htmlPath: HTML_PATH, storage });
  const blobsCapturados = [];
  const origBlob = globalThis.Blob;
  const origURL = globalThis.URL;
  const origFileReader = globalThis.FileReader;

  globalThis.Blob = class StubBlob {
    constructor(partes = [], opcoes = {}) {
      this.texto = partes.map((p) => String(p)).join('');
      this.type = opcoes.type || '';
      blobsCapturados.push(this.texto);
    }
  };
  globalThis.URL = class StubURL extends origURL {
    static createObjectURL() {
      return 'blob:todolab-export';
    }
    static revokeObjectURL() {}
  };
  globalThis.FileReader = class StubFileReader {
    readAsText(arquivo) {
      Promise.resolve(arquivo.text()).then((conteudo) => {
        this.result = conteudo;
        this.onload?.({ target: this });
      });
    }
  };

  await import(`${APP_URL}?t=${Date.now()}-${Math.random()}`);
  dom.dispararDomContentLoaded();

  return {
    dom,
    blobsCapturados,
    form: dom.document.querySelector('#todo-form'),
    input: dom.document.querySelector('#todo-input'),
    restore() {
      globalThis.Blob = origBlob;
      globalThis.URL = origURL;
      globalThis.FileReader = origFileReader;
      dom.restore();
    },
  };
}

describe('Aceitação BDD — Issue #8 (Painel de Telemetria QA e Exportação/Importação JSON v1.2.0)', () => {
  it('Cenário 4 e portabilidade: exibe métricas de telemetria, exporta JSON v1.2.0 e importa arquivo válido e rejeita inválido', async () => {
    const storage = criarArmazenamentoMemoria();
    const app = await montarAplicacao(storage);

    try {
      const estInput = app.form.querySelectorAll('input').find((el) =>
        `${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`.toLowerCase().includes('estimat')
      );
      if (estInput) estInput.value = '25';
      app.input.value = 'Auditar métricas';
      app.form.dispatchEvent({ type: 'submit' });

      if (estInput) estInput.value = '25';
      app.input.value = 'Validar exportação';
      app.form.dispatchEvent({ type: 'submit' });

      const tarefas = JSON.parse(storage.getItem('todolab:tarefas'));
      const cbPrimeira = app.dom.document.querySelector(`[data-id="${tarefas[0].id}"] input[type="checkbox"]`);
      cbPrimeira.checked = true;
      cbPrimeira.dispatchEvent({ type: 'change' });

      const textoTela = app.dom.document.body.textContent;
      assert.match(textoTela, /50(\.0|,0)?\s*%/, 'Painel deve exibir taxa de conclusão de 50%');
      assert.match(textoTela, /50\s*min/, 'Painel deve exibir total estimado (50 min)');

      const btnExportar = app.dom.document.querySelectorAll('button').find((b) =>
        /exportar/i.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
      );
      assert.ok(btnExportar, 'Botão Exportar JSON deve existir');
      btnExportar.click();

      assert.ok(app.blobsCapturados.length > 0, 'Exportação deve gerar Blob JSON');
      const exportado = JSON.parse(app.blobsCapturados[app.blobsCapturados.length - 1]);
      assert.equal(exportado.versaoSchema, '1.2.0');
      assert.equal(exportado.tarefas.length, 2);

      const inputImportar = app.dom.document.querySelector('input[type="file"]');
      assert.ok(inputImportar, 'Deve existir input[type="file"] para importar arquivo .json');

      inputImportar.files = [{
        name: 'invalido.json',
        type: 'application/json',
        text: async () => JSON.stringify({ versaoSchema: '0.1.0', tarefas: [] }),
      }];
      inputImportar.dispatchEvent({ type: 'change' });
      await new Promise((r) => setTimeout(r, 20));

      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 2, 'Importação inválida deve preservar dados atuais');

      const btnLimpar = app.dom.document.querySelectorAll('button').find((b) =>
        /limpar conclu/i.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
      );
      btnLimpar.click();
      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 1);

      inputImportar.files = [{
        name: 'todolab-v1.2.0.json',
        type: 'application/json',
        text: async () => JSON.stringify(exportado),
      }];
      inputImportar.dispatchEvent({ type: 'change' });
      await new Promise((r) => setTimeout(r, 20));

      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 2, 'Importação válida v1.2.0 deve restaurar todas as tarefas');
    } finally {
      app.restore();
    }
  });
});
