import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const base = process.argv[2];
if (!base) throw new Error('Usage: node cloudflare/verify.mjs https://DEPLOYMENT.workers.dev');
const files = JSON.parse(readFileSync(new URL('./assets.json', import.meta.url)));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
let checked = 0;
for (const file of files) {
  const response = await fetch(new URL(`/${file}`, base), { redirect: 'manual' });
  if (response.status !== 200) throw new Error(`${file}: HTTP ${response.status}`);
  if (hash(Buffer.from(await response.arrayBuffer())) !== hash(readFileSync(`dist/${file}`))) throw new Error(`${file}: content mismatch`);
  checked++;
}
for (const path of ['/.git/config', '/.env', '/package.json', '/cloudflare/worker.mjs']) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  if (response.status !== 404) throw new Error(`Source/private path returned ${response.status}: ${path}`);
}
console.log(`Verified ${checked} public assets and private-path exclusions at ${base}`);
