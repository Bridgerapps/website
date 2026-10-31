#!/usr/bin/env node
// Run only against a dedicated deployment checkout, never a developer's working tree.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const [checkoutArg, stateArg, liveUrl] = process.argv.slice(2);
if (!checkoutArg || !stateArg || !liveUrl) throw new Error('Usage: watch-deploy.mjs CHECKOUT STATE_FILE LIVE_URL');
const cwd = resolve(checkoutArg), state = resolve(stateArg);
function run(command, args, capture = false) {
  return execFileSync(command, args, {cwd, encoding:'utf8', timeout:600000, stdio:capture ? ['ignore','pipe','pipe'] : 'inherit', env:{...process.env,CI:'true'}})?.trim();
}
const dirty = run('git',['status','--porcelain','--untracked-files=no'],true).split('\n').filter(Boolean);
// Jabbit's upstream repository contains both README.md and readme.md; macOS cannot represent both.
if (dirty.some(line => line.slice(3) !== 'README.md')) throw new Error('Deployment checkout has local modifications; refusing to overwrite them');
run('git',['fetch','--quiet','origin','main']);
const sha = run('git',['rev-parse','origin/main'],true);
const previous = existsSync(state) ? JSON.parse(readFileSync(state,'utf8')) : {};
if (previous.commit === sha) process.exit(0);
run('git',['merge','--ff-only','origin/main']);
run('npm',['ci','--no-audit','--no-fund']);
// This historical generated file is tracked in Jabbit. Restore it after npm regenerates it.
const trackedLock = run('git',['ls-files','node_modules/.package-lock.json'],true);
if (trackedLock) run('git',['restore','--','node_modules/.package-lock.json']);
run('npm',['run','deploy:cloudflare']);
const response = await fetch(liveUrl, {redirect:'follow',signal:AbortSignal.timeout(30000)});
if (!response.ok || response.headers.get('server') !== 'cloudflare') throw new Error(`Post-deploy check failed: ${response.status}`);
const published = Buffer.from(await response.arrayBuffer());
if (!published.equals(readFileSync(resolve(cwd,'dist/index.html')))) throw new Error('Published homepage does not match this commit');
writeFileSync(state,JSON.stringify({commit:sha,verifiedAt:new Date().toISOString(),url:liveUrl,status:response.status},null,2)+'\n',{mode:0o600});
console.log(`Verified Cloudflare deployment ${sha}: ${liveUrl}`);
