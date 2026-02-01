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
const { getCourses, getAssignmentsForCourse } = require('../api/client');
const { selectCourse } = require('../ui/select');
const { displayCourseDetails } = require('../ui/display');
const { displayError, requireAuth } = require('../utils/errors');
const { isDueWithinDays, sortByDueDate, getWeekEnd } = require('../utils/dates');
const config = require('../utils/config');
const { getWeekViewWeeks } = config;

/**
 * Class command - select and view class details
 */
async function classCommand(options) {
  try {
    requireAuth(config);

    console.log(chalk.cyan('\n[*] Loading courses...\n'));

    const courses = await getCourses();

    if (courses.length === 0) {
      console.log(chalk.yellow('No courses found'));
      return;
    }

    // Let user select a course
    const selectedCourse = await selectCourse(courses);

    if (!selectedCourse) {
      return;
    }

    console.log(chalk.cyan('\n[*] Loading assignments...\n'));

    // Get ALL assignments for the course
    let allAssignments = await getAssignmentsForCourse(selectedCourse.id);

    // Attach course info to assignments
    allAssignments = allAssignments.map(a => ({
      ...a,
      course_name: selectedCourse.name,
      course_code: selectedCourse.course_code,
      course_color: selectedCourse.custom_color,
      course_id: selectedCourse.id
    }));

    // Sort all assignments by due date
    allAssignments = sortByDueDate(allAssignments);

    // Filter for display in course details summary
    let filteredAssignments = allAssignments;
    if (!options.all) {
      // Default: show assignments due within configured weeks (same as default canvas command)
      const weeks = getWeekViewWeeks();
      const now = new Date();
      const targetWeekEnd = getWeekEnd(now);
      targetWeekEnd.setDate(targetWeekEnd.getDate() + (weeks * 7));
      const daysUntilEnd = Math.ceil((targetWeekEnd - now) / (24 * 60 * 60 * 1000));
      filteredAssignments = allAssignments.filter(a => isDueWithinDays(a, daysUntilEnd));
    }

    // Display course details with filtered assignments for summary, all assignments for "View all"
    await displayCourseDetails(selectedCourse, filteredAssignments, allAssignments);

  } catch (error) {
    displayError(error);
    process.exit(1);
  }
}

module.exports = classCommand;
