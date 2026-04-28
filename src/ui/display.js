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
const inquirer = require('inquirer');
const open = require('open');
const { formatDate, getDueDateColor, groupByWeek, sortByDueDate, getWeekEnd } = require('../utils/dates');
const { getWeekViewWeeks } = require('../utils/config');
const { getTerminalWidth, truncate } = require('./format');

// Cache for course colors to ensure consistency
const courseColorCache = new Map();

/**
 * Get consistent color for course based on Canvas custom color or fallback
 */
function getCourseColor(courseName, courseId, customColor) {
  // Use course ID as key for consistency
  const key = courseId || courseName;

  if (courseColorCache.has(key)) {
    return courseColorCache.get(key);
  }

  let colorFunc;

  // Use custom Canvas color if available
  if (customColor) {
    colorFunc = (text) => chalk.hex(customColor)(text);
  } else {
    // Fallback: assign color based on hash of course identifier
    const colors = [chalk.cyan, chalk.green, chalk.yellow, chalk.magenta, chalk.blue, chalk.red];
    const hash = key ? String(key).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    colorFunc = colors[hash % colors.length];
  }

  courseColorCache.set(key, colorFunc);
  return colorFunc;
}

/**
 * Display a list of assignments in tree format
 */
function displayAssignmentsList(assignments) {
  if (assignments.length === 0) {
    console.log(chalk.yellow('\nNo assignments found\n'));
    return;
  }

  console.log(chalk.bold('\nAssignments\n'));

  const termWidth = getTerminalWidth();

  assignments.forEach((assignment, index) => {
    const courseColor = getCourseColor(assignment.course_name, assignment.course_id, assignment.course_color);
    const dueDate = formatDate(assignment.due_at);
    const dueDateColor = getDueDateColor(assignment.due_at);

    const isLast = index === assignments.length - 1;
    const connector = isLast ? '└─' : '├─';

    // Calculate available width for assignment name
    // Format: "  ├─ [CourseName] AssignmentName"
    const courseTag = `[${assignment.course_name}]`;
    const prefixLen = 5 + courseTag.length + 1; // 2 spaces + connector (2) + space (1) + course tag + space
    const availableWidth = termWidth - prefixLen - 1;
    const assignmentName = truncate(assignment.name, Math.max(availableWidth, 20));

    console.log(`  ${chalk.gray(connector)} ${courseColor(courseTag)} ${assignmentName}`);
    console.log(`  ${isLast ? '  ' : '│ '}  Due: ${chalk.hex(dueDateColor)(dueDate)}`);
  });

  console.log();
}

/**
 * Display detailed assignment information with action menu
 */
async function displayAssignmentDetails(assignment) {
  const courseColor = getCourseColor(assignment.course_name, assignment.course_id, assignment.course_color);
  const dueDateColor = getDueDateColor(assignment.due_at);

  console.log(chalk.bold('\n' + '='.repeat(80)));
  console.log(courseColor(chalk.bold(`  ${assignment.course_name}`)));
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold(`\n${assignment.name}\n`));

  console.log(chalk.gray('Due Date:'), chalk.hex(dueDateColor)(formatDate(assignment.due_at)));

  if (assignment.points_possible) {
    console.log(chalk.gray('Points:'), assignment.points_possible);
  }

  console.log(chalk.gray('Submission Types:'), assignment.submission_types.join(', '));

  if (assignment.description) {
    // Strip HTML tags for CLI display
    const cleanDescription = assignment.description.replace(/<[^>]*>/g, '').trim();
    if (cleanDescription) {
      console.log(chalk.gray('\nDescription:'));
      console.log(cleanDescription.substring(0, 500) + (cleanDescription.length > 500 ? '...' : ''));
    }
  }

  console.log(chalk.bold('\n' + '='.repeat(80) + '\n'));

  // Action menu
  const actions = [
    { name: '1. Open in browser', value: 'open' },
    { name: '2. Return to terminal', value: 'exit' }
  ];

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Choose an action:',
      choices: actions
    }
  ]);

  if (answer.action === 'open') {
    await open(assignment.html_url);
    console.log(chalk.green('\n[+] Opened in browser\n'));
  }
}

/**
 * Display detailed course information with action menu
 * @param {Object} course - The course object
 * @param {Array} filteredAssignments - Assignments to show in summary (e.g., due within 3 days)
 * @param {Array} allAssignments - All assignments to show when "View all" is selected
 */
async function displayCourseDetails(course, filteredAssignments, allAssignments = null) {
  // If allAssignments not provided, use filtered assignments for both
  if (!allAssignments) {
    allAssignments = filteredAssignments;
  }

  const courseColor = getCourseColor(course.name, course.id, course.custom_color);

  console.log(chalk.bold('\n' + '='.repeat(80)));
  console.log(courseColor(chalk.bold(`  ${course.name}`)));
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.gray('\nCourse Code:'), course.course_code);

  if (course.term) {
    console.log(chalk.gray('Term:'), course.term.name);
  }

  console.log(chalk.gray('\nTotal Assignments:'), allAssignments.length);

  // Show upcoming assignments from filtered list (exclude past assignments)
  const now = new Date();
  const upcoming = filteredAssignments.filter(a => {
    if (!a.due_at) return false;
    const dueDate = new Date(a.due_at);
    // Only show if due in future
    return dueDate > now;
  });

  // Calculate weeks for label
  const configuredWeeks = getWeekViewWeeks();
  const weekLabel = configuredWeeks === 0 ? 'this week' : configuredWeeks === 1 ? 'next 2 weeks' : `next ${configuredWeeks + 1} weeks`;
  console.log(chalk.gray(`Upcoming Assignments (${weekLabel}):`), upcoming.length);

  if (upcoming.length > 0) {
    console.log(chalk.bold('\nUpcoming Assignments\n'));

    // Group by week like the default canvas command
    const sortedUpcoming = sortByDueDate(upcoming);
    const weekGroups = groupByWeek(sortedUpcoming);
    const termWidth = getTerminalWidth();

    weekGroups.forEach((week, weekIndex) => {
      // Week header
      console.log(chalk.bold.cyan(week.label));

      week.assignments.forEach((a, i) => {
        const dueDateColor = getDueDateColor(a.due_at);
        const dueDate = formatDate(a.due_at);

        // Tree-style connector
        const isLast = i === week.assignments.length - 1;
        const connector = isLast ? '└─' : '├─';

        // Calculate available width for assignment name
        const prefixLen = 5; // 2 spaces + connector (2) + space (1)
        const availableWidth = termWidth - prefixLen - 1;
        const assignmentName = truncate(a.name, Math.max(availableWidth, 20));

        console.log(`  ${chalk.gray(connector)} ${assignmentName}`);
        console.log(`  ${isLast ? '  ' : '│ '}  Due: ${chalk.hex(dueDateColor)(dueDate)}`);
      });

      // Add spacing between weeks (except last)
      if (weekIndex < weekGroups.length - 1) {
        console.log();
      }
    });

    console.log();
  }

  console.log(chalk.bold('='.repeat(80) + '\n'));

  // Action menu
  const actions = [
    { name: '1. Open course in browser', value: 'open' },
    { name: '2. View all assignments', value: 'assignments' },
    { name: '3. Return to terminal', value: 'exit' }
  ];

  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'Choose an action:',
      choices: actions
    }
  ]);

  if (answer.action === 'open') {
    const courseUrl = `${require('../utils/config').getCanvasUrl()}/courses/${course.id}`;
    await open(courseUrl);
    console.log(chalk.green('\n[+] Opened in browser\n'));
  } else if (answer.action === 'assignments') {
    displayAssignmentsList(allAssignments);
  }
}

/**
 * Display assignments grouped by week
 */
function displayWeekView(assignments) {
  if (assignments.length === 0) {
    console.log(chalk.yellow('\nNo upcoming assignments\n'));
    return;
  }

  // Sort all assignments by due date first
  const sorted = sortByDueDate(assignments);

  // Group by week
  const weeks = groupByWeek(sorted);

  console.log(chalk.bold('\nUpcoming Assignments\n'));

  const termWidth = getTerminalWidth();

  weeks.forEach((week, weekIndex) => {
    // Week header
    console.log(chalk.bold.cyan(week.label));

    week.assignments.forEach((assignment, i) => {
      const courseColor = getCourseColor(assignment.course_name, assignment.course_id, assignment.course_color);
      const dueDateColor = getDueDateColor(assignment.due_at);
      const dueDate = formatDate(assignment.due_at);

      // Tree-style connector
      const isLast = i === week.assignments.length - 1;
      const connector = isLast ? '└─' : '├─';

      // Calculate available width for assignment name
      // Format: "  ├─ [CourseName] AssignmentName"
      // Prefix: 2 spaces + connector (2) + space (1) = 5 chars
      // Course tag: brackets (2) + course name
      const courseTag = `[${assignment.course_name}]`;
      const prefixLen = 5 + courseTag.length + 1; // +1 for space after course tag
      const availableWidth = termWidth - prefixLen - 1; // -1 for safety margin
      const assignmentName = truncate(assignment.name, Math.max(availableWidth, 20));

      console.log(`  ${chalk.gray(connector)} ${courseColor(courseTag)} ${assignmentName}`);
      console.log(`  ${isLast ? '  ' : '│ '}  Due: ${chalk.hex(dueDateColor)(dueDate)}`);
    });

    // Add spacing between weeks (except last)
    if (weekIndex < weeks.length - 1) {
      console.log();
    }
  });

  console.log();
}

module.exports = {
  displayAssignmentsList,
  displayAssignmentDetails,
  displayCourseDetails,
  displayWeekView,
  getCourseColor
};
