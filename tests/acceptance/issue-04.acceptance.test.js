import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
const APP_URL = pathToFileURL(resolve(RAIZ, 'src', 'app.js')).href;

const ROTULOS_COLUNA = {
  todo: ['a fazer', 'todo'],
  in_progress: ['em progresso', 'in_progress'],
  review: ['em revisão', 'em revisao', 'review'],
  done: ['concluído', 'concluido', 'done'],
};

async function montarAplicacao(storage) {
  const dom = criarAmbienteDom({ htmlPath: HTML_PATH, storage });
  await import(`${APP_URL}?t=${Date.now()}-${Math.random()}`);
  dom.dispararDomContentLoaded();
  return {
    dom,
    form: dom.document.querySelector('#todo-form'),
    input: dom.document.querySelector('#todo-input'),
  };
}

function obterColuna(dom, status) {
  return dom.document.querySelector(
    `[data-status="${status}"], [data-coluna="${status}"], [data-column="${status}"]`
  );
}

function arrastarESoltar(cartao, colunaDestino) {
  const transferencia = new Map();
  const dataTransfer = {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData(tipo, valor) {
      transferencia.set(tipo, String(valor));
    },
    getData(tipo) {
      return transferencia.get(tipo) ?? '';
    },
  };
  cartao.dispatchEvent({ type: 'dragstart', dataTransfer });
  colunaDestino.dispatchEvent({ type: 'dragover', dataTransfer });
  colunaDestino.dispatchEvent({ type: 'drop', dataTransfer });
  cartao.dispatchEvent({ type: 'dragend', dataTransfer });
}

function acionarControleAcessivel(cartao, destino) {
  const select = cartao.querySelector('select');
  if (select) {
    select.value = destino;
    select.dispatchEvent({ type: 'change' });
    return true;
  }
  const termos = ROTULOS_COLUNA[destino] || [destino];
  const botoes = cartao.querySelectorAll('button').filter((b) => !b.classList.contains('remove'));
  const direto = botoes.find((btn) => {
    const alvoAttr = btn.dataset.status || btn.dataset.target || btn.dataset.destino || btn.dataset.move || '';
    const texto = `${btn.getAttribute('aria-label') || ''} ${btn.textContent}`.toLowerCase();
    return alvoAttr === destino || termos.some((t) => texto.includes(t));
  });
  if (direto) {
    direto.click();
    return true;
  }
  const avancar = botoes.find((btn) => {
    const texto = `${btn.getAttribute('aria-label') || ''} ${btn.textContent}`.toLowerCase();
    return texto.includes('avançar') || texto.includes('avancar') || texto.includes('próxim');
  });
  if (avancar) {
    avancar.click();
    return true;
  }
  return false;
}

function obterAvisosVisiveis(dom) {
  const candidatos = [
    ...dom.document.querySelectorAll('[aria-live]'),
    ...dom.document.querySelectorAll('[role="alert"]'),
    ...dom.document.querySelectorAll('[role="status"]'),
  ];
  return [...new Set(candidatos)].filter(
    (el) => el.id !== 'todo-list' && el.tagName !== 'UL' && !el.hidden && el.textContent.trim().length > 0
  );
}

describe('Aceitação BDD — Issue #4 (Quadro Scrum-Kanban de 4 colunas, WIP e Drag-and-Drop)', () => {
  it('Cenário 1: renderiza 4 colunas Kanban rotuladas e exibe contador WIP na coluna Em Progresso', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom } = await montarAplicacao(storage);

    try {
      const textoPagina = dom.document.body.textContent.toLowerCase();
      assert.ok(textoPagina.includes('a fazer'));
      assert.ok(textoPagina.includes('em progresso'));
      assert.ok(textoPagina.includes('em revisão') || textoPagina.includes('em revisao'));
      assert.ok(textoPagina.includes('concluído') || textoPagina.includes('concluido'));

      for (const status of ['todo', 'in_progress', 'review', 'done']) {
        assert.ok(obterColuna(dom, status), `Coluna para status "${status}" deve existir no DOM`);
      }

      const colProgresso = obterColuna(dom, 'in_progress');
      assert.match(colProgresso.textContent, /0\s*\/\s*2/);
    } finally {
      dom.restore();
    }
  });

  it('Cenários 2 e 3: movimenta cartões via Drag-and-Drop e controle acessível por teclado e bloqueia 3ª tarefa ao atingir WIP 2/2', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      for (const titulo of ['Tarefa Alpha', 'Tarefa Beta', 'Tarefa Gama']) {
        input.value = titulo;
        form.dispatchEvent({ type: 'submit' });
      }

      const tarefas = JSON.parse(storage.getItem('todolab:tarefas'));
      const [t1, t2, t3] = tarefas;

      const cartao1 = dom.document.querySelector(`[data-id="${t1.id}"]`);
      assert.ok(cartao1);
      assert.equal(cartao1.draggable || cartao1.getAttribute('draggable') === 'true', true);

      const controlesAcessiveis = [
        ...cartao1.querySelectorAll('select'),
        ...cartao1.querySelectorAll('button').filter((b) => !b.classList.contains('remove')),
      ].filter((el) => (el.getAttribute('aria-label') || '').trim().length > 0);
      assert.ok(controlesAcessiveis.length > 0, 'Cartão deve possuir controles acessíveis com aria-label para teclado');

      arrastarESoltar(cartao1, obterColuna(dom, 'in_progress'));
      let estado = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(estado.find((t) => t.id === t1.id).status, 'in_progress');
      assert.match(obterColuna(dom, 'in_progress').textContent, /1\s*\/\s*2/);

      const cartao2 = dom.document.querySelector(`[data-id="${t2.id}"]`);
      assert.equal(acionarControleAcessivel(cartao2, 'in_progress'), true);
      estado = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(estado.find((t) => t.id === t2.id).status, 'in_progress');
      assert.match(obterColuna(dom, 'in_progress').textContent, /2\s*\/\s*2/);

      const cartao3 = dom.document.querySelector(`[data-id="${t3.id}"]`);
      arrastarESoltar(cartao3, obterColuna(dom, 'in_progress'));

      estado = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(estado.find((t) => t.id === t3.id).status, 'todo');
      assert.equal(obterColuna(dom, 'in_progress').querySelector(`[data-id="${t3.id}"]`), null);

      const avisos = obterAvisosVisiveis(dom);
      assert.ok(avisos.length > 0, 'Deve exibir aviso acessível quando o limite de WIP for excedido');
    } finally {
      dom.restore();
    }
  });

  it('Cenários 4 e 5: permite configurar limite WIP para 3 na UI, concluir via Drag-and-Drop e persistir estado ao recarregar', async () => {
    const storage = criarArmazenamentoMemoria();
    const primeira = await montarAplicacao(storage);

    try {
      for (const titulo of ['Card Um', 'Card Dois', 'Card Três']) {
        primeira.input.value = titulo;
        primeira.form.dispatchEvent({ type: 'submit' });
      }
      const [t1, t2, t3] = JSON.parse(storage.getItem('todolab:tarefas'));

      arrastarESoltar(primeira.dom.document.querySelector(`[data-id="${t1.id}"]`), obterColuna(primeira.dom, 'in_progress'));
      arrastarESoltar(primeira.dom.document.querySelector(`[data-id="${t2.id}"]`), obterColuna(primeira.dom, 'in_progress'));

      const controleWip = primeira.dom.document.querySelectorAll('input').find((el) => {
        const meta = `${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        return meta.includes('wip');
      });
      assert.ok(controleWip, 'A interface deve oferecer controle para configurar o limite de WIP');

      controleWip.value = '3';
      controleWip.dispatchEvent({ type: 'input' });
      controleWip.dispatchEvent({ type: 'change' });
      const formWip = controleWip.closest('form');
      if (formWip) formWip.dispatchEvent({ type: 'submit' });

      arrastarESoltar(primeira.dom.document.querySelector(`[data-id="${t3.id}"]`), obterColuna(primeira.dom, 'in_progress'));
      let estado = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(estado.find((t) => t.id === t3.id).status, 'in_progress');
      assert.match(obterColuna(primeira.dom, 'in_progress').textContent, /3\s*\/\s*3/);

      arrastarESoltar(primeira.dom.document.querySelector(`[data-id="${t1.id}"]`), obterColuna(primeira.dom, 'review'));
      arrastarESoltar(primeira.dom.document.querySelector(`[data-id="${t1.id}"]`), obterColuna(primeira.dom, 'done'));

      estado = JSON.parse(storage.getItem('todolab:tarefas'));
      const t1Final = estado.find((t) => t.id === t1.id);
      assert.equal(t1Final.status, 'done');
      assert.equal(t1Final.concluida, true);
    } finally {
      primeira.dom.restore();
    }

    const segunda = await montarAplicacao(storage);
    try {
      const colDone = obterColuna(segunda.dom, 'done');
      const colInProgress = obterColuna(segunda.dom, 'in_progress');
      assert.equal(colDone.querySelectorAll('[data-id]').length, 1);
      assert.equal(colInProgress.querySelectorAll('[data-id]').length, 2);
      assert.match(colInProgress.textContent, /2\s*\/\s*3/);
    } finally {
      segunda.dom.restore();
    }
  });
});
