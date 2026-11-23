export function criarArmazenamentoMemoria(dadosIniciais = {}) {
  const mapa = new Map(Object.entries(dadosIniciais));
  const chamadas = {
    getItem: 0,
    setItem: 0,
    removeItem: 0,
    clear: 0,
  };
  let erroAoSalvar = null;

  return {
    get chamadas() {
      return { ...chamadas };
    },
    definirErroAoSalvar(erro) {
      erroAoSalvar = erro;
    },
    getItem(chave) {
      chamadas.getItem += 1;
      return mapa.has(chave) ? mapa.get(chave) : null;
    },
    setItem(chave, valor) {
      chamadas.setItem += 1;
      if (erroAoSalvar) {
        throw erroAoSalvar;
      }
      mapa.set(chave, String(valor));
    },
    removeItem(chave) {
      chamadas.removeItem += 1;
      mapa.delete(chave);
    },
    clear() {
      chamadas.clear += 1;
      mapa.clear();
    },
    snapshot() {
      return Object.fromEntries(mapa.entries());
    },
  };
}
