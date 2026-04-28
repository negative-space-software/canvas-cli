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
const { getAllAssignments } = require('../api/client');
const { isDueWithinDays, isOverdue, isDue, sortByDueDate } = require('../utils/dates');
const { displayAssignmentsList, displayWeekView } = require('../ui/display');
const { displayError, requireAuth } = require('../utils/errors');
const config = require('../utils/config');

/**
 * List assignments with various filters
 */
async function listCommand(options) {
  try {
    requireAuth(config);

    console.log(chalk.cyan('\n[*] Loading assignments...\n'));

    const { assignments: allAssignments, skippedCourses } = await getAllAssignments();

    let filteredAssignments = [];

    if (options.all && options.overdue) {
      // canvas-cli list all overdue
      filteredAssignments = allAssignments.filter(isOverdue);
    } else if (options.all && options.due) {
      // canvas-cli list all due
      filteredAssignments = allAssignments.filter(isDue);
    } else if (options.all) {
      // canvas-cli list all
      filteredAssignments = allAssignments;
    } else if (options.days) {
      // canvas-cli list with custom days filter
      filteredAssignments = allAssignments.filter(a => isDueWithinDays(a, options.days));
    } else {
      // canvas-cli list (default: next 3 days)
      filteredAssignments = allAssignments.filter(a => isDueWithinDays(a, 3));
    }

    // Sort by due date
    const sortedAssignments = sortByDueDate(filteredAssignments);

    // Use week view or standard list based on options
    if (options.weekView) {
      displayWeekView(sortedAssignments);
    } else {
      displayAssignmentsList(sortedAssignments);
    }

    // Display warning for skipped courses
    if (skippedCourses.length > 0) {
      console.log(chalk.yellow(`\n[!] Skipped courses (API access restricted): ${skippedCourses.join(', ')}`));
    }

  } catch (error) {
    displayError(error);
    process.exit(1);
  }
}

module.exports = listCommand;
