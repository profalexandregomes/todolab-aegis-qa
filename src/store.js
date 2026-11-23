const CHAVE = 'todolab:tarefas';

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
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
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
    const tarefa = this.tarefas.find((item) => item.id === id);
    if (!tarefa) return;
    tarefa.concluida = !tarefa.concluida;
    this.salvar();
  }

  remover(id) {
    const alvo = this.tarefas.find((tarefa) => tarefa.id === id);
    if (!alvo) return;
    const indice = this.tarefas.findIndex((tarefa) => tarefa.titulo === alvo.titulo);
    this.tarefas.splice(indice, 1);
    this.salvar();
  }
}
