import { spawnSync } from 'node:child_process';

const LIMITE_MINIMO_PCT = 60;

const execucao = spawnSync(
  process.execPath,
  ['--test', '--experimental-test-coverage', 'tests/unit', 'tests/acceptance'],
  { encoding: 'utf8' }
);

if (execucao.stdout) process.stdout.write(execucao.stdout);
if (execucao.stderr) process.stderr.write(execucao.stderr);

if (execucao.status !== 0) {
  process.exit(execucao.status ?? 1);
}

const saidaCompleta = `${execucao.stdout || ''}\n${execucao.stderr || ''}`;
const linhas = saidaCompleta.split(/\r?\n/);

let emSrc = false;
const amostrasPorArquivo = new Map();

for (const linha of linhas) {
  if (/^[ℹ#\s]*src\s*\|/.test(linha)) {
    emSrc = true;
    continue;
  }
  if (emSrc && /\b(tests|scripts|all files)\b/.test(linha)) {
    emSrc = false;
  }

  const matchFlat = /(?:^|[ℹ#\s])src[/\\]([a-zA-Z0-9_.-]+\.js)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/.exec(linha);
  const matchGrouped = emSrc
    ? /\s+([a-zA-Z0-9_.-]+\.js)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)/.exec(linha)
    : null;
  const match = matchFlat || matchGrouped;
  if (!match) continue;

  const arquivo = match[1];
  const entrada = {
    linhas: Number(match[2]),
    ramos: Number(match[3]),
    funcoes: Number(match[4]),
  };
  if (!amostrasPorArquivo.has(arquivo)) {
    amostrasPorArquivo.set(arquivo, []);
  }
  amostrasPorArquivo.get(arquivo).push(entrada);
}

if (amostrasPorArquivo.size === 0) {
  console.error('Coverage Gate falhou: não foi possível extrair métricas de cobertura de src/.');
  process.exit(1);
}

const metricasSrc = [];
for (const [arquivo, amostras] of amostrasPorArquivo.entries()) {
  const mediaArquivo = amostras.reduce((acc, item) => acc + item.linhas, 0) / amostras.length;
  metricasSrc.push({ arquivo, linhas: mediaArquivo });
}

const mediaLinhas = metricasSrc.reduce((acc, m) => acc + m.linhas, 0) / metricasSrc.length;
const abaixo = metricasSrc.filter((m) => m.linhas < LIMITE_MINIMO_PCT);

if (abaixo.length > 0 || mediaLinhas < LIMITE_MINIMO_PCT) {
  console.error(
    `Coverage Gate falhou: cobertura mínima exigida de ${LIMITE_MINIMO_PCT}% em src/ não atingida.`
  );
  process.exit(1);
}

console.log(
  `Coverage Gate aprovado (média de linhas em src/: ${mediaLinhas.toFixed(2)}% >= ${LIMITE_MINIMO_PCT}%).`
);
