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

const chalk = require('chalk');
const { detectShell, aliasAlreadyInstalled, offerAliasInstall } = require('../utils/shellAlias');
const { displayError } = require('../utils/errors');

/**
 * Alias command - install a `canvas` shortcut alias for `canvas-cli`
 * in the user's shell rc file.
 */
async function aliasCommand() {
  try {
    const detected = detectShell();
    if (!detected) {
      console.log(chalk.yellow('\n[!] Unsupported shell.'));
      console.log(chalk.gray('Supported: zsh, bash, fish.'));
      console.log(chalk.gray('Add manually to your shell config:'));
      console.log(chalk.cyan("  alias canvas='canvas-cli'\n"));
      return;
    }

    if (aliasAlreadyInstalled(detected.rcFile)) {
      console.log(chalk.green(`\n[+] Alias already configured in ${detected.rcFile}\n`));
      return;
    }

    await offerAliasInstall();
  } catch (error) {
    displayError(error);
    process.exit(1);
  }
}

module.exports = aliasCommand;
