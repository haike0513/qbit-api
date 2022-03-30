#!/usr/bin/env node

import babel from '@babel/cli/lib/babel/dir.js';
import { EXT_CJS, EXT_ESM } from '@polkadot/dev/config/babel-extensions.cjs'
import copySync from '@polkadot/dev/scripts/copySync.mjs';
import execSync from '@polkadot/dev/scripts/execSync.mjs';

import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// const BL_CONFIGS = ['js', 'cjs', 'mjs']
// .map((e) => `babel.config.${e}`);

const CPX = ['patch', 'js', 'cjs', 'mjs', 'json', 'd.ts', 'css', 'gif', 'hbs', 'jpg', 'png', 'svg']
  .map((e) => `src/**/*.${e}`)
  .concat(['package.json', 'README.md', 'LICENSE', 'src/**/mod.ts']);


// compile via babel, either via supplied config or default
async function buildBabel (dir, type) {
  const outDir = path.join(process.cwd(), 'build');

  await babel.default({
    babelOptions: {
      configFile: type === 'esm'
        ? path.join(__dirname, './config/esm.mjs')
        : path.join(__dirname, './config/cjs.mjs')
    },
    cliOptions: {
      extensions: ['.ts', '.tsx'],
      filenames: ['src'],
      ignore: '**/*.d.ts',
      outDir,
      outFileExtension: type === 'esm' ? EXT_ESM : EXT_CJS
    }
  });
    // rewrite a skeleton package.json with a type=module
    if (type !== 'esm') {
      [
        ...CPX,
        `../../build/${dir}/src/**/*.d.ts`,
        `../../build/packages/${dir}/src/**/*.d.ts`
      ].forEach((s) => copySync(s, 'build'));
    }
}


function sortJson (json) {
  return Object
    .entries(json)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((all, [k, v]) => ({ ...all, [k]: v }), {});
}


function orderPackageJson (json) {
  // sort the object
  const sorted = sortJson(json);


  // move the different entry points to the (almost) end
  ['browser', 'electron', 'main', 'module', 'react-native'].forEach((d) => {
    delete sorted[d];

    if (json[d]) {
      sorted[d] = json[d];
    }
  });

  // move bin, scripts & dependencies to the end
  [
    ['bin', 'scripts'],
    ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies', 'resolutions']
  ].forEach((a) =>
    a.forEach((d) => {
      delete sorted[d];

      if (json[d] && Object.keys(json[d]).length) {
        sorted[d] = sortJson(json[d]);
      }
    })
  );

  fs.writeFileSync(path.join(process.cwd(), 'package.json'), `${JSON.stringify(sorted, null, 2)}\n`);
}



async function buildJs (dir) {
  const json = JSON.parse(fs.readFileSync(path.join(process.cwd(), './package.json'), 'utf-8'));
  const { name, version } = json;

  orderPackageJson(json);

  console.log(`*** ${name} ${version}`);

  await buildBabel(dir, 'cjs');
  await buildBabel(dir, 'esm');
}

async function main() {
  execSync('yarn polkadot-dev-clean-build');
  execSync('yarn polkadot-exec-tsc --build tsconfig.build.json');
  process.chdir('packages');
  // get dirs
  const dirs = fs
    .readdirSync('.')
    .filter((dir) => fs.statSync(dir).isDirectory() && fs.existsSync(path.join(process.cwd(), dir, 'src')));
  // build packages
  for (const dir of dirs) {
    process.chdir(dir);

    await buildJs(dir);

    process.chdir('..');
  }
}

await main();