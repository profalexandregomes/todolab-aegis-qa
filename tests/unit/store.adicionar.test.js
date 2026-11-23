import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('TodoStore.adicionar — Issue #1 (normalização e bloqueio de título vazio)', () => {
  it('Cenário 1: remove espaços das bordas ao criar tarefa válida e persiste no armazenamento', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const tarefa = store.adicionar('  Estudar Garantia da Qualidade  ');

    assert.ok(tarefa);
    assert.equal(tarefa.titulo, 'Estudar Garantia da Qualidade');
    assert.equal(tarefa.concluida, false);
    assert.ok(tarefa.id);
    assert.ok(!store.ultimoErro);

    const lista = store.listar();
    assert.equal(lista.length, 1);
    assert.equal(lista[0].titulo, 'Estudar Garantia da Qualidade');

    const persistido = JSON.parse(storage.getItem('todolab:tarefas'));
    assert.equal(persistido.length, 1);
    assert.equal(persistido[0].titulo, 'Estudar Garantia da Qualidade');
    assert.equal(storage.chamadas.setItem, 1);
  });

  it('Cenário 2: rejeita string vazia "", registra ultimoErro e não grava no armazenamento', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    const resultado = store.adicionar('');

    assert.equal(resultado, null);
    assert.equal(store.listar().length, 0);
    assert.equal(typeof store.ultimoErro, 'string');
    assert.ok(store.ultimoErro.trim().length > 0);
    assert.equal(storage.chamadas.setItem, 0);
  });

  it('Cenário 3: rejeita entradas com apenas espaços, tabulações ou quebras de linha preservando tarefas existentes', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    store.adicionar('Tarefa inicial válida');
    const gravacoesAntes = storage.chamadas.setItem;

    for (const invalido of ['   ', '\t\t', '\n  ', ' \r\n\t ']) {
      const resultado = store.adicionar(invalido);
      assert.equal(resultado, null);
      assert.equal(typeof store.ultimoErro, 'string');
      assert.ok(store.ultimoErro.trim().length > 0);
    }

    assert.equal(store.listar().length, 1);
    assert.equal(store.listar()[0].titulo, 'Tarefa inicial válida');
    assert.equal(storage.chamadas.setItem, gravacoesAntes);
  });

  it('Cenário 4: rejeita entradas nulas ou não textuais sem lançar exceção', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    for (const entrada of [null, undefined, 123, true, {}, { titulo: '' }, { titulo: '   ' }, { titulo: 42 }]) {
      let resultado;
      assert.doesNotThrow(() => {
        resultado = store.adicionar(entrada);
      });
      assert.equal(resultado, null);
      assert.equal(typeof store.ultimoErro, 'string');
      assert.ok(store.ultimoErro.trim().length > 0);
    }

    assert.equal(store.listar().length, 0);
    assert.equal(storage.chamadas.setItem, 0);
  });

  it('Casos de borda: aceita 1 caractere, preserva espaços internos, aceita emojis/acentos e limpa ultimoErro após sucesso', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);

    assert.equal(store.adicionar('   '), null);
    assert.ok(store.ultimoErro);

    const umCaractere = store.adicionar(' a ');
    assert.equal(umCaractere.titulo, 'a');
    assert.ok(!store.ultimoErro);

    const espacosInternos = store.adicionar('Revisar   PR');
    assert.equal(espacosInternos.titulo, 'Revisar   PR');

    const unicodeEmoji = store.adicionar('  🚀 Lançar versão  ');
    assert.equal(unicodeEmoji.titulo, '🚀 Lançar versão');

    const viaObjeto = store.adicionar({ titulo: '  Validar critério BDD  ' });
    assert.equal(viaObjeto.titulo, 'Validar critério BDD');
  });
});
