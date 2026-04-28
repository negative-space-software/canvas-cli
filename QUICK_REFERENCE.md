# Canvas CLI - Quick Reference Guide

## Key File Locations

| Purpose | File Path | Key Function/Variable |
|---------|-----------|----------------------|
| Interactive Selection | `src/ui/select.js` | `selectCourse()`, `selectAssignment()`, `selectFile()` |
| Display Output | `src/ui/display.js` | `displayAssignmentsList()`, `displayAssignmentDetails()`, `getCourseColor()` |
| Terminal Primitives | `src/ui/format.js` | `truncate()`, `getTerminalWidth()` |
| API Wrapper | `src/api/client.js` | `createClient()`, `getCourses()`, `getAllAssignments()` |
| Config Management | `src/utils/config.js` | `getToken()`, `getCanvasUrl()`, `saveConfig()` |
| Date Filtering | `src/utils/dates.js` | `isDueWithinDays()`, `isDue()`, `isOverdue()`, `formatDate()` |
| Error Handling | `src/utils/errors.js` | `displayError()`, `requireAuth()` |
| CLI Entry Point | `src/index.js` | Commander.js setup, command routing |
| Auth Command | `src/commands/auth.js` | Token input, URL auto-detection |
| Assignment List | `src/commands/list.js` | Simple filtering and display |
| Course View | `src/commands/class.js` | Course selection + assignment display |
| Assignment Detail | `src/commands/assignment.js` | Course → Assignment → Details flow |
| File Submit | `src/commands/submit.js` | Course → Assignment → File → Upload |

## Libraries Map

| Library | Purpose | Key Usage |
|---------|---------|-----------|
| **Inquirer.js** | Interactive prompts | `type: 'list'` for arrow-key navigation |
| **Chalk** | Terminal colors | `chalk.red()`, `chalk.hex('#abc')` |
| **Axios** | HTTP requests | API calls with auto bearer token |
| **Commander.js** | CLI framework | `.command()`, `.action()` |
| **Dotenv** | Config loading | Load from `~/.canvas-cli/.env` |
| **Open** | Browser launch | `await open(url)` |
| **Form-Data** | File uploads | 3-step Canvas upload process |
| **Asciify-Image** | ASCII art | Convert PNG to ASCII (about command) |

## Key Patterns

### Create a New Command

1. Create file: `src/commands/mycommand.js`
2. Use template:
   ```javascript
   const chalk = require('chalk');
   const { requireAuth, displayError } = require('../utils/errors');
   const config = require('../utils/config');
   
   async function myCommand(options) {
     try {
       requireAuth(config);
       console.log(chalk.cyan('\n[*] Loading...\n'));
       // ... implementation
     } catch (error) {
       displayError(error);
       process.exit(1);
     }
   }
   
   module.exports = myCommand;
   ```
3. Register in `src/index.js`:
   ```javascript
   const myCommand = require('./commands/mycommand');
   program.command('mycommand').action(() => myCommand({}));
   ```

### Add Interactive Selection

```javascript
const { selectCourse, selectAssignment, selectFile } = require('../ui/select');

const course = await selectCourse(courses); // Returns null if cancelled
if (!course) return;
```

### Display Results

```javascript
const { displayAssignmentsList, displayAssignmentDetails } = require('../ui/display');

displayAssignmentsList(assignments); // Compact list
await displayAssignmentDetails(assignment); // Full details with action menu
```

### Filter Assignments

```javascript
const { isDueWithinDays, isOverdue, isDue, sortByDueDate } = require('../utils/dates');

const upcoming = assignments.filter(a => isDueWithinDays(a, 3));
const overdue = assignments.filter(a => isOverdue(a));
const sorted = sortByDueDate(assignments);
```

### Call Canvas API

```javascript
const { getCourses, getAssignmentsForCourse, getAllAssignments } = require('../api/client');

const courses = await getCourses(); // With custom colors attached
const assignments = await getAssignmentsForCourse(courseId);
const all = await getAllAssignments(); // Returns { assignments, skippedCourses }
```

## Icon Reference

| Icon | Meaning | Example |
|------|---------|---------|
| `[*]` | Info/Loading | `chalk.cyan('[*] Loading assignments...')` |
| `[+]` | Success | `chalk.green('[+] File submitted successfully!')` |
| `[!]` | Warning | `chalk.yellow('[!] Could not auto-detect URL')` |
| `[X]` | Error | `chalk.red('[X] Failed to authenticate')` |
| `[>]` | Navigation | `'[>] Show all assignments'` |
| `[ERROR]` | Error header | Always preceded by blank line |

## Color Scheme

**Due Dates:**
- Red: Today
- Yellow: Tomorrow  
- Green: Later/All other dates

**UI Elements:**
- Cyan: Section headers, loading messages
- Green: Success messages
- Yellow: Warnings, alternative options
- Red: Errors
- Gray: Labels, secondary info

**Course Names:**
- Custom color from Canvas (if set)
- Hash-based fallback: cyan, green, yellow, magenta, blue, red

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/users/self` | Verify authentication |
| GET | `/api/v1/users/self/colors` | Get custom course colors |
| GET | `/api/v1/courses` | Get all active courses |
| GET | `/api/v1/courses/{id}/assignments` | Get course assignments |
| POST | `/api/v1/courses/{id}/assignments/{id}/submissions/self/files` | Step 1: Start file upload |
| POST | (upload_url) | Step 2: Upload file to S3 |
| GET | (location header) | Step 3: Confirm upload |

## Configuration

**Storage Location:** `~/.canvas-cli/.env`
**Environment Variables:**
- `CANVAS_TOKEN` - API authentication token
- `CANVAS_URL` - Instance URL (e.g., https://school.instructure.com)

**Auto-Detection:**
- Tries `https://canvas.instructure.com` first
- Follows redirects to find actual URL
- Falls back to manual entry if needed

## Important Notes

1. **Never truncate errors** - Always show complete error messages
2. **Date filtering only** - Don't trust `has_submitted_submissions` flag
3. **Text icons only** - No emojis (uses `[*]`, `[+]`, etc.)
4. **24-hour time** - Use `hour12: false` in date formatting
5. **Color caching** - Course colors cached in memory for consistency
6. **Handle 403 gracefully** - Skip courses with restricted API access

## Common Tasks

### Show assignments due in next 3 days
```javascript
const upcoming = assignments.filter(a => isDueWithinDays(a, 3));
const sorted = sortByDueDate(upcoming);
displayAssignmentsList(sorted);
```

### Get color for course
```javascript
const { getCourseColor } = require('../ui/display');
const colorFunc = getCourseColor(courseName, courseId, customColor);
console.log(colorFunc('Colored text'));
```

### Format date for display
```javascript
const { formatDate } = require('../utils/dates');
const formatted = formatDate(assignment.due_at);
// Returns: "Today at 14:00", "Tomorrow at 23:59", "Nov 5, 2024 10:00"
```

### Check if authenticated
```javascript
const config = require('../utils/config');
if (!config.isAuthenticated()) {
  console.log('Not authenticated');
}
```

### Make raw API call
```javascript
const { makeRawRequest } = require('../api/client');
const data = await makeRawRequest('/api/v1/users/self');
```

