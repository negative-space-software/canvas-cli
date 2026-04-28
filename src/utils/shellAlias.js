/*
 * Copyright 2025 Negative Space Software
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { confirm } = require('../ui/select');

const ALIAS_MARKER = '# Added by canvas-cli';
const ALIAS_TARGET = 'canvas-cli';
const ALIAS_NAME = 'canvas';

/**
 * Detect the user's shell and the rc file the alias should be written to.
 * Returns { shell, rcFile } or null if shell is unsupported.
 */
function detectShell() {
  const shellEnv = process.env.SHELL || '';
  const home = os.homedir();

  if (shellEnv.includes('zsh')) {
    return { shell: 'zsh', rcFile: path.join(home, '.zshrc') };
  }
  if (shellEnv.includes('bash')) {
    // macOS Terminal launches bash as a login shell, which reads .bash_profile
    // Linux interactive bash reads .bashrc
    const rcFile = process.platform === 'darwin'
      ? path.join(home, '.bash_profile')
      : path.join(home, '.bashrc');
    return { shell: 'bash', rcFile };
  }
  if (shellEnv.includes('fish')) {
    return { shell: 'fish', rcFile: path.join(home, '.config/fish/config.fish') };
  }
  return null;
}

/**
 * Check whether the alias is already present in the rc file.
 */
function aliasAlreadyInstalled(rcFile) {
  if (!fs.existsSync(rcFile)) return false;
  const content = fs.readFileSync(rcFile, 'utf8');
  // Detect either our marker or any user-written alias line for `canvas`
  return content.includes(ALIAS_MARKER) || /^\s*alias\s+canvas[\s=]/m.test(content);
}

/**
 * Build the alias line for the given shell.
 */
function buildAliasLine(shell) {
  if (shell === 'fish') {
    return `\n${ALIAS_MARKER}\nalias ${ALIAS_NAME} '${ALIAS_TARGET}'\n`;
  }
  return `\n${ALIAS_MARKER}\nalias ${ALIAS_NAME}='${ALIAS_TARGET}'\n`;
}

/**
 * Append the alias to the rc file. Creates parent dirs if needed (fish).
 */
function appendAlias(rcFile, shell) {
  const dir = path.dirname(rcFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(rcFile, buildAliasLine(shell));
}

/**
 * Offer to install the `canvas` alias. Safe to call from any flow.
 * - Skips silently on unsupported shells
 * - Skips if alias already exists
 * - Asks the user before writing
 */
async function offerAliasInstall() {
  const detected = detectShell();
  if (!detected) {
    return;
  }
  const { shell, rcFile } = detected;

  if (aliasAlreadyInstalled(rcFile)) {
    return;
  }

  console.log(chalk.cyan(`\n[*] Detected ${shell} shell.`));
  const yes = await confirm(`Add 'canvas' as a shortcut alias for 'canvas-cli' in ${rcFile}?`);
  if (!yes) {
    console.log(chalk.gray('Skipped. You can run `canvas-cli alias` later to add it.'));
    return;
  }

  try {
    appendAlias(rcFile, shell);
    console.log(chalk.green(`\n[+] Alias added to ${rcFile}`));
    console.log(chalk.gray(`Run \`source ${rcFile}\` or open a new terminal to start using \`canvas\`.`));
  } catch (error) {
    console.log(chalk.yellow(`\n[!] Could not write to ${rcFile}: ${error.message}`));
  }
}

module.exports = {
  detectShell,
  aliasAlreadyInstalled,
  offerAliasInstall
};
