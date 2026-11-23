import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('TodoStore.remover e unicidade de ID — Issue #2 (Defeito D-03)', () => {
  it('Cenário 1: remove apenas a segunda tarefa com título duplicado usando id único e preserva a primeira concluída', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const t1 = store.adicionar('Revisar código');
    const t2 = store.adicionar('Revisar código');
    store.alternar(t1.id);

    store.remover(t2.id);

    const restantes = store.listar();
    assert.equal(restantes.length, 1);
    assert.equal(restantes[0].id, t1.id);
    assert.equal(restantes[0].concluida, true);

    const persistidas = JSON.parse(storage.getItem('todolab:tarefas'));
    assert.equal(persistidas.length, 1);
    assert.equal(persistidas[0].id, t1.id);
    assert.equal(persistidas[0].concluida, true);
  });

  it('Cenário 2: gera IDs não vazios e estritamente distintos ao criar tarefas em sequência imediata', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const criadas = [];
    for (let i = 0; i < 50; i += 1) {
      criadas.push(store.adicionar('Tarefa duplicada'));
    }

    const ids = store.listar().map((t) => t.id);
    assert.equal(ids.length, 50);
    for (const id of ids) {
      assert.equal(typeof id, 'string');
      assert.ok(id.trim().length > 0);
    }
    assert.equal(new Set(ids).size, 50);
  });

  it('Cenário 3: remover ID inexistente ou nulo não altera a lista, não grava no storage e não lança exceção', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    const t1 = store.adicionar('Manter tarefa');
    const gravacoesAntes = storage.chamadas.setItem;

    for (const idInvalido of ['id-inexistente', null, undefined, '']) {
      assert.doesNotThrow(() => {
        store.remover(idInvalido);
      });
    }

    assert.equal(store.listar().length, 1);
    assert.equal(store.listar()[0].id, t1.id);
    assert.equal(storage.chamadas.setItem, gravacoesAntes);
  });

  it('Cenário 4: exclusão persiste corretamente ao recarregar nova instância de TodoStore', () => {
    const storage = criarArmazenamentoMemoria();
    const storeInicial = new TodoStore(storage);

    const t1 = storeInicial.adicionar('Revisar código');
    const t2 = storeInicial.adicionar('Revisar código');
    storeInicial.alternar(t1.id);
    storeInicial.remover(t2.id);

    const storeRecarregada = new TodoStore(storage);
    const carregadas = storeRecarregada.listar();

    assert.equal(carregadas.length, 1);
    assert.equal(carregadas[0].id, t1.id);
    assert.equal(carregadas[0].concluida, true);
  });

  it('Casos de borda: 3 títulos iguais removendo o do meio, lista vazia, remoção repetida (no-op) e alternar por ID', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const t1 = store.adicionar('Mesmo título');
    const t2 = store.adicionar('Mesmo título');
    const t3 = store.adicionar('Mesmo título');

    store.alternar(t3.id);
    assert.equal(store.listar().find((t) => t.id === t1.id).concluida, false);
    assert.equal(store.listar().find((t) => t.id === t2.id).concluida, false);
    assert.equal(store.listar().find((t) => t.id === t3.id).concluida, true);

    store.remover(t2.id);
    assert.deepEqual(
      store.listar().map((t) => t.id),
      [t1.id, t3.id]
    );

    const gravacoesAntesNoOp = storage.chamadas.setItem;
    store.remover(t2.id);
    assert.equal(storage.chamadas.setItem, gravacoesAntesNoOp);

    store.remover(t1.id);
    store.remover(t3.id);
    assert.deepEqual(store.listar(), []);
    assert.equal(storage.getItem('todolab:tarefas'), '[]');
  });
});
