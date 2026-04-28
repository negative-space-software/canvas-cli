# Canvas CLI - Key Patterns and Architecture Insights

## Core Architecture Philosophy

### Layered Design
The codebase follows a clean **three-layer architecture**:

1. **Commands Layer** (`src/commands/`)
   - Entry point for each CLI command
   - Handles orchestration and user flow
   - Minimal business logic

2. **UI/Display Layer** (`src/ui/`)
   - Handles all user interaction (Inquirer.js)
   - Handles all output formatting (Chalk)
   - Reusable across commands

3. **Data Layer** (`src/api/` + `src/utils/`)
   - API communication (client.js)
   - Data transformation (dates.js)
   - Configuration management (config.js)

### Why This Matters
- Changes to display format → edit `src/ui/display.js` (renderers) or `src/ui/format.js` (primitives)
- Changes to API → edit only `src/api/client.js`
- Changes to business logic → edit command files
- Easy to add new commands without duplicating code

---

## The Inquirer.js Pattern

**Key Insight: Inquirer.js handles ALL interactive I/O**

Rather than building custom arrow-key navigation or input systems, the entire interactive experience uses Inquirer.js prompts:

```
Type: 'list'     → Arrow key navigation + enter confirmation
Type: 'confirm'  → Yes/no dialog
Type: 'password' → Masked password input
Type: 'input'    → Text input with validation
```

**Important: The Firebase-style navigation is built into Inquirer.js**
- No custom event handling needed
- Page size of 15 handles large lists
- Returns selected value directly (no async needed beyond the prompt)

**Pattern in select.js:**
```javascript
async function select(message, choices) {
  const answer = await inquirer.prompt([
    {
      type: 'list',
      name: 'selection',
      message: message,
      choices: choices,
      pageSize: 15
    }
  ]);
  return answer.selection; // Returns the chosen item's value
}
```

Each command that needs selection simply calls these wrapper functions.

---

## The Color System - Three-Tier Approach

### Tier 1: Canvas Custom Colors
```
Canvas API (/api/v1/users/self/colors)
    ↓ Returns: { "course_123": "#abc123" }
    ↓
Fetched in getCourses()
    ↓
Attached to course objects as custom_color
```

### Tier 2: In-Memory Cache
```javascript
const courseColorCache = new Map();
```
- Prevents redundant color function creation
- Ensures consistency across displays
- Per-session lifetime

### Tier 3: Fallback Hash-Based Colors
If no custom color:
```javascript
const colors = [chalk.cyan, chalk.green, chalk.yellow, chalk.magenta, chalk.blue, chalk.red];
const hash = courseId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
const colorFunc = colors[hash % colors.length];
```

**Why this design?**
- Respects user's Canvas color preferences
- Provides consistent fallback if not set
- Avoids re-creating chalk color functions
- Supports hex colors directly from Canvas

---

## The Command Execution Pattern

**Every command follows the same structure:**

```
1. Authenticate     → requireAuth(config)
2. Load/Fetch       → API calls (getCourses, etc.)
3. Select/Filter    → User interaction (selectCourse) or data filtering
4. Transform        → Date formatting, color attachment
5. Display          → Display functions (displayAssignmentsList)
6. Action Menu      → Further action selection (optional)
7. Error Handling   → Try/catch with displayError
```

**Example Flow (Assignment Command):**
```
try {
  requireAuth()                          // 1. Auth check
  courses = getCourses()                 // 2. Fetch
  selectedCourse = selectCourse()        // 3. Select
  assignments = getAssignmentsForCourse()// 2. Fetch
  assignments = filter(isDueWithinDays) // 3. Filter
  assignments = sortByDueDate()          // 4. Transform
  selectedAssignment = selectAssignment()// 3. Select
  displayAssignmentDetails()             // 5. Display
} catch (error) {
  displayError(error)                    // 7. Error
  process.exit(1)
}
```

---

## The Date Filtering Philosophy

**Critical Insight: Use dates, not submission flags**

The Canvas API's `has_submitted_submissions` is unreliable:
- It indicates if ANY student in the course submitted
- It does NOT tell you if the current user submitted
- Therefore: NEVER use it for primary filtering

**Instead, use three date-based filters:**

1. **isDueWithinDays(assignment, 3)**
   - Due date in future
   - Within N days from now
   - Used for: "next 3 days" views

2. **isDue(assignment)**
   - Due date is in the future
   - Used for: all non-past assignments

3. **isOverdue(assignment)**
   - Due date is past
   - Only used as secondary check with `has_submitted_submissions`
   - Used for: marking as overdue

**Hierarchy of Trust:**
1. Due date comparison (most reliable)
2. `has_submitted_submissions` (secondary, unreliable)
3. Nothing else

---

## The Error Handling Philosophy

**Rule: NEVER truncate errors**

This is stated explicitly in `outline.txt`:
> "NEVER truncate errors. if there are errors, display the entire message. EVERY TIME. NO EXCEPTIONS."

**Implementation:**
```javascript
function displayError(error) {
  console.error(chalk.red('\n[ERROR]\n'));
  
  if (error.response) {
    // Full HTTP error with status, headers, body
    console.error(chalk.red('Status:'), error.response.status);
    console.error(chalk.red('Response Data:'));
    console.error(JSON.stringify(error.response.data, null, 2));
  } else if (error.request) {
    // Network error
    console.error(chalk.red('No response received'));
  } else {
    // Other errors
    console.error(chalk.red('Message:'), error.message);
  }
  
  // ALWAYS show stack trace
  console.error(chalk.red('\nStack Trace:'));
  console.error(error.stack);
}
```

**Special Cases:**
- 503 errors get extra help text (Canvas maintenance)
- 403 errors are tracked separately (API access restricted)
- All other errors get full technical details

---

## The Authentication Strategy

**Two-part authentication system:**

1. **Token + URL Storage**
   - Stored in `~/.canvas-cli/.env` (user's home directory)
   - Read on every command startup
   - Survives directory changes

2. **Smart URL Auto-Detection**
   ```
   User enters token
   Try canvas.instructure.com (generic)
   Follow redirects (maxRedirects: 5)
   Extract URL from redirect chain
   Fallback to manual entry
   Verify token works with URL
   Save both to .env
   ```

**Why Home Directory?**
- Works from any project directory
- Doesn't pollute project .env files
- Follows CLI conventions (like .ssh, .git-credentials)
- Allows single token across multiple projects

---

## The Text Icon System

**Principle: No emojis, only ASCII text icons**

Icons serve as visual quick-scans:
- `[*]` → "Something is happening" (cyan loading state)
- `[+]` → "Success!" (green completion)
- `[!]` → "Pay attention" (yellow warning)
- `[X]` → "Failure" (red error)
- `[>]` → "This is navigation" (show more options)

**Consistency across app:**
- Same icon used in same context everywhere
- Color codes reinforce meaning
- Works in all terminals (no special font needed)

---

## The Display Formatting Pattern

**Three tiers of detail:**

### Tier 1: List View (Compact)
```
Assignments

1. [Computer Science] Midterm Exam
   Due: Today at 14:00
   Points: 100

2. [Physics] Lab Report
   Due: Tomorrow at 23:59
```

### Tier 2: Details View (Full)
```
================================================================================
  Computer Science
================================================================================

Midterm Exam
Due Date: Today at 14:00
Points: 100
Submission Types: online_text_entry

Description:
[First 500 chars, HTML stripped]
```

### Tier 3: Action Menu (Interactive)
```
Choose an action:
  1. Open in browser
> 2. Return to terminal
```

**Design Insight:**
- Lists are for scanning many items
- Details are for understanding one item
- Action menus provide next steps
- Always provide "Return to terminal" option

---

## The API Client Design

**Principle: Stateless, reusable wrapper**

```javascript
function createClient() {
  return axios.create({
    baseURL: baseUrl,
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

**Why this approach?**
- Consistent authorization across all requests
- Easy to swap auth headers
- Can be called fresh for each request
- Axios handles all HTTP complexity

**Data Enrichment Pattern:**
```javascript
// getCourses() returns raw API data + custom colors
const courses = await getCourses();
// Data now has: { id, name, course_code, ..., custom_color }

// getAssignmentsForCourse() returns raw assignments
// Command enriches with course data:
assignments = assignments.map(a => ({
  ...a,
  course_name: course.name,
  course_color: course.custom_color,
  course_id: course.id
}));
```

**Why enrich at command level?**
- API layer stays pure
- Commands control what data to attach
- Display layer gets complete objects
- Easy to debug data flow

---

## The File Upload Process (3 Steps)

Canvas requires a 3-step upload dance:

```
Step 1: POST to /api/v1/courses/{id}/assignments/{id}/submissions/self/files
        ↓ Returns: { upload_url, upload_params }
        
Step 2: POST file to upload_url with upload_params
        ↓ Returns: redirect (301) to confirm endpoint
        
Step 3: GET the Location header URL
        ↓ Returns: actual file object
```

**Why three steps?**
- Canvas delegates uploads to S3
- This is the Canvas API's required flow
- Follows RFC for S3 uploads

---

## Configuration Persistence

**Key Innovation: Cross-directory persistence**

Instead of `.env` in project:
- Stores in `~/.canvas-cli/.env` (home directory)
- Accessed via `path.join(os.homedir(), '.canvas-cli')`
- Loaded on every command startup with `dotenv.config()`

**Benefits:**
- Run `canvas-cli` from any directory
- Single token works across all projects
- Survives `cd` commands
- No accidental git commits of secrets

---

## The About Command Pattern

**Special display: ASCII art conversion**

```javascript
// Load PNG files from root
const canvasLogoPath = path.join(__dirname, '../../canvas.png');
const nssLogoPath = path.join(__dirname, '../../nss.png');

// Convert to ASCII
const canvasAscii = await imageToAscii(canvasLogoPath);
const nssAscii = await imageToAscii(nssLogoPath);

// Combine side-by-side
const combined = combineAsciiSideBySide(canvasAscii, nssAscii);
```

**Smart institution detection:**
```javascript
// https://clemson.instructure.com → "Clemson"
// https://canvas.university.edu → "University"
```

---

## Data Flow Summary

### Typical Command Execution
```
index.js (CLI routing)
    ↓
commands/assignment.js (orchestration)
    ↓ calls
api/client.js (getCourses) → Canvas API
    ↓ returns
Courses with custom colors attached
    ↓ calls
ui/select.js (selectCourse) ← Inquirer.js
    ↓ returns
Selected course
    ↓ calls
api/client.js (getAssignmentsForCourse) → Canvas API
    ↓ returns
Raw assignments
    ↓ enriches
commands/assignment.js (add course data)
    ↓ filters/sorts
utils/dates.js (isDueWithinDays, sortByDueDate)
    ↓ calls
ui/select.js (selectAssignment) ← Inquirer.js
    ↓ calls
ui/display.js (displayAssignmentDetails)
    ↓ renders
Terminal output with colors
    ↓ awaits
User action menu selection
    ↓ handles
Based on action (open, exit)
    ↓ returns to
Terminal prompt
```

---

## Extension Points

**Where to add new features:**

1. **New selection type**
   - Add function to `src/ui/select.js`
   - Wraps Inquirer.js prompt

2. **New display format**
   - Add function to `src/ui/display.js`
   - Uses chalk for colors, getCourseColor for consistency

3. **New data filter**
   - Add function to `src/utils/dates.js`
   - Reused across commands

4. **New API endpoint**
   - Add function to `src/api/client.js`
   - Uses createClient() with bearer token

5. **New command**
   - Create in `src/commands/newcommand.js`
   - Register in `src/index.js`
   - Follow standard error handling pattern

---

## Performance Considerations

### Caching Strategy
- **Course colors:** Cached in memory Map (per session)
- **Token/URL:** Loaded from .env at startup (per session)
- **Courses:** Fetched on demand (not cached)
- **Assignments:** Fetched on demand (not cached)

### Why not cache everything?
- Canvas data changes frequently
- Assignment status updates in real-time
- Token can be rotated at any time
- Session-only caching keeps app fresh

### Parallel Requests
```javascript
// getCourses() uses Promise.all()
const [coursesResponse, customColors] = await Promise.all([
  client.get('/api/v1/courses', ...),
  getUserColors()
]);
```
- Reduces latency
- Used when requests are independent

---

## Security Considerations

### Token Storage
- `.env` is gitignored
- Stored in user's home directory (not project)
- Only readable by current user (file permissions)
- Never logged or displayed (password input with masking)

### Error Messages
- Never include token in error output
- Only show URL and status
- Full stack trace for debugging (stderr)

### Input Validation
- Password input masked with asterisks
- URL validation (must start with http://)
- Token non-empty validation

---

## Testing Patterns

**Raw command for API testing:**
```bash
canvas-cli raw /api/v1/users/self
canvas-cli raw /api/v1/courses
```

**Validate API response format** before adding feature:
- Test actual endpoint first
- Don't assume response structure
- Check for pagination (per_page: 100)
- Handle missing fields gracefully

