import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const outputDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
const siteFiles = ['index.html', 'styles.css', 'app.js', 'roadmaps.js', '.nojekyll'];

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const file of siteFiles) {
  await cp(new URL(`../${file}`, import.meta.url), new URL(`../dist/${file}`, import.meta.url));
}

await cp(new URL('../lib/', import.meta.url), new URL('../dist/lib/', import.meta.url), { recursive: true });

console.log(`Production site created at ${outputDirectory}`);
