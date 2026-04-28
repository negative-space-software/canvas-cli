# Canvas CLI

A modern command-line interface for any university's Canvas LMS.

## Features

- Secure token-based authentication with auto URL detection
- List assignments with flexible filtering (upcoming, all, due, overdue)
- Interactive course and assignment browsing with arrow key navigation
- File submission support (select class → assignment → file)
- Quick browser integration
- Custom Canvas course colors
- Color-coded due dates (red → yellow → green → blue gradient)
- 24-hour time format support
- Raw API access for advanced users

## Installation

```bash
npm install -g @negative-space-software/canvas-cli
```

This makes the `canvas-cli` command globally available. During first-time auth, you'll be offered the option to add a shorter `canvas` alias to your shell config.

## Setup

### Get Your Canvas Token

1. Log into Canvas
2. Go to Account → Settings
3. Scroll to "Approved Integrations"
4. Click "+ New Access Token"
5. Generate token with a descriptive purpose

### Authenticate

```bash
canvas-cli auth
```

The CLI auto-detects your Canvas URL, stores credentials in `~/.canvas-cli/.env`, and offers to install a `canvas` alias for shorter commands.

### Optional: Add the `canvas` alias later

If you skipped the alias prompt during auth, you can install it any time:

```bash
canvas-cli alias
```

This appends `alias canvas='canvas-cli'` to your shell rc file (`.zshrc`, `.bash_profile`, or `config.fish`). After installation, run `source` on the rc file or open a new terminal.

The rest of this README uses `canvas-cli` for examples — substitute `canvas` if you've installed the alias.

## Commands

### Assignments

```bash
canvas-cli                    # Week view - upcoming assignments grouped by week (configurable)
canvas-cli list               # List assignments due in next 3 days
canvas-cli list-all           # List all assignments
canvas-cli list-all-due       # List all upcoming assignments
canvas-cli list-all-overdue   # List all overdue assignments
```

### Classes

```bash
canvas-cli class              # Select class, view details (assignments due in 3 days)
canvas-cli class-all          # Select class, view all assignments
```

### Assignment Details

```bash
canvas-cli assignment         # Select class → assignment (uses CANVAS_DEFAULT_DAYS)
canvas-cli assignment -d 7    # Select class → assignment (next 7 days)
canvas-cli assignment -a      # Select class → assignment (all assignments)
```

### Submit Files

```bash
canvas-cli submit             # Interactive file submission
```

Workflow:
1. Select a course
2. Select an assignment (shows assignments due in next 3 days)
3. Option to view all future file-upload assignments if needed
4. Select a file from current directory
5. Confirm and submit

### Utilities

```bash
canvas-cli open                   # Open Canvas in browser
canvas-cli raw <endpoint>         # Make raw API request
canvas-cli alias                  # Install `canvas` shell alias
canvas-cli about                  # Show version, license, institution
```

Example: `canvas-cli raw /api/v1/courses`

## Visual Features

### Date Formatting
Due dates display with friendly named days:
- **Today** → "Today at 14:00"
- **Tomorrow** → "Tomorrow at 14:00"
- **Within 7 days** → Day name (e.g., "Sunday at 14:00")
- **Beyond 7 days** → Full date (e.g., "Jan 15, 2025 at 14:00")

### Due Date Colors
Uses a gradient based on days until due:
- **Red** — 1 day or less
- **Red/Yellow** — 1-4 days (gradient)
- **Yellow/Green** — 4-7 days (gradient)
- **Green/Blue** — 7-14 days (gradient)
- **Blue** — 14+ days

### Course Colors
- Uses your custom Canvas course colors
- Consistent across all views
- Falls back to hash-based colors if not set

## Configuration

Settings stored in `~/.canvas-cli/.env`:

| Variable | Purpose | Default |
|---|---|---|
| `CANVAS_TOKEN` | Your Canvas API token | — |
| `CANVAS_URL` | Auto-detected Canvas instance URL | — |
| `CANVAS_DEFAULT_DAYS` | Default days for `assignment` filtering | 3 |
| `CANVAS_WEEK_VIEW_WEEKS` | Additional weeks beyond current week to show in week view | 1 |
| `CANVAS_WEEK_START` | Day the week starts on (`sunday`, `monday`, ...) | `sunday` |

## Sorting Behavior

Assignments and courses respect your Canvas dashboard ordering:
- **Week view (`canvas-cli`)**: Grouped by week (configurable start day, default Sunday), then sorted by your dashboard course order, then by due date
- **Course selection**: Courses appear in your dashboard order
- To change the order, drag courses on your Canvas dashboard

## Reporting Issues

Bugs, feature requests, and questions: [GitHub Issues](https://github.com/negative-space-software/canvas-cli/issues)

## License

Apache License 2.0 — see [LICENSE](./LICENSE).

Copyright © Negative Space Software.
