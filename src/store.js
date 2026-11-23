const CHAVE = 'todolab:tarefas';
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

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : gerarIdUnico(),
    titulo,
    concluida: Boolean(item.concluida),
    criadaEm: typeof item.criadaEm === 'string' && item.criadaEm ? item.criadaEm : new Date().toISOString(),
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

function criarTarefa(titulo) {
  return {
    id: gerarIdUnico(),
    titulo,
    concluida: false,
    criadaEm: new Date().toISOString(),
  };
}

export class TodoStore {
  constructor(armazenamento = obterArmazenamentoPadrao()) {
    this.armazenamento = armazenamento;
    this.ultimoErro = null;
    this.erroPersistencia = null;
    this.persistenciaDisponivel = temInterfaceArmazenamento(this.armazenamento);
    this.tarefas = this.carregar();
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

  adicionar(entrada) {
    const { erro, titulo } = extrairTituloNormalizado(entrada);
    if (erro) {
      this.ultimoErro = erro;
      return null;
    }

    this.ultimoErro = null;
    const tarefa = criarTarefa(titulo);
    this.tarefas.push(tarefa);
    this.salvar();
    return tarefa;
  }

  alternar(id) {
    if (id == null || id === '') return;
    const tarefa = this.tarefas.find((item) => item.id === id);
    if (!tarefa) return;
    tarefa.concluida = !tarefa.concluida;
    this.salvar();
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
