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
const { makeRawRequest } = require('../api/client');
const { displayError, requireAuth } = require('../utils/errors');
const config = require('../utils/config');

/**
 * Raw command - make a raw API request and display the response
 */
async function rawCommand(endpoint) {
  try {
    requireAuth(config);

    if (!endpoint) {
      console.error(chalk.red('\nError: Please provide an API endpoint'));
      console.log(chalk.yellow('Usage: canvas-cli raw <endpoint>'));
      console.log(chalk.yellow('Example: canvas-cli raw /api/v1/users/self\n'));
      process.exit(1);
    }

    // Ensure endpoint starts with /
    if (!endpoint.startsWith('/')) {
      endpoint = '/' + endpoint;
    }

    console.log(chalk.cyan(`\n[*] Fetching: ${endpoint}\n`));

    const data = await makeRawRequest(endpoint);

    // Pretty print the JSON response
    console.log(JSON.stringify(data, null, 2));
    console.log();

  } catch (error) {
    displayError(error);
    process.exit(1);
  }
}

module.exports = rawCommand;
