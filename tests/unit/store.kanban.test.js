import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('TodoStore Quadro Scrum-Kanban e Limite de WIP — Issue #4', () => {
  it('inicializa com limiteWip padrão 2, status "todo" em novas tarefas e migra tarefas legadas sem status', () => {
    const legadas = JSON.stringify([
      { id: 'leg-1', titulo: 'Pendente legada', concluida: false, criadaEm: '2026-08-01T10:00:00.000Z' },
      { id: 'leg-2', titulo: 'Concluída legada', concluida: true, criadaEm: '2026-08-01T10:00:00.000Z' },
    ]);
    const storage = criarArmazenamentoMemoria({ 'todolab:tarefas': legadas });
    const store = new TodoStore(storage);

    assert.equal(store.limiteWip, 2);

    const listadas = store.listar();
    assert.equal(listadas[0].status, 'todo');
    assert.equal(listadas[0].concluida, false);
    assert.equal(listadas[1].status, 'done');
    assert.equal(listadas[1].concluida, true);

    const nova = store.adicionar('Nova tarefa Kanban');
    assert.equal(nova.status, 'todo');
    assert.equal(nova.concluida, false);
    assert.equal(typeof nova.atualizadaEm, 'string');
    assert.ok(!Number.isNaN(Date.parse(nova.atualizadaEm)));

    const emRevisao = store.adicionar({ titulo: 'Já em revisão', status: 'review' });
    assert.equal(emRevisao.status, 'review');
    assert.equal(emRevisao.concluida, false);
  });

  it('Cenário 2 e 4: moverStatus transiciona entre as 4 colunas, sincroniza concluida/atualizadaEm e persiste', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    const tarefa = store.adicionar('Implementar Kanban');

    const r1 = store.moverStatus(tarefa.id, 'in_progress');
    assert.equal(r1.sucesso, true);
    assert.equal(store.listar()[0].status, 'in_progress');
    assert.equal(store.listar()[0].concluida, false);

    const r2 = store.moverStatus(tarefa.id, 'review');
    assert.equal(r2.sucesso, true);
    assert.equal(store.listar()[0].status, 'review');
    assert.equal(store.listar()[0].concluida, false);

    const r3 = store.moverStatus(tarefa.id, 'done');
    assert.equal(r3.sucesso, true);
    assert.equal(store.listar()[0].status, 'done');
    assert.equal(store.listar()[0].concluida, true);

    const recarregada = new TodoStore(storage);
    assert.equal(recarregada.listar()[0].status, 'done');
    assert.equal(recarregada.listar()[0].concluida, true);

    recarregada.alternar(tarefa.id);
    assert.equal(recarregada.listar()[0].concluida, false);
    assert.equal(recarregada.listar()[0].status, 'todo');

    recarregada.alternar(tarefa.id);
    assert.equal(recarregada.listar()[0].concluida, true);
    assert.equal(recarregada.listar()[0].status, 'done');
  });

  it('Cenário 3: bloqueia entrada em in_progress quando limiteWip (2) é atingido retornando WIP_LIMIT_EXCEEDED', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const t1 = store.adicionar('Card 1');
    const t2 = store.adicionar('Card 2');
    const t3 = store.adicionar('Card 3');
    const t4 = store.adicionar({ titulo: 'Card 4 em revisão', status: 'review' });

    assert.equal(store.moverStatus(t1.id, 'in_progress').sucesso, true);
    assert.equal(store.moverStatus(t2.id, 'in_progress').sucesso, true);

    const gravacoesAntes = storage.chamadas.setItem;

    const bloqueioTodo = store.moverStatus(t3.id, 'in_progress');
    assert.deepEqual(
      { sucesso: bloqueioTodo.sucesso, motivo: bloqueioTodo.motivo, limiteWip: bloqueioTodo.limiteWip },
      { sucesso: false, motivo: 'WIP_LIMIT_EXCEEDED', limiteWip: 2 }
    );
    assert.equal(store.listar().find((t) => t.id === t3.id).status, 'todo');

    const bloqueioReview = store.moverStatus(t4.id, 'in_progress');
    assert.deepEqual(
      { sucesso: bloqueioReview.sucesso, motivo: bloqueioReview.motivo, limiteWip: bloqueioReview.limiteWip },
      { sucesso: false, motivo: 'WIP_LIMIT_EXCEEDED', limiteWip: 2 }
    );
    assert.equal(store.listar().find((t) => t.id === t4.id).status, 'review');
    assert.equal(storage.chamadas.setItem, gravacoesAntes);
  });

  it('Cenário 5: definirLimiteWip(n) atualiza dinamicamente, persiste entre sessões e rejeita valores inválidos', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const t1 = store.adicionar('Item 1');
    const t2 = store.adicionar('Item 2');
    const t3 = store.adicionar('Item 3');

    store.moverStatus(t1.id, 'in_progress');
    store.moverStatus(t2.id, 'in_progress');
    assert.equal(store.moverStatus(t3.id, 'in_progress').sucesso, false);

    store.definirLimiteWip(3);
    assert.equal(store.limiteWip, 3);
    assert.equal(store.moverStatus(t3.id, 'in_progress').sucesso, true);

    for (const invalido of [0, -1, NaN, 1.5, 'abc', null, undefined]) {
      store.definirLimiteWip(invalido);
      assert.equal(store.limiteWip, 3);
    }

    const recarregada = new TodoStore(storage);
    assert.equal(recarregada.limiteWip, 3);
  });

  it('Casos de borda: mesma coluna in_progress cheia não falha, status/id inválido retorna sucesso:false e redução de WIP preserva existentes', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const t1 = store.adicionar('A');
    const t2 = store.adicionar('B');
    const t3 = store.adicionar('C');

    store.moverStatus(t1.id, 'in_progress');
    store.moverStatus(t2.id, 'in_progress');

    const mesmaColuna = store.moverStatus(t1.id, 'in_progress');
    assert.equal(mesmaColuna.sucesso, true);

    assert.equal(store.moverStatus(t1.id, 'archived').sucesso, false);
    assert.equal(store.moverStatus('id-nao-existe', 'done').sucesso, false);

    store.definirLimiteWip(1);
    const emProgresso = store.listar().filter((t) => t.status === 'in_progress');
    assert.equal(emProgresso.length, 2);

    const bloqueadoComWipReduzido = store.moverStatus(t3.id, 'in_progress');
    assert.equal(bloqueadoComWipReduzido.sucesso, false);
    assert.equal(bloqueadoComWipReduzido.motivo, 'WIP_LIMIT_EXCEEDED');
    assert.equal(bloqueadoComWipReduzido.limiteWip, 1);
  });
});
