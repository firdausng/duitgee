import { appendFile, readFile } from 'node:fs/promises';

const target = '.svelte-kit/cloudflare/_worker.js';
const source = 'cron/job.js';

const contents = await readFile(source, 'utf8');
await appendFile(target, '\n' + contents, 'utf8');

console.log(`[cron/append] appended ${source} to ${target}`);
