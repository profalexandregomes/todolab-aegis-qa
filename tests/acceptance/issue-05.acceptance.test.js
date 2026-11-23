import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
const APP_URL = pathToFileURL(resolve(RAIZ, 'src', 'app.js')).href;

function formatarDataLocal(deslocamentoDias = 0) {
  const base = new Date();
  const data = new Date(base.getFullYear(), base.getMonth(), base.getDate() + deslocamentoDias);
  const ano = String(data.getFullYear()).padStart(4, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
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

function ativarOrdenacaoPrioridade(dom, form) {
  const controles = [
    ...dom.document.querySelectorAll('input[type="checkbox"]'),
    ...dom.document.querySelectorAll('button'),
    ...dom.document.querySelectorAll('select'),
  ].filter((el) => !form.contains(el));

  const controle = controles.find((el) => {
    const meta = `${el.id} ${el.name} ${el.getAttribute('aria-label') || ''} ${el.textContent}`.toLowerCase();
    return meta.includes('orden') || meta.includes('prioridade');
  });

  if (!controle) return null;
  if (controle.tagName === 'INPUT' && controle.type === 'checkbox') {
    if (!controle.checked) {
      controle.checked = true;
      controle.dispatchEvent({ type: 'change' });
    }
  } else if (controle.tagName === 'SELECT') {
    const opcoes = controle.querySelectorAll('option');
    const alvo = opcoes.find((o) => /prioridade/i.test(`${o.value} ${o.textContent}`));
    if (alvo) {
      controle.value = alvo.value;
      controle.dispatchEvent({ type: 'change' });
    }
  } else if (controle.tagName === 'BUTTON') {
    if (controle.getAttribute('aria-pressed') !== 'true') {
      controle.click();
    }
  }
  return controle;
}

describe('Aceitação BDD — Issue #5 (Matriz de Prioridade, Vencimento e Ordenação na UI)', () => {
  it('Cenário 4: formulário coleta prioridade e dataVencimento, exibe selos nos cartões e ordena por prioridade', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      const seletorPrioridade = form.querySelectorAll('select').find((el) => {
        const meta = `${el.id} ${el.name} ${el.getAttribute('aria-label') || ''}`.toLowerCase();
        return meta.includes('prioridade') || el.querySelectorAll('option').some((o) => o.value === 'alta');
      });
      const campoData = form.querySelector('input[type="date"]');

      assert.ok(seletorPrioridade, 'Formulário deve possuir seletor de prioridade');
      assert.ok(campoData, 'Formulário deve possuir campo input[type="date"] de vencimento');

      const hoje = formatarDataLocal(0);
      const ontem = formatarDataLocal(-1);
      const futuro = formatarDataLocal(5);

      seletorPrioridade.value = 'baixa';
      campoData.value = futuro;
      input.value = 'Tarefa Baixa Futura';
      form.dispatchEvent({ type: 'submit' });

      seletorPrioridade.value = 'media';
      campoData.value = ontem;
      input.value = 'Tarefa Média Atrasada';
      form.dispatchEvent({ type: 'submit' });

      seletorPrioridade.value = 'alta';
      campoData.value = hoje;
      input.value = 'Tarefa Alta Hoje';
      form.dispatchEvent({ type: 'submit' });

      const controleOrdenacao = ativarOrdenacaoPrioridade(dom, form);
      assert.ok(controleOrdenacao, 'Deve existir controle na UI para ativar ordenação por prioridade');

      const colTodo = dom.document.querySelector('[data-status="todo"]');
      const cartoesTodo = colTodo.querySelectorAll('[data-id]');
      assert.equal(cartoesTodo.length, 3);

      const textosCartoes = cartoesTodo.map((c) => c.textContent);
      assert.ok(textosCartoes[0].includes('Tarefa Alta Hoje'), '1º cartão em A Fazer deve ser prioridade Alta');
      assert.ok(textosCartoes[1].includes('Tarefa Média Atrasada'), '2º cartão em A Fazer deve ser prioridade Média');
      assert.ok(textosCartoes[2].includes('Tarefa Baixa Futura'), '3º cartão em A Fazer deve ser prioridade Baixa');

      assert.match(textosCartoes[0].toLowerCase(), /alta/);
      assert.match(textosCartoes[0].toLowerCase(), /vence hoje/);
      assert.match(textosCartoes[1].toLowerCase(), /m[eé]dia/);
      assert.match(textosCartoes[1].toLowerCase(), /atrasada/);
      assert.match(textosCartoes[2].toLowerCase(), /baixa/);
      assert.match(textosCartoes[2].toLowerCase(), /futura/);

      const checkboxAtrasada = cartoesTodo[1].querySelector('input[type="checkbox"]');
      checkboxAtrasada.checked = true;
      checkboxAtrasada.dispatchEvent({ type: 'change' });

      const colDone = dom.document.querySelector('[data-status="done"]');
      const cartoesDone = colDone.querySelectorAll('[data-id]');
      assert.equal(cartoesDone.length, 1);
      assert.doesNotMatch(cartoesDone[0].textContent.toLowerCase(), /atrasada/);
    } finally {
      dom.restore();
    }
  });
});
