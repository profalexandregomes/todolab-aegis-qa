import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('TodoStore.editar multi-campo e saneamento — Issue #18', () => {
  it('persiste título, prioridade, dataVencimento, estimativaMin e esforcoRealMin preservando status e concluida', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const tarefa = store.adicionar({
      titulo: 'Avaliar o trabalho dos alunos na A3',
      prioridade: 'baixa',
      dataVencimento: '2026-11-20',
      estimativaMin: 30,
      esforcoRealMin: 10,
      status: 'done',
    });

    assert.equal(tarefa.concluida, true);
    assert.equal(tarefa.status, 'done');

    const editada = store.editar(tarefa.id, '  Revisar rubrica final da A3  ', {
      prioridade: 'alta',
      dataVencimento: '2026-12-05',
      estimativaMin: 90,
      esforcoRealMin: 75,
    });

    assert.ok(editada, 'editar deve retornar a tarefa atualizada');
    assert.equal(editada.titulo, 'Revisar rubrica final da A3');
    assert.equal(editada.prioridade, 'alta');
    assert.equal(editada.dataVencimento, '2026-12-05');
    assert.equal(editada.estimativaMin, 90);
    assert.equal(editada.esforcoRealMin, 75);
    assert.equal(editada.status, 'done');
    assert.equal(editada.concluida, true);

    const recarregada = new TodoStore(storage);
    const persistida = recarregada.listar().find((item) => item.id === tarefa.id);
    assert.ok(persistida);
    assert.equal(persistida.titulo, 'Revisar rubrica final da A3');
    assert.equal(persistida.prioridade, 'alta');
    assert.equal(persistida.dataVencimento, '2026-12-05');
    assert.equal(persistida.estimativaMin, 90);
    assert.equal(persistida.esforcoRealMin, 75);
    assert.equal(persistida.status, 'done');
    assert.equal(persistida.concluida, true);
  });

  it('saneia minutos negativos ou inválidos, prioridade inválida e data vazia em editar()', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const tarefa = store.adicionar({
      titulo: 'Calibrar tempos',
      prioridade: 'alta',
      dataVencimento: '2026-12-10',
      estimativaMin: 40,
      esforcoRealMin: 20,
      status: 'in_progress',
    });

    const editada = store.editar(tarefa.id, 'Tempos saneados', {
      prioridade: 'urgente',
      dataVencimento: '',
      estimativaMin: -15,
      esforcoRealMin: Number.NaN,
    });

    assert.ok(editada);
    assert.equal(editada.prioridade, 'media');
    assert.equal(editada.dataVencimento, null);
    assert.equal(editada.estimativaMin, 0);
    assert.equal(editada.esforcoRealMin, 0);
    assert.equal(editada.status, 'in_progress');
    assert.equal(editada.concluida, false);

    const comInfinito = store.editar(tarefa.id, 'Tempos com texto e infinito', {
      estimativaMin: '60',
      esforcoRealMin: Infinity,
    });
    assert.equal(comInfinito.estimativaMin, 0);
    assert.equal(comInfinito.esforcoRealMin, 0);
  });

  it('reverte todos os 5 campos editados em 1 único passo com desfazer() e mantém validação de 200 chars', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const tarefa = store.adicionar({
      titulo: 'Estado original',
      prioridade: 'media',
      dataVencimento: '2026-11-30',
      estimativaMin: 45,
      esforcoRealMin: 15,
    });

    const editada = store.editar(tarefa.id, 'Estado alterado', {
      prioridade: 'alta',
      dataVencimento: '2026-12-20',
      estimativaMin: 120,
      esforcoRealMin: 110,
    });
    assert.ok(editada);

    assert.equal(store.editar(tarefa.id, 'x'.repeat(201), {
      prioridade: 'baixa',
      esforcoRealMin: 999,
    }), null);
    assert.equal(store.listar()[0].titulo, 'Estado alterado');
    assert.equal(store.listar()[0].esforcoRealMin, 110);

    assert.equal(store.desfazer(), true);
    const restaurada = store.listar()[0];
    assert.equal(restaurada.titulo, 'Estado original');
    assert.equal(restaurada.prioridade, 'media');
    assert.equal(restaurada.dataVencimento, '2026-11-30');
    assert.equal(restaurada.estimativaMin, 45);
    assert.equal(restaurada.esforcoRealMin, 15);
  });
});
