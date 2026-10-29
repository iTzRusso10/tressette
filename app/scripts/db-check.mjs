// Prova le migrazioni e le funzioni del server su un Postgres vero, vuoto, creato al volo.
// Serve Postgres installato (initdb, postgres, psql). Uso: node scripts/db-check.mjs
//
// 1. crea un database temporaneo; 2. applica supabase/tests/00_stub_supabase.sql (schema auth e ruoli
// che su Supabase ci sono già); 3. tutte le migrazioni in ordine; 4. i file supabase/tests/[1-9]*.sql,
// che falliscono con un errore se qualcosa non va.
import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bin = ['/usr/lib/postgresql/16/bin', '/usr/lib/postgresql/17/bin', '/opt/homebrew/bin', '/usr/local/bin'].find(d => existsSync(join(d, 'initdb')));
if (!bin) {
  console.error('Postgres non trovato (initdb).');
  process.exit(1);
}
const dir = mkdtempSync(join(tmpdir(), 'napoletane-db-'));
const data = join(dir, 'data');
const asRoot = process.getuid?.() === 0;
// Postgres non parte come root: si usa l'utente «postgres» se c'è.
const run = (cmd, args, opts = {}) =>
  asRoot ? execFileSync('runuser', ['-u', 'postgres', '--', join(bin, cmd), ...args], { stdio: 'pipe', ...opts }) : execFileSync(join(bin, cmd), args, { stdio: 'pipe', ...opts });
if (asRoot) execFileSync('chown', ['postgres', dir]);
run('initdb', ['-D', data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C']);
const port = String(54000 + Math.floor(Math.random() * 900));
const pg = asRoot
  ? spawn('runuser', ['-u', 'postgres', '--', join(bin, 'postgres'), '-D', data, '-p', port, '-k', dir, '-c', 'listen_addresses='], { stdio: 'ignore' })
  : spawn(join(bin, 'postgres'), ['-D', data, '-p', port, '-k', dir, '-c', 'listen_addresses='], { stdio: 'ignore' });
const psql = (file, label) => {
  try {
    const out = execFileSync(join(bin, 'psql'), ['-h', dir, '-p', port, '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q', '-f', file], { stdio: 'pipe' }).toString();
    console.log('ok', label, out.trim() ? `\n${out.trim()}` : '');
  } catch (e) {
    console.error('ERRORE in', label, '\n' + (e.stderr?.toString() || e.message));
    throw e;
  }
};
let failed = false;
try {
  for (let i = 0; i < 50; i++) {
    try {
      execFileSync(join(bin, 'pg_isready'), ['-h', dir, '-p', port], { stdio: 'ignore' });
      break;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  const tests = join(root, 'supabase', 'tests');
  psql(join(tests, '00_stub_supabase.sql'), 'stub di Supabase');
  const mig = join(root, 'supabase', 'migrations');
  for (const f of readdirSync(mig).filter(f => f.endsWith('.sql')).sort()) psql(join(mig, f), f);
  for (const f of readdirSync(tests).filter(f => /^[1-9].*\.sql$/.test(f)).sort()) psql(join(tests, f), f);
  console.log('\nTutto a posto.');
} catch {
  failed = true;
} finally {
  pg.kill('SIGINT');
  await new Promise(r => setTimeout(r, 500));
  rmSync(dir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
