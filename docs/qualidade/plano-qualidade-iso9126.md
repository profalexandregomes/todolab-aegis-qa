# Plano de Qualidade de Produto (ISO/IEC 9126) — TodoLab `v1.2.0`

**Squad:** Esquadrão Aegis QA  
**Norma de Referência:** **ISO/IEC 9126** (*International Organization for Standardization* — Norma Internacional de Qualidade de Produto de Software)

Este documento consolida como cada característica e subcaracterística da norma **ISO/IEC 9126** foi traduzida em requisitos testáveis, casos de borda, testes automatizados e portões de *CI/CD* (*Continuous Integration / Continuous Delivery* — Integração Contínua / Entrega Contínua) nas Sprints 01 a 03.

---

## 1. Mapeamento ISO/IEC 9126 por Característica

| Característica ISO 9126 | Subcaracterísticas Endereçadas | Issues Associadas | Mecanismos e Evidências no Produto |
|---|---|---|---|
| **Funcionalidade** | Adequação, Acurácia e Segurança de Acesso/Dados | `#1`, `#2`, `#4`, `#5`, `#7`, `#8` | Normalização com *trim* e bloqueio de entradas vazias (`D-01`); exclusão estrita por `id` (`D-03`); fluxo *Kanban* com limite *WIP* (`#4`); ordenação e classificação determinística de prazos (`#5`); filtros combinados, busca *NFD* (*Normalization Form Decomposition*) e proteção anti-*XSS* (*Cross-Site Scripting*) com `textContent` (`#7`); cálculo exato de estatísticas e sanitização contra poluição de protótipo (`#8`). |
| **Confiabilidade** | Maturidade, Tolerância a Falhas e Recuperabilidade | `#2`, `#3`, `#7`, `#8` | Captura de exceções de `JSON.parse`, validação estrutural contra dados corrompidos (`D-02`) e captura de `QuotaExceededError` / `SecurityError` sem travar a aplicação (`#3`); pilha de *Undo* (Desfazer) para reversão segura inclusive de ações em lote e importações (`#7`, `#8`); rejeição atômica de *JSON* inválido ou versão incompatível preservando 100% da lista atual (`#8`). |
| **Usabilidade** | Inteligibilidade, Apreensibilidade, Operacionalidade e Acessibilidade | `#1`, `#4`, `#6`, `#7` | Mensagens claras em português com termos técnicos traduzidos/explicados; regiões `aria-live` (*Accessible Rich Internet Applications*) e controles por teclado equivalentes ao *Drag-and-Drop* (Arrastar e Soltar) (`#4`); cronômetro *Pomodoro* integrado (`#6`); edição *inline* (direta no cartão) com `Enter`/`Esc`/`blur` e contador regressivo acima de 180 caracteres (`#7`). |
| **Eficiência** | Comportamento em Relação ao Tempo e Utilização de Recursos | `#6`, `#7`, `#8` | Controle de esforço estimado vs. real em minutos com ciclos *Pomodoro* (`#6`); filtragem e busca instantânea sem recarregamentos (`#7`); validação preventiva de carga máxima (limite de `5.000` tarefas na importação *JSON* `v1.2.0`) (`#8`). |
| **Manutenibilidade** | Analisabilidade, Modificabilidade e Testabilidade | `#5`, `#8` | Isolamento de regras puras sem dependência do *DOM* (*Document Object Model*) em `src/store.js` (`classificarVencimento`, `ordenarTarefas`, `calcularEstatisticas`, `validarSchemaImportacao`); injeção explícita da data de referência e do armazenamento para testes 100% determinísticos; cobertura de linhas em `src/store.js` de `93.61%` e média em `src/` de `80.09%`; portão `guard-tests` e análise estática (`lint`). |
| **Portabilidade** | Adaptabilidade e Capacidade de Substituição | `#3`, `#8` | Execução zero-dependências em JavaScript *ESM* (*ECMAScript Modules*) puro compatível com navegadores modernos e *Node.js* 20+; degradação graciosa para modo em memória quando `localStorage` não está disponível (`#3`); exportação e importação portável em contrato *JSON* versionado `v1.2.0` (`#8`). |

---

## 2. Técnicas de Caixa-Preta e Caixa-Branca Aplicadas

- **Classes de Equivalência e Valores-Limite (*Boundary Value Analysis*):**
  - Entradas de título: `""`, `"   "`, `"\t\n"`, `" a "` (1 caractere), `199`, `200` (aceito) e `201` (rejeitado) caracteres.
  - Limite temporal determinístico em `classificarVencimento`: `-1 dia` (`atrasada`), `0 dias` (`vence_hoje`), `+1 dia` (`proxima`), `+3 dias` (`proxima`) e `+4 dias` (`futura`), além de tarefas concluídas (`concluida`, nunca `atrasada`).
  - Limite de *WIP* (*Work in Progress*): `0` / negativo (rejeitado), `1/2`, `2/2` (bloqueia 3ª entrada distinta, permite reordenação interna) e reconfiguração dinâmica (`3/3`).
  - Divisão por zero e arredondamento em estatísticas: `0/0 -> 0%`, `1/3 -> 33.3%`.
- **Tabela de Decisão e Máquina de Estados:**
  - Interação entre filtros (`statusFiltro` × `prioridade` × `colunaKanban` × `busca`) preservando o contador global `contarPendentes()` imune a filtros.
  - Estados da edição *inline*: abertura (`dblclick`/botão) → confirmação (`Enter`/`blur`), cancelamento (`Esc`), remoção em vazio (`""`), bloqueio > 200 caracteres e preservação estrita de `concluida` e `status`.
- **Inspeção Caixa-Branca e Cobertura:**
  - Monitoramento contínuo via `node --test --experimental-test-coverage` com portão automático >= 60% em `src/` (`scripts/check-coverage.mjs`).
