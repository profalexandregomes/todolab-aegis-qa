import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
const APP_URL = pathToFileURL(resolve(RAIZ, 'src', 'app.js')).href;

function instalarEspiaoTemporizadores() {
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const ativos = new Set();
  let proximoId = 1;

  globalThis.setInterval = () => {
    const id = proximoId;
    proximoId += 1;
    ativos.add(id);
    return id;
  };
  globalThis.clearInterval = (id) => {
    ativos.delete(id);
  };

  return {
    get ativos() {
      return ativos.size;
    },
    restore() {
      globalThis.setInterval = originalSetInterval;
      globalThis.clearInterval = originalClearInterval;
    },
  };
}

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

function encontrarBotao(dom, regex) {
  return dom.document.querySelectorAll('button').find((b) =>
    regex.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
  );
}

describe('Aceitação BDD — Issue #6 (Cronômetro Pomodoro e Telemetria Estimativa vs. Esforço Real)', () => {
  it('Cenários 1, 3 e 4: define estimativa, opera Pomodoro sem múltiplos timers, acumula esforço real e exibe desvio', async () => {
    const storage = criarArmazenamentoMemoria();
    const timers = instalarEspiaoTemporizadores();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      const campoEstimativa = form.querySelectorAll('input').find((el) => {
        const meta = `${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        return meta.includes('estimat');
      });
      assert.ok(campoEstimativa, 'Formulário deve possuir campo para estimativa em minutos');

      campoEstimativa.value = '25';
      input.value = 'Focar em testes';
      form.dispatchEvent({ type: 'submit' });

      const [tarefa] = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(tarefa.estimativaMin, 25);
      assert.equal(tarefa.esforcoRealMin, 0);

      const cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      assert.match(cartao.textContent, /25\s*min/);
      assert.match(cartao.textContent, /0\s*min/);

      assert.match(dom.document.body.textContent, /25:00/);

      const selectFoco = dom.document.querySelectorAll('select').find((el) => {
        if (form.contains(el) || el.closest('[data-id]')) return false;
        const meta = `${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        return meta.includes('foco') || meta.includes('pomodoro') || meta.includes('tarefa');
      });
      assert.ok(selectFoco, 'Deve existir seletor de tarefa para o cronômetro Pomodoro');
      selectFoco.value = tarefa.id;
      selectFoco.dispatchEvent({ type: 'change' });

      const btnIniciar = encontrarBotao(dom, /iniciar/i);
      const btnPausar = encontrarBotao(dom, /pausar/i);
      const btnReiniciar = encontrarBotao(dom, /reiniciar/i);
      const btnConcluir = encontrarBotao(dom, /concluir ciclo/i);

      assert.ok(btnIniciar, 'Botão Iniciar Foco deve existir');
      assert.ok(btnPausar, 'Botão Pausar deve existir');
      assert.ok(btnReiniciar, 'Botão Reiniciar deve existir');
      assert.ok(btnConcluir, 'Botão Concluir Ciclo deve existir');

      btnIniciar.click();
      assert.equal(timers.ativos, 1);
      btnIniciar.click();
      assert.equal(timers.ativos, 1, 'Não deve criar múltiplos temporizadores ao clicar repetidamente em Iniciar');

      btnPausar.click();
      assert.equal(timers.ativos, 0);

      btnIniciar.click();
      btnConcluir.click();

      let persistida = JSON.parse(storage.getItem('todolab:tarefas'))[0];
      assert.equal(persistida.esforcoRealMin, 25);
      assert.match(dom.document.body.textContent, /05:00/);
      assert.match(dom.document.body.textContent.toLowerCase(), /pausa/);

      btnConcluir.click();
      assert.match(dom.document.body.textContent, /25:00/);

      const cartaoAtualizado = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      const btnAddEsforco = cartaoAtualizado.querySelectorAll('button').find((b) =>
        /\+\s*\d+|esfor[cç]o/i.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
      );
      if (btnAddEsforco) {
        btnAddEsforco.click();
      } else {
        btnIniciar.click();
        btnConcluir.click();
      }

      persistida = JSON.parse(storage.getItem('todolab:tarefas'))[0];
      assert.ok(persistida.esforcoRealMin > 25, 'Esforço real deve acumular acima da estimativa de 25 min');

      const desvioEsperado = persistida.esforcoRealMin - 25;
      const cartaoComDesvio = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      assert.ok(
        cartaoComDesvio.textContent.includes(`+${desvioEsperado} min`),
        `Cartão deve exibir variação positiva "+${desvioEsperado} min"`
      );

      btnReiniciar.click();
      assert.equal(timers.ativos, 0);
    } finally {
      timers.restore();
      dom.restore();
    }
  });

  it('Caso de borda: excluir a tarefa vinculada ao Pomodoro pausa o timer e desvincula sem lançar erro', async () => {
    const storage = criarArmazenamentoMemoria();
    const timers = instalarEspiaoTemporizadores();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      input.value = 'Tarefa temporária';
      form.dispatchEvent({ type: 'submit' });
      const [tarefa] = JSON.parse(storage.getItem('todolab:tarefas'));

      const selectFoco = dom.document.querySelectorAll('select').find((el) => {
        if (form.contains(el) || el.closest('[data-id]')) return false;
        const meta = `${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        return meta.includes('foco') || meta.includes('pomodoro') || meta.includes('tarefa');
      });
      selectFoco.value = tarefa.id;
      selectFoco.dispatchEvent({ type: 'change' });

      encontrarBotao(dom, /iniciar/i).click();
      assert.equal(timers.ativos, 1);

      const cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      assert.doesNotThrow(() => {
        cartao.querySelector('.remove').click();
      });

      assert.equal(timers.ativos, 0, 'Excluir a tarefa vinculada deve pausar/limpar o temporizador');
      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 0);
    } finally {
      timers.restore();
      dom.restore();
    }
  });
});
