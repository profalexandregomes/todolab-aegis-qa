import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TodoStore } from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

function criarErroDom(nome, mensagem) {
  const erro = new Error(mensagem);
  erro.name = nome;
  return erro;
}

describe('TodoStore persistência resiliente (ISO 9126 Confiabilidade) — Issue #3 (D-02 / A4)', () => {
  it('Cenário 1: restaura exatamente 3 tarefas com títulos, IDs e estados preservados ao recarregar', () => {
    const storage = criarArmazenamentoMemoria();
    const store1 = new TodoStore(storage);

    const t1 = store1.adicionar('Planejar testes');
    const t2 = store1.adicionar('Executar suíte');
    const t3 = store1.adicionar('Revisar PR');
    store1.alternar(t2.id);

    const store2 = new TodoStore(storage);
    const restauradas = store2.listar();

    assert.equal(restauradas.length, 3);
    assert.deepEqual(
      restauradas.map((t) => ({ id: t.id, titulo: t.titulo, concluida: t.concluida })),
      [
        { id: t1.id, titulo: 'Planejar testes', concluida: false },
        { id: t2.id, titulo: 'Executar suíte', concluida: true },
        { id: t3.id, titulo: 'Revisar PR', concluida: false },
      ]
    );
    assert.equal(store2.persistenciaDisponivel, true);
    assert.ok(!store2.ultimoErro);
  });

  it('Cenário 2: captura JSON corrompido no localStorage, recupera para [] e registra ultimoErro', () => {
    const storage = criarArmazenamentoMemoria({
      'todolab:tarefas': '{isso não é JSON',
    });

    let store;
    assert.doesNotThrow(() => {
      store = new TodoStore(storage);
    });

    assert.deepEqual(store.listar(), []);
    assert.equal(typeof store.ultimoErro, 'string');
    assert.ok(store.ultimoErro.trim().length > 0);

    const nova = store.adicionar('Tarefa após recuperação');
    assert.ok(nova);
    assert.equal(store.listar().length, 1);
    assert.equal(store.listar()[0].titulo, 'Tarefa após recuperação');
  });

  it('Cenário 3: trata JSON válido com estrutura incompatível (objeto, número, null) como [] com ultimoErro', () => {
    for (const payloadInvalido of ['{"invalido": true}', '123', 'null', '"texto"']) {
      const storage = criarArmazenamentoMemoria({
        'todolab:tarefas': payloadInvalido,
      });

      let store;
      assert.doesNotThrow(() => {
        store = new TodoStore(storage);
      });

      assert.deepEqual(store.listar(), []);
      assert.equal(typeof store.ultimoErro, 'string');
      assert.ok(store.ultimoErro.trim().length > 0);
    }
  });

  it('Cenário 4: captura QuotaExceededError em salvar(), mantém tarefas em memória e registra ultimoErro', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    const inicial = store.adicionar('Tarefa inicial');

    storage.definirErroAoSalvar(criarErroDom('QuotaExceededError', 'Cota de armazenamento excedida'));

    let segunda;
    assert.doesNotThrow(() => {
      segunda = store.adicionar('Tarefa em memória sem cota');
    });

    assert.ok(segunda);
    assert.equal(segunda.titulo, 'Tarefa em memória sem cota');
    assert.equal(store.listar().length, 2);
    assert.equal(store.listar()[0].id, inicial.id);
    assert.equal(typeof store.ultimoErro, 'string');
    assert.ok(store.ultimoErro.trim().length > 0);

    assert.doesNotThrow(() => {
      store.alternar(inicial.id);
    });
    assert.equal(store.listar()[0].concluida, true);
    assert.ok(store.ultimoErro);
  });

  it('Cenário 5: opera em memória quando armazenamento é null ou lança SecurityError, marcando persistenciaDisponivel = false', () => {
    const storeSemStorage = new TodoStore(null);
    assert.equal(storeSemStorage.persistenciaDisponivel, false);
    assert.deepEqual(storeSemStorage.listar(), []);
    const tNull = storeSemStorage.adicionar('Sem localStorage');
    assert.equal(tNull.titulo, 'Sem localStorage');
    assert.equal(storeSemStorage.listar().length, 1);

    const storageBloqueado = criarArmazenamentoMemoria();
    const secError = criarErroDom('SecurityError', 'Acesso ao localStorage bloqueado');
    storageBloqueado.definirErroAoLer(secError);
    storageBloqueado.definirErroAoSalvar(secError);

    let storeBloqueada;
    assert.doesNotThrow(() => {
      storeBloqueada = new TodoStore(storageBloqueado);
    });

    assert.equal(storeBloqueada.persistenciaDisponivel, false);
    assert.equal(typeof storeBloqueada.ultimoErro, 'string');
    assert.ok(storeBloqueada.ultimoErro.trim().length > 0);

    const tMem = storeBloqueada.adicionar('Modo anônimo seguro');
    assert.ok(tMem);
    assert.equal(storeBloqueada.listar().length, 1);
  });

  it('Casos de borda: filtra registros corrompidos no array, trata vazio sem erro e limpa ultimoErro ao recuperar gravação', () => {
    const misto = JSON.stringify([
      null,
      {},
      { id: 'sem-titulo' },
      { id: 'vazio', titulo: '   ', concluida: false },
      { id: 'ok-1', titulo: 'Tarefa íntegra', concluida: true },
    ]);
    const storageMisto = criarArmazenamentoMemoria({ 'todolab:tarefas': misto });
    const storeMisto = new TodoStore(storageMisto);
    assert.equal(storeMisto.listar().length, 1);
    assert.equal(storeMisto.listar()[0].id, 'ok-1');
    assert.equal(storeMisto.listar()[0].titulo, 'Tarefa íntegra');

    const storageVazio = criarArmazenamentoMemoria({ 'todolab:tarefas': '' });
    const storeVazio = new TodoStore(storageVazio);
    assert.deepEqual(storeVazio.listar(), []);
    assert.ok(!storeVazio.ultimoErro);

    const storageRecuperavel = criarArmazenamentoMemoria();
    const storeRec = new TodoStore(storageRecuperavel);
    storageRecuperavel.definirErroAoSalvar(criarErroDom('QuotaExceededError', 'Sem espaço'));
    storeRec.adicionar('Durante falha');
    assert.ok(storeRec.ultimoErro);

    storageRecuperavel.definirErroAoSalvar(null);
    storeRec.adicionar('Após recuperação');
    assert.ok(!storeRec.ultimoErro);
    assert.equal(storeRec.persistenciaDisponivel, true);
    assert.equal(JSON.parse(storageRecuperavel.getItem('todolab:tarefas')).length, 2);
  });
});
