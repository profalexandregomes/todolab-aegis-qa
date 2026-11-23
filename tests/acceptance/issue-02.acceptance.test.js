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
  return { dom, form, input };
}

function adicionarViaUi(form, input, titulo) {
  input.value = titulo;
  form.dispatchEvent({ type: 'submit' });
}

describe('Aceitação BDD — Issue #2 (Exclusão por ID único com títulos duplicados)', () => {
  it('Cenário 1 e 4: remove apenas a segunda tarefa duplicada pela UI e preserva a primeira concluída após recarregar', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      adicionarViaUi(form, input, 'Revisar código');
      adicionarViaUi(form, input, 'Revisar código');

      const criadas = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(criadas.length, 2);
      const [t1, t2] = criadas;
      assert.notEqual(t1.id, t2.id);

      const cardT1 = dom.document.querySelector(`[data-id="${t1.id}"]`);
      assert.ok(cardT1, 'Primeiro item deve estar renderizado com data-id correspondente');
      const checkboxT1 = cardT1.querySelector('input[type="checkbox"]');
      assert.ok(checkboxT1, 'Primeiro item deve possuir checkbox de conclusão');
      checkboxT1.checked = true;
      checkboxT1.dispatchEvent({ type: 'change' });

      const cardT2 = dom.document.querySelector(`[data-id="${t2.id}"]`);
      assert.ok(cardT2, 'Segundo item deve estar renderizado com data-id correspondente');
      const botoesT2 = cardT2.querySelectorAll('button');
      const botaoRemoverT2 = botoesT2.find(
        (btn) => btn.classList.contains('remove') || /remover/i.test(btn.textContent)
      );
      assert.ok(botaoRemoverT2, 'Segundo item deve possuir botão de remoção');
      botaoRemoverT2.click();

      const persistidas = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(persistidas.length, 1);
      assert.equal(persistidas[0].id, t1.id);
      assert.equal(persistidas[0].concluida, true);

      assert.ok(dom.document.querySelector(`[data-id="${t1.id}"]`), 'T1 deve continuar na UI');
      assert.equal(dom.document.querySelector(`[data-id="${t2.id}"]`), null, 'T2 não deve permanecer na UI');

      const storeRecarregada = new TodoStore(storage);
      assert.equal(storeRecarregada.listar().length, 1);
      assert.equal(storeRecarregada.listar()[0].id, t1.id);
      assert.equal(storeRecarregada.listar()[0].concluida, true);
    } finally {
      dom.restore();
    }
  });

  it('Cenário 2 e 3: gera IDs únicos sob criação rápida na Store e ignora remoção de ID inexistente ou nulo', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const a = store.adicionar('Duplicada');
    const b = store.adicionar('Duplicada');
    const c = store.adicionar('Duplicada');

    assert.equal(new Set([a.id, b.id, c.id]).size, 3);

    assert.doesNotThrow(() => {
      store.remover('id-inexistente');
      store.remover(null);
    });
    assert.equal(store.listar().length, 3);
  });
});
