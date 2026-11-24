# Casos de Teste: Classes de Equivalência, Valores-Limite e Tabelas de Decisão

**Squad (equipe ágil multidisciplinar):** Esquadrão Aegis QA (*Quality Assurance* — Garantia da Qualidade)  
**Escopo:** Técnicas de teste de caixa-preta (*Black-Box Testing* — derivação de casos a partir da especificação sem depender do código interno) aplicadas às *Issues* `#1` a `#8` na suíte `tests/unit/` e `tests/acceptance/`.

---

## 1. Classes de Equivalência e Valores-Limite (*Boundary Value Analysis*)

### 1.1 Validação e Limite do Título da Tarefa (`Issue #1` e `Issue #7` — Itens `A2` + `B4`)

| Técnica | Partição / Fronteira | Entrada de Teste | Resultado Esperado | Suíte Verificadora |
|---|---|---|---|---|
| Classe Inválida (Vazio) | String vazia | `""` | Retorna `null`, preenche `ultimoErro`, não altera lista/armazenamento | `store.adicionar.test.js` · `issue-01.acceptance.test.js` |
| Classe Inválida (Espaços) | Somente espaços/tabulação/quebra | `"   "`, `"\t\t"`, `"\n  "` | Retorna `null`, mantém foco em `#todo-input`, exibe aviso em `aria-live` | `store.adicionar.test.js` · `issue-01.acceptance.test.js` |
| Classe Inválida (Tipo) | Nulo / indefinido / objeto inválido | `null`, `undefined`, `{}` | Retorna `null` sem lançar exceção | `store.adicionar.test.js` |
| Valor-Limite Inferior | 1 caractere válido com bordas | `" a "` | Aceito e normalizado via *trim* (remoção de espaços nas bordas) para `"a"` | `store.adicionar.test.js` |
| Classe Válida (Normalização) | Texto com espaços externos e acentos | `"  Estudar QA  "` | Aceito como `"Estudar QA"` (espaços internos preservados) | `store.adicionar.test.js` · `issue-01.acceptance.test.js` |
| Valor-Limite Superior (`B4`) | `199` caracteres após *trim* | `'x'.repeat(199)` | Aceito na criação e na edição; contador regressivo visível (`> 180`) | `store.filtros-edicao-undo.test.js` · `issue-07.acceptance.test.js` |
| Valor-Limite Exato (`B4`) | `200` caracteres após *trim* | `'x'.repeat(200)` | Aceito (`titulo.length === 200`) | `store.filtros-edicao-undo.test.js` · `issue-07.acceptance.test.js` |
| Valor-Limite Acima (`B4`) | `201` caracteres após *trim* | `'x'.repeat(201)` | Rejeitado (`null`), registra `ultimoErro`, preserva estado anterior | `store.filtros-edicao-undo.test.js` · `issue-07.acceptance.test.js` |

### 1.2 Classificador Determinístico de Vencimento (`Issue #5` — Item `C2`)

Data de referência fixa injetada: `2026-10-15`.

| Fronteira Temporal | `dataVencimento` | Estado `concluida` | Classificação Retornada | Suíte Verificadora |
|---|---|---|---|---|
| `-1` dia (ontem) | `'2026-10-14'` | `false` | `'atrasada'` | `store.prioridade-vencimento.test.js` |
| `0` dias (hoje) | `'2026-10-15'` | `false` | `'vence_hoje'` | `store.prioridade-vencimento.test.js` |
| `+1` dia (amanhã) | `'2026-10-16'` | `false` | `'proxima'` | `store.prioridade-vencimento.test.js` |
| `+3` dias (limite da janela) | `'2026-10-18'` | `false` | `'proxima'` | `store.prioridade-vencimento.test.js` |
| `+4` dias (após janela) | `'2026-10-19'` | `false` | `'futura'` | `store.prioridade-vencimento.test.js` |
| Tarefa concluída vencida | `'2026-10-01'` | `true` | `'concluida'` (nunca `'atrasada'`) | `store.prioridade-vencimento.test.js` |
| Ausente / malformada | `null` / `'invalida'` | `false` | `'sem_prazo'` sem exceção | `store.prioridade-vencimento.test.js` |

### 1.3 Limite de *WIP* (*Work in Progress* — Trabalho em Progresso) (`Issue #4`)

| Cenário de Fronteira | Ocupação Atual em `in_progress` | `limiteWip` | Ação | Resultado Esperado | Suíte Verificadora |
|---|---|---|---|---|---|
| Abaixo do limite | `1` | `2` | Mover nova tarefa para `'in_progress'` | `{ sucesso: true }` (`2/2`) | `store.kanban.test.js` |
| No limite exato | `2` | `2` | Mover 3ª tarefa para `'in_progress'` | `{ sucesso: false, motivo: 'WIP_LIMIT_EXCEEDED', limiteWip: 2 }` | `store.kanban.test.js` · `issue-04.acceptance.test.js` |
| Mesma coluna cheia | `2` | `2` | Mover tarefa já em `'in_progress'` para `'in_progress'` | Permitido sem erro de *WIP* | `store.kanban.test.js` |
| Limite inválido | — | `2` | `definirLimiteWip(0)`, `-1`, `NaN` (*Not a Number*) | Rejeitado; mantém `limiteWip === 2` | `store.kanban.test.js` |

### 1.4 Esforço, Estatísticas e Portabilidade `v1.2.0` (`Issues #6` e `#8`)

| Domínio | Entrada / Condição | Resultado Esperado | Suíte Verificadora |
|---|---|---|---|
| `registrarEsforco(id, min)` | `min = 0`, `-10`, `NaN` ou `id` inexistente | Retorna `null`; não altera `esforcoRealMin` | `store.esforco.test.js` |
| `registrarEsforco(id, min)` | `25` e depois `15` | Acumula para `40` e persiste | `store.esforco.test.js` · `issue-06.acceptance.test.js` |
| `calcularEstatisticas` (`C3`) | Lista vazia (`0/0`) | `taxaConclusao === 0` (nunca `NaN`) | `store.telemetria-portabilidade.test.js` |
| `calcularEstatisticas` (`C3`) | `1` concluída de `3` (`1/3`) | `taxaConclusao === 33.3` | `store.telemetria-portabilidade.test.js` |
| `importarJSON` (`D3`) | *JSON* inválido, `versaoSchema: '0.9.0'`, carga `> 5.000` itens ou `__proto__` | Rejeição atômica `{ sucesso: false }`; lista atual preservada 100%; sanitização de protótipo | `store.telemetria-portabilidade.test.js` · `issue-08.acceptance.test.js` |

---

## 2. Tabela de Decisão: Filtros Combinados, Contador `A1` e Busca `B5` (`Issue #7`)

| Condição: `statusFiltro` | Condição: `prioridade` | Condição: `busca` (insensível a caixa/acento via *NFD*) | Tarefas Exibidas | Contador `formatarContadorPendentes()` |
|---|---|---|---|---|
| `'todas'` | `'todas'` | `""` | Todas as tarefas | Total real de pendentes (`"N itens restantes"` / `"1 item restante"` / `"0 itens restantes"`) |
| `'ativas'` | `'alta'` | `'revisao'` | Apenas pendentes `alta` contendo `"Revisão"` / `"revisao"` | **Mesmo total real de pendentes da *Store*** (imune ao filtro!) |
| `'concluidas'` | `'todas'` | `""` | Apenas concluídas; ao desmarcar uma tarefa ela sai da visão imediatamente | **Mesmo total real de pendentes da *Store*** |
| Qualquer filtro | Qualquer | `'termo-inexistente'` | Lista filtrada vazia + mensagem `#filter-empty-state` visível | **Mesmo total real de pendentes da *Store*** |

---

## 3. Máquina de Estados: Edição *Inline* (`Issue #7` — Item `B2`)

| Estado Atual | Evento do Usuário | Próximo Estado | Efeito nos Dados (`TodoStore`) |
|---|---|---|---|
| Exibição do cartão | Duplo clique (`dblclick`) ou botão **Editar** | Edição aberta (`input` focado com texto original) | Nenhuma mutação |
| Edição aberta | Tecla `Esc` | Exibição do cartão | Cancela e restaura título original sem gravar |
| Edição aberta (texto válido `1..200`) | Tecla `Enter` ou evento *blur* (perda de foco) | Exibição do cartão | Atualiza `titulo` com *trim*; **preserva `concluida` e `status`**; registra *snapshot* em `pilhaUndo` |
| Edição aberta (texto vazio `"   "`) | Tecla `Enter` ou *blur* | Item removido | Remove tarefa da lista e registra *snapshot* em `pilhaUndo` |
| Edição aberta (texto `> 200` chars) | Tecla `Enter` ou *blur* | Permanece em edição / alerta | Bloqueia (`null`), mantém título anterior e exibe `ultimoErro` |
