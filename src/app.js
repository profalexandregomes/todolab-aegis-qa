import { TodoStore } from './store.js';

const COLUNAS = [
  { status: 'todo', rotulo: 'A Fazer' },
  { status: 'in_progress', rotulo: 'Em Progresso' },
  { status: 'review', rotulo: 'Em Revisão' },
  { status: 'done', rotulo: 'Concluído' },
];

const store = new TodoStore();
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const feedback = document.querySelector('#todo-feedback');
const storageAlert = document.querySelector('#storage-alert');
const kanbanAlert = document.querySelector('#kanban-alert');
const wipForm = document.querySelector('#wip-form');
const wipInput = document.querySelector('#wip-limit-input');
const emptyState = document.querySelector('#empty-state');

let idArrastado = null;

function sincronizarAlertaPersistencia() {
  if (!storageAlert) return;
  const mensagem = store.erroPersistencia
    || (!store.persistenciaDisponivel
      ? 'Persistência local indisponível; operando apenas em memória.'
      : '');
  if (mensagem) {
    storageAlert.textContent = mensagem;
    storageAlert.hidden = false;
  } else {
    storageAlert.textContent = '';
    storageAlert.hidden = true;
  }
}

function exibirErro(mensagem) {
  if (feedback) {
    feedback.textContent = mensagem;
    feedback.hidden = false;
  }
  input.setAttribute('aria-invalid', 'true');
}

function limparErro() {
  if (feedback) {
    feedback.textContent = '';
    feedback.hidden = true;
  }
  input.removeAttribute('aria-invalid');
}

function exibirAvisoKanban(mensagem) {
  if (!kanbanAlert) return;
  kanbanAlert.textContent = mensagem;
  kanbanAlert.hidden = false;
}

function limparAvisoKanban() {
  if (!kanbanAlert) return;
  kanbanAlert.textContent = '';
  kanbanAlert.hidden = true;
}

function moverTarefa(id, novoStatus) {
  const resultado = store.moverStatus(id, novoStatus);
  if (!resultado.sucesso) {
    if (resultado.motivo === 'WIP_LIMIT_EXCEEDED') {
      exibirAvisoKanban(
        `Limite de WIP (Work in Progress — Trabalho em Progresso) atingido: máximo de ${resultado.limiteWip} tarefas em andamento.`
      );
    }
    render();
    return false;
  }

  limparAvisoKanban();
  render();
  return true;
}

function criarCartaoTarefa(tarefa) {
  const item = document.createElement('li');
  item.className = `todo-card ${tarefa.concluida ? 'todo--done' : ''}`;
  item.dataset.id = tarefa.id;
  item.draggable = true;
  item.setAttribute('draggable', 'true');

  item.addEventListener('dragstart', (event) => {
    idArrastado = tarefa.id;
    event.dataTransfer?.setData('text/plain', tarefa.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    item.classList.add('todo-card--dragging');
  });

  item.addEventListener('dragend', () => {
    idArrastado = null;
    item.classList.remove('todo-card--dragging');
  });

  const topRow = document.createElement('div');
  topRow.className = 'todo-card__main';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = tarefa.concluida;
  checkbox.setAttribute('aria-label', `Marcar ${tarefa.titulo} como concluída`);
  checkbox.addEventListener('change', () => {
    limparAvisoKanban();
    store.alternar(tarefa.id);
    render();
  });

  const title = document.createElement('span');
  title.className = 'todo-card__title';
  title.textContent = tarefa.titulo;

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove';
  remove.textContent = 'Remover';
  remove.setAttribute('aria-label', `Remover ${tarefa.titulo}`);
  remove.addEventListener('click', () => {
    limparAvisoKanban();
    store.remover(tarefa.id);
    render();
  });

  topRow.append(checkbox, title, remove);

  const controlsRow = document.createElement('div');
  controlsRow.className = 'todo-card__controls';

  const moveSelect = document.createElement('select');
  moveSelect.className = 'kanban-move-select';
  moveSelect.setAttribute('aria-label', `Mover ${tarefa.titulo} para coluna`);
  for (const col of COLUNAS) {
    const option = document.createElement('option');
    option.value = col.status;
    option.textContent = col.rotulo;
    moveSelect.append(option);
  }
  moveSelect.value = tarefa.status;
  moveSelect.addEventListener('change', () => {
    moverTarefa(tarefa.id, moveSelect.value);
  });

  controlsRow.append(moveSelect);
  item.append(topRow, controlsRow);
  return item;
}

function render() {
  sincronizarAlertaPersistencia();
  const tarefas = store.listar();
  emptyState.hidden = tarefas.length > 0;
  if (wipInput) {
    wipInput.value = String(store.limiteWip);
  }

  for (const { status } of COLUNAS) {
    const listaColuna = document.querySelector(`#list-${status}`);
    const contadorColuna = document.querySelector(`#count-${status}`);
    const tarefasDaColuna = tarefas.filter((tarefa) => tarefa.status === status);

    if (contadorColuna) {
      contadorColuna.textContent = status === 'in_progress'
        ? `${tarefasDaColuna.length} / ${store.limiteWip}`
        : String(tarefasDaColuna.length);
    }

    if (listaColuna) {
      listaColuna.replaceChildren();
      for (const tarefa of tarefasDaColuna) {
        listaColuna.append(criarCartaoTarefa(tarefa));
      }
    }
  }
}

for (const { status } of COLUNAS) {
  const coluna = document.querySelector(`[data-status="${status}"]`);
  if (!coluna) continue;

  coluna.addEventListener('dragover', (event) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    coluna.classList.add('kanban-col--dragover');
  });

  coluna.addEventListener('dragleave', () => {
    coluna.classList.remove('kanban-col--dragover');
  });

  coluna.addEventListener('drop', (event) => {
    event.preventDefault();
    coluna.classList.remove('kanban-col--dragover');
    const id = event.dataTransfer?.getData('text/plain') || idArrastado;
    idArrastado = null;
    if (id) moverTarefa(id, status);
  });
}

function aplicarLimiteWip() {
  if (!wipInput) return;
  const valor = Number(wipInput.value);
  const resultado = store.definirLimiteWip(valor);
  if (!resultado.sucesso) {
    exibirAvisoKanban('Informe um número inteiro positivo (>= 1) para o limite de WIP.');
    wipInput.value = String(store.limiteWip);
    return;
  }
  limparAvisoKanban();
  render();
}

if (wipForm) {
  wipForm.addEventListener('submit', (event) => {
    event.preventDefault();
    aplicarLimiteWip();
  });
}

if (wipInput) {
  wipInput.addEventListener('change', aplicarLimiteWip);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const tarefa = store.adicionar(input.value);
  if (!tarefa) {
    exibirErro(store.ultimoErro || 'Informe um título válido para a tarefa.');
    input.focus();
    return;
  }
  limparErro();
  limparAvisoKanban();
  input.value = '';
  input.focus();
  render();
});

input.addEventListener('input', () => {
  if (input.getAttribute('aria-invalid') === 'true') {
    limparErro();
  }
});

render();
