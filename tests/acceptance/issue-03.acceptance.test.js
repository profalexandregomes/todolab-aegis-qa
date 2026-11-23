import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
const APP_URL = pathToFileURL(resolve(RAIZ, 'src', 'app.js')).href;

function criarErroDom(nome, mensagem) {
  const erro = new Error(mensagem);
  erro.name = nome;
  return erro;
}

function obterAvisosVisiveis(dom) {
  const candidatos = [
    ...dom.document.querySelectorAll('[aria-live]'),
    ...dom.document.querySelectorAll('[role="alert"]'),
    ...dom.document.querySelectorAll('[role="status"]'),
  ];
  const unicos = [...new Set(candidatos)];
  return unicos.filter(
    (el) => el.id !== 'todo-list' && el.tagName !== 'UL' && !el.hidden && el.textContent.trim().length > 0
  );
}

async function montarAplicacao(storage) {
  const dom = criarAmbienteDom({ htmlPath: HTML_PATH, storage });
  await import(`${APP_URL}?t=${Date.now()}-${Math.random()}`);
  dom.dispararDomContentLoaded();
  const form = dom.document.querySelector('#todo-form');
  const input = dom.document.querySelector('#todo-input');
  return { dom, form, input };
}

describe('Aceitação BDD — Issue #3 (Persistência resiliente ISO 9126 Confiabilidade)', () => {
  it('Cenário 2: inicializa sem quebrar com JSON corrompido, exibe aviso e permite criar novas tarefas', async () => {
    const storage = criarArmazenamentoMemoria({
      'todolab:tarefas': '{isso não é JSON',
    });

    const { dom, form, input } = await montarAplicacao(storage);

    try {
      const avisos = obterAvisosVisiveis(dom);
      assert.ok(avisos.length > 0, 'Deve exibir aviso acessível de recuperação na UI');

      input.value = 'Nova tarefa recuperada';
      form.dispatchEvent({ type: 'submit' });

      const persistidas = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(persistidas.length, 1);
      assert.equal(persistidas[0].titulo, 'Nova tarefa recuperada');

      const textos = dom.getElementosCriados().map((el) => el.textContent);
      assert.ok(textos.includes('Nova tarefa recuperada'));
    } finally {
      dom.restore();
    }
  });

  it('Cenário 4: exibe alerta não bloqueante e mantém tarefa em memória quando QuotaExceededError ocorre', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      storage.definirErroAoSalvar(criarErroDom('QuotaExceededError', 'Cota excedida'));

      input.value = 'Tarefa sem espaço em disco';
      form.dispatchEvent({ type: 'submit' });

      const textos = dom.getElementosCriados().map((el) => el.textContent);
      assert.ok(
        textos.includes('Tarefa sem espaço em disco'),
        'A tarefa deve permanecer visível na lista em memória mesmo com falha de gravação'
      );

      const avisos = obterAvisosVisiveis(dom);
      assert.ok(avisos.length > 0, 'A UI deve exibir aviso não bloqueante informando falha ao salvar');
    } finally {
      dom.restore();
    }
  });

  it('Cenário 5: funciona em memória com aviso claro quando localStorage lança SecurityError', async () => {
    const storage = criarArmazenamentoMemoria();
    const securityError = criarErroDom('SecurityError', 'Armazenamento bloqueado');
    storage.definirErroAoLer(securityError);
    storage.definirErroAoSalvar(securityError);

    const { dom, form, input } = await montarAplicacao(storage);

    try {
      const avisosIniciais = obterAvisosVisiveis(dom);
      assert.ok(avisosIniciais.length > 0, 'Deve informar na UI que a persistência local está indisponível');

      input.value = 'Tarefa somente em memória';
      form.dispatchEvent({ type: 'submit' });

      const textos = dom.getElementosCriados().map((el) => el.textContent);
      assert.ok(textos.includes('Tarefa somente em memória'));
      assert.ok(obterAvisosVisiveis(dom).length > 0);
    } finally {
      dom.restore();
    }
  });
});
