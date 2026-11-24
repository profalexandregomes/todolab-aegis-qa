# Checklist de Qualidade de Produto (ISO/IEC 9126) — TodoLab `v1.2.0`

**Squad (equipe ágil multidisciplinar):** Esquadrão Aegis QA (*Quality Assurance* — Garantia da Qualidade)  
**Norma de Referência:** **ISO/IEC 9126** (*International Organization for Standardization / International Electrotechnical Commission* — Norma Internacional de Qualidade de Produto de Software)  
**Versão Avaliada:** `v1.2.0` (2026-11-23)

---

## 1. Funcionalidade (*Functionality*)
*Capacidade do software de prover funções que atendam às necessidades explícitas e implícitas.*

- [x] **Adequação:** O produto entrega todas as demandas priorizadas nas *Sprints* (ciclos iterativos curtos) 01 a 03: quadro *Scrum-Kanban* (*Scrum* + *Kanban* — gestão visual de fluxo contínuo) de 4 colunas (`#4`), priorização e prazos (`#5`), cronômetro *Pomodoro* (ciclos cronometrados de foco e pausa) (`#6`), filtros combinados, busca instantânea, edição *inline* (direta no cartão) e pilha de *Undo* (desfazer) (`#7`), além de painel de telemetria e exportação/importação (`#8`).
- [x] **Acurácia:**
  - Títulos são normalizados com *trim* (remoção de espaços nas bordas) e entradas vazias ou apenas com espaços/tabulações são bloqueadas (`#1`, Defeito `D-01`).
  - Exclusão e alternância operam estritamente por `id` (*Identifier* — Identificador Único), eliminando colisões com títulos duplicados (`#2`, Defeito `D-03`).
  - `classificarVencimento(tarefa, dataReferencia)` classifica prazos de forma determinística por data civil sem variação de fuso horário, garantindo que tarefas concluídas nunca sejam marcadas como atrasadas (`#5`).
  - `contarPendentes()` e `formatarContadorPendentes()` refletem sempre o total pendente real, imunes a filtros ativos (`#7`), e `calcularEstatisticas()` trata `0/0` retornando `0` sem gerar `NaN` (*Not a Number* — Não Numérico) (`#8`).
- [x] **Segurança de Acesso e Dados:**
  - Proteção contra *XSS* (*Cross-Site Scripting* — Injeção de Script Entre Sites) mediante renderização exclusiva com `textContent` e criação segura de nós *DOM* (*Document Object Model* — Modelo de Objeto de Documento), sem uso de `innerHTML` com entrada do usuário (`#7`).
  - Validação estrita de contrato em `validarSchemaImportacao()` com *whitelist* (lista explícita de campos permitidos) e bloqueio contra poluição de protótipo (`__proto__`, `constructor`) (`#8`).

## 2. Confiabilidade (*Reliability*)
*Capacidade de manter o nível de desempenho sob condições estabelecidas.*

- [x] **Maturidade:** 55/55 testes automatizados aprovados em 16 suítes (`tests/unit/` e `tests/acceptance/`), sem falhas nem regressões conhecidas.
- [x] **Tolerância a Falhas:**
  - `carregar()` captura *JSON* (*JavaScript Object Notation* — Notação de Objetos JavaScript) corrompido (`"{isso não é JSON"`), tipos incompatíveis (`"123"`, `"{}"`, `"null"`) e registros malformados, recuperando-se para estado seguro sem travar a aplicação (`#3`, Defeito `D-02`).
  - `salvar()` trata `QuotaExceededError` (Erro de Cota Excedida) e `SecurityError` (armazenamento bloqueado em modo privado), preservando a lista em memória com faixa de aviso (*banner*) não bloqueante na *UI* (*User Interface* — Interface de Usuário) (`#3`).
  - `importarJSON()` executa validação atômica: arquivos inválidos, incompatíveis ou com carga > 5.000 tarefas são rejeitados sem alterar a lista atual (`#8`).
- [x] **Recuperabilidade:** Pilha de *Undo* em memória (`pilhaUndo`) reverte ações individuais, operações em lote (`limparConcluidas`, `alternarTodas`) e até importações *JSON* em um único passo (`#7`, `#8`).

## 3. Usabilidade (*Usability*)
*Esforço necessário para compreender, aprender, operar e apreciar o produto.*

- [x] **Inteligibilidade e Apreensibilidade:** Todos os rótulos, mensagens de erro e indicadores estão em português brasileiro claro, explicando conceitos técnicos como *Work in Progress* (*WIP* — Trabalho em Progresso) e *Pomodoro*.
- [x] **Operacionalidade e Acessibilidade:**
  - Região dedicada `aria-live` (*Accessible Rich Internet Applications* — especificações de acessibilidade web) para feedback de validação sem perda de foco no campo de entrada (`#1`).
  - Controles equivalentes por teclado e atributos `aria-label` nos cartões *Kanban* como alternativa acessível ao *Drag-and-Drop* (Arrastar e Soltar) (`#4`).
  - Edição *inline* com máquina de estados previsível (`Enter` e *blur* / perda de foco salvam; `Esc` cancela; vazio remove) e contador regressivo acima de 180 caracteres (`#7`).

## 4. Eficiência (*Efficiency*)
*Relação entre o nível de desempenho do software e a quantidade de recursos utilizados.*

- [x] **Comportamento em Relação ao Tempo:** Filtragem combinada, busca *NFD* (*Normalization Form Decomposition* — Decomposição Canônica Unicode) instantânea e atualização do quadro *Kanban* executadas em memória sem recarregamento de página.
- [x] **Utilização de Recursos:** Aplicação em JavaScript puro com *ESM* (*ECMAScript Modules* — Módulos Nativos JavaScript) sem dependências externas (`0` pacotes de terceiros), com guarda preventiva de volume máximo (`5.000` itens) na importação (`#8`).

## 5. Manutenibilidade (*Maintainability*)
*Facilidade com que o software pode ser analisado, modificado e testado.*

- [x] **Analisabilidade e Modificabilidade:** Separação clara entre regras puras/persistência (`src/store.js`) e apresentação/eventos (`src/app.js`), acompanhada de histórico de decisões em `docs/prompts/ISSUE-01.md` a `ISSUE-08.md`.
- [x] **Estabilidade e Testabilidade:**
  - Funções puras determinísticas com injeção de dependência de armazenamento (`armazenamento`) e data de referência (`dataReferencia`).
  - Cobertura verificada por portão automático (`npm run test:coverage:gate`): **`93.61%`** de linhas em `src/store.js`, **`66.57%`** em `src/app.js` e média de **`80.09%`** em `src/` (acima do mínimo exigido de `60%`).
  - Análise estática (`npm run lint`) e bloqueio contra alteração indevida de testes (`npm run guard:tests`).

## 6. Portabilidade (*Portability*)
*Capacidade de transferência do software para outro ambiente.*

- [x] **Adaptabilidade:** Funciona integralmente no navegador (via *GitHub Pages* — hospedagem estática do GitHub) e executa sua camada de domínio e testes diretamente em *Node.js* 20+ usando dublês (*stubs* — objetos simulados de teste). Opera em modo degradado em memória caso `localStorage` esteja desabilitado (`#3`).
- [x] **Capacidade de Substituição e Interoperabilidade de Dados:** Contrato de exportação e importação *JSON* versionado (`versaoSchema: "1.2.0"`) permitindo transportar listas completas com integridade entre navegadores e máquinas (`#8`).
