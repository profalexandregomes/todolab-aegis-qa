const CHAVE = 'todolab:tarefas';
let sequenciaId = 0;

function gerarIdUnico() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  sequenciaId += 1;
  return `tarefa-${Date.now()}-${sequenciaId}-${Math.random().toString(36).slice(2, 8)}`;
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
  constructor(armazenamento = globalThis.localStorage) {
    this.armazenamento = armazenamento;
    this.ultimoErro = null;
    this.tarefas = this.carregar();
  }

  carregar() {
    if (!this.armazenamento) return [];
    const bruto = this.armazenamento.getItem(CHAVE);
    if (!bruto) return [];
    return JSON.parse(bruto);
  }

  salvar() {
    if (!this.armazenamento) return;
    this.armazenamento.setItem(CHAVE, JSON.stringify(this.tarefas));
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
