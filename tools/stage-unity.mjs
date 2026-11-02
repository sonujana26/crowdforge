import { readdir, readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Buffer } from 'node:buffer';
import console from 'node:console';
import process from 'node:process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'unity/Builds/UnityWeb/Build');
const output = resolve(root, 'apps/web/public/unity/Build');
try {
  const names = await readdir(source);
  const select = (suffix) => {
    const found = names.filter((name) => name.endsWith(suffix));
    if (found.length !== 1 || !/^[a-zA-Z0-9_-]+\.[a-z.]+$/.test(found[0])) throw new Error(`Expected exactly one safe ${suffix} artifact.`);
    return found[0];
  };
  const files = { loaderUrl: select('.loader.js'), dataUrl: select('.data'), frameworkUrl: select('.framework.js'), codeUrl: select('.wasm') };
  for (const file of Object.values(files)) {
    const bytes = await readFile(resolve(source,file));
    if (!bytes.length) throw new Error(`Empty build artifact: ${file}`);
    if (file.endsWith('.wasm') && !bytes.subarray(0,4).equals(Buffer.from([0,97,115,109]))) throw new Error('Invalid WebAssembly file.');
  }
  await mkdir(output,{recursive:true});
  for (const file of Object.values(files)) await copyFile(resolve(source,file),resolve(output,basename(file)));
  // Manifest last: missing or failed builds never advertise a ready runtime.
  await writeFile(resolve(output,'../manifest.json'),JSON.stringify({ protocol:1,...Object.fromEntries(Object.entries(files).map(([key,file])=>[key,`/unity/Build/${file}`])) },null,2)+'\n');
  console.log('Unity artifacts staged. Run pnpm build, then test /arena?renderer=unity before cutover.');
} catch (error) {
  console.error(`Unity staging failed: ${error.message}`);
  process.exitCode=1;
}
