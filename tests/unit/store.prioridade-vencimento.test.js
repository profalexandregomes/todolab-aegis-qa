import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TodoStore,
  classificarVencimento,
  ordenarTarefas,
} from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('Prioridade, Vencimento e Classificador Determinístico (TDD) — Issue #5', () => {
  it('armazena prioridade (padrão media) e dataVencimento (padrão null) com migração legada e saneamento', () => {
    const legadas = JSON.stringify([
      { id: 'leg-1', titulo: 'Tarefa legada', concluida: false, criadaEm: '2026-08-01T10:00:00.000Z' },
    ]);
    const storage = criarArmazenamentoMemoria({ 'todolab:tarefas': legadas });
    const store = new TodoStore(storage);

    assert.equal(store.listar()[0].prioridade, 'media');
    assert.equal(store.listar()[0].dataVencimento, null);

    const padrao = store.adicionar('Sem campos extras');
    assert.equal(padrao.prioridade, 'media');
    assert.equal(padrao.dataVencimento, null);

    const alta = store.adicionar({
      titulo: 'Urgente com prazo',
      prioridade: 'alta',
      dataVencimento: '2026-10-15',
    });
    assert.equal(alta.prioridade, 'alta');
    assert.equal(alta.dataVencimento, '2026-10-15');

    const baixa = store.adicionar('Baixa via opções', {
      prioridade: 'baixa',
      dataVencimento: '2026-10-20',
    });
    assert.equal(baixa.prioridade, 'baixa');
    assert.equal(baixa.dataVencimento, '2026-10-20');

    const saneada = store.adicionar({
      titulo: 'Campos inválidos',
      prioridade: 'critica',
      dataVencimento: '15/10/2026',
    });
    assert.equal(saneada.prioridade, 'media');
    assert.equal(saneada.dataVencimento, null);

    const recarregada = new TodoStore(storage);
    const achada = recarregada.listar().find((t) => t.id === alta.id);
    assert.equal(achada.prioridade, 'alta');
    assert.equal(achada.dataVencimento, '2026-10-15');
  });

  it('Cenário 1 (C1): ordenarTarefas ordena pendentes antes de concluídas, por prioridade e desempate por criadaEm sem mutar origem', () => {
    const entrada = [
      { id: '1', titulo: 'Baixa pendente', concluida: false, status: 'todo', prioridade: 'baixa', criadaEm: '2026-10-01T10:00:00.000Z' },
      { id: '2', titulo: 'Alta concluída', concluida: true, status: 'done', prioridade: 'alta', criadaEm: '2026-10-01T08:00:00.000Z' },
      { id: '3', titulo: 'Média T2', concluida: false, status: 'todo', prioridade: 'media', criadaEm: '2026-10-02T12:00:00.000Z' },
      { id: '4', titulo: 'Alta pendente', concluida: false, status: 'in_progress', prioridade: 'alta', criadaEm: '2026-10-03T09:00:00.000Z' },
      { id: '5', titulo: 'Média T1', concluida: false, status: 'todo', prioridade: 'media', criadaEm: '2026-10-01T09:00:00.000Z' },
    ];
    const copiaOriginal = JSON.parse(JSON.stringify(entrada));

    const ordenada = ordenarTarefas(entrada);

    assert.deepEqual(entrada, copiaOriginal, 'ordenarTarefas não deve mutar o array original');
    assert.deepEqual(
      ordenada.map((t) => t.id),
      ['4', '5', '3', '1', '2']
    );

    const desconhecida = ordenarTarefas([
      { id: 'b', titulo: 'Baixa', concluida: false, prioridade: 'baixa', criadaEm: '2026-10-01T08:00:00.000Z' },
      { id: 'u', titulo: 'Desconhecida', concluida: false, prioridade: 'xpto', criadaEm: '2026-10-01T10:00:00.000Z' },
      { id: 'a', titulo: 'Alta', concluida: false, prioridade: 'alta', criadaEm: '2026-10-01T12:00:00.000Z' },
    ]);
    assert.deepEqual(desconhecida.map((t) => t.id), ['a', 'u', 'b']);
  });

  it('Cenário 2 (C2): classificarVencimento valida fronteiras exatas -1, 0, +1, +3 e +4 dias com dataReferencia fixa', () => {
    const ref = '2026-10-15';

    assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-14' }, ref), 'atrasada');
    assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-15' }, ref), 'vence_hoje');
    assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-16' }, ref), 'proxima');
    assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-18' }, ref), 'proxima');
    assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-19' }, ref), 'futura');
  });

  it('Cenário 3 e bordas: concluída nunca é atrasada, datas ausentes/malformadas dão sem_prazo e Date em 00:00/23:59 é determinístico', () => {
    const ref = '2026-10-15';

    assert.equal(
      classificarVencimento({ concluida: true, status: 'done', dataVencimento: '2026-10-01' }, ref),
      'concluida'
    );
    assert.equal(
      classificarVencimento({ concluida: false, status: 'done', dataVencimento: '2026-10-01' }, ref),
      'concluida'
    );

    for (const semPrazo of [
      { concluida: false, dataVencimento: null },
      { concluida: false, dataVencimento: '' },
      { concluida: false },
      { concluida: false, dataVencimento: 'data-invalida' },
      { concluida: false, dataVencimento: '2026-13-40' },
    ]) {
      assert.doesNotThrow(() => {
        assert.equal(classificarVencimento(semPrazo, ref), 'sem_prazo');
      });
    }

    const inicioDia = new Date(2026, 9, 15, 0, 0, 0);
    const fimDia = new Date(2026, 9, 15, 23, 59, 59);
    for (const dataObj of [inicioDia, fimDia]) {
      assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-14' }, dataObj), 'atrasada');
      assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-15' }, dataObj), 'vence_hoje');
      assert.equal(classificarVencimento({ concluida: false, dataVencimento: '2026-10-16' }, dataObj), 'proxima');
    }
  });
});
