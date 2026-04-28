# Canvas CLI - Architecture and Implementation Guide

## Overview
Canvas CLI is a Node.js command-line interface for Canvas LMS (by Instructure). It works with any university or school that uses Canvas. The application provides a modern, interactive CLI with color-coding, arrow-key navigation, and integrated Canvas API interactions.

**Key Libraries:**
- **Commander.js** - CLI argument parsing and command routing
- **Inquirer.js** - Interactive selection menus (arrow keys, enter/space confirmation)
- **Chalk** - Terminal color output
- **Axios** - HTTP client for Canvas REST API
- **Dotenv** - Environment variable management
- **Open** - Browser launching
- **Form-Data** - File upload handling
- **Asciify-Image** - ASCII art conversion (for about command)

---

## 1. SELECT/INTERACTIVE NAVIGATION SYSTEM

### Location: `/Users/nicho/Projects/canvas-cli/src/ui/select.js`

**Library Used:** Inquirer.js

The select system uses Inquirer's `list` type prompts which provide Firebase-style navigation:
- **Arrow keys** - Navigate up/down through options
- **Enter/Space** - Confirm selection
- **Page size** - Set to 15 items per page for scrollable lists

**Key Functions:**

```javascript
async function select(message, choices) {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: message,
      choices: choices,
      pageSize: 15  // Enable pagination
    }
  ]);
  return answer.selection;
}
```

**Specialized Selection Functions:**
- `selectCourse(courses)` - Select from course list with format: "[Course Name] (CODE)"
- `selectAssignment(assignments)` - Select from assignment list with format: "[Course] Assignment Name"
- `selectFile(files)` - Select files from current directory
- `confirm(message)` - Yes/no confirmation dialog

**Choice Objects:**
Choices use a simple format:
```javascript
{
  name: 'Display text shown to user',
  value: actualObjectToReturn
}
```

---

## 2. FILE ARCHITECTURE

### Directory Structure:
```
src/
├── index.js           # Main CLI entry point, command routing
├── api/
│   └── client.js      # Canvas API wrapper with axios
├── commands/
│   ├── auth.js        # Authentication (token + URL detection)
│   ├── list.js        # List assignments
│   ├── class.js       # View class details
│   ├── assignment.js  # View assignment details
│   ├── submit.js      # Submit file for assignment
│   ├── raw.js         # Raw API endpoint calls
│   ├── open.js        # Open Canvas in browser
│   └── about.js       # Display version/project info
├── ui/
│   ├── select.js      # Interactive selection menus
│   ├── display.js     # Domain renderers (assignments, courses) + getCourseColor
│   └── format.js      # Generic terminal primitives (truncate, getTerminalWidth)
└── utils/
    ├── config.js      # Token/URL management
    ├── dates.js       # Date filtering and formatting
    └── errors.js      # Error handling and display
```

### Root Directory:
- `.env` - Stores `CANVAS_TOKEN` and `CANVAS_URL` (user's home: `~/.canvas-cli/.env`)
- `.gitignore` - Excludes `.env` from version control
- `package.json` - Dependencies and scripts
- `outline.txt` - Project specification
- `CLAUDE.md` - Development guidelines

---

## 3. COLOR SYSTEM

### Location: `/Users/nicho/Projects/canvas-cli/src/ui/display.js`

**Color Sources:**
1. **Custom Colors from Canvas** - Fetched from `/api/v1/users/self/colors`
   - Returns object: `{ "course_123": "#abc123" }`
   - Applied to course names in displays

2. **Course Color Cache** - Map-based in-memory caching
   ```javascript
   const courseColorCache = new Map();
   
   function getCourseColor(courseName, courseId, customColor) {
     const key = courseId || courseName;
     
     if (courseColorCache.has(key)) {
       return courseColorCache.get(key);
     }
     
     let colorFunc;
     if (customColor) {
       colorFunc = (text) => chalk.hex(customColor)(text);
     } else {
       // Fallback to hash-based color
       const colors = [chalk.cyan, chalk.green, chalk.yellow, chalk.magenta, chalk.blue, chalk.red];
       const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
       colorFunc = colors[hash % colors.length];
     }
     
     courseColorCache.set(key, colorFunc);
     return colorFunc;
   }
   ```

3. **Due Date Coloring** - Urgency-based coloring with gradients
   - **Red** - 1 day or less
   - **Red → Yellow** - 1-4 days
   - **Yellow → Green** - 4-7 days
   - **Green → Blue** - 7-14 days
   - **Blue** - 14+ days

### Color Fetching Flow:
```
getCourses() 
  → Fetches courses from Canvas API
  → Calls getUserColors() in parallel
  → Attaches customColor to each course object
  → Passed through to display functions
```

---

## 4. TEXT-BASED ICONS

**No Unicode emojis used** - All messaging uses text icons:

| Icon | Usage | Location |
|------|-------|----------|
| `[*]` | Information/progress | Loading states |
| `[+]` | Success | File submission, browser open |
| `[!]` | Warning | Skipped courses, auth issues |
| `[X]` | Error | Authentication failures |
| `[>]` | Navigation | "Show all" option in submit |
| `[ERROR]` | Error header | displayError() function |
| `=` (line) | Separator | Assignment/course details display |
| Numbers (1., 2., 3.) | Action menu items | displayAssignmentDetails(), displayCourseDetails() |

**Example from display.js:**
```javascript
console.log(chalk.green('\n[+] Opened in browser\n'));
console.log(chalk.cyan('\n[*] Loading assignments...\n'));
console.log(chalk.yellow('  [!] Could not auto-detect URL from token'));
```

---

## 5. DISPLAY/UI PATTERNS

### Location: `/Users/nicho/Projects/canvas-cli/src/ui/display.js`

**Display Pattern - Three Tiers:**

1. **List Display** - `displayAssignmentsList(assignments)`
   - Shows compact list of assignments
   - Format: `[Course Name] Assignment Name`
   - Shows due date with color coding
   - Shows points if available

2. **Details Display** - `displayAssignmentDetails(assignment)` / `displayCourseDetails(course)`
   - Bordered display with `=` separators
   - Full information (description, due date, points, submission types)
   - Action menu with numbered options

3. **Action Menu Pattern**
   ```javascript
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
   ```

**Key Display Features:**
- Color-coded course names using course colors
- Bordered sections with `=` repeats (80 chars wide)
- Numbered menu items (1., 2., 3.)
- Context labels in gray (chalk.gray)
- Data displayed under context labels

**Example Outputs:**

Assignment List:
```
Assignments

1. [Computer Science] Midterm Exam
   Due: Today at 14:00
   Points: 100

2. [Physics] Lab Report
   Due: Tomorrow at 23:59
```

Assignment Details:
```
================================================================================
  Computer Science
================================================================================

Midterm Exam

Due Date: Today at 14:00
Points: 100
Submission Types: online_text_entry

Description:
[HTML stripped description...]

================================================================================

Choose an action:
> 1. Open in browser
  2. Return to terminal
```

---

## 6. ERROR HANDLING

### Location: `/Users/nicho/Projects/canvas-cli/src/utils/errors.js`

**Critical Requirement:** NEVER TRUNCATE ERRORS - Display complete error messages.

**Main Error Function:**
```javascript
function displayError(error) {
  console.error(chalk.red('\n[ERROR]\n'));
  
  // Handle HTTP errors with response
  if (error.response) {
    const status = error.response.status;
    
    // Special 503 handling
    if (status === 503) {
      console.error(chalk.red('Canvas is currently unavailable'));
      console.error(chalk.yellow('Check status at: ') + chalk.cyan('https://status.instructure.com/'));
    }
    
    // Show full response data
    console.error(chalk.red('Response Data:'));
    console.error(JSON.stringify(error.response.data, null, 2));
  }
  
  // Always show stack trace
  console.error(chalk.red('\nStack Trace:'));
  console.error(error.stack);
}
```

**Authentication Check:**
```javascript
function requireAuth(config) {
  if (!config.isAuthenticated()) {
    console.error(chalk.red('\n[!] Not authenticated. Please run:'));
    console.error(chalk.yellow('  canvas-cli auth\n'));
    process.exit(1);
  }
}
```

**Error Handling Pattern in Commands:**
```javascript
try {
  requireAuth(config);
  // ... command logic
} catch (error) {
  displayError(error);
  process.exit(1);
}
```

---

## 7. AUTHENTICATION

### Location: `/Users/nicho/Projects/canvas-cli/src/utils/config.js` and `/Users/nicho/Projects/canvas-cli/src/commands/auth.js`

**Config Storage:**
- Location: `~/.canvas-cli/.env` (user's home directory)
- Creates directory if not exists: `path.join(os.homedir(), '.canvas-cli')`
- Format:
  ```
  CANVAS_TOKEN=<token>
  CANVAS_URL=<url>
  ```

**Config Functions:**
```javascript
function getToken() {
  return process.env.CANVAS_TOKEN;
}

function getCanvasUrl() {
  return process.env.CANVAS_URL;
}

function saveConfig(token, url) {
  const envContent = `CANVAS_TOKEN=${token}\nCANVAS_URL=${url}\n`;
  fs.writeFileSync(ENV_PATH, envContent);
  
  // Reload environment variables
  process.env.CANVAS_TOKEN = token;
  process.env.CANVAS_URL = url;
}

function isAuthenticated() {
  return !!getToken() && !!getCanvasUrl();
}
```

**Auth Command Flow:**
1. Prompt for Canvas token (password input with masking)
2. Attempt auto-detection of Canvas URL
   - Tries generic `https://canvas.instructure.com`
   - Follows redirects (maxRedirects: 5)
   - Extracts URL from error responses
3. If auto-detection fails, prompt for manual URL entry
4. Verify the token/URL combination works
5. Save to `~/.canvas-cli/.env`

**Auto-Detection Logic:**
```javascript
async function detectCanvasUrl(token) {
  const response = await axios.get(`${baseUrl}/api/v1/users/self`, {
    headers: { 'Authorization': `Bearer ${token}` },
    maxRedirects: 5,
    validateStatus: () => true // Accept all responses
  });
  
  if (response.status === 200 && response.data.id) {
    const actualUrl = response.request.res.responseUrl || baseUrl;
    const url = new URL(actualUrl);
    return `${url.protocol}//${url.host}`;
  }
}
```

---

## 8. COMMAND STRUCTURE PATTERN

### Template for New Commands:

**Location:** `/Users/nicho/Projects/canvas-cli/src/commands/`

```javascript
const chalk = require('chalk');
const { getCourses, /* other API functions */ } = require('../api/client');
const { select /* utilities */ } = require('../ui/select');
const { display /* functions */ } = require('../ui/display');
const { displayError, requireAuth } = require('../utils/errors');
const config = require('../utils/config');

async function commandName(options) {
  try {
    // 1. Check authentication
    requireAuth(config);
    
    // 2. Load data from API
    console.log(chalk.cyan('\n[*] Loading data...\n'));
    const data = await getCourses();
    
    // 3. Use interactive selection if needed
    const selected = await selectCourse(data);
    if (!selected) return; // User cancelled
    
    // 4. Filter/process data
    let filtered = data.filter(/* condition */);
    
    // 5. Display results
    displayAssignmentsList(filtered);
    
  } catch (error) {
    displayError(error);
    process.exit(1);
  }
}

module.exports = commandName;
```

**Key Patterns:**
1. Require auth first
2. Log loading state with cyan `[*]` icon
3. Check for null selections (user cancellation)
4. Filter data based on options
5. Display using UI functions
6. Always wrap in try/catch with displayError

**Command Registration (index.js):**
```javascript
program
  .command('command-name')
  .description('Description text')
  .action(() => commandModule({})); // Pass options object
```

### Command Examples:

**List (Simple)** - `/Users/nicho/Projects/canvas-cli/src/commands/list.js`
- Filters all assignments by criteria (next 3 days, all, due, overdue)
- Displays in list format
- Handles skipped courses (API 403 errors)

**Assignment (Selection + Details)** - `/Users/nicho/Projects/canvas-cli/src/commands/assignment.js`
- Select course → Select assignment → Display details
- Default filter: next 3 days
- Optional `all: true` for all assignments
- Details display has action menu

**Submit (Complex Multi-Step)** - `/Users/nicho/Projects/canvas-cli/src/commands/submit.js`
- Select course → Filter to file upload only → Select assignment → Select file → Confirm → Upload
- 3-step Canvas upload process
- Shows upcoming (3 days) first, then "show all" separator
- File selection from current directory

---

## 9. API CLIENT

### Location: `/Users/nicho/Projects/canvas-cli/src/api/client.js`

**Axios Client Creation:**
```javascript
function createClient() {
  const token = config.getToken();
  const baseUrl = config.getCanvasUrl();
  
  if (!token || !baseUrl) {
    throw new Error('Not authenticated. Run: canvas-cli auth');
  }
  
  return axios.create({
    baseURL: baseUrl,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

**Core API Functions:**

| Function | Endpoint | Purpose |
|----------|----------|---------|
| `getUserColors()` | `/api/v1/users/self/colors` | Fetch user's custom course colors |
| `getCourses()` | `/api/v1/courses` | Get all active courses with colors |
| `getAssignmentsForCourse(courseId)` | `/api/v1/courses/{id}/assignments` | Get assignments for specific course |
| `getAllAssignments()` | (loops getCourses + getAssignmentsForCourse) | Get all assignments across all courses |
| `getUserInfo()` | `/api/v1/users/self` | Get current user info |
| `makeRawRequest(endpoint)` | (dynamic endpoint) | Raw API call for testing |

**getCourses() Implementation:**
```javascript
async function getCourses() {
  const client = createClient();
  const [coursesResponse, customColors] = await Promise.all([
    client.get('/api/v1/courses', {
      params: {
        enrollment_state: 'active',
        include: ['term', 'total_scores'],
        per_page: 100
      }
    }),
    getUserColors()
  ]);
  
  // Attach custom colors to courses
  return coursesResponse.data.map(course => ({
    ...course,
    custom_color: customColors[`course_${course.id}`] || null
  }));
}
```

**getAllAssignments() - With Error Handling:**
```javascript
async function getAllAssignments() {
  const courses = await getCourses();
  const allAssignments = [];
  const skippedCourses = [];
  
  for (const course of courses) {
    try {
      const assignments = await getAssignmentsForCourse(course.id);
      
      // Attach course info to each assignment
      assignments.forEach(assignment => {
        allAssignments.push({
          ...assignment,
          course_name: course.name,
          course_code: course.course_code,
          course_color: course.custom_color,
          course_id: course.id
        });
      });
    } catch (error) {
      // Track 403 errors (restricted access)
      if (error.response?.status === 403) {
        skippedCourses.push(course.name);
      }
      continue; // Keep going with other courses
    }
  }
  
  return { assignments: allAssignments, skippedCourses };
}
```

**File Upload - 3-Step Process** (in submit.js):
```javascript
// Step 1: Notify Canvas about file upload
const step1Response = await client.post(
  `/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/self/files`,
  { name: fileName, size: fileSize }
);

// Step 2: Upload file data to returned URL
const formData = new FormData();
Object.keys(uploadParams).forEach(key => formData.append(key, uploadParams[key]));
formData.append('file', fs.createReadStream(filePath));
const uploadResponse = await axios.post(uploadUrl, formData, {
  headers: formData.getHeaders(),
  maxRedirects: 0,
  validateStatus: (status) => status === 301 || status < 400
});

// Step 3: Confirm upload via location header
const confirmResponse = await client.get(uploadResponse.headers.location);
```

---

## 10. NOTABLE PATTERNS

### Date Filtering and Formatting

**Location:** `/Users/nicho/Projects/canvas-cli/src/utils/dates.js`

**Filtering Functions:**
```javascript
// Check if assignment due within N days (future only)
function isDueWithinDays(assignment, days) {
  if (!assignment.due_at) return false;
  const now = new Date();
  const dueDate = new Date(assignment.due_at);
  const daysFromNow = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  return dueDate >= now && dueDate <= daysFromNow;
}

// Check if overdue (past due and not submitted)
function isOverdue(assignment) {
  if (!assignment.due_at) return false;
  const now = new Date();
  const dueDate = new Date(assignment.due_at);
  return dueDate < now && !assignment.has_submitted_submissions;
}

// Check if due in future
function isDue(assignment) {
  if (!assignment.due_at) return false;
  const now = new Date();
  const dueDate = new Date(assignment.due_at);
  return dueDate >= now;
}

// Sort by due date, then course name
function sortByDueDate(assignments) {
  return assignments.sort((a, b) => {
    if (!a.due_at && !b.due_at) return a.course_name.localeCompare(b.course_name);
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    const dateA = new Date(a.due_at);
    const dateB = new Date(b.due_at);
    if (dateA.getTime() === dateB.getTime()) {
      return a.course_name.localeCompare(b.course_name);
    }
    return dateA - dateB;
  });
}
```

**Date Formatting:**
```javascript
function formatDate(dateString) {
  if (!dateString) return 'No due date';
  
  const date = new Date(dateString);
  const now = new Date();
  
  // Today → "Today at HH:MM"
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // Tomorrow → "Tomorrow at HH:MM"
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // Other dates → "MMM DD, YYYY HH:MM"
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}
```

**Note on `has_submitted_submissions`:**
- Canvas API flag is unreliable (indicates if ANY student submitted, not current user)
- Use only for overdue detection as backup check
- Primary filtering is date-based

### Handling Missing Due Dates

- Assignments without due dates are always filtered out by default
- sortByDueDate() places them at the end
- isDueWithinDays() returns false for missing due dates

### Special Cases

**Course Selection Display:**
```javascript
const choices = courses.map(course => ({
  name: `${course.name} (${course.course_code})`,
  value: course
}));
```

**Assignment Selection Display:**
```javascript
const choices = assignments.map(assignment => ({
  name: `[${assignment.course_name}] ${assignment.name}`,
  value: assignment
}));
```

**"Show All" Pattern (in submit.js):**
```javascript
// First show upcoming (3 days)
const upcomingChoices = [...];

// Add separator and show all option if more exist
if (allFutureAssignments.length > upcomingAssignments.length) {
  choices.push(new inquirer.Separator());
  choices.push({
    name: `[>] Show all ${allFutureAssignments.length} future file upload assignments`,
    value: '__SHOW_ALL__'
  });
}

// If user selected __SHOW_ALL__, show second prompt with all
if (selectedAssignment === '__SHOW_ALL__') {
  const allChoices = sortedAll.map(a => ({...}));
  // Second prompt...
}
```

### HTML Stripping

In assignment details display:
```javascript
const cleanDescription = assignment.description
  .replace(/<[^>]*>/g, '') // Remove HTML tags
  .trim();
```

---

## 11. MAIN ENTRY POINT

### Location: `/Users/nicho/Projects/canvas-cli/src/index.js`

**CLI Setup:**
```javascript
const program = new Command();

program
  .name('canvas')
  .description('CLI tool for Canvas LMS')
  .version('1.0.0');
```

**Default Behavior:**
```javascript
const args = process.argv.slice(2);
if (args.length === 0) {
  // Default to list command (assignments due in next 3 days)
  listCommand({});
} else {
  program.parse(process.argv);
}
```

**Command Registration Pattern:**
```javascript
program
  .command('list')
  .description('List assignments due in the next 3 days')
  .action(() => listCommand({}));

program
  .command('list-all')
  .description('List all assignments')
  .action(() => listCommand({ all: true }));
```

---

## 12. CONFIGURATION MANAGEMENT

### ENV File Location Strategy
- **Consistent Access:** Stores in `~/.canvas-cli/.env` regardless of working directory
- **Cross-Directory:** Token persists across any directory the user runs from
- **Automatic Loading:** `dotenv.config()` loads on app startup
- **Quiet Mode:** `quiet: true` suppresses dotenv promotional messages

**Why Home Directory?**
- Works from any project directory
- Survives directory changes
- More secure (not in project directories)
- Follows standard CLI conventions (like ~/.ssh, ~/.git-credentials)

---

## 13. ABOUT COMMAND SPECIAL FEATURES

### Location: `/Users/nicho/Projects/canvas-cli/src/commands/about.js`

**Institution Name Extraction:**
```javascript
// Pattern 1: [school].instructure.com → "School"
// Pattern 2: canvas.[school].edu → "School"

function extractInstitutionName(url) {
  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  
  if (hostname.endsWith('.instructure.com')) {
    const schoolName = hostname.split('.')[0];
    return schoolName.charAt(0).toUpperCase() + schoolName.slice(1);
  }
  
  if (hostname.startsWith('canvas.')) {
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const schoolName = parts[1];
      return schoolName.charAt(0).toUpperCase() + schoolName.slice(1);
    }
  }
  
  return hostname; // Fallback
}
```

**ASCII Art Rendering:**
- Uses `asciify-image` package to convert PNG logos to ASCII
- Canvas logo: `canvas.png` (converted to red)
- NSS logo: `nss.png` (with color)
- Combines side-by-side with `combineAsciiSideBySide()`
- Strips ANSI color codes for width calculation

---

## 14. PACKAGE.JSON OVERVIEW

```json
{
  "name": "@negative-space-software/canvas-cli",
  "version": "1.0.0",
  "description": "CLI tool for Canvas LMS - works with any university or school",
  "main": "src/index.js",
  "bin": {
    "canvas-cli": "./src/index.js"
  },
  "scripts": {
    "start": "node src/index.js"
  },
  "dependencies": {
    "asciify-image": "^0.1.10",      // ASCII art conversion
    "axios": "^1.12.2",              // HTTP requests
    "chalk": "^4.1.2",               // Terminal colors
    "commander": "^14.0.1",          // CLI framework
    "dotenv": "^17.2.3",             // .env file loading
    "form-data": "^4.0.4",           // File uploads
    "inquirer": "^8.2.7",            // Interactive prompts
    "open": "^8.4.2"                 // Open URLs in browser
  }
}
```

**bin.canvas-cli:** Makes `canvas-cli` command available globally after `npm install -g @negative-space-software/canvas-cli`. Users can optionally add a `canvas` shell alias via `canvas-cli alias`.

---

## Development Guidelines Summary

### Always:
1. ✓ Require authentication for all non-auth commands
2. ✓ Use `displayError()` for ALL errors - never truncate
3. ✓ Log loading state with cyan `[*]` icon
4. ✓ Check for null selections (user cancellation)
5. ✓ Use date-based filtering only (don't trust `has_submitted_submissions`)
6. ✓ Cache colors in memory for consistency
7. ✓ Wrap commands in try/catch with process.exit(1)
8. ✓ Use text icons instead of emojis
9. ✓ Use 24-hour time format
10. ✓ Show complete error messages with full stack traces

### API Interaction:
1. Test response formats - don't assume Canvas API responses
2. Handle 403 errors gracefully (skipped courses)
3. Use Promise.all() for parallel requests when possible
4. Keep per_page: 100 for pagination

### UI Patterns:
1. Numbered action items in display menus
2. Bordered details with `=` separators
3. Color-code course names with custom Canvas colors
4. Distinguish due dates: red (today), yellow (tomorrow), green (later)
5. Show context labels in gray (chalk.gray)

