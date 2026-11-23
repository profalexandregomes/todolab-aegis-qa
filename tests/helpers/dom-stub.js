import { readFileSync } from 'node:fs';

function paraKebabCase(nome) {
  return nome.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`);
}

function criarElemento(tagName, documento, attrsIniciais = {}) {
  const attributes = new Map();
  const listeners = new Map();
  const children = [];
  let classNameValor = '';
  let textContentValor = '';

  const elemento = {
    tagName: tagName.toUpperCase(),
    parentNode: null,
    children,
    style: {},
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    get id() {
      return attributes.get('id') || '';
    },
    set id(valor) {
      if (valor) attributes.set('id', String(valor));
      else attributes.delete('id');
    },
    get type() {
      return attributes.get('type') || '';
    },
    set type(valor) {
      if (valor == null) attributes.delete('type');
      else attributes.set('type', String(valor));
    },
    get name() {
      return attributes.get('name') || '';
    },
    set name(valor) {
      if (valor == null) attributes.delete('name');
      else attributes.set('name', String(valor));
    },
    get draggable() {
      return attributes.get('draggable') === 'true';
    },
    set draggable(valor) {
      attributes.set('draggable', String(Boolean(valor)));
    },
    get className() {
      return classNameValor;
    },
    set className(valor) {
      classNameValor = String(valor || '');
      if (classNameValor) attributes.set('class', classNameValor);
      else attributes.delete('class');
    },
    classList: {
      add(...classes) {
        const atual = new Set(classNameValor.split(/\s+/).filter(Boolean));
        for (const cls of classes) atual.add(cls);
        elemento.className = [...atual].join(' ');
      },
      remove(...classes) {
        const atual = new Set(classNameValor.split(/\s+/).filter(Boolean));
        for (const cls of classes) atual.delete(cls);
        elemento.className = [...atual].join(' ');
      },
      toggle(cls, force) {
        const possui = this.contains(cls);
        const deveAdicionar = force === undefined ? !possui : Boolean(force);
        if (deveAdicionar) this.add(cls);
        else this.remove(cls);
        return deveAdicionar;
      },
      contains(cls) {
        return classNameValor.split(/\s+/).filter(Boolean).includes(cls);
      },
    },
    get textContent() {
      if (children.length === 0) return textContentValor;
      return `${textContentValor}${children.map((c) => c.textContent).join('')}`;
    },
    set textContent(valor) {
      children.length = 0;
      textContentValor = valor == null ? '' : String(valor);
    },
    get innerText() {
      return this.textContent;
    },
    set innerText(valor) {
      this.textContent = valor;
    },
    dataset: new Proxy(
      {},
      {
        get(_, prop) {
          if (typeof prop !== 'string') return undefined;
          return attributes.get(`data-${paraKebabCase(prop)}`);
        },
        set(_, prop, valor) {
          if (typeof prop === 'string') {
            attributes.set(`data-${paraKebabCase(prop)}`, String(valor));
          }
          return true;
        },
      }
    ),
    setAttribute(nome, valor) {
      const chave = nome.toLowerCase();
      const texto = valor == null ? '' : String(valor);
      attributes.set(chave, texto);
      if (chave === 'class') classNameValor = texto;
      if (chave === 'value') elemento.value = texto;
      if (chave === 'hidden') elemento.hidden = true;
      if (chave === 'disabled') elemento.disabled = true;
    },
    getAttribute(nome) {
      const chave = nome.toLowerCase();
      return attributes.has(chave) ? attributes.get(chave) : null;
    },
    hasAttribute(nome) {
      return attributes.has(nome.toLowerCase());
    },
    removeAttribute(nome) {
      const chave = nome.toLowerCase();
      attributes.delete(chave);
      if (chave === 'class') classNameValor = '';
      if (chave === 'hidden') elemento.hidden = false;
      if (chave === 'disabled') elemento.disabled = false;
    },
    append(...nos) {
      for (const no of nos) {
        if (typeof no === 'string') {
          textContentValor += no;
        } else if (no) {
          no.parentNode = elemento;
          children.push(no);
        }
      }
    },
    appendChild(no) {
      this.append(no);
      return no;
    },
    replaceChildren(...nos) {
      children.length = 0;
      textContentValor = '';
      this.append(...nos);
    },
    remove() {
      if (!elemento.parentNode) return;
      const idx = elemento.parentNode.children.indexOf(elemento);
      if (idx >= 0) elemento.parentNode.children.splice(idx, 1);
      elemento.parentNode = null;
    },
    focus() {
      documento.activeElement = elemento;
    },
    blur() {
      if (documento.activeElement === elemento) {
        documento.activeElement = documento.body;
      }
    },
    click() {
      this.dispatchEvent({ type: 'click' });
    },
    reset() {
      for (const filho of descendentes(elemento)) {
        if (filho.tagName === 'INPUT' || filho.tagName === 'TEXTAREA') {
          filho.value = '';
          filho.checked = false;
        }
      }
    },
    addEventListener(tipo, handler) {
      if (!listeners.has(tipo)) listeners.set(tipo, []);
      listeners.get(tipo).push(handler);
    },
    removeEventListener(tipo, handler) {
      const lista = listeners.get(tipo);
      if (!lista) return;
      const idx = lista.indexOf(handler);
      if (idx >= 0) lista.splice(idx, 1);
    },
    dispatchEvent(evento) {
      const evt = {
        defaultPrevented: false,
        cancelBubble: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
        stopPropagation() {
          this.cancelBubble = true;
        },
        ...evento,
        target: evento.target || elemento,
        currentTarget: elemento,
      };
      let atual = elemento;
      while (atual && !evt.cancelBubble) {
        evt.currentTarget = atual;
        const handlers = [...(atual._listeners?.get(evt.type) || [])];
        for (const fn of handlers) {
          fn.call(atual, evt);
        }
        if (evt.bubbles === false) break;
        atual = atual.parentNode;
      }
      return evt;
    },
    _listeners: listeners,
    querySelector(seletor) {
      return buscarEm(children, seletor)[0] || null;
    },
    querySelectorAll(seletor) {
      return buscarEm(children, seletor);
    },
    closest(seletor) {
      let atual = elemento;
      while (atual) {
        if (casaSeletor(atual, seletor)) return atual;
        atual = atual.parentNode;
      }
      return null;
    },
  };

  for (const [k, v] of Object.entries(attrsIniciais)) {
    elemento.setAttribute(k, v);
  }
  return elemento;
}

function descendentes(raiz) {
  const resultado = [];
  for (const filho of raiz.children) {
    resultado.push(filho, ...descendentes(filho));
  }
  return resultado;
}

function casaSeletorSimples(el, parte) {
  if (!parte) return false;
  let resto = parte.trim();
  const tagMatch = resto.match(/^[a-zA-Z0-9-]+/);
  if (tagMatch) {
    if (el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
    resto = resto.slice(tagMatch[0].length);
  }
  while (resto.length > 0) {
    if (resto.startsWith('#')) {
      const m = resto.match(/^#([a-zA-Z0-9_-]+)/);
      if (!m || el.id !== m[1]) return false;
      resto = resto.slice(m[0].length);
    } else if (resto.startsWith('.')) {
      const m = resto.match(/^\.([a-zA-Z0-9_-]+)/);
      if (!m || !el.classList.contains(m[1])) return false;
      resto = resto.slice(m[0].length);
    } else if (resto.startsWith('[')) {
      const m = resto.match(/^\[([a-zA-Z0-9_-]+)(?:=["']?([^"'\]]+)["']?)?\]/);
      if (!m) return false;
      const valor = el.getAttribute(m[1]);
      if (m[2] !== undefined) {
        if (valor !== m[2]) return false;
      } else if (valor === null) {
        return false;
      }
      resto = resto.slice(m[0].length);
    } else {
      return false;
    }
  }
  return true;
}

function casaSeletor(el, seletor) {
  const alternativas = seletor.split(',').map((s) => s.trim()).filter(Boolean);
  return alternativas.some((alt) => {
    const tokens = alt.split(/\s+/).filter(Boolean);
    const ultimo = tokens[tokens.length - 1];
    return casaSeletorSimples(el, ultimo);
  });
}

function buscarEm(raizes, seletor) {
  const achados = [];
  const visitar = (lista) => {
    for (const el of lista) {
      if (casaSeletor(el, seletor)) achados.push(el);
      if (el.children.length > 0) visitar(el.children);
    }
  };
  visitar(raizes);
  return achados;
}

function extrairAtributos(textoAttrs) {
  const attrs = {};
  const regex = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = regex.exec(textoAttrs)) !== null) {
    const chave = match[1];
    const valor = match[2] ?? match[3] ?? match[4] ?? '';
    attrs[chave] = valor;
  }
  return attrs;
}

function analisarHtml(html, documento) {
  const todos = [];
  const voidTags = new Set(['!doctype', 'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
  const ignorarTags = new Set(['!doctype', 'html', 'head', 'meta', 'title', 'link', 'script', 'body']);
  const pilha = [documento.body];
  const tokenRegex = /<\/([a-zA-Z0-9-]+)\s*>|<([a-zA-Z0-9-]+)([^>]*)>/g;
  let ultimoIndice = 0;
  let match;
  while ((match = tokenRegex.exec(html)) !== null) {
    const textoEntre = html.slice(ultimoIndice, match.index);
    if (textoEntre && textoEntre.trim() && pilha.length > 1) {
      pilha[pilha.length - 1].append(textoEntre.replace(/\s+/g, ' '));
    }
    ultimoIndice = tokenRegex.lastIndex;
    if (match[1]) {
      const fechando = match[1].toLowerCase();
      if (!ignorarTags.has(fechando) && pilha.length > 1 && pilha[pilha.length - 1].tagName.toLowerCase() === fechando) {
        pilha.pop();
      }
      continue;
    }
    const tag = match[2].toLowerCase();
    if (ignorarTags.has(tag)) continue;
    const rawAttrs = (match[3] || '').trim();
    const autoFecha = rawAttrs.endsWith('/') || voidTags.has(tag);
    const attrsLimpas = rawAttrs.replace(/\/$/, '').trim();
    const attrs = extrairAtributos(attrsLimpas);
    const el = criarElemento(tag, documento, attrs);
    const pai = pilha[pilha.length - 1];
    pai.children.push(el);
    el.parentNode = pai;
    todos.push(el);
    if (!autoFecha) {
      pilha.push(el);
    }
  }
  return todos;
}

export function criarAmbienteDom({ htmlPath, storage }) {
  const anterior = {
    document: globalThis.document,
    localStorage: globalThis.localStorage,
    window: globalThis.window,
  };

  const elementosCriados = [];
  const docListeners = new Map();
  const winListeners = new Map();

  const documentStub = {
    activeElement: null,
    body: null,
    createElement(tag) {
      const el = criarElemento(tag, documentStub);
      elementosCriados.push(el);
      return el;
    },
    createTextNode(texto) {
      return String(texto ?? '');
    },
    getElementById(id) {
      return this.querySelector(`#${id}`);
    },
    querySelector(seletor) {
      return buscarEm(this.body.children, seletor)[0] || null;
    },
    querySelectorAll(seletor) {
      return buscarEm(this.body.children, seletor);
    },
    addEventListener(tipo, fn) {
      if (!docListeners.has(tipo)) docListeners.set(tipo, []);
      docListeners.get(tipo).push(fn);
    },
    dispatchEvent(evt) {
      const handlers = [...(docListeners.get(evt.type) || [])];
      for (const fn of handlers) fn(evt);
    },
  };

  documentStub.body = criarElemento('body', documentStub);
  documentStub.activeElement = documentStub.body;

  const html = readFileSync(htmlPath, 'utf8');
  const elementosHtml = analisarHtml(html, documentStub);

  const windowStub = {
    document: documentStub,
    localStorage: storage,
    addEventListener(tipo, fn) {
      if (!winListeners.has(tipo)) winListeners.set(tipo, []);
      winListeners.get(tipo).push(fn);
    },
    removeEventListener() {},
    confirm: () => true,
    alert: () => {},
  };

  globalThis.document = documentStub;
  globalThis.localStorage = storage;
  globalThis.window = windowStub;

  return {
    document: documentStub,
    window: windowStub,
    storage,
    elementosHtml,
    getElementosCriados: () => [...elementosCriados],
    dispararDomContentLoaded() {
      documentStub.dispatchEvent({ type: 'DOMContentLoaded' });
    },
    restore() {
      if (anterior.document === undefined) delete globalThis.document;
      else globalThis.document = anterior.document;
      if (anterior.localStorage === undefined) delete globalThis.localStorage;
      else globalThis.localStorage = anterior.localStorage;
      if (anterior.window === undefined) delete globalThis.window;
      else globalThis.window = anterior.window;
    },
  };
}
