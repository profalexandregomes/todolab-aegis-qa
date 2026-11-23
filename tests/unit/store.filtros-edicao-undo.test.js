import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('TodoStore Filtros, Busca, Edição (200 chars), Lote e Undo — Issue #7', () => {
  it('Cenário 1 (A1): contarPendentes e formatarContadorPendentes pluralizam e ignoram filtros', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    assert.equal(store.contarPendentes(), 0);
    assert.equal(store.formatarContadorPendentes(), '0 itens restantes');

    const t1 = store.adicionar('Uma tarefa');
    assert.equal(store.contarPendentes(), 1);
    assert.equal(store.formatarContadorPendentes(), '1 item restante');

    const t2 = store.adicionar('Segunda tarefa');
    const t3 = store.adicionar('Terceira tarefa');
    store.alternar(t3.id);

    assert.equal(store.contarPendentes(), 2);
    assert.equal(store.formatarContadorPendentes(), '2 itens restantes');

    const somenteConcluidas = store.filtrar({ statusFiltro: 'concluidas' });
    assert.equal(somenteConcluidas.length, 1);
    assert.equal(store.formatarContadorPendentes(), '2 itens restantes');

    store.alternar(t1.id);
    store.alternar(t2.id);
    assert.equal(store.contarPendentes(), 0);
    assert.equal(store.formatarContadorPendentes(), '0 itens restantes');
  });

  it('Cenário 2 (B1 + B5): filtrar combina statusFiltro, prioridade, colunaKanban, busca sem acento/caixa e ordenação', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const a1 = store.adicionar({ titulo: 'Revisão de código urgente', prioridade: 'alta', status: 'in_progress' });
    store.adicionar({ titulo: 'Revisão de documentação', prioridade: 'baixa', status: 'todo' });
    const a3 = store.adicionar({ titulo: 'Revisão concluída', prioridade: 'alta', status: 'done' });
    store.adicionar({ titulo: 'Reunião diária', prioridade: 'alta', status: 'todo' });

    const filtradas = store.filtrar({
      statusFiltro: 'ativas',
      prioridade: 'alta',
      busca: 'revisao',
    });
    assert.deepEqual(filtradas.map((t) => t.id), [a1.id]);

    const naColuna = store.filtrar({
      colunaKanban: 'done',
      busca: 'CONCLUIDA',
    });
    assert.deepEqual(naColuna.map((t) => t.id), [a3.id]);

    const ordenadas = store.filtrar({ statusFiltro: 'ativas', ordenar: true });
    assert.equal(ordenadas[0].prioridade, 'alta');
    assert.equal(ordenadas[ordenadas.length - 1].prioridade, 'baixa');
  });

  it('Cenários 4 e 5 (B2 + B4): editar preserva concluida/status, remove quando vazio e impõe limite exato de 200 caracteres', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const de199 = 'a'.repeat(199);
    const de200 = 'b'.repeat(200);
    const de201 = 'c'.repeat(201);

    assert.ok(store.adicionar(de199));
    assert.ok(store.adicionar(`  ${de200}  `));
    assert.equal(store.adicionar(de201), null);
    assert.ok(store.ultimoErro);

    const concluida = store.adicionar({ titulo: 'Escrever teste', status: 'done' });
    assert.equal(concluida.concluida, true);
    assert.equal(concluida.status, 'done');

    const editada = store.editar(concluida.id, '  Escrever teste E2E  ');
    assert.ok(editada);
    assert.equal(editada.titulo, 'Escrever teste E2E');
    assert.equal(editada.concluida, true);
    assert.equal(editada.status, 'done');

    assert.equal(store.editar(concluida.id, de201), null);
    assert.ok(store.ultimoErro);
    assert.equal(store.listar().find((t) => t.id === concluida.id).titulo, 'Escrever teste E2E');

    assert.ok(store.editar(concluida.id, de200));
    assert.equal(store.listar().find((t) => t.id === concluida.id).titulo, de200);

    store.editar(concluida.id, '   ');
    assert.equal(store.listar().find((t) => t.id === concluida.id), undefined);
  });

  it('Cenário 6 e bordas (A3 + B3 + C4): limparConcluidas, alternarTodas e pilha LIFO de desfazer', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    assert.equal(store.desfazer(), false);

    const t1 = store.adicionar('Ativa 1');
    const t2 = store.adicionar('Concluída 1');
    const t3 = store.adicionar('Concluída 2');
    store.alternar(t2.id);
    store.alternar(t3.id);

    store.limparConcluidas();
    assert.deepEqual(store.listar().map((t) => t.id), [t1.id]);

    assert.equal(store.desfazer(), true);
    assert.equal(store.listar().length, 3);
    assert.equal(store.listar().filter((t) => t.concluida).length, 2);

    store.alternarTodas(true);
    assert.equal(store.contarPendentes(), 0);
    assert.equal(store.listar().every((t) => t.concluida && t.status === 'done'), true);

    assert.equal(store.desfazer(), true);
    assert.equal(store.contarPendentes(), 1);

    const antes = store.listar().length;
    store.adicionar('Extra para undo');
    assert.equal(store.listar().length, antes + 1);
    assert.equal(store.desfazer(), true);
    assert.equal(store.listar().length, antes);

    const recarregada = new TodoStore(storage);
    assert.equal(recarregada.listar().length, antes);
    assert.equal(recarregada.desfazer(), false);
  });
});
