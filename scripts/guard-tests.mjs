import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function listarArquivosAlterados() {
  const baseRef = process.env.GITHUB_BASE_REF;
  const candidatos = [];
  if (baseRef) {
    candidatos.push(`origin/${baseRef}...HEAD`, `${baseRef}...HEAD`);
  }
  const before = process.env.GITHUB_EVENT_BEFORE;
  if (before && !/^0+$/.test(before)) {
    candidatos.push(`${before}..HEAD`);
  }
  candidatos.push('HEAD~1..HEAD');

  for (const range of candidatos) {
    const res = spawnSync('git', ['diff', '--name-only', range], { encoding: 'utf8' });
    if (res.status === 0) {
      return res.stdout
        .split(/\r?\n/)
        .map((linha) => linha.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function possuiJustificativaTeste() {
  if (process.env.GUARD_ALLOW_TEST_CHANGE === '1') return true;
  if ((process.env.PR_LABELS || '').includes('test-change-justificado')) return true;

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) return false;

  try {
    const evento = JSON.parse(readFileSync(eventPath, 'utf8'));
    const labels = evento?.pull_request?.labels || [];
    if (labels.some((label) => label?.name === 'test-change-justificado')) {
      return true;
    }
    const body = String(evento?.pull_request?.body || '');
    if (body.includes('test-change-justificado')) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

const alterados = listarArquivosAlterados();
const tocouTests = alterados.some((arq) => arq.startsWith('tests/'));
const tocouSrc = alterados.some((arq) => arq.startsWith('src/'));

if (tocouTests && tocouSrc && !possuiJustificativaTeste()) {
  console.error(
    'Guard-Tests bloqueou a integração: alteração simultânea em tests/ e src/ exige a label "test-change-justificado".'
  );
  process.exit(1);
}

console.log(
  `Guard-Tests aprovado (${alterados.length} arquivos no diff; tests=${tocouTests}, src=${tocouSrc}).`
);
