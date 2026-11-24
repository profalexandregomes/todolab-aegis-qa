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

function criarNo(tag, props = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(props)) {
    if (valor == null || chave === 'value') continue;
    if (chave === 'className' || chave === 'textContent' || chave === 'checked' || chave === 'type') {
      no[chave] = valor;
    } else {
      no.setAttribute(chave, String(valor));
    }
  }
  if (filhos.length > 0) no.append(...filhos);
  if (props.value != null) no.value = props.value;
  return no;
}

function sincronizarSeletorPomodoro(tarefas) {
  if (pomodoroTaskId && !tarefas.some((tarefa) => tarefa.id === pomodoroTaskId)) {
    pausarPomodoro();
    pomodoroTaskId = '';
  }
  if (!pomodoroTaskSelect) return;

  pomodoroTaskSelect.replaceChildren(
    criarNo('option', { value: '', textContent: 'Selecione uma tarefa' }),
    ...tarefas.map((t) => criarNo('option', { value: t.id, textContent: t.titulo }))
  );
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

function confirmarEdicaoInline(id, novoTexto, camposExtras = {}) {
  const aparado = String(novoTexto ?? '').trim();
  if (!aparado) {
    store.editar(id, '');
    editingTaskId = null;
    limparAvisoKanban();
    render();
    return;
  }

  const atualizada = store.editar(id, aparado, camposExtras);
  if (!atualizada) {
    exibirAvisoKanban(store.ultimoErro || `O título deve ter no máximo ${LIMITE_TITULO} caracteres.`);
    return;
  }

  editingTaskId = null;
  limparAvisoKanban();
  render();
}

function criarPainelEdicao(tarefa, prioridade) {
  const editInput = criarNo('input', {
    type: 'text', className: 'todo-card__edit-input', value: tarefa.titulo,
    maxlength: LIMITE_TITULO, 'aria-label': `Editar título de ${tarefa.titulo}`,
  });
  const editPriority = criarNo('select', {
    className: 'todo-card__edit-priority', 'aria-label': `Prioridade de ${tarefa.titulo}`, value: prioridade,
  }, ...Object.entries(ROTULOS_PRIORIDADE).map(([value, textContent]) => criarNo('option', { value, textContent })));
  const editDate = criarNo('input', {
    type: 'date', className: 'todo-card__edit-date', value: tarefa.dataVencimento || '',
    'aria-label': `Prazo de ${tarefa.titulo}`,
  });
  const numOpts = (cls, val, label) => criarNo('input', {
    type: 'number', className: cls, min: 0, step: 5, value: String(val ?? 0), 'aria-label': label,
  });
  const editEstimate = numOpts('todo-card__edit-estimate', tarefa.estimativaMin, `Estimativa em minutos de ${tarefa.titulo}`);
  const editReal = numOpts('todo-card__edit-real', tarefa.esforcoRealMin, `Esforço real em minutos de ${tarefa.titulo}`);
  const saveBtn = criarNo('button', { type: 'button', className: 'save-edit-btn', textContent: 'Salvar' });
  const cancelBtn = criarNo('button', { type: 'button', className: 'cancel-edit-btn', textContent: 'Cancelar' });
  const lerNum = (el) => (Number.isFinite(Number(el.value)) && el.value.trim() !== '' ? Number(el.value) : 0);
  const salvar = () => confirmarEdicaoInline(tarefa.id, editInput.value, {
    prioridade: editPriority.value, dataVencimento: editDate.value || null,
    estimativaMin: lerNum(editEstimate), esforcoRealMin: lerNum(editReal),
  });
  const cancelar = () => { editingTaskId = null; limparAvisoKanban(); render(); };
  const aoTecla = (e) => {
    if (e.key === 'Escape') { e.preventDefault?.(); cancelar(); }
    else if (e.key === 'Enter') { e.preventDefault(); salvar(); }
  };
  for (const campo of [editInput, editPriority, editDate, editEstimate, editReal]) campo.addEventListener('keydown', aoTecla);
  saveBtn.addEventListener('click', salvar);
  cancelBtn.addEventListener('click', cancelar);
  const campo = (rotulo, ctrl) => criarNo('label', { className: 'todo-card__edit-field' },
    criarNo('span', { className: 'todo-card__edit-label', textContent: rotulo }), ctrl);
  const editPanel = criarNo('div', { className: 'todo-card__edit-panel' },
    editInput,
    criarNo('div', { className: 'todo-card__edit-grid' },
      campo('Prioridade', editPriority), campo('Prazo', editDate),
      campo('Estimativa (min)', editEstimate), campo('Esforço Real (min)', editReal)),
    criarNo('div', { className: 'todo-card__edit-actions' }, saveBtn, cancelBtn)
  );
  return { editPanel, editInput };
}

function criarCartaoTarefa(tarefa) {
  const emEdicao = editingTaskId === tarefa.id;
  const item = criarNo('li', {
    className: `todo-card ${tarefa.concluida ? 'todo--done' : ''}`,
    draggable: String(!emEdicao),
  });
  item.dataset.id = tarefa.id;
  item.draggable = !emEdicao;

  item.addEventListener('dragstart', (event) => {
    idArrastado = tarefa.id;
    event.dataTransfer?.setData('text/plain', tarefa.id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
    item.classList.add('todo-card--dragging');
  });
  item.addEventListener('dragend', () => {
    idArrastado = null;
    item.classList.remove('todo-card--dragging');
  });

  const checkbox = criarNo('input', {
    type: 'checkbox',
    checked: tarefa.concluida,
    'aria-label': `Marcar ${tarefa.titulo} como concluída`,
  });
  checkbox.addEventListener('change', () => {
    limparAvisoKanban();
    store.alternar(tarefa.id);
    render();
  });

  const prioridade = tarefa.prioridade || 'media';
  const headerLeft = criarNo('div', { className: 'todo-card__header-left' },
    checkbox,
    criarNo('span', { className: `badge badge--prio-${prioridade}`, textContent: ROTULOS_PRIORIDADE[prioridade] || 'Média' })
  );
  const statusPrazo = classificarVencimento(tarefa);
  const rotuloPrazo = ROTULOS_VENCIMENTO[statusPrazo];
  if (rotuloPrazo) {
    headerLeft.append(criarNo('span', { className: `badge badge--due-${statusPrazo}`, textContent: rotuloPrazo }));
  }

  const actionsTop = criarNo('div', { className: 'todo-card__top-actions' });
  if (!emEdicao) {
    const editBtn = criarNo('button', {
      type: 'button',
      className: 'edit-btn',
      textContent: 'Editar',
      'aria-label': `Editar ${tarefa.titulo}`,
    });
    editBtn.addEventListener('click', () => {
      editingTaskId = tarefa.id;
      render();
    });
    actionsTop.append(editBtn);
  }

  const remove = criarNo('button', {
    type: 'button',
    className: 'remove',
    textContent: 'Remover',
    'aria-label': `Remover ${tarefa.titulo}`,
  });
  remove.addEventListener('click', () => {
    limparAvisoKanban();
    if (pomodoroTaskId === tarefa.id) {
      pausarPomodoro();
      pomodoroTaskId = '';
    }
    if (editingTaskId === tarefa.id) editingTaskId = null;
    store.remover(tarefa.id);
    render();
  });
  actionsTop.append(remove);

  const header = criarNo('div', { className: 'todo-card__header' }, headerLeft, actionsTop);
  const body = criarNo('div', { className: 'todo-card__body' });

  let editInputRef = null;
  if (emEdicao) {
    const { editPanel, editInput } = criarPainelEdicao(tarefa, prioridade);
    body.append(editPanel);
    editInputRef = editInput;
  } else {
    const title = criarNo('span', { className: 'todo-card__title', textContent: tarefa.titulo });
    title.addEventListener('dblclick', () => {
      editingTaskId = tarefa.id;
      render();
    });
    body.append(title);
    if (tarefa.dataVencimento) {
      body.append(criarNo('span', { className: 'todo-card__date', textContent: tarefa.dataVencimento }));
    }
  }

  const estimativa = tarefa.estimativaMin ?? 0;
  const real = tarefa.esforcoRealMin ?? 0;
  const desvioTexto = formatarDesvioEsforco(estimativa, real);
  const effortRow = criarNo('div', { className: 'todo-card__effort-row' },
    criarNo('span', { className: 'todo-card__effort', textContent: `Estimativa: ${estimativa} min · Real: ${real} min` })
  );
  if (desvioTexto) {
    effortRow.append(criarNo('span', {
      className: `badge ${real > estimativa ? 'badge--over-effort' : 'badge--on-effort'}`,
      textContent: desvioTexto,
    }));
  }

  const addEffortBtn = criarNo('button', {
    type: 'button',
    className: 'effort-btn',
    textContent: '+15 min',
    'aria-label': `Registrar +15 min de esforço em ${tarefa.titulo}`,
  });
  addEffortBtn.addEventListener('click', () => {
    store.registrarEsforco(tarefa.id, 15);
    render();
  });

  const moveSelect = criarNo('select', {
    className: 'kanban-move-select',
    'aria-label': `Mover ${tarefa.titulo} para coluna`,
    value: tarefa.status,
  }, ...COLUNAS.map((col) => criarNo('option', { value: col.status, textContent: col.rotulo })));
  moveSelect.addEventListener('change', () => moverTarefa(tarefa.id, moveSelect.value));

  const controlsRow = criarNo('div', { className: 'todo-card__controls' }, addEffortBtn, moveSelect);
  item.append(header, body, effortRow, controlsRow);
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
