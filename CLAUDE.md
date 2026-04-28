# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Canvas CLI is a command-line interface for interacting with Canvas LMS (by Instructure). Works with any university or school that uses Canvas.

**IMPORTANT**: For complete project specifications, commands, and development requirements, always reference `outline.txt` in the project root. The outline contains the authoritative specification for CLI commands, UI/UX requirements, and critical development guidelines.

## Architecture

### Core Components

- **Authentication**: Canvas API token management stored in .env file
- **API Client**: Wrapper for Canvas LMS REST API calls with custom color support
- **Interactive Selection**: Firebase-style arrow key navigation with space/enter confirmation
- **Display System**: CLI popup-style displays with numbered action items
- **Color Scheme**:
  - Uses user's custom Canvas course colors from `/api/v1/users/self/colors`
  - Color-coded due dates (red ≤1 day, yellow ~4 days, green ~7 days, blue 14+ days)
  - 24-hour time format
  - Clean text icons (no emojis)

## Canvas API Integration

**CRITICAL**: When implementing API calls, never assume response formats. Always verify against Canvas API documentation or test responses first, as specified in `outline.txt`.

## Important Implementation Details

### Filtering Behavior
- Default `canvas-cli` and `canvas-cli class` views show assignments through end of configured weeks (CANVAS_WEEK_VIEW_WEEKS, default 1 = this week + next week)
- `canvas-cli list` and `canvas-cli assignment` default to next 3 days (CANVAS_DEFAULT_DAYS)
- Filters exclude past assignments and overdue assignments (based on due date)
- `has_submitted_submissions` flag is unreliable (shows if ANY student submitted, not current user)
- Use date-based filtering only

### Submit Command
- Must filter by class first
- Then by assignment (file upload only)
- Show assignments due in next 3 days by default
- Provide option to view all future file-upload assignments

### Course Colors
- Fetched from `/api/v1/users/self/colors` API endpoint
- Format: `{ "course_123": "#abc123" }`
- Cached in memory for consistency across views
- Falls back to hash-based colors if not set

## Key Development Guidelines

See `outline.txt` for:
- Complete command specifications and behavior
- Error handling requirements (never truncate errors)
- UI/UX interaction patterns
- API development approach
