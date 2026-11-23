import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { criarArmazenamentoMemoria } from '../helpers/storage-stub.js';
import { criarAmbienteDom } from '../helpers/dom-stub.js';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const HTML_PATH = resolve(RAIZ, 'index.html');
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

function encontrarBotao(dom, regex) {
  return dom.document.querySelectorAll('button').find((b) =>
    regex.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
  );
}

function selecionarFiltroStatus(dom, valor) {
  const select = dom.document.querySelectorAll('select').find((el) =>
    el.querySelectorAll('option').some((o) => o.value === 'ativas')
    && el.querySelectorAll('option').some((o) => o.value === 'concluidas')
  );
  if (select) {
    select.value = valor;
    select.dispatchEvent({ type: 'change' });
    return select;
  }
  const btn = dom.document.querySelectorAll('button').find((b) =>
    (b.dataset.filter || b.dataset.statusFiltro) === valor
    || b.textContent.trim().toLowerCase() === valor
  );
  if (btn) btn.click();
  return btn;
}

describe('Aceitação BDD — Issue #7 (Filtros, Busca, Contador A1, Edição Inline 200 chars e Undo)', () => {
  it('Cenários 1, 2 e 3: contador A1 imune ao filtro, filtros combinados + busca sem acento, vazio e persistência do filtro', async () => {
    const storage = criarArmazenamentoMemoria();
    const s1 = await montarAplicacao(storage);

    try {
      const selectPrioForm = s1.form.querySelector('#todo-priority')
        || s1.form.querySelectorAll('select').find((s) => s.querySelectorAll('option').some((o) => o.value === 'alta'));

      selectPrioForm.value = 'alta';
      s1.input.value = 'Revisão crítica';
      s1.form.dispatchEvent({ type: 'submit' });

      selectPrioForm.value = 'baixa';
      s1.input.value = 'Documentar manual';
      s1.form.dispatchEvent({ type: 'submit' });

      selectPrioForm.value = 'alta';
      s1.input.value = 'Tarefa já pronta';
      s1.form.dispatchEvent({ type: 'submit' });

      const tarefas = JSON.parse(storage.getItem('todolab:tarefas'));
      const pronta = tarefas.find((t) => t.titulo === 'Tarefa já pronta');
      const cbPronta = s1.dom.document.querySelector(`[data-id="${pronta.id}"] input[type="checkbox"]`);
      cbPronta.checked = true;
      cbPronta.dispatchEvent({ type: 'change' });

      selecionarFiltroStatus(s1.dom, 'concluidas');
      assert.match(s1.dom.document.body.textContent, /2 itens restantes/);
      assert.equal(s1.dom.document.querySelectorAll('[data-id]').length, 1);

      const cbDesmarcar = s1.dom.document.querySelector(`[data-id="${pronta.id}"] input[type="checkbox"]`);
      cbDesmarcar.checked = false;
      cbDesmarcar.dispatchEvent({ type: 'change' });
      assert.equal(s1.dom.document.querySelectorAll('[data-id]').length, 0);
      assert.match(s1.dom.document.body.textContent, /3 itens restantes/);

      const cbMarcarDeNovo = (() => {
        selecionarFiltroStatus(s1.dom, 'todas');
        const el = s1.dom.document.querySelector(`[data-id="${pronta.id}"] input[type="checkbox"]`);
        el.checked = true;
        el.dispatchEvent({ type: 'change' });
        return el;
      })();
      assert.ok(cbMarcarDeNovo);

      selecionarFiltroStatus(s1.dom, 'ativas');
      const filtroPrio = s1.dom.document.querySelectorAll('select').find((el) =>
        !s1.form.contains(el)
        && el.querySelectorAll('option').some((o) => o.value === 'alta')
        && el.querySelectorAll('option').some((o) => o.value === 'todas')
      );
      assert.ok(filtroPrio, 'Deve existir seletor de filtro por prioridade');
      filtroPrio.value = 'alta';
      filtroPrio.dispatchEvent({ type: 'change' });

      const campoBusca = s1.dom.document.querySelectorAll('input').find((el) => {
        if (s1.form.contains(el)) return false;
        const meta = `${el.id} ${el.name} ${el.type} ${el.getAttribute('aria-label') || ''} ${el.getAttribute('placeholder') || ''}`.toLowerCase();
        return meta.includes('busca') || meta.includes('search') || meta.includes('pesquis');
      });
      assert.ok(campoBusca, 'Deve existir campo de busca instantânea');

      campoBusca.value = 'revisao';
      campoBusca.dispatchEvent({ type: 'input' });

      const visiveis = s1.dom.document.querySelectorAll('[data-id]');
      assert.equal(visiveis.length, 1);
      assert.ok(visiveis[0].textContent.includes('Revisão crítica'));

      campoBusca.value = 'termo-inexistente-xyz';
      campoBusca.dispatchEvent({ type: 'input' });
      assert.equal(s1.dom.document.querySelectorAll('[data-id]').length, 0);
      assert.match(s1.dom.document.body.textContent.toLowerCase(), /nenhum|encontrad|filtro/);

      campoBusca.value = '';
      campoBusca.dispatchEvent({ type: 'input' });
      filtroPrio.value = 'todas';
      filtroPrio.dispatchEvent({ type: 'change' });
    } finally {
      s1.dom.restore();
    }

    const s2 = await montarAplicacao(storage);
    try {
      const seletorPersistido = s2.dom.document.querySelectorAll('select').find((el) =>
        el.querySelectorAll('option').some((o) => o.value === 'ativas')
        && el.querySelectorAll('option').some((o) => o.value === 'concluidas')
      );
      if (seletorPersistido) {
        assert.equal(seletorPersistido.value, 'ativas');
      }
      assert.equal(s2.dom.document.querySelectorAll('[data-id]').length, 2, 'Filtro Ativas deve persistir após recarregar');
    } finally {
      s2.dom.restore();
    }
  });

  it('Cenário 4: edição inline via Enter, Esc, vazio remove e preserva estado concluído', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      input.value = 'Escrever teste';
      form.dispatchEvent({ type: 'submit' });
      const [tarefa] = JSON.parse(storage.getItem('todolab:tarefas'));

      const checkbox = dom.document.querySelector(`[data-id="${tarefa.id}"] input[type="checkbox"]`);
      checkbox.checked = true;
      checkbox.dispatchEvent({ type: 'change' });

      let cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      const btnEditar = cartao.querySelectorAll('button').find((b) =>
        /editar/i.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
      );
      const spanTitulo = cartao.querySelector('.todo-card__title') || cartao.querySelector('span');
      if (btnEditar) {
        btnEditar.click();
      } else {
        spanTitulo.dispatchEvent({ type: 'dblclick' });
      }

      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      let editInput = cartao.querySelectorAll('input').find((el) => el.type !== 'checkbox');
      assert.ok(editInput, 'Modo de edição inline deve abrir um input no cartão');

      editInput.value = 'Cancelado por Esc';
      editInput.dispatchEvent({ type: 'keydown', key: 'Escape' });
      assert.equal(JSON.parse(storage.getItem('todolab:tarefas'))[0].titulo, 'Escrever teste');

      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      const btnEditar2 = cartao.querySelectorAll('button').find((b) =>
        /editar/i.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
      );
      if (btnEditar2) btnEditar2.click();
      else (cartao.querySelector('.todo-card__title') || cartao.querySelector('span')).dispatchEvent({ type: 'dblclick' });

      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      editInput = cartao.querySelectorAll('input').find((el) => el.type !== 'checkbox');
      editInput.value = '  Escrever teste E2E  ';
      editInput.dispatchEvent({ type: 'keydown', key: 'Enter' });

      const atualizada = JSON.parse(storage.getItem('todolab:tarefas'))[0];
      assert.equal(atualizada.titulo, 'Escrever teste E2E');
      assert.equal(atualizada.concluida, true);
      assert.equal(atualizada.status, 'done');

      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      const btnEditar3 = cartao.querySelectorAll('button').find((b) =>
        /editar/i.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`)
      );
      if (btnEditar3) btnEditar3.click();
      else (cartao.querySelector('.todo-card__title') || cartao.querySelector('span')).dispatchEvent({ type: 'dblclick' });

      cartao = dom.document.querySelector(`[data-id="${tarefa.id}"]`);
      editInput = cartao.querySelectorAll('input').find((el) => el.type !== 'checkbox');
      editInput.value = '   ';
      editInput.dispatchEvent({ type: 'keydown', key: 'Enter' });
      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 0);
    } finally {
      dom.restore();
    }
  });

  it('Cenários 5, 6 e XSS: contador regressivo (>180), limite 200/201, limpar concluídas, desfazer em 1 passo e anti-XSS', async () => {
    const storage = criarArmazenamentoMemoria();
    const { dom, form, input } = await montarAplicacao(storage);

    try {
      const btnLimparInicial = encontrarBotao(dom, /limpar conclu/i);
      assert.ok(btnLimparInicial, 'Botão Limpar concluídas deve existir no DOM');
      assert.equal(btnLimparInicial.hidden, true, 'Botão Limpar concluídas deve ficar oculto quando há 0 concluídas');

      input.value = 'x'.repeat(185);
      input.dispatchEvent({ type: 'input' });
      assert.match(dom.document.body.textContent, /15/);

      input.value = 'y'.repeat(201);
      form.dispatchEvent({ type: 'submit' });
      assert.equal(storage.getItem('todolab:tarefas'), null);
      assert.equal(dom.document.activeElement, input);

      input.value = 'z'.repeat(200);
      form.dispatchEvent({ type: 'submit' });
      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 1);

      const xssPayload = '<img src=x onerror=alert(1)><script>window.__xss=1</script>';
      input.value = xssPayload;
      form.dispatchEvent({ type: 'submit' });
      assert.equal(dom.window.__xss, undefined);
      const cartoes = dom.document.querySelectorAll('[data-id]');
      assert.ok(cartoes.some((c) => c.textContent.includes(xssPayload)));

      const btnMarcarTodas = encontrarBotao(dom, /marcar todas/i);
      assert.ok(btnMarcarTodas, 'Botão Marcar todas deve existir');
      btnMarcarTodas.click();
      assert.match(dom.document.body.textContent, /0 itens restantes/);
      assert.equal(encontrarBotao(dom, /limpar conclu/i).hidden, false);

      encontrarBotao(dom, /limpar conclu/i).click();
      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 0);

      const btnDesfazer = encontrarBotao(dom, /desfazer|undo/i);
      assert.ok(btnDesfazer, 'Botão Desfazer deve existir');
      btnDesfazer.click();
      assert.equal(JSON.parse(storage.getItem('todolab:tarefas')).length, 2, 'Desfazer deve restaurar operação em lote em 1 passo');
    } finally {
      dom.restore();
    }
  });
});
