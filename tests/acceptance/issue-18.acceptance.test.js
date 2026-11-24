import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
const CSS_PATH = resolve(RAIZ, 'src', 'styles.css');
const APP_URL = pathToFileURL(resolve(RAIZ, 'src', 'app.js')).href;

async function montarAplicacao(storage) {
  const dom = criarAmbienteDom({ htmlPath: HTML_PATH, storage });
  await import(`${APP_URL}?t=${Date.now()}-${Math.random()}`);
  dom.dispararDomContentLoaded();
  return {
    dom,
    form: dom.document.querySelector('#todo-form'),
    input: dom.document.querySelector('#todo-input'),
  };
}

describe('Aceitação BDD — Issue #18 (Layout de Cartão Kanban em Largura Total e Edição Multi-Campo)', () => {
  it('Cenário 1 e 2: estrutura cabeçalho + corpo em largura total e CSS não comprime inputs não-checkbox', async () => {
    const css = readFileSync(CSS_PATH, 'utf8');
    assert.doesNotMatch(
      css,
      /\.todo-card__main\s+input\b/,
      'styles.css não deve usar regra .todo-card__main input que encolhe inputs de texto para 17px'
    );
    assert.match(
      css,
      /input\[type="checkbox"\]/,
      'styles.css deve restringir tamanho de checkbox com seletor input[type="checkbox"]'
    );
    assert.match(css, /\.todo-card__header\b/, 'styles.css deve estilizar .todo-card__header');
    assert.match(css, /\.todo-card__body\b/, 'styles.css deve estilizar .todo-card__body');
    assert.match(css, /\.todo-card__edit-panel\b/, 'styles.css deve estilizar .todo-card__edit-panel');
    assert.match(css, /\.todo-card__edit-input\b/, 'styles.css deve estilizar .todo-card__edit-input');

    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      const selectPrio = form.querySelector('#todo-priority');
      const dueInput = form.querySelector('#todo-due-date');
      const estInput = form.querySelector('#todo-estimate');

      selectPrio.value = 'alta';
      dueInput.value = '2026-12-01';
      estInput.value = '60';
      input.value = 'Avaliar o trabalho dos alunos na A3';
      form.dispatchEvent({ type: 'submit' });

      const [tarefa] = JSON.parse(storage.getItem('todolab:tarefas'));
      const cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      assert.ok(cartao, 'Cartão deve ser renderizado no quadro');
      assert.equal(cartao.querySelector('.todo-card__main'), null, 'Cartão não deve usar .todo-card__main comprimido');

      const header = cartao.querySelector('.todo-card__header');
      const headerLeft = cartao.querySelector('.todo-card__header-left');
      const topActions = cartao.querySelector('.todo-card__top-actions');
      const body = cartao.querySelector('.todo-card__body');
      const title = body?.querySelector('.todo-card__title');

      assert.ok(header, 'Cartão deve possuir .todo-card__header');
      assert.ok(headerLeft, 'Cabeçalho deve possuir .todo-card__header-left');
      assert.ok(topActions, 'Cabeçalho deve possuir .todo-card__top-actions');
      assert.ok(headerLeft.querySelector('input[type="checkbox"]'), 'Checkbox deve ficar à esquerda no cabeçalho');
      assert.ok(headerLeft.querySelector('.badge--prio-alta'), 'Badge de prioridade deve ficar à esquerda no cabeçalho');
      assert.ok(topActions.querySelector('.edit-btn'), 'Botão Editar deve ficar em .todo-card__top-actions');
      assert.ok(topActions.querySelector('.remove'), 'Botão Remover deve ficar em .todo-card__top-actions');
      assert.ok(body, 'Cartão deve possuir .todo-card__body em largura total');
      assert.ok(title, 'Título deve ser renderizado dentro de .todo-card__body');
      assert.equal(title.textContent, 'Avaliar o trabalho dos alunos na A3');
      assert.equal(header.contains(title), false, 'Título não deve ficar espremido dentro do cabeçalho');
    } finally {
      dom.restore();
    }
  });

  it('Cenário 3: abre painel multi-campo sem fechar por blur, salva os 5 campos e preserva status e concluida', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      const selectPrio = form.querySelector('#todo-priority');
      const dueInput = form.querySelector('#todo-due-date');
      const estInput = form.querySelector('#todo-estimate');

      selectPrio.value = 'baixa';
      dueInput.value = '2026-11-25';
      estInput.value = '30';
      input.value = 'Preparar apresentação da sprint';
      form.dispatchEvent({ type: 'submit' });

      const [criada] = JSON.parse(storage.getItem('todolab:tarefas'));
      const moveSelect = dom.document.querySelector(`[data-id="${criada.id}"] .kanban-move-select`);
      moveSelect.value = 'in_progress';
      moveSelect.dispatchEvent({ type: 'change' });

      const cb = dom.document.querySelector(`[data-id="${criada.id}"] input[type="checkbox"]`);
      cb.checked = true;
      cb.dispatchEvent({ type: 'change' });

      let cartao = dom.document.querySelector(`[data-id="${criada.id}"]`);
      cartao.querySelector('.edit-btn').click();

      cartao = dom.document.querySelector(`[data-id="${criada.id}"]`);
      const panel = cartao.querySelector('.todo-card__edit-panel');
      assert.ok(panel, 'Clicar em Editar deve abrir .todo-card__edit-panel');

      const primeiroInputNaoCheckbox = cartao.querySelectorAll('input').find((el) => el.type !== 'checkbox');
      const editTitle = panel.querySelector('.todo-card__edit-input');
      const editPriority = panel.querySelector('.todo-card__edit-priority');
      const editDate = panel.querySelector('.todo-card__edit-date');
      const editEstimate = panel.querySelector('.todo-card__edit-estimate');
      const editReal = panel.querySelector('.todo-card__edit-real');
      const saveBtn = panel.querySelector('.save-edit-btn');
      const cancelBtn = panel.querySelector('.cancel-edit-btn');

      assert.ok(editTitle && editTitle.type === 'text', 'Painel deve ter input de texto .todo-card__edit-input');
      assert.equal(primeiroInputNaoCheckbox, editTitle, '.todo-card__edit-input deve ser o 1º input não-checkbox do cartão');
      assert.ok(editPriority && editPriority.tagName === 'SELECT', 'Painel deve ter select de prioridade');
      assert.ok(editDate && editDate.type === 'date', 'Painel deve ter input[type="date"] de prazo');
      assert.ok(editEstimate && editEstimate.type === 'number', 'Painel deve ter input[type="number"] de estimativa');
      assert.ok(editReal && editReal.type === 'number', 'Painel deve ter input[type="number"] de esforço real');
      assert.ok(saveBtn && /salvar/i.test(saveBtn.textContent), 'Painel deve ter botão Salvar');
      assert.ok(cancelBtn && /cancelar/i.test(cancelBtn.textContent), 'Painel deve ter botão Cancelar');

      editTitle.value = 'Avaliar o trabalho dos alunos na A3 (Atualizado)';
      editTitle.dispatchEvent({ type: 'blur', bubbles: false });
      editTitle.blur();
      editPriority.focus();

      cartao = dom.document.querySelector(`[data-id="${criada.id}"]`);
      assert.ok(
        cartao.querySelector('.todo-card__edit-panel'),
        'Blur no campo de título não pode fechar o painel de edição prematuramente'
      );
      assert.equal(
        JSON.parse(storage.getItem('todolab:tarefas'))[0].titulo,
        'Preparar apresentação da sprint',
        'Blur não deve persistir alterações antes de clicar em Salvar ou pressionar Enter'
      );

      editPriority.value = 'alta';
      editDate.value = '2026-12-15';
      editEstimate.value = '90';
      editReal.value = '105';
      saveBtn.click();

      const [atualizada] = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(atualizada.titulo, 'Avaliar o trabalho dos alunos na A3 (Atualizado)');
      assert.equal(atualizada.prioridade, 'alta');
      assert.equal(atualizada.dataVencimento, '2026-12-15');
      assert.equal(atualizada.estimativaMin, 90);
      assert.equal(atualizada.esforcoRealMin, 105);
      assert.equal(atualizada.status, 'done');
      assert.equal(atualizada.concluida, true);

      cartao = dom.document.querySelector(`[data-id="${criada.id}"]`);
      assert.equal(cartao.querySelector('.todo-card__edit-panel'), null, 'Painel deve fechar após Salvar');
      assert.equal(cartao.querySelector('.todo-card__title').textContent, 'Avaliar o trabalho dos alunos na A3 (Atualizado)');
      assert.ok(cartao.querySelector('.badge--prio-alta'), 'Badge de prioridade deve refletir Alta');
      assert.match(cartao.textContent, /2026-12-15/);
      assert.match(cartao.querySelector('.todo-card__effort-row').textContent, /Estimativa:\s*90\s*min.*Real:\s*105\s*min/);

      cartao.querySelector('.edit-btn').click();
      cartao = dom.document.querySelector(`[data-id="${criada.id}"]`);
      const panelEnter = cartao.querySelector('.todo-card__edit-panel');
      panelEnter.querySelector('.todo-card__edit-real').value = '80';
      panelEnter.querySelector('.todo-card__edit-real').dispatchEvent({ type: 'keydown', key: 'Enter' });

      const [aposEnter] = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(aposEnter.esforcoRealMin, 80);
      assert.equal(aposEnter.status, 'done');
      assert.equal(aposEnter.concluida, true);
    } finally {
      dom.restore();
    }
  });

  it('Cenário 4: Cancelar e Esc descartam alterações; salvar com título vazio remove a tarefa', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      input.value = 'Manter intacta';
      form.dispatchEvent({ type: 'submit' });
      const [tarefa] = JSON.parse(storage.getItem('todolab:tarefas'));

      let cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      cartao.querySelector('.edit-btn').click();
      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);

      let panel = cartao.querySelector('.todo-card__edit-panel');
      panel.querySelector('.todo-card__edit-input').value = 'Alteração descartada';
      panel.querySelector('.todo-card__edit-priority').value = 'alta';
      panel.querySelector('.todo-card__edit-real').value = '50';
      panel.querySelector('.cancel-edit-btn').click();

      let [persistida] = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(persistida.titulo, 'Manter intacta');
      assert.equal(persistida.prioridade, 'media');
      assert.equal(persistida.esforcoRealMin, 0);

      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      cartao.querySelector('.edit-btn').click();
      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      panel = cartao.querySelector('.todo-card__edit-panel');
      panel.querySelector('.todo-card__edit-input').value = 'Descartada por Esc';
      panel.querySelector('.todo-card__edit-priority').dispatchEvent({ type: 'keydown', key: 'Escape' });

      [persistida] = JSON.parse(storage.getItem('todolab:tarefas'));
      assert.equal(persistida.titulo, 'Manter intacta');

      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      cartao.querySelector('.edit-btn').click();
      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      panel = cartao.querySelector('.todo-card__edit-panel');
      panel.querySelector('.todo-card__edit-input').value = '   ';
      panel.querySelector('.save-edit-btn').click();

      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 0);
    } finally {
      dom.restore();
    }
  });
});
