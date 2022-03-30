#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yargs from 'yargs';

import copySync from '@polkadot/dev/scripts/copySync.mjs';
import execSync from '@polkadot/dev/scripts/execSync.mjs';

console.log('$ build:version', process.argv.slice(2).join(' '));

const argv = yargs(process.argv.slice(2))
  .options({
    'skip-beta': {
      description: 'Do not increment as beta',
      type: 'boolean'
    }
  })
  .strict()
  .argv;

function runClean () {
  execSync('yarn polkadot-dev-clean-build');
}

// function runCheck () {
//   execSync('yarn lint');
// }

function runTest () {
  execSync('yarn test');
}

function runBuild () {
  execSync('yarn build');
}

function npmGetVersion () {
  return JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')
  ).version;
}

function npmPublish () {
  if (fs.existsSync('.skip-npm')) {
    return;
  }

  ['LICENSE', 'package.json']
    .filter((file) => !fs.existsSync(path.join(process.cwd(), 'build', file)))
    .forEach((file) => copySync(file, 'build'));

  process.chdir('build');

  const tag = npmGetVersion().includes('-') ? '--tag beta' : '';
  let count = 1;

  while (true) {
    try {
      execSync(`npm publish --access public ${tag}`);

      break;
    } catch (error) {
      if (count < 5) {
        const end = Date.now() + 15000;

        console.error(`Publish failed on attempt ${count}/5. Retrying in 15s`);
        count++;

        while (Date.now() < end) {
          // just spin our wheels
        }
      }
    }
  }

  process.chdir('..');
}

function gitBump () {
  const currentVersion = npmGetVersion();
  const [version, tag] = currentVersion.split('-');
  const [,, patch] = version.split('.');

  if (argv['skip-beta']) {
    // don't allow beta versions
    execSync('yarn polkadot-dev-version patch');
  } else {
    execSync('yarn polkadot-dev-version pre');
  }
}

gitBump();
runClean();
// runCheck();
// runTest();
runBuild();
