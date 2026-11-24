const CHAVE = 'todolab:tarefas';
const CHAVE_CONFIG = 'todolab:config';
const STATUS_VALIDOS = new Set(['todo', 'in_progress', 'review', 'done']);
const PRIORIDADES_VALIDAS = new Set(['alta', 'media', 'baixa']);
const FILTROS_STATUS_VALIDOS = new Set(['todas', 'ativas', 'concluidas']);
const PESO_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };
const LIMITE_TITULO = 200;
const LIMITE_IMPORTACAO_TAREFAS = 5000;
const VERSAO_SCHEMA = '1.2.0';
const MS_POR_DIA = 86_400_000;
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

function normalizarMinutosNaoNegativos(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor) || valor < 0) {
    return 0;
  }
  return valor;
}

function normalizarPrioridade(valor) {
  return PRIORIDADES_VALIDAS.has(valor) ? valor : 'media';
}

function normalizarDataVencimento(valor) {
  if (typeof valor !== 'string') return null;
  const texto = valor.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!match) return null;

  const ano = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));
  if (
    dataUtc.getUTCFullYear() !== ano
    || dataUtc.getUTCMonth() !== mes - 1
    || dataUtc.getUTCDate() !== dia
  ) {
    return null;
  }

  return texto;
}

function extrairDiaCivilUtc(dataReferencia) {
  if (dataReferencia instanceof Date && !Number.isNaN(dataReferencia.getTime())) {
    return Date.UTC(
      dataReferencia.getFullYear(),
      dataReferencia.getMonth(),
      dataReferencia.getDate()
    );
  }
  if (typeof dataReferencia === 'string') {
    const dataIso = normalizarDataVencimento(dataReferencia);
    if (dataIso) {
      const [ano, mes, dia] = dataIso.split('-').map(Number);
      return Date.UTC(ano, mes - 1, dia);
    }
    const convertida = new Date(dataReferencia);
    if (!Number.isNaN(convertida.getTime())) {
      return Date.UTC(
        convertida.getFullYear(),
        convertida.getMonth(),
        convertida.getDate()
      );
    }
  }
  const hoje = new Date();
  return Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
}

export function classificarVencimento(tarefa, dataReferencia = new Date()) {
  if (!tarefa || tarefa.concluida === true || tarefa.status === 'done') {
    return 'concluida';
  }

  const dataVencimento = normalizarDataVencimento(tarefa.dataVencimento);
  if (!dataVencimento) {
    return 'sem_prazo';
  }

  const [ano, mes, dia] = dataVencimento.split('-').map(Number);
  const vencimentoUtc = Date.UTC(ano, mes - 1, dia);
  const referenciaUtc = extrairDiaCivilUtc(dataReferencia);
  const diferencaDias = Math.round((vencimentoUtc - referenciaUtc) / MS_POR_DIA);

  if (diferencaDias < 0) return 'atrasada';
  if (diferencaDias === 0) return 'vence_hoje';
  if (diferencaDias <= 3) return 'proxima';
  return 'futura';
}

export function ordenarTarefas(tarefas = []) {
  return [...tarefas].sort((a, b) => {
    const concluidaA = a?.concluida || a?.status === 'done' ? 1 : 0;
    const concluidaB = b?.concluida || b?.status === 'done' ? 1 : 0;
    if (concluidaA !== concluidaB) return concluidaA - concluidaB;

    const pesoA = PESO_PRIORIDADE[normalizarPrioridade(a?.prioridade)];
    const pesoB = PESO_PRIORIDADE[normalizarPrioridade(b?.prioridade)];
    if (pesoA !== pesoB) return pesoA - pesoB;

    const criadaA = Date.parse(a?.criadaEm || '') || 0;
    const criadaB = Date.parse(b?.criadaEm || '') || 0;
    return criadaA - criadaB;
  });
}

export function calcularEstatisticas(tarefas = [], dataReferencia = new Date(), limiteWip = 2) {
  const lista = Array.isArray(tarefas) ? tarefas : [];
  const total = lista.length;
  const porColuna = { todo: 0, in_progress: 0, review: 0, done: 0 };
  const porPrioridade = { alta: 0, media: 0, baixa: 0 };

  let concluidas = 0;
  let atrasadas = 0;
  let venceHoje = 0;
  let proximas = 0;
  let estimativaTotalMin = 0;
  let esforcoRealTotalMin = 0;

  for (const tarefa of lista) {
    if (!tarefa || typeof tarefa !== 'object') continue;
    const status = STATUS_VALIDOS.has(tarefa.status)
      ? tarefa.status
      : (tarefa.concluida ? 'done' : 'todo');
    const concluida = Boolean(tarefa.concluida || status === 'done');
    if (concluida) concluidas += 1;

    porColuna[status] += 1;
    porPrioridade[normalizarPrioridade(tarefa.prioridade)] += 1;

    const prazo = classificarVencimento({ ...tarefa, concluida, status }, dataReferencia);
    if (prazo === 'atrasada') atrasadas += 1;
    else if (prazo === 'vence_hoje') venceHoje += 1;
    else if (prazo === 'proxima') proximas += 1;

    estimativaTotalMin += normalizarMinutosNaoNegativos(tarefa.estimativaMin);
    esforcoRealTotalMin += normalizarMinutosNaoNegativos(tarefa.esforcoRealMin);
  }

  const pendentes = total - concluidas;
  const taxaConclusao = total === 0 ? 0 : Number(((concluidas / total) * 100).toFixed(1));
  const wipAtual = porColuna.in_progress;
  const limiteSeguro = Number.isInteger(limiteWip) && limiteWip >= 1 ? limiteWip : 2;
  const wipExcedido = wipAtual > limiteSeguro;
  const variacaoEsforcoMin = esforcoRealTotalMin - estimativaTotalMin;

  return {
    total,
    pendentes,
    concluidas,
    taxaConclusao,
    porColuna,
    porPrioridade,
    atrasadas,
    venceHoje,
    proximas,
    wipAtual,
    limiteWip: limiteSeguro,
    wipExcedido,
    estimativaTotalMin,
    esforcoRealTotalMin,
    variacaoEsforcoMin,
  };
}

export function validarSchemaImportacao(payload) {
  const erros = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { valido: false, erros: ['Payload raiz inválido: esperado objeto JSON.'], dadosSanitizados: null };
  }

  if (payload.produto !== 'TodoLab') {
    erros.push('Produto inválido no arquivo (esperado "TodoLab").');
  }
  if (payload.versaoSchema !== VERSAO_SCHEMA) {
    erros.push(`Versão de esquema incompatível: esperado "${VERSAO_SCHEMA}".`);
  }
  if (!Array.isArray(payload.tarefas)) {
    erros.push('Campo "tarefas" deve ser um array.');
    return { valido: false, erros, dadosSanitizados: null };
  }
  if (payload.tarefas.length > LIMITE_IMPORTACAO_TAREFAS) {
    erros.push(`Limite máximo de ${LIMITE_IMPORTACAO_TAREFAS} tarefas excedido na importação.`);
    return { valido: false, erros, dadosSanitizados: null };
  }

  const limiteWip = Number.isInteger(payload.limiteWip) && payload.limiteWip >= 1 ? payload.limiteWip : 2;
  const tarefasSanitizadas = [];

  for (let i = 0; i < payload.tarefas.length; i += 1) {
    const item = payload.tarefas[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      erros.push(`Tarefa na posição ${i} não é um objeto válido.`);
      continue;
    }

    if (typeof item.id !== 'string' || !item.id.trim()) {
      erros.push(`Tarefa na posição ${i} possui "id" inválido.`);
    }

    const { erro: erroTitulo, titulo } = extrairTituloNormalizado(item.titulo);
    if (erroTitulo) {
      erros.push(`Tarefa na posição ${i}: ${erroTitulo}`);
    }

    if (typeof item.concluida !== 'boolean') {
      erros.push(`Tarefa na posição ${i} possui campo "concluida" não booleano.`);
    }

    if (!STATUS_VALIDOS.has(item.status)) {
      erros.push(`Tarefa na posição ${i} possui "status" inválido.`);
    }

    if (!PRIORIDADES_VALIDAS.has(item.prioridade)) {
      erros.push(`Tarefa na posição ${i} possui "prioridade" inválida.`);
    }

    let dataVencimento = null;
    if (item.dataVencimento !== undefined && item.dataVencimento !== null && item.dataVencimento !== '') {
      dataVencimento = normalizarDataVencimento(item.dataVencimento);
      if (!dataVencimento) {
        erros.push(`Tarefa na posição ${i} possui "dataVencimento" inválida.`);
      }
    }

    if (typeof item.estimativaMin !== 'number' || !Number.isFinite(item.estimativaMin) || item.estimativaMin < 0) {
      erros.push(`Tarefa na posição ${i} possui "estimativaMin" inválida.`);
    }

    if (typeof item.esforcoRealMin !== 'number' || !Number.isFinite(item.esforcoRealMin) || item.esforcoRealMin < 0) {
      erros.push(`Tarefa na posição ${i} possui "esforcoRealMin" inválido.`);
    }

    if (erros.length === 0) {
      const agora = new Date().toISOString();
      const criadaEm = typeof item.criadaEm === 'string' && item.criadaEm ? item.criadaEm : agora;
      const atualizadaEm = typeof item.atualizadaEm === 'string' && item.atualizadaEm ? item.atualizadaEm : criadaEm;

      tarefasSanitizadas.push({
        id: item.id.trim(),
        titulo,
        concluida: item.status === 'done' ? true : item.concluida,
        status: item.status,
        prioridade: item.prioridade,
        dataVencimento,
        estimativaMin: item.estimativaMin,
        esforcoRealMin: item.esforcoRealMin,
        criadaEm,
        atualizadaEm,
      });
    }
  }

  if (erros.length > 0) {
    return { valido: false, erros, dadosSanitizados: null };
  }

  return {
    valido: true,
    erros: [],
    dadosSanitizados: {
      produto: 'TodoLab',
      versaoSchema: VERSAO_SCHEMA,
      limiteWip,
      tarefas: tarefasSanitizadas,
    },
  };
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
    prioridade: normalizarPrioridade(item.prioridade),
    dataVencimento: normalizarDataVencimento(item.dataVencimento),
    estimativaMin: normalizarMinutosNaoNegativos(item.estimativaMin),
    esforcoRealMin: normalizarMinutosNaoNegativos(item.esforcoRealMin),
    criadaEm,
    atualizadaEm,
  };
}

function normalizarTextoBusca(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

  if (titulo.length > LIMITE_TITULO) {
    return {
      erro: `O título da tarefa deve ter no máximo ${LIMITE_TITULO} caracteres.`,
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
    prioridade: normalizarPrioridade(opcoes.prioridade),
    dataVencimento: normalizarDataVencimento(opcoes.dataVencimento),
    estimativaMin: normalizarMinutosNaoNegativos(opcoes.estimativaMin),
    esforcoRealMin: normalizarMinutosNaoNegativos(opcoes.esforcoRealMin),
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
    this.pilhaUndo = [];
    const config = this.carregarConfiguracao(opcoes);
    this.limiteWip = config.limiteWip;
    this.statusFiltro = config.statusFiltro;
    this.tarefas = this.carregar();
  }

  carregarConfiguracao(opcoes = {}) {
    const limitePadrao = Number.isInteger(opcoes.limiteWip) && opcoes.limiteWip >= 1 ? opcoes.limiteWip : 2;
    const filtroPadrao = FILTROS_STATUS_VALIDOS.has(opcoes.statusFiltro) ? opcoes.statusFiltro : 'todas';
    const padrao = { limiteWip: limitePadrao, statusFiltro: filtroPadrao };
    if (!temInterfaceArmazenamento(this.armazenamento)) return padrao;
    try {
      const bruto = this.armazenamento.getItem(CHAVE_CONFIG);
      if (!bruto) return padrao;
      const cfg = JSON.parse(bruto);
      return {
        limiteWip: Number.isInteger(cfg?.limiteWip) && cfg.limiteWip >= 1 ? cfg.limiteWip : limitePadrao,
        statusFiltro: FILTROS_STATUS_VALIDOS.has(cfg?.statusFiltro) ? cfg.statusFiltro : filtroPadrao,
      };
    } catch {
      return padrao;
    }
  }

  salvarConfiguracao() {
    if (!temInterfaceArmazenamento(this.armazenamento)) return;
    try {
      this.armazenamento.setItem(
        CHAVE_CONFIG,
        JSON.stringify({ limiteWip: this.limiteWip, statusFiltro: this.statusFiltro })
      );
    } catch (erro) {
      const diagnostico = classificarErroArmazenamento(erro, 'escrita');
      this.persistenciaDisponivel = diagnostico.disponivel;
      this.erroPersistencia = diagnostico.mensagem;
      this.ultimoErro = diagnostico.mensagem;
    }
  }

  registrarSnapshotUndo() {
    this.pilhaUndo.push(this.tarefas.map((item) => ({ ...item })));
  }

  definirFiltroStatus(filtro) {
    if (!FILTROS_STATUS_VALIDOS.has(filtro)) return false;
    this.statusFiltro = filtro;
    this.salvarConfiguracao();
    return true;
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

    this.registrarSnapshotUndo();
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
    this.registrarSnapshotUndo();
    tarefa.concluida = !tarefa.concluida;
    tarefa.status = tarefa.concluida ? 'done' : 'todo';
    tarefa.atualizadaEm = new Date().toISOString();
    this.salvar();
  }

  editar(id, novoTitulo, camposExtras = {}) {
    if (id == null || id === '') return null;
    const tarefa = this.tarefas.find((item) => item.id === id);
    if (!tarefa) return null;

    if (typeof novoTitulo !== 'string') {
      this.ultimoErro = 'Informe um título textual válido para a tarefa.';
      return null;
    }

    const titulo = novoTitulo.trim();
    if (!titulo) {
      this.remover(id);
      this.ultimoErro = null;
      return null;
    }

    if (titulo.length > LIMITE_TITULO) {
      this.ultimoErro = `O título da tarefa deve ter no máximo ${LIMITE_TITULO} caracteres.`;
      return null;
    }

    this.registrarSnapshotUndo();
    tarefa.titulo = titulo;
    if (camposExtras && typeof camposExtras === 'object') {
      if ('prioridade' in camposExtras) {
        tarefa.prioridade = normalizarPrioridade(camposExtras.prioridade);
      }
      if ('dataVencimento' in camposExtras) {
        tarefa.dataVencimento = normalizarDataVencimento(camposExtras.dataVencimento);
      }
      if ('estimativaMin' in camposExtras) {
        tarefa.estimativaMin = normalizarMinutosNaoNegativos(camposExtras.estimativaMin);
      }
      if ('esforcoRealMin' in camposExtras) {
        tarefa.esforcoRealMin = normalizarMinutosNaoNegativos(camposExtras.esforcoRealMin);
      }
    }
    tarefa.atualizadaEm = new Date().toISOString();
    this.ultimoErro = null;
    this.salvar();
    return tarefa;
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

    this.registrarSnapshotUndo();
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
    this.salvarConfiguracao();
    return { sucesso: true, limiteWip: this.limiteWip };
  }

  registrarEsforco(id, min) {
    if (id == null || id === '') return null;
    if (typeof min !== 'number' || !Number.isFinite(min) || min <= 0) {
      return null;
    }

    const tarefa = this.tarefas.find((item) => item.id === id);
    if (!tarefa) return null;

    this.registrarSnapshotUndo();
    tarefa.esforcoRealMin = normalizarMinutosNaoNegativos(tarefa.esforcoRealMin) + min;
    tarefa.atualizadaEm = new Date().toISOString();
    this.ultimoErro = null;
    this.salvar();
    return tarefa;
  }

  remover(id) {
    if (id == null || id === '') return false;
    const indice = this.tarefas.findIndex((tarefa) => tarefa.id === id);
    if (indice === -1) return false;
    this.registrarSnapshotUndo();
    this.tarefas.splice(indice, 1);
    this.salvar();
    return true;
  }

  limparConcluidas() {
    const concluidas = this.tarefas.filter((item) => item.concluida);
    if (concluidas.length === 0) return 0;
    this.registrarSnapshotUndo();
    this.tarefas = this.tarefas.filter((item) => !item.concluida);
    this.ultimoErro = null;
    this.salvar();
    return concluidas.length;
  }

  alternarTodas(concluir) {
    if (this.tarefas.length === 0) return false;
    const marcar = typeof concluir === 'boolean'
      ? concluir
      : this.tarefas.some((item) => !item.concluida);
    const precisaMudar = this.tarefas.some((item) => item.concluida !== marcar);
    if (!precisaMudar) return false;

    this.registrarSnapshotUndo();
    const agora = new Date().toISOString();
    for (const tarefa of this.tarefas) {
      tarefa.concluida = marcar;
      tarefa.status = marcar ? 'done' : 'todo';
      tarefa.atualizadaEm = agora;
    }
    this.ultimoErro = null;
    this.salvar();
    return true;
  }

  desfazer() {
    if (this.pilhaUndo.length === 0) return false;
    const snapshot = this.pilhaUndo.pop();
    this.tarefas = snapshot.map((item) => ({ ...item }));
    this.ultimoErro = null;
    this.salvar();
    return true;
  }

  contarPendentes() {
    return this.tarefas.filter((item) => !item.concluida).length;
  }

  formatarContadorPendentes() {
    const pendentes = this.contarPendentes();
    return pendentes === 1 ? '1 item restante' : `${pendentes} itens restantes`;
  }

  filtrar({
    statusFiltro = 'todas',
    prioridade = 'todas',
    busca = '',
    colunaKanban = 'todas',
    ordenar = false,
  } = {}) {
    const termo = normalizarTextoBusca(busca);
    const filtradas = this.tarefas.filter((tarefa) => {
      if (statusFiltro === 'ativas' && tarefa.concluida) return false;
      if (statusFiltro === 'concluidas' && !tarefa.concluida) return false;
      if (PRIORIDADES_VALIDAS.has(prioridade) && tarefa.prioridade !== prioridade) return false;
      if (STATUS_VALIDOS.has(colunaKanban) && tarefa.status !== colunaKanban) return false;
      if (termo && !normalizarTextoBusca(tarefa.titulo).includes(termo)) return false;
      return true;
    });

    return ordenar ? ordenarTarefas(filtradas) : filtradas.map((item) => ({ ...item }));
  }

  estatisticas(dataReferencia = new Date()) {
    return calcularEstatisticas(this.tarefas, dataReferencia, this.limiteWip);
  }

  exportarJSON() {
    return JSON.stringify(
      {
        produto: 'TodoLab',
        versaoSchema: VERSAO_SCHEMA,
        exportadoEm: new Date().toISOString(),
        limiteWip: this.limiteWip,
        tarefas: this.tarefas.map((item) => ({ ...item })),
      },
      null,
      2
    );
  }

  importarJSON(jsonBruto) {
    if (typeof jsonBruto !== 'string' || !jsonBruto.trim()) {
      return { sucesso: false, erros: ['Conteúdo JSON vazio ou inválido.'] };
    }
    if (jsonBruto.length > 5_000_000) {
      return { sucesso: false, erros: ['Arquivo excede o tamanho máximo permitido (5 MB).'] };
    }

    let analisado;
    try {
      analisado = JSON.parse(jsonBruto);
    } catch {
      return { sucesso: false, erros: ['Sintaxe JSON inválida no arquivo informado.'] };
    }

    const validacao = validarSchemaImportacao(analisado);
    if (!validacao.valido) {
      return { sucesso: false, erros: validacao.erros };
    }

    this.registrarSnapshotUndo();
    this.tarefas = validacao.dadosSanitizados.tarefas;
    this.limiteWip = validacao.dadosSanitizados.limiteWip;
    this.salvarConfiguracao();
    this.ultimoErro = null;
    this.salvar();
    return { sucesso: true, totalImportado: this.tarefas.length };
  }
}
