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
const axios = require('axios');
const config = require('../utils/config');
const { version } = require('../../package.json');
const asciify = require('asciify-image');
const path = require('path');

/**
 * Extract institution name from Canvas URL
 * e.g., https://clemson.instructure.com -> "Clemson"
 *       https://canvas.university.edu -> "University"
 */
function extractInstitutionName(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Pattern 1: [school].instructure.com
    if (hostname.endsWith('.instructure.com')) {
      const schoolName = hostname.split('.')[0];
      return schoolName.charAt(0).toUpperCase() + schoolName.slice(1);
    }

    // Pattern 2: canvas.[school].edu or canvas.[school].[tld]
    if (hostname.startsWith('canvas.')) {
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        const schoolName = parts[1];
        return schoolName.charAt(0).toUpperCase() + schoolName.slice(1);
      }
    }

    // Fallback: just return the hostname
    return hostname;
  } catch (error) {
    return 'Unknown';
  }
}

/**
 * Convert image to ASCII art
 */
async function imageToAscii(imagePath, options = {}) {
  try {
    const ascii = await asciify(imagePath, {
      fit: 'box',
      width: options.width || 30,
      height: options.height || 20,
      color: options.color !== false,
      format: 'string',
      c_ratio: 2,
      ...options
    });
    // Remove trailing whitespace from each line to clean up transparent areas
    return ascii.split('\n').map(line => line.trimEnd()).join('\n');
  } catch (error) {
    return null;
  }
}

/**
 * Combine two ASCII art strings side by side
 */
function combineAsciiSideBySide(left, right, spacing = 4) {
  if (!left && !right) return '';
  if (!left) return right;
  if (!right) return left;

  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const maxLines = Math.max(leftLines.length, rightLines.length);
  const leftWidth = Math.max(...leftLines.map(l => l.replace(/\u001b\[[0-9;]*m/g, '').length));
  const spacer = ' '.repeat(spacing);

  const combined = [];
  for (let i = 0; i < maxLines; i++) {
    const leftLine = leftLines[i] || '';
    const rightLine = rightLines[i] || '';
    const leftPadding = leftWidth - leftLine.replace(/\u001b\[[0-9;]*m/g, '').length;
    combined.push(leftLine + ' '.repeat(leftPadding) + spacer + rightLine);
  }
  return combined.join('\n');
}

/**
 * About command - display project info and ASCII art
 */
async function aboutCommand() {
  console.log('\n');

  // Get Canvas URL if authenticated
  const canvasUrl = config.getCanvasUrl();
  const institutionName = canvasUrl ? extractInstitutionName(canvasUrl) : null;

  // Generate ASCII art for both logos from local files
  const canvasLogoPath = path.join(__dirname, '../../canvas.png');
  const nssLogoPath = path.join(__dirname, '../../nss.png');

  const canvasAscii = await imageToAscii(canvasLogoPath, { width: 30, height: 18, color: false });
  const nssAscii = await imageToAscii(nssLogoPath, { width: 30, height: 18, color: true });

  if (canvasAscii && nssAscii) {
    // Color the Canvas logo red
    const redLogo = canvasAscii.split('\n').map(line => chalk.red(line)).join('\n');

    // Combine both logos side by side
    const combinedLogos = combineAsciiSideBySide(redLogo, nssAscii, 6);

    // Create info text
    const info = [
      chalk.cyan.bold('CANVAS CLI'),
      '',
      chalk.bold('Version:  ') + chalk.green(`v${version}`),
      chalk.bold('Author:   ') + chalk.yellow('Negative Space Software'),
      chalk.bold('License:  ') + chalk.magenta('Apache License 2.0'),
      chalk.bold('GitHub:   ') + chalk.blue('https://github.com/negative-space-software/canvas-cli'),
      ''
    ];

    // Add institution info if authenticated
    if (institutionName && canvasUrl) {
      info.push(chalk.bold('School:   ') + chalk.white(institutionName));
      info.push(chalk.bold('Canvas:   ') + chalk.gray(canvasUrl));
      info.push('');
    } else {
      info.push(chalk.yellow('Not authenticated - run ') + chalk.cyan('canvas-cli auth'));
      info.push('');
    }

    info.push(chalk.gray('A modern CLI for Canvas LMS'));
    info.push(chalk.gray('Built with Node.js, Inquirer, and Chalk'));

    // Display logos on top
    console.log(combinedLogos.split('\n').map(line => '  ' + line).join('\n'));

    // Display info text underneath
    console.log('');
    console.log(info.map(line => '  ' + line).join('\n'));
  } else if (canvasAscii) {
    // Fallback to just Canvas logo if NSS logo fails to load
    const redLogo = canvasAscii.split('\n').map(line => chalk.red(line)).join('\n');
    console.log(redLogo.split('\n').map(line => '  ' + line).join('\n'));
    console.log('');

    console.log(chalk.bold('  Version:  ') + chalk.green(`v${version}`));
    console.log(chalk.bold('  Author:   ') + chalk.yellow('Negative Space Software'));
    console.log(chalk.bold('  License:  ') + chalk.magenta('Apache License 2.0'));
    console.log(chalk.bold('  GitHub:   ') + chalk.blue('https://github.com/negative-space-software/canvas-cli'));

    if (institutionName && canvasUrl) {
      console.log(chalk.bold('  School:   ') + chalk.white(institutionName));
      console.log(chalk.bold('  Canvas:   ') + chalk.gray(canvasUrl));
    } else {
      console.log(chalk.yellow('\n  Not authenticated - run ') + chalk.cyan('canvas-cli auth'));
    }

    console.log(chalk.gray('\n  A modern CLI for Canvas LMS'));
    console.log(chalk.gray('  Built with Node.js, Inquirer, and Chalk'));
  } else {
    // Fallback if both logos fail to load
    console.log(chalk.bold('  Version:  ') + chalk.green(`v${version}`));
    console.log(chalk.bold('  Author:   ') + chalk.yellow('Negative Space Software'));
    console.log(chalk.bold('  License:  ') + chalk.magenta('Apache License 2.0'));
    console.log(chalk.bold('  GitHub:   ') + chalk.blue('https://github.com/negative-space-software/canvas-cli'));

    if (institutionName && canvasUrl) {
      console.log(chalk.bold('  School:   ') + chalk.white(institutionName));
      console.log(chalk.bold('  Canvas:   ') + chalk.gray(canvasUrl));
    } else {
      console.log(chalk.yellow('\n  Not authenticated - run ') + chalk.cyan('canvas-cli auth'));
    }

    console.log(chalk.gray('\n  A modern CLI for Canvas LMS'));
    console.log(chalk.gray('  Built with Node.js, Inquirer, and Chalk'));
  }

  console.log('\n');
}

module.exports = aboutCommand;
