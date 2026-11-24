import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TodoStore,
  calcularEstatisticas,
  validarSchemaImportacao,
} from '../../src/store.js';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';

describe('Telemetria de Qualidade (C3) e Portabilidade JSON v1.2.0 (D3) — Issue #8', () => {
  it('Cenário 1 (C3): calcularEstatisticas evita divisão por zero (0/0 -> 0) e calcula 1/3 -> 33.3 com totais por coluna, prioridade, prazos e esforço', () => {
    const vazia = calcularEstatisticas([], '2026-10-15', 2);
    assert.equal(vazia.total, 0);
    assert.equal(vazia.pendentes, 0);
    assert.equal(vazia.concluidas, 0);
    assert.equal(vazia.taxaConclusao, 0);
    assert.equal(Number.isNaN(vazia.taxaConclusao), false);
    assert.equal(vazia.wipAtual, 0);
    assert.equal(vazia.limiteWip, 2);
    assert.equal(vazia.wipExcedido, false);
    assert.equal(vazia.estimativaTotalMin, 0);
    assert.equal(vazia.esforcoRealTotalMin, 0);
    assert.equal(vazia.variacaoEsforcoMin, 0);

    const tarefas = [
      { id: '1', titulo: 'Atrasada', concluida: false, status: 'in_progress', prioridade: 'alta', dataVencimento: '2026-10-14', estimativaMin: 25, esforcoRealMin: 30 },
      { id: '2', titulo: 'Hoje', concluida: false, status: 'todo', prioridade: 'media', dataVencimento: '2026-10-15', estimativaMin: 50, esforcoRealMin: 10 },
      { id: '3', titulo: 'Pronta', concluida: true, status: 'done', prioridade: 'baixa', dataVencimento: '2026-10-10', estimativaMin: 25, esforcoRealMin: 25 },
    ];

    const stats = calcularEstatisticas(tarefas, '2026-10-15', 2);
    assert.equal(stats.total, 3);
    assert.equal(stats.pendentes, 2);
    assert.equal(stats.concluidas, 1);
    assert.equal(stats.taxaConclusao, 33.3);
    assert.deepEqual(stats.porColuna, { todo: 1, in_progress: 1, review: 0, done: 1 });
    assert.deepEqual(stats.porPrioridade, { alta: 1, media: 1, baixa: 1 });
    assert.equal(stats.atrasadas, 1);
    assert.equal(stats.venceHoje, 1);
    assert.equal(stats.proximas, 0);
    assert.equal(stats.wipAtual, 1);
    assert.equal(stats.limiteWip, 2);
    assert.equal(stats.wipExcedido, false);
    assert.equal(stats.estimativaTotalMin, 100);
    assert.equal(stats.esforcoRealTotalMin, 65);
    assert.equal(stats.variacaoEsforcoMin, -35);

    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    store.adicionar({ titulo: 'Via store', prioridade: 'alta', estimativaMin: 20 });
    const viaMetodo = store.estatisticas('2026-10-15');
    assert.equal(viaMetodo.total, 1);
    assert.equal(viaMetodo.porPrioridade.alta, 1);
  });

  it('Cenário 2 (D3): exportarJSON e importarJSON no schema v1.2.0 são idempotentes e suportam desfazer()', () => {
    const storageOrigem = criarArmazenamentoMemoria();
    const origem = new TodoStore(storageOrigem);
    origem.definirLimiteWip(4);
    const t1 = origem.adicionar({ titulo: 'Tarefa 1', prioridade: 'alta', dataVencimento: '2026-10-20', estimativaMin: 50 });
    origem.moverStatus(t1.id, 'in_progress');
    origem.registrarEsforco(t1.id, 30);
    const t2 = origem.adicionar({ titulo: 'Tarefa 2', prioridade: 'baixa', status: 'done' });

    const json = origem.exportarJSON();
    const parsed = JSON.parse(json);
    assert.equal(parsed.produto, 'TodoLab');
    assert.equal(parsed.versaoSchema, '1.2.0');
    assert.equal(parsed.limiteWip, 4);
    assert.equal(parsed.tarefas.length, 2);

    const storageDestino = criarArmazenamentoMemoria();
    const destino = new TodoStore(storageDestino);
    const anterior = destino.adicionar('Pré-existente');

    const resultado = destino.importarJSON(json);
    assert.equal(resultado.sucesso, true);
    assert.equal(resultado.totalImportado, 2);
    assert.equal(destino.limiteWip, 4);
    assert.equal(destino.listar().length, 2);
    assert.equal(destino.listar().find((t) => t.id === t1.id).esforcoRealMin, 30);
    assert.equal(destino.listar().find((t) => t.id === t2.id).concluida, true);

    assert.equal(destino.desfazer(), true);
    assert.equal(destino.listar().length, 1);
    assert.equal(destino.listar()[0].id, anterior.id);
  });

  it('Cenário 3 (D3): importarJSON rejeita atomicamente JSON inválido, versão incompatível e títulos inválidos preservando dados atuais', () => {
    const storage = criarArmazenamentoMemoria();
    const store = new TodoStore(storage);
    const original = store.adicionar('Dado protegido');
    const gravacoesAntes = storage.chamadas.setItem;

    const invalidos = [
      '{json quebrado',
      JSON.stringify({ produto: 'TodoLab', versaoSchema: '0.9.0', tarefas: [] }),
      JSON.stringify({ produto: 'TodoLab', versaoSchema: '1.2.0', tarefas: [{ id: '1', titulo: '   ', concluida: false, status: 'todo', prioridade: 'media', estimativaMin: 0, esforcoRealMin: 0 }] }),
      JSON.stringify({ produto: 'TodoLab', versaoSchema: '1.2.0', tarefas: [{ id: '1', titulo: 'x'.repeat(201), concluida: false, status: 'todo', prioridade: 'media', estimativaMin: 0, esforcoRealMin: 0 }] }),
      JSON.stringify({ produto: 'TodoLab', versaoSchema: '1.2.0', tarefas: 'nao-array' }),
    ];

    for (const bruto of invalidos) {
      const resp = store.importarJSON(bruto);
      assert.equal(resp.sucesso, false);
      assert.ok(Array.isArray(resp.erros) && resp.erros.length > 0);
    }

    assert.equal(store.listar().length, 1);
    assert.equal(store.listar()[0].id, original.id);
    assert.equal(storage.chamadas.setItem, gravacoesAntes);
  });

  it('Casos de borda: validarSchemaImportacao remove campos extras/poluição de protótipo e rejeita carga > 5000 itens', () => {
    const payloadComExtras = JSON.parse(`{
      "produto": "TodoLab",
      "versaoSchema": "1.2.0",
      "limiteWip": 3,
      "tarefas": [
        {
          "id": "id-seguro",
          "titulo": "  Tarefa limpa  ",
          "concluida": false,
          "status": "todo",
          "prioridade": "alta",
          "dataVencimento": null,
          "estimativaMin": 25,
          "esforcoRealMin": 10,
          "campoMalicioso": "ignorar",
          "__proto__": { "poluido": true }
        }
      ]
    }`);

    const validacao = validarSchemaImportacao(payloadComExtras);
    assert.equal(validacao.valido, true);
    assert.equal(validacao.dadosSanitizados.tarefas[0].titulo, 'Tarefa limpa');
    assert.equal('campoMalicioso' in validacao.dadosSanitizados.tarefas[0], false);
    assert.equal(({}).poluido, undefined);

    const excessivo = {
      produto: 'TodoLab',
      versaoSchema: '1.2.0',
      tarefas: Array.from({ length: 5001 }, (_, i) => ({
        id: `id-${i}`,
        titulo: `Tarefa ${i}`,
        concluida: false,
        status: 'todo',
        prioridade: 'media',
        estimativaMin: 0,
        esforcoRealMin: 0,
      })),
    };
    const respExcessivo = validarSchemaImportacao(excessivo);
    assert.equal(respExcessivo.valido, false);
    assert.ok(respExcessivo.erros.length > 0);
  });
});
