import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('TodoStore Estimativa e Esforço Real (Pomodoro) — Issue #6', () => {
  it('Cenário 1: armazena estimativaMin (padrão 0), esforcoRealMin inicial 0 e saneia valores inválidos', () => {
    const legadas = JSON.stringify([
      { id: 'leg-1', titulo: 'Legada sem esforço', concluida: false },
    ]);
    const storage = criarArmazenamentoMemoria({ 'todolab:tarefas': legadas });
    const store = new TodoStore(storage);

    assert.equal(store.listar()[0].estimativaMin, 0);
    assert.equal(store.listar()[0].esforcoRealMin, 0);

    const padrao = store.adicionar('Sem estimativa');
    assert.equal(padrao.estimativaMin, 0);
    assert.equal(padrao.esforcoRealMin, 0);

    const doisPomodoros = store.adicionar({
      titulo: 'Implementar cronômetro',
      estimativaMin: 50,
    });
    assert.equal(doisPomodoros.estimativaMin, 50);
    assert.equal(doisPomodoros.esforcoRealMin, 0);

    const viaOpcoes = store.adicionar('Revisar métricas', { estimativaMin: 25 });
    assert.equal(viaOpcoes.estimativaMin, 25);

    for (const invalida of [-15, NaN, 'abc', null, Infinity]) {
      const saneada = store.adicionar({ titulo: 'Saneada', estimativaMin: invalida });
      assert.equal(saneada.estimativaMin, 0);
      assert.equal(Number.isNaN(saneada.estimativaMin), false);
    }
  });

  it('Cenário 2: registrarEsforco acumula esforcoRealMin, atualiza atualizadaEm e persiste no armazenamento', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    const tarefa = store.adicionar({ titulo: 'Sessão de foco', estimativaMin: 25 });

    const r1 = store.registrarEsforco(tarefa.id, 25);
    assert.ok(r1);
    assert.equal(r1.esforcoRealMin, 25);

    const r2 = store.registrarEsforco(tarefa.id, 15);
    assert.ok(r2);
    assert.equal(r2.esforcoRealMin, 40);
    assert.equal(typeof r2.atualizadaEm, 'string');

    const recarregada = new TodoStore(storage);
    assert.equal(recarregada.listar()[0].estimativaMin, 25);
    assert.equal(recarregada.listar()[0].esforcoRealMin, 40);
  });

  it('Casos de borda: registrarEsforco rejeita id inexistente e minutos <= 0 ou não finitos sem gravar', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    const tarefa = store.adicionar({ titulo: 'Estável', estimativaMin: 25 });
    const gravacoesAntes = storage.chamadas.setItem;

    assert.equal(store.registrarEsforco('id-inexistente', 25), null);
    assert.equal(store.registrarEsforco(null, 25), null);

    for (const minInvalido of [0, -10, NaN, Infinity, -Infinity, '25', null, undefined]) {
      assert.equal(store.registrarEsforco(tarefa.id, minInvalido), null);
    }

    assert.equal(store.listar()[0].esforcoRealMin, 0);
    assert.equal(storage.chamadas.setItem, gravacoesAntes);
  });
});
