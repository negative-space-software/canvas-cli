#!/usr/bin/env node

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

const { Command } = require('commander');
const authCommand = require('./commands/auth');
const listCommand = require('./commands/list');
const classCommand = require('./commands/class');
const assignmentCommand = require('./commands/assignment');
const submitCommand = require('./commands/submit');
const rawCommand = require('./commands/raw');
const openCommand = require('./commands/open');
const aboutCommand = require('./commands/about');
const aliasCommand = require('./commands/alias');
const chalk = require('chalk');

const program = new Command();

program
  .name('canvas-cli')
  .description('CLI tool for Canvas LMS')
  .version('1.0.0');

// Auth command
program
  .command('auth')
  .description('Authenticate with Canvas (stores token and auto-detects URL)')
  .action(authCommand);

// List command - default behavior
program
  .command('list')
  .description('List assignments due in the next 3 days')
  .action(() => listCommand({}));

// List all command
program
  .command('list-all')
  .description('List all assignments')
  .action(() => listCommand({ all: true }));

// List all due command
program
  .command('list-all-due')
  .description('List all due assignments')
  .action(() => listCommand({ all: true, due: true }));

// List all overdue command
program
  .command('list-all-overdue')
  .description('List all overdue assignments')
  .action(() => listCommand({ all: true, overdue: true }));

// Class command
program
  .command('class')
  .description('Select and view class details (assignments due in next 3 days)')
  .action(() => classCommand({}));

// Class all command
program
  .command('class-all')
  .description('Select and view class details (all assignments)')
  .action(() => classCommand({ all: true }));

// Assignment command
program
  .command('assignment')
  .description('Select and view assignment details')
  .option('-d, --days <number>', 'Show assignments due within N days (default: CANVAS_DEFAULT_DAYS env)')
  .option('-a, --all', 'Show all assignments')
  .action((options) => {
    if (options.all) {
      assignmentCommand({ all: true });
    } else {
      assignmentCommand({ days: options.days ? parseInt(options.days, 10) : null });
    }
  });

// Submit command
program
  .command('submit')
  .description('Submit a file for an assignment')
  .action(submitCommand);

// Raw command
program
  .command('raw <endpoint>')
  .description('Make a raw Canvas API request and display the response')
  .action(rawCommand);

// Open command
program
  .command('open')
  .description('Open Canvas in default browser')
  .action(openCommand);

// About command
program
  .command('about')
  .description('Display version and project information')
  .action(aboutCommand);

// Alias command
program
  .command('alias')
  .description('Install a `canvas` shortcut alias for `canvas-cli` in your shell')
  .action(aliasCommand);

// Check if no command provided before parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  // Default: week view showing current week + N additional weeks
  const { getWeekViewWeeks } = require('./utils/config');
  const { getWeekEnd } = require('./utils/dates');
  const weeks = getWeekViewWeeks();

  // Calculate days until end of target week (Saturday)
  const now = new Date();
  const targetWeekEnd = getWeekEnd(now);
  targetWeekEnd.setDate(targetWeekEnd.getDate() + (weeks * 7));
  const daysUntilEnd = Math.ceil((targetWeekEnd - now) / (24 * 60 * 60 * 1000));

  listCommand({ weekView: true, days: daysUntilEnd });
} else {
  program.parse(process.argv);
}
