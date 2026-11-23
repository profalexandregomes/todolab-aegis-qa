import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
const APP_URL = pathToFileURL(resolve(RAIZ, 'src', 'app.js')).href;

async function montarAplicacao(storage) {
  const dom = criarAmbienteDom({ htmlPath: HTML_PATH, storage });
  await import(`${APP_URL}?t=${Date.now()}-${Math.random()}`);
  dom.dispararDomContentLoaded();

  const form = dom.document.querySelector('#todo-form');
  const input = dom.document.querySelector('#todo-input');
  const submitBtn = form?.querySelector('button[type="submit"]') || form?.querySelector('button');
  const regioesLive = dom.document
    .querySelectorAll('[aria-live]')
    .filter((el) => el.id !== 'todo-list' && el.tagName !== 'UL');

  return { dom, form, input, submitBtn, regioesLive };
}

function submeter(dom, form, input, valor, focoAnterior) {
  dom.document.activeElement = focoAnterior || dom.document.body;
  input.value = valor;
  return form.dispatchEvent({ type: 'submit' });
}

describe('Aceitação BDD — Issue #1 (Impedir tarefas vazias/espaços e normalizar título)', () => {
  it('Cenário 1: cria tarefa normalizada via formulário, exibe na UI, limpa o campo e mantém o foco', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input, submitBtn } = await montarAplicacao(storage);

    try {
      const evento = submeter(dom, form, input, '  Estudar Garantia da Qualidade  ', submitBtn);

      assert.equal(evento.defaultPrevented, true);
      assert.equal(input.value, '');
      assert.equal(dom.document.activeElement, input);

      const persistidas = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(persistidas.length, 1);
      assert.equal(persistidas[0].titulo, 'Estudar Garantia da Qualidade');

      const textosRenderizados = dom.getElementosCriados().map((el) => el.textContent);
      assert.ok(
        textosRenderizados.some((texto) => texto === 'Estudar Garantia da Qualidade'),
        'O título normalizado deve ser renderizado sem espaços extras nas bordas'
      );
    } finally {
      dom.restore();
    }
  });

  it('Cenário 2: entrada totalmente vazia "" bloqueia criação, mantém foco no #todo-input e exibe aviso em região aria-live', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input, submitBtn, regioesLive } = await montarAplicacao(storage);

    try {
      assert.ok(
        regioesLive.length > 0,
        'A interface deve possuir uma região aria-live dedicada para avisos de validação'
      );

      const evento = submeter(dom, form, input, '', submitBtn);

      assert.equal(evento.defaultPrevented, true);
      assert.equal(storage.chamadas.setItem, 0);
      assert.equal(storage.getItem('todolab:tarefas'), null);
      assert.equal(dom.document.activeElement, input);

      const avisoVisivel = regioesLive.find((el) => !el.hidden && el.textContent.trim().length > 0);
      assert.ok(avisoVisivel, 'Deve exibir mensagem acessível de validação na região aria-live');
    } finally {
      dom.restore();
    }
  });

  it('Cenário 3: entradas com espaços, tabs e quebras preservam lista/storage intactos, avisam via aria-live e limpam aviso após envio válido', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input, submitBtn, regioesLive } = await montarAplicacao(storage);

    try {
      submeter(dom, form, input, 'Tarefa existente', submitBtn);
      const gravacoesAntes = storage.chamadas.setItem;

      for (const entradaInvalida of ['   ', '\t\t', '\n  ']) {
        submeter(dom, form, input, entradaInvalida, submitBtn);
        assert.equal(storage.chamadas.setItem, gravacoesAntes);
        assert.equal(dom.document.activeElement, input);

        const persistidas = JSON.parse(storage.getItem('todolab:tarefas'));
        assert.equal(persistidas.length, 1);
        assert.equal(persistidas[0].titulo, 'Tarefa existente');

        const avisoVisivel = regioesLive.find((el) => !el.hidden && el.textContent.trim().length > 0);
        assert.ok(avisoVisivel, `Deve exibir aviso acessível para entrada "${JSON.stringify(entradaInvalida)}"`);
      }

      submeter(dom, form, input, '  Nova tarefa válida  ', submitBtn);
      const persistidasDepois = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(persistidasDepois.length, 2);
      assert.equal(persistidasDepois[1].titulo, 'Nova tarefa válida');

      const aindaComAviso = regioesLive.some((el) => !el.hidden && el.textContent.trim().length > 0);
      assert.equal(aindaComAviso, false, 'O aviso de erro deve ser limpo ou ocultado após criação válida');
    } finally {
      dom.restore();
    }
  });

  it('Cenário 4: API da Store rejeita null, undefined e objetos inválidos de forma segura', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    assert.equal(store.adicionar(null), null);
    assert.equal(store.adicionar(undefined), null);
    assert.equal(store.adicionar({}), null);
    assert.equal(store.adicionar({ titulo: '\t  ' }), null);
    assert.equal(store.listar().length, 0);
    assert.ok(store.ultimoErro);
  });
});
