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

/**
 * Display complete error message - NEVER truncate
 * This follows the critical requirement in outline.txt
 */
function displayError(error) {
  console.error(chalk.red('\n[ERROR]\n'));

  if (error.response) {
    const status = error.response.status;

    // Handle 503 Service Unavailable specially
    if (status === 503) {
      console.error(chalk.red('Canvas is currently unavailable (503 Service Unavailable)'));
      console.error(chalk.yellow('\nThis usually means:'));
      console.error(chalk.yellow('  • Canvas is down for maintenance'));
      console.error(chalk.yellow('  • Canvas is experiencing service issues'));
      console.error(chalk.yellow('\nCheck status at: ') + chalk.cyan('https://status.instructure.com/'));

      // Show technical details if not HTML
      const isHtml = typeof error.response.data === 'string' &&
                     error.response.data.trim().startsWith('<!DOCTYPE') ||
                     error.response.data.trim().startsWith('<html');

      if (!isHtml) {
        console.error(chalk.red('\nResponse Data:'));
        console.error(JSON.stringify(error.response.data, null, 2));
      }
      return; // Skip stack trace for 503 errors
    }

    // HTTP error response (non-503)
    console.error(chalk.red('Status:'), status);
    console.error(chalk.red('Status Text:'), error.response.statusText);
    console.error(chalk.red('URL:'), error.config?.url || 'N/A');
    console.error(chalk.red('\nResponse Data:'));
    console.error(JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    // Request made but no response
    console.error(chalk.red('No response received from server'));
    console.error(chalk.red('Request:'), error.request);
  } else {
    // Something else happened
    console.error(chalk.red('Message:'), error.message);
  }

  // Always show stack trace (except for 503)
  console.error(chalk.red('\nStack Trace:'));
  console.error(error.stack);
}

/**
 * Require authentication - exit if not authenticated
 */
function requireAuth(config) {
  if (!config.isAuthenticated()) {
    console.error(chalk.red('\n[!] Not authenticated. Please run:'));
    console.error(chalk.yellow('  canvas-cli auth\n'));
    process.exit(1);
  }
}

module.exports = {
  displayError,
  requireAuth
};
