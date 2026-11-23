const CHAVE = 'todolab:tarefas';
const CHAVE_CONFIG = 'todolab:config';
const STATUS_VALIDOS = new Set(['todo', 'in_progress', 'review', 'done']);
let sequenciaId = 0;

function obterArmazenamentoPadrao() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function temInterfaceArmazenamento(armazenamento) {
  return Boolean(
    armazenamento
    && typeof armazenamento.getItem === 'function'
    && typeof armazenamento.setItem === 'function'
  );
}

function classificarErroArmazenamento(erro, operacao) {
  const nome = erro?.name || '';
  if (nome === 'QuotaExceededError' || nome === 'NS_ERROR_DOM_QUOTA_REACHED') {
    return {
      disponivel: true,
      mensagem: 'Limite de armazenamento local (QuotaExceededError) atingido; alterações mantidas apenas em memória.',
    };
  }
  if (nome === 'SecurityError') {
    return {
      disponivel: false,
      mensagem: 'Armazenamento local bloqueado pelo navegador (SecurityError); operando apenas em memória.',
    };
  }
  const acao = operacao === 'leitura' ? 'ler' : 'gravar';
  return {
    disponivel: false,
    mensagem: `Falha ao ${acao} no armazenamento local; operando apenas em memória.`,
  };
}

function gerarIdUnico() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  sequenciaId += 1;
  return `tarefa-${Date.now()}-${sequenciaId}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizarRegistroArmazenado(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  if (typeof item.titulo !== 'string') return null;
  const titulo = item.titulo.trim();
  if (!titulo) return null;

  const status = STATUS_VALIDOS.has(item.status)
    ? item.status
    : (item.concluida ? 'done' : 'todo');
  const concluida = status === 'done';
  const criadaEm = typeof item.criadaEm === 'string' && item.criadaEm
    ? item.criadaEm
    : new Date().toISOString();
  const atualizadaEm = typeof item.atualizadaEm === 'string' && item.atualizadaEm
    ? item.atualizadaEm
    : criadaEm;

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : gerarIdUnico(),
    titulo,
    concluida,
    status,
    criadaEm,
    atualizadaEm,
  };
}

function extrairTituloNormalizado(entrada) {
  const bruto = typeof entrada === 'string'
    ? entrada
    : (entrada && typeof entrada === 'object' && !Array.isArray(entrada) ? entrada.titulo : null);

  if (typeof bruto !== 'string') {
    return {
      erro: 'Informe um título textual válido para a tarefa.',
      titulo: null,
    };
  }

  const titulo = bruto.trim();
  if (!titulo) {
    return {
      erro: 'O título da tarefa não pode estar vazio nem conter apenas espaços.',
      titulo: null,
    };
  }

  return { erro: null, titulo };
}

function criarTarefa(titulo, opcoes = {}) {
  const status = STATUS_VALIDOS.has(opcoes.status) ? opcoes.status : 'todo';
  const agora = new Date().toISOString();
  return {
    id: gerarIdUnico(),
    titulo,
    concluida: status === 'done',
    status,
    criadaEm: agora,
    atualizadaEm: agora,
  };
}

export class TodoStore {
  constructor(armazenamento = obterArmazenamentoPadrao(), opcoes = {}) {
    this.armazenamento = armazenamento;
    this.ultimoErro = null;
    this.erroPersistencia = null;
    this.persistenciaDisponivel = temInterfaceArmazenamento(this.armazenamento);
    this.limiteWip = this.carregarLimiteWip(opcoes.limiteWip);
    this.tarefas = this.carregar();
  }

  carregarLimiteWip(padrao = 2) {
    const limitePadrao = Number.isInteger(padrao) && padrao >= 1 ? padrao : 2;
    if (!temInterfaceArmazenamento(this.armazenamento)) return limitePadrao;
    try {
      const bruto = this.armazenamento.getItem(CHAVE_CONFIG);
      if (!bruto) return limitePadrao;
      const cfg = JSON.parse(bruto);
      return Number.isInteger(cfg?.limiteWip) && cfg.limiteWip >= 1 ? cfg.limiteWip : limitePadrao;
    } catch {
      return limitePadrao;
    }
  }

  carregar() {
    if (!temInterfaceArmazenamento(this.armazenamento)) {
      this.persistenciaDisponivel = false;
      this.erroPersistencia = 'Armazenamento local indisponível; operando apenas em memória.';
      return [];
    }

    let bruto;
    try {
      bruto = this.armazenamento.getItem(CHAVE);
      this.persistenciaDisponivel = true;
    } catch (erro) {
      const diagnostico = classificarErroArmazenamento(erro, 'leitura');
      this.persistenciaDisponivel = diagnostico.disponivel;
      this.erroPersistencia = diagnostico.mensagem;
      this.ultimoErro = diagnostico.mensagem;
      return [];
    }

    if (!bruto) {
      this.erroPersistencia = null;
      return [];
    }

    let analisado;
    try {
      analisado = JSON.parse(bruto);
    } catch {
      const msg = 'Dados corrompidos encontrados no armazenamento local; a lista foi restaurada vazia com segurança.';
      this.erroPersistencia = msg;
      this.ultimoErro = msg;
      return [];
    }

    if (!Array.isArray(analisado)) {
      const msg = 'Estrutura incompatível encontrada no armazenamento local; a lista foi reiniciada com segurança.';
      this.erroPersistencia = msg;
      this.ultimoErro = msg;
      return [];
    }

    const validas = analisado.map(normalizarRegistroArmazenado).filter(Boolean);
    if (validas.length !== analisado.length) {
      const msg = 'Registros inválidos foram descartados durante a restauração do armazenamento local.';
      this.erroPersistencia = msg;
      this.ultimoErro = msg;
    } else {
      this.erroPersistencia = null;
    }

    return validas;
  }

  salvar() {
    if (!temInterfaceArmazenamento(this.armazenamento)) {
      this.persistenciaDisponivel = false;
      this.erroPersistencia = 'Armazenamento local indisponível; alterações mantidas apenas em memória.';
      return false;
    }

    try {
      this.armazenamento.setItem(CHAVE, JSON.stringify(this.tarefas));
      this.persistenciaDisponivel = true;
      this.erroPersistencia = null;
      this.ultimoErro = null;
      return true;
    } catch (erro) {
      const diagnostico = classificarErroArmazenamento(erro, 'escrita');
      this.persistenciaDisponivel = diagnostico.disponivel;
      this.erroPersistencia = diagnostico.mensagem;
      this.ultimoErro = diagnostico.mensagem;
      return false;
    }
  }

  listar() {
    return [...this.tarefas];
  }

  adicionar(entrada, opcoes = {}) {
    const { erro, titulo } = extrairTituloNormalizado(entrada);
    if (erro) {
      this.ultimoErro = erro;
      return null;
    }

    const opcoesCombinadas = entrada && typeof entrada === 'object' && !Array.isArray(entrada)
      ? { ...entrada, ...opcoes }
      : opcoes;

    this.ultimoErro = null;
    const tarefa = criarTarefa(titulo, opcoesCombinadas);
    this.tarefas.push(tarefa);
    this.salvar();
    return tarefa;
  }

  alternar(id) {
    if (id == null || id === '') return;
    const tarefa = this.tarefas.find((item) => item.id === id);
    if (!tarefa) return;
    tarefa.concluida = !tarefa.concluida;
    tarefa.status = tarefa.concluida ? 'done' : 'todo';
    tarefa.atualizadaEm = new Date().toISOString();
    this.salvar();
  }

  moverStatus(id, novoStatus) {
    if (id == null || id === '' || !STATUS_VALIDOS.has(novoStatus)) {
      return { sucesso: false, motivo: 'INVALID_STATUS_OR_ID' };
    }

    const tarefa = this.tarefas.find((item) => item.id === id);
    if (!tarefa) {
      return { sucesso: false, motivo: 'NOT_FOUND' };
    }

    if (tarefa.status === novoStatus) {
      return { sucesso: true, tarefa };
    }

    if (novoStatus === 'in_progress') {
      const emProgresso = this.tarefas.filter((item) => item.status === 'in_progress').length;
      if (emProgresso >= this.limiteWip) {
        this.ultimoErro = `Limite de WIP (Work in Progress — Trabalho em Progresso) atingido (${emProgresso}/${this.limiteWip}).`;
        return {
          sucesso: false,
          motivo: 'WIP_LIMIT_EXCEEDED',
          limiteWip: this.limiteWip,
        };
      }
    }

    tarefa.status = novoStatus;
    tarefa.concluida = novoStatus === 'done';
    tarefa.atualizadaEm = new Date().toISOString();
    this.ultimoErro = null;
    this.salvar();
    return { sucesso: true, tarefa };
  }

  definirLimiteWip(n) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
      return { sucesso: false, limiteWip: this.limiteWip };
    }

    this.limiteWip = n;
    if (temInterfaceArmazenamento(this.armazenamento)) {
      try {
        this.armazenamento.setItem(CHAVE_CONFIG, JSON.stringify({ limiteWip: this.limiteWip }));
      } catch (erro) {
        const diagnostico = classificarErroArmazenamento(erro, 'escrita');
        this.persistenciaDisponivel = diagnostico.disponivel;
        this.erroPersistencia = diagnostico.mensagem;
        this.ultimoErro = diagnostico.mensagem;
      }
    }
    return { sucesso: true, limiteWip: this.limiteWip };
  }

  remover(id) {
    if (id == null || id === '') return false;
    const indice = this.tarefas.findIndex((tarefa) => tarefa.id === id);
    if (indice === -1) return false;
    this.tarefas.splice(indice, 1);
    this.salvar();
    return true;
  }
}
