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

const inquirer = require('inquirer');
const axios = require('axios');
const chalk = require('chalk');
const config = require('../utils/config');
const { displayError } = require('../utils/errors');
const { offerAliasInstall } = require('../utils/shellAlias');

/**
 * Extract Canvas URL from error response
 * Canvas API returns the full URL in error responses
 */
function extractUrlFromError(error) {
  try {
    // Check if error response contains a URL
    if (error.response && error.response.request && error.response.request.res) {
      const responseUrl = error.response.request.res.responseUrl;
      if (responseUrl) {
        const url = new URL(responseUrl);
        return `${url.protocol}//${url.host}`;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Detect Canvas URL from token by trying common patterns
 * Canvas tokens are scoped to specific instances, so we try to discover the URL
 */
async function detectCanvasUrl(token) {
  console.log(chalk.blue('\n[*] Detecting Canvas URL from token...\n'));

  // Strategy 1: Try generic instructure.com endpoint
  // This will redirect or error with institution-specific info
  const commonPatterns = [
    'https://canvas.instructure.com'
  ];

  for (const baseUrl of commonPatterns) {
    try {
      console.log(chalk.gray(`  Attempting auto-detection...`));
      const response = await axios.get(`${baseUrl}/api/v1/users/self`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000,
        maxRedirects: 5,
        validateStatus: () => true // Accept any status to analyze response
      });

      if (response.status === 200 && response.data.id) {
        // Extract the actual URL from the successful request
        const actualUrl = response.request.res.responseUrl || baseUrl;
        const url = new URL(actualUrl);
        const detectedUrl = `${url.protocol}//${url.host}`;

        console.log(chalk.green(`  [+] Found! Connected as: ${response.data.name}`));
        console.log(chalk.gray(`  Canvas URL: ${detectedUrl}`));
        return detectedUrl;
      }
    } catch (error) {
      // Try to extract URL from error
      const extractedUrl = extractUrlFromError(error);
      if (extractedUrl) {
        // Verify the extracted URL works
        try {
          const verifyResponse = await axios.get(`${extractedUrl}/api/v1/users/self`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 5000
          });

          if (verifyResponse.status === 200 && verifyResponse.data.id) {
            console.log(chalk.green(`  [+] Found! Connected as: ${verifyResponse.data.name}`));
            console.log(chalk.gray(`  Canvas URL: ${extractedUrl}`));
            return extractedUrl;
          }
        } catch (verifyError) {
          // Continue to manual entry
        }
      }
    }
  }

  console.log(chalk.yellow('  [!] Could not auto-detect URL from token'));
  return null;
}

/**
 * Auth command - prompts for token and auto-detects Canvas URL
 */
async function authCommand() {
  try {
    console.log(chalk.cyan('\n[AUTH] Canvas CLI Authentication\n'));

    // Prompt for token
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'token',
        message: 'Enter your Canvas access token:',
        mask: '*',
        validate: (input) => {
          if (!input || input.trim().length === 0) {
            return 'Token cannot be empty';
          }
          return true;
        }
      }
    ]);

    const token = answers.token.trim();

    // Try to detect Canvas URL
    const canvasUrl = await detectCanvasUrl(token);

    if (!canvasUrl) {
      // If auto-detection fails, ask user for URL
      console.log(chalk.yellow('\n[!] Could not auto-detect Canvas URL'));
      console.log(chalk.gray('Please enter your institution\'s Canvas URL'));
      console.log(chalk.gray('Common formats:'));
      console.log(chalk.gray('  - https://[school].instructure.com'));
      console.log(chalk.gray('  - https://canvas.[school].edu\n'));

      const urlAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'url',
          message: 'Enter your Canvas URL:',
          validate: (input) => {
            if (!input || !input.startsWith('http')) {
              return 'Please enter a valid URL starting with http:// or https://';
            }
            return true;
          }
        }
      ]);

      // Verify the manual URL
      try {
        const response = await axios.get(`${urlAnswer.url}/api/v1/users/self`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 200) {
          config.saveConfig(token, urlAnswer.url.replace(/\/$/, ''));
          console.log(chalk.green('\n[+] Authentication successful!'));
          console.log(chalk.gray(`Logged in as: ${response.data.name}`));
        }
      } catch (error) {
        console.error(chalk.red('\n[X] Failed to authenticate with provided URL'));
        displayError(error);
        process.exit(1);
      }
    } else {
      // Save detected URL
      config.saveConfig(token, canvasUrl);
      console.log(chalk.green('\n[+] Authentication successful!'));
    }

    // Offer to install `canvas` alias for the current shell
    await offerAliasInstall();

  } catch (error) {
    displayError(error);
    process.exit(1);
  }
}

module.exports = authCommand;
