import { TodoStore, classificarVencimento } from './store.js';

const COLUNAS = [
  { status: 'todo', rotulo: 'A Fazer' },
  { status: 'in_progress', rotulo: 'Em Progresso' },
  { status: 'review', rotulo: 'Em Revisão' },
  { status: 'done', rotulo: 'Concluído' },
];

const ROTULOS_PRIORIDADE = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const ROTULOS_VENCIMENTO = {
  atrasada: 'Atrasada',
  vence_hoje: 'Vence hoje',
  proxima: 'Próxima',
  futura: 'Futura',
  concluida: 'Concluída',
  sem_prazo: '',
};

const LIMITE_TITULO = 200;
const LIMITE_AVISO_CONTADOR = 180;
const FOCO_MINUTOS = 25;
const PAUSA_MINUTOS = 5;
const FOCO_SEGUNDOS = FOCO_MINUTOS * 60;
const PAUSA_SEGUNDOS = PAUSA_MINUTOS * 60;

const store = new TodoStore();
const form = document.querySelector('#todo-form');
const input = document.querySelector('#todo-input');
const prioritySelect = document.querySelector('#todo-priority');
const dueDateInput = document.querySelector('#todo-due-date');
const estimateInput = document.querySelector('#todo-estimate');
const feedback = document.querySelector('#todo-feedback');
const charCounter = document.querySelector('#title-char-counter');
const storageAlert = document.querySelector('#storage-alert');
const kanbanAlert = document.querySelector('#kanban-alert');
const wipForm = document.querySelector('#wip-form');
const wipInput = document.querySelector('#wip-limit-input');
const searchInput = document.querySelector('#search-input');
const filterStatusSelect = document.querySelector('#filter-status');
const filterPrioritySelect = document.querySelector('#filter-priority');
const sortSelect = document.querySelector('#sort-select');
const pendingCounter = document.querySelector('#pending-counter');
const toggleAllBtn = document.querySelector('#toggle-all-btn');
const clearCompletedBtn = document.querySelector('#clear-completed-btn');
const undoBtn = document.querySelector('#undo-btn');
const filterEmptyState = document.querySelector('#filter-empty-state');
const pomodoroTimer = document.querySelector('#pomodoro-timer');
const pomodoroMode = document.querySelector('#pomodoro-mode');
const pomodoroTaskSelect = document.querySelector('#pomodoro-task');
const pomodoroStartBtn = document.querySelector('#pomodoro-start');
const pomodoroPauseBtn = document.querySelector('#pomodoro-pause');
const pomodoroResetBtn = document.querySelector('#pomodoro-reset');
const pomodoroCompleteBtn = document.querySelector('#pomodoro-complete');
const metricRate = document.querySelector('#metric-rate');
const metricDelaysWip = document.querySelector('#metric-delays-wip');
const metricEffort = document.querySelector('#metric-effort');
const exportJsonBtn = document.querySelector('#export-json-btn');
const importJsonInput = document.querySelector('#import-json-input');
const emptyState = document.querySelector('#empty-state');

let idArrastado = null;
let editingTaskId = null;
let modoPomodoro = 'foco';
let segundosRestantes = FOCO_SEGUNDOS;
let intervaloPomodoro = null;
let pomodoroTaskId = '';

function formatarRelogio(segundosTotais) {
  const min = Math.floor(Math.max(0, segundosTotais) / 60);
  const seg = Math.max(0, segundosTotais) % 60;
  return `${String(min).padStart(2, '0')}:${String(seg).padStart(2, '0')}`;
}

function atualizarVisorPomodoro() {
  if (pomodoroTimer) {
    pomodoroTimer.textContent = formatarRelogio(segundosRestantes);
  }
  if (pomodoroMode) {
    pomodoroMode.textContent = modoPomodoro === 'foco'
      ? `Foco (${FOCO_MINUTOS} min)`
      : `Pausa Curta (${PAUSA_MINUTOS} min)`;
  }
}

function pausarPomodoro() {
  if (intervaloPomodoro !== null) {
    clearInterval(intervaloPomodoro);
    intervaloPomodoro = null;
  }
  atualizarVisorPomodoro();
}

function concluirCicloPomodoro() {
  pausarPomodoro();
  if (modoPomodoro === 'foco') {
    if (pomodoroTaskId) {
      store.registrarEsforco(pomodoroTaskId, FOCO_MINUTOS);
    }
    modoPomodoro = 'pausa';
    segundosRestantes = PAUSA_SEGUNDOS;
  } else {
    modoPomodoro = 'foco';
    segundosRestantes = FOCO_SEGUNDOS;
  }
  atualizarVisorPomodoro();
  render();
}

function iniciarPomodoro() {
  if (intervaloPomodoro !== null) return;
  intervaloPomodoro = setInterval(() => {
    segundosRestantes -= 1;
    if (segundosRestantes <= 0) {
      concluirCicloPomodoro();
      return;
    }
    atualizarVisorPomodoro();
  }, 1000);
  atualizarVisorPomodoro();
}

function reiniciarPomodoro() {
  pausarPomodoro();
  modoPomodoro = 'foco';
  segundosRestantes = FOCO_SEGUNDOS;
  atualizarVisorPomodoro();
}

function sincronizarSeletorPomodoro(tarefas) {
  if (pomodoroTaskId && !tarefas.some((tarefa) => tarefa.id === pomodoroTaskId)) {
    pausarPomodoro();
    pomodoroTaskId = '';
  }

  if (!pomodoroTaskSelect) return;

  pomodoroTaskSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Selecione uma tarefa';
  pomodoroTaskSelect.append(placeholder);

  for (const tarefa of tarefas) {
    const option = document.createElement('option');
    option.value = tarefa.id;
    option.textContent = tarefa.titulo;
    pomodoroTaskSelect.append(option);
  }

  pomodoroTaskSelect.value = pomodoroTaskId;
}

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

function atualizarContadorCaracteres() {
  if (!charCounter) return;
  const tamanho = input.value.trim().length;
  if (tamanho <= LIMITE_AVISO_CONTADOR) {
    charCounter.textContent = '';
    charCounter.hidden = true;
    charCounter.classList.remove('char-counter--over');
    return;
  }
  const restantes = LIMITE_TITULO - tamanho;
  charCounter.textContent = restantes >= 0
    ? `${restantes} caracteres restantes`
    : `Excedido em ${Math.abs(restantes)} caracteres (máximo ${LIMITE_TITULO})`;
  charCounter.hidden = false;
  charCounter.classList.toggle('char-counter--over', restantes < 0);
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

function formatarDesvioEsforco(estimativaMin, esforcoRealMin) {
  if (!estimativaMin || esforcoRealMin === 0) return '';
  const desvio = esforcoRealMin - estimativaMin;
  if (desvio > 0) return `+${desvio} min`;
  if (desvio < 0) return `${desvio} min`;
  return 'no estimado';
}

function confirmarEdicaoInline(id, novoTexto) {
  const aparado = String(novoTexto ?? '').trim();
  if (!aparado) {
    store.editar(id, '');
    editingTaskId = null;
    limparAvisoKanban();
    render();
    return;
  }

  const atualizada = store.editar(id, aparado);
  if (!atualizada) {
    exibirAvisoKanban(store.ultimoErro || `O título deve ter no máximo ${LIMITE_TITULO} caracteres.`);
    return;
  }

  editingTaskId = null;
  limparAvisoKanban();
  render();
}

function criarCartaoTarefa(tarefa) {
  const item = document.createElement('li');
  item.className = `todo-card ${tarefa.concluida ? 'todo--done' : ''}`;
  item.dataset.id = tarefa.id;
  item.draggable = editingTaskId !== tarefa.id;
  item.setAttribute('draggable', String(editingTaskId !== tarefa.id));

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

  let titleNode;
  let editInputRef = null;
  if (editingTaskId === tarefa.id) {
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'todo-card__edit-input';
    editInput.value = tarefa.titulo;
    editInput.setAttribute('aria-label', `Editar título de ${tarefa.titulo}`);

    let finalizou = false;
    editInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        finalizou = true;
        editingTaskId = null;
        limparAvisoKanban();
        render();
      } else if (event.key === 'Enter') {
        event.preventDefault();
        finalizou = true;
        confirmarEdicaoInline(tarefa.id, editInput.value);
      }
    });

    editInput.addEventListener('blur', () => {
      if (finalizou) return;
      finalizou = true;
      confirmarEdicaoInline(tarefa.id, editInput.value);
    });

    titleNode = editInput;
    editInputRef = editInput;
  } else {
    const title = document.createElement('span');
    title.className = 'todo-card__title';
    title.textContent = tarefa.titulo;
    title.addEventListener('dblclick', () => {
      editingTaskId = tarefa.id;
      render();
    });
    titleNode = title;
  }

  const actionsTop = document.createElement('div');
  actionsTop.className = 'todo-card__top-actions';

  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'edit-btn';
  editBtn.textContent = 'Editar';
  editBtn.setAttribute('aria-label', `Editar ${tarefa.titulo}`);
  editBtn.addEventListener('click', () => {
    editingTaskId = tarefa.id;
    render();
  });

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'remove';
  remove.textContent = 'Remover';
  remove.setAttribute('aria-label', `Remover ${tarefa.titulo}`);
  remove.addEventListener('click', () => {
    limparAvisoKanban();
    if (pomodoroTaskId === tarefa.id) {
      pausarPomodoro();
      pomodoroTaskId = '';
    }
    if (editingTaskId === tarefa.id) {
      editingTaskId = null;
    }
    store.remover(tarefa.id);
    render();
  });

  actionsTop.append(editBtn, remove);
  topRow.append(checkbox, titleNode, actionsTop);

  const metaRow = document.createElement('div');
  metaRow.className = 'todo-card__meta';

  const prioridade = tarefa.prioridade || 'media';
  const badgePrioridade = document.createElement('span');
  badgePrioridade.className = `badge badge--prio-${prioridade}`;
  badgePrioridade.textContent = ROTULOS_PRIORIDADE[prioridade] || 'Média';
  metaRow.append(badgePrioridade);

  const statusPrazo = classificarVencimento(tarefa);
  const rotuloPrazo = ROTULOS_VENCIMENTO[statusPrazo];
  if (rotuloPrazo) {
    const badgePrazo = document.createElement('span');
    badgePrazo.className = `badge badge--due-${statusPrazo}`;
    badgePrazo.textContent = rotuloPrazo;
    metaRow.append(badgePrazo);
  }

  if (tarefa.dataVencimento) {
    const dataTexto = document.createElement('span');
    dataTexto.className = 'todo-card__date';
    dataTexto.textContent = tarefa.dataVencimento;
    metaRow.append(dataTexto);
  }

  const effortRow = document.createElement('div');
  effortRow.className = 'todo-card__effort-row';

  const estimativa = tarefa.estimativaMin ?? 0;
  const real = tarefa.esforcoRealMin ?? 0;
  const desvioTexto = formatarDesvioEsforco(estimativa, real);

  const effortLabel = document.createElement('span');
  effortLabel.className = 'todo-card__effort';
  effortLabel.textContent = `Estimativa: ${estimativa} min · Real: ${real} min`;
  effortRow.append(effortLabel);

  if (desvioTexto) {
    const desvioBadge = document.createElement('span');
    const positivo = real > estimativa;
    desvioBadge.className = `badge ${positivo ? 'badge--over-effort' : 'badge--on-effort'}`;
    desvioBadge.textContent = desvioTexto;
    effortRow.append(desvioBadge);
  }

  const controlsRow = document.createElement('div');
  controlsRow.className = 'todo-card__controls';

  const addEffortBtn = document.createElement('button');
  addEffortBtn.type = 'button';
  addEffortBtn.className = 'effort-btn';
  addEffortBtn.textContent = '+15 min';
  addEffortBtn.setAttribute('aria-label', `Registrar +15 min de esforço em ${tarefa.titulo}`);
  addEffortBtn.addEventListener('click', () => {
    store.registrarEsforco(tarefa.id, 15);
    render();
  });

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

  controlsRow.append(addEffortBtn, moveSelect);
  item.append(topRow, metaRow, effortRow, controlsRow);
  return { item, editInputRef };
}

function render() {
  sincronizarAlertaPersistencia();
  const baseTarefas = store.listar();
  sincronizarSeletorPomodoro(baseTarefas);
  atualizarVisorPomodoro();

  if (filterStatusSelect) {
    filterStatusSelect.value = store.statusFiltro;
  }

  if (pendingCounter) {
    pendingCounter.textContent = store.formatarContadorPendentes();
  }

  const temConcluidas = baseTarefas.some((tarefa) => tarefa.concluida);
  const temPendentes = baseTarefas.some((tarefa) => !tarefa.concluida);
  if (clearCompletedBtn) {
    clearCompletedBtn.hidden = !temConcluidas;
  }
  if (toggleAllBtn) {
    toggleAllBtn.textContent = baseTarefas.length > 0 && !temPendentes
      ? 'Desmarcar todas'
      : 'Marcar todas';
  }
  if (undoBtn) {
    undoBtn.disabled = store.pilhaUndo.length === 0;
  }

  const stats = store.estatisticas();
  if (metricRate) {
    metricRate.textContent = `${stats.taxaConclusao}%`;
  }
  if (metricDelaysWip) {
    metricDelaysWip.textContent = `${stats.atrasadas} atrasadas · WIP ${stats.wipAtual} / ${stats.limiteWip}`;
  }
  if (metricEffort) {
    const sinal = stats.variacaoEsforcoMin > 0 ? `+${stats.variacaoEsforcoMin}` : String(stats.variacaoEsforcoMin);
    metricEffort.textContent = `Estimado: ${stats.estimativaTotalMin} min · Real: ${stats.esforcoRealTotalMin} min (${sinal} min)`;
  }

  const tarefasVisiveis = store.filtrar({
    statusFiltro: store.statusFiltro,
    prioridade: filterPrioritySelect?.value || 'todas',
    busca: searchInput?.value || '',
    ordenar: sortSelect?.value === 'prioridade',
  });

  emptyState.hidden = baseTarefas.length > 0;
  if (filterEmptyState) {
    filterEmptyState.hidden = !(baseTarefas.length > 0 && tarefasVisiveis.length === 0);
  }
  if (wipInput) {
    wipInput.value = String(store.limiteWip);
  }

  let inputEdicaoFocar = null;
  for (const { status } of COLUNAS) {
    const listaColuna = document.querySelector(`#list-${status}`);
    const contadorColuna = document.querySelector(`#count-${status}`);
    const tarefasDaColuna = tarefasVisiveis.filter((tarefa) => tarefa.status === status);
    const totalEmProgresso = baseTarefas.filter((tarefa) => tarefa.status === 'in_progress').length;

    if (contadorColuna) {
      contadorColuna.textContent = status === 'in_progress'
        ? `${totalEmProgresso} / ${store.limiteWip}`
        : String(tarefasDaColuna.length);
    }

    if (listaColuna) {
      listaColuna.replaceChildren();
      for (const tarefa of tarefasDaColuna) {
        const { item, editInputRef } = criarCartaoTarefa(tarefa);
        listaColuna.append(item);
        if (editInputRef) {
          inputEdicaoFocar = editInputRef;
        }
      }
    }
  }

  if (inputEdicaoFocar) {
    inputEdicaoFocar.focus();
    inputEdicaoFocar.select?.();
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

if (wipInput) wipInput.addEventListener('change', aplicarLimiteWip);
if (sortSelect) sortSelect.addEventListener('change', render);
if (filterPrioritySelect) filterPrioritySelect.addEventListener('change', render);
if (searchInput) searchInput.addEventListener('input', render);

if (filterStatusSelect) {
  filterStatusSelect.addEventListener('change', () => {
    store.definirFiltroStatus(filterStatusSelect.value);
    render();
  });
}

if (toggleAllBtn) {
  toggleAllBtn.addEventListener('click', () => {
    const marcar = store.listar().some((tarefa) => !tarefa.concluida);
    store.alternarTodas(marcar);
    limparAvisoKanban();
    render();
  });
}

if (clearCompletedBtn) {
  clearCompletedBtn.addEventListener('click', () => {
    store.limparConcluidas();
    limparAvisoKanban();
    render();
  });
}

if (undoBtn) {
  undoBtn.addEventListener('click', () => {
    store.desfazer();
    limparAvisoKanban();
    render();
  });
}

if (pomodoroTaskSelect) {
  pomodoroTaskSelect.addEventListener('change', () => {
    pomodoroTaskId = pomodoroTaskSelect.value;
  });
}

if (pomodoroStartBtn) pomodoroStartBtn.addEventListener('click', iniciarPomodoro);
if (pomodoroPauseBtn) pomodoroPauseBtn.addEventListener('click', pausarPomodoro);
if (pomodoroResetBtn) pomodoroResetBtn.addEventListener('click', reiniciarPomodoro);
if (pomodoroCompleteBtn) pomodoroCompleteBtn.addEventListener('click', concluirCicloPomodoro);

if (exportJsonBtn) {
  exportJsonBtn.addEventListener('click', () => {
    const json = store.exportarJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'todolab-v1.2.0.json';
    link.click();
    URL.revokeObjectURL(url);
  });
}

if (importJsonInput) {
  importJsonInput.addEventListener('change', () => {
    const arquivo = importJsonInput.files?.[0];
    if (!arquivo) return;
    const reader = new FileReader();
    reader.onload = () => {
      const resultado = store.importarJSON(String(reader.result || ''));
      if (!resultado.sucesso) {
        exibirAvisoKanban(resultado.erros.join(' '));
      } else {
        limparAvisoKanban();
      }
      importJsonInput.value = '';
      render();
    };
    reader.readAsText(arquivo);
  });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const estimativaBruta = estimateInput?.value ? Number(estimateInput.value) : 0;
  const tarefa = store.adicionar(input.value, {
    prioridade: prioritySelect?.value,
    dataVencimento: dueDateInput?.value || null,
    estimativaMin: Number.isFinite(estimativaBruta) ? estimativaBruta : 0,
  });
  if (!tarefa) {
    exibirErro(store.ultimoErro || 'Informe um título válido para a tarefa.');
    input.focus();
    return;
  }
  limparErro();
  limparAvisoKanban();
  input.value = '';
  atualizarContadorCaracteres();
  if (prioritySelect) prioritySelect.value = 'media';
  if (dueDateInput) dueDateInput.value = '';
  if (estimateInput) estimateInput.value = '';
  input.focus();
  render();
});

input.addEventListener('input', () => {
  atualizarContadorCaracteres();
  if (input.getAttribute('aria-invalid') === 'true') {
    limparErro();
  }
});

render();
