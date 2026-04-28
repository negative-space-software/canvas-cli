# Canvas CLI - Documentation Index

This directory contains comprehensive documentation of the Canvas CLI architecture and implementation patterns. Start here to understand the codebase.

## Documentation Files

### 1. ARCHITECTURE.md (24 KB) - Complete Technical Reference
**Best for:** Understanding how everything fits together, detailed explanations

Contains:
- Overview of core libraries (Commander, Inquirer, Chalk, Axios, etc.)
- Select/Interactive Navigation System - How Firebase-style arrow key navigation works
- File Architecture - Complete directory structure and purpose of each file
- Color System - Three-tier color approach (Canvas colors → Cache → Fallback)
- Text-Based Icons - All icons used throughout the CLI
- Display/UI Patterns - How CLI popups and formatted output work
- Error Handling - Error display patterns and requirements
- Authentication - Token and URL management strategy
- Command Structure Pattern - Template for creating new commands
- API Client - Canvas API wrapper implementation
- Notable Patterns - Date filtering, formatting, special cases
- Entry Point - CLI setup and routing
- Configuration Management - How .env persistence works
- About Command - Special features like ASCII art
- Package.json Overview - Dependencies and their purposes
- Development Guidelines Summary - Key rules and patterns

**Read this when:** You need to understand a specific subsystem or see complete code examples.

---

### 2. QUICK_REFERENCE.md (6.7 KB) - Fast Lookup Guide
**Best for:** Quick lookups while coding, common tasks

Contains:
- Key File Locations table (purpose → file path → main functions)
- Libraries Map (library → purpose → usage)
- Key Patterns - Code snippets for common tasks
- Icon Reference - Icon → Meaning → Example
- Color Scheme - Due dates and UI element colors
- API Endpoints Used - Methods, paths, purposes
- Configuration - Storage location and auto-detection
- Important Notes - Critical guidelines
- Common Tasks - Quick code examples for frequent operations

**Read this when:** You need to quickly find where something is or see a quick code snippet.

---

### 3. PATTERNS_AND_INSIGHTS.md (13 KB) - Deep Architecture Knowledge
**Best for:** Understanding design decisions and philosophy

Contains:
- Core Architecture Philosophy - Three-layer design (Commands, UI/Display, Data)
- The Inquirer.js Pattern - How interactive prompts work
- The Color System - Three-tier approach explained
- The Command Execution Pattern - Standard flow for all commands
- The Date Filtering Philosophy - Why dates, not submission flags
- The Error Handling Philosophy - NEVER truncate errors principle
- The Authentication Strategy - Two-part system with auto-detection
- The Text Icon System - Design reasoning for ASCII icons
- The Display Formatting Pattern - Three tiers of detail
- The API Client Design - Stateless wrapper approach
- The File Upload Process - 3-step Canvas API dance
- Configuration Persistence - Cross-directory persistence strategy
- The About Command - Special ASCII art rendering
- Data Flow Summary - Typical command execution flow with ASCII diagram
- Extension Points - Where to add new features
- Performance Considerations - Caching and optimization strategies
- Security Considerations - Token storage and error handling security
- Testing Patterns - Using raw command and API validation

**Read this when:** You want to understand WHY things are designed the way they are.

---

### 4. CLAUDE.md (2.2 KB) - Project Overview & Guidelines
**Best for:** High-level project summary and development requirements

Contains:
- Project Overview - What Canvas CLI is
- Architecture - Core components overview
- Canvas API Integration - How to work with Canvas API
- Important Implementation Details - Filtering behavior, Submit command, Course colors
- Key Development Guidelines - Reference to outline.txt

**Read this when:** You're getting oriented with the project.

---

## How to Use This Documentation

### Scenario 1: "I need to understand how selection menus work"
1. Start with QUICK_REFERENCE.md → Key File Locations → Interactive Selection
2. Read ARCHITECTURE.md → Section 1: SELECT/INTERACTIVE NAVIGATION SYSTEM
3. Look at actual code: `/Users/nicho/Projects/canvas-cli/src/ui/select.js`

### Scenario 2: "I need to add a new command"
1. Read QUICK_REFERENCE.md → Key Patterns → Create a New Command
2. Reference ARCHITECTURE.md → Section 8: COMMAND STRUCTURE PATTERN
3. Look at example: `/Users/nicho/Projects/canvas-cli/src/commands/list.js`
4. Check PATTERNS_AND_INSIGHTS.md → Extension Points

### Scenario 3: "I need to understand the date filtering logic"
1. Read PATTERNS_AND_INSIGHTS.md → The Date Filtering Philosophy
2. Reference ARCHITECTURE.md → Section 10: Notable Patterns
3. Look at code: `/Users/nicho/Projects/canvas-cli/src/utils/dates.js`

### Scenario 4: "I need to modify the display output"
1. Read QUICK_REFERENCE.md → Color Scheme & Icon Reference
2. Reference ARCHITECTURE.md → Section 5: DISPLAY/UI PATTERNS
3. Look at code: `/Users/nicho/Projects/canvas-cli/src/ui/display.js`

### Scenario 5: "I'm debugging an error"
1. Read ARCHITECTURE.md → Section 6: ERROR HANDLING
2. Check `/Users/nicho/Projects/canvas-cli/src/utils/errors.js`
3. Reference PATTERNS_AND_INSIGHTS.md → The Error Handling Philosophy

### Scenario 6: "I need to call a new Canvas API endpoint"
1. Read QUICK_REFERENCE.md → Call Canvas API code snippet
2. Reference ARCHITECTURE.md → Section 9: API CLIENT
3. Look at code: `/Users/nicho/Projects/canvas-cli/src/api/client.js`
4. Test with: `canvas-cli raw /api/v1/your/endpoint`

---

## File Structure Reference

```
/Users/nicho/Projects/canvas-cli/
├── DOCS_INDEX.md                 # This file - documentation map
├── ARCHITECTURE.md               # Complete technical reference
├── QUICK_REFERENCE.md            # Fast lookup guide
├── PATTERNS_AND_INSIGHTS.md      # Design philosophy
├── CLAUDE.md                     # Project overview
├── outline.txt                   # Official project specification
├── package.json                  # Dependencies
├── src/
│   ├── index.js                  # CLI entry point
│   ├── api/
│   │   └── client.js             # Canvas API wrapper
│   ├── commands/
│   │   ├── auth.js               # Authentication
│   │   ├── list.js               # List assignments
│   │   ├── class.js              # View course
│   │   ├── assignment.js         # View assignment
│   │   ├── submit.js             # Submit file
│   │   ├── raw.js                # Raw API calls
│   │   ├── open.js               # Open in browser
│   │   └── about.js              # Version/info
│   ├── ui/
│   │   ├── select.js             # Interactive menus
│   │   ├── display.js            # Domain renderers + getCourseColor
│   │   └── format.js             # Generic primitives (truncate, getTerminalWidth)
│   └── utils/
│       ├── config.js             # Config management
│       ├── dates.js              # Date utilities
│       └── errors.js             # Error handling
```

---

## Quick Command Reference

```bash
# Development
npm start                              # Run CLI locally
canvas-cli auth                        # Authenticate
canvas-cli list                        # List assignments (next 3 days)
canvas-cli list-all                    # List all assignments
canvas-cli class                       # View course details
canvas-cli assignment                  # View assignment details
canvas-cli submit                      # Submit file for assignment
canvas-cli raw /api/v1/users/self      # Test API endpoint
canvas-cli open                        # Open Canvas in browser
canvas-cli about                       # Show version info
canvas-cli alias                       # Install `canvas` shell alias
```

---

## Key Architectural Patterns

### The Three-Layer Architecture
- **Commands Layer** (`src/commands/`) - Orchestration
- **UI/Display Layer** (`src/ui/`) - User interaction and formatting
- **Data Layer** (`src/api/` + `src/utils/`) - API calls and data transformation

### The Standard Command Flow
1. Authenticate → 2. Load/Fetch → 3. Select/Filter → 4. Transform → 5. Display → 6. Error Handling

### The Color System
Canvas Custom Colors → In-Memory Cache → Hash-Based Fallback

### The Error Philosophy
NEVER TRUNCATE ERRORS - Always show complete messages with stack traces.

### The Text Icon System
- `[*]` = Info (cyan)
- `[+]` = Success (green)
- `[!]` = Warning (yellow)
- `[X]` = Error (red)
- `[>]` = Navigation (default)

---

## Important Notes for Development

1. **Always require authentication** at the start of commands
2. **Use date-based filtering** - Don't trust `has_submitted_submissions`
3. **Cache colors in memory** - Use getCourseColor() consistently
4. **Use text icons only** - No emoji symbols
5. **Use 24-hour time format** - Set `hour12: false`
6. **Check for null selections** - User might cancel Inquirer prompts
7. **Wrap in try/catch** - Always call displayError() on errors
8. **Show full errors** - Never truncate or abbreviate error messages

---

## Learning Path

**For New Contributors:**
1. Read CLAUDE.md (overview)
2. Read QUICK_REFERENCE.md (fast orientation)
3. Look at simple command: `/Users/nicho/Projects/canvas-cli/src/commands/list.js`
4. Read ARCHITECTURE.md (detailed understanding)
5. Study PATTERNS_AND_INSIGHTS.md (philosophy)
6. Explore code with understanding of architecture

**For Feature Development:**
1. Identify which layer needs modification (Commands, UI, or Data)
2. Check QUICK_REFERENCE.md for relevant code snippet
3. Reference ARCHITECTURE.md for detailed implementation
4. Look at similar existing code for patterns
5. Check Extension Points in PATTERNS_AND_INSIGHTS.md

**For Bug Fixes:**
1. Use QUICK_REFERENCE.md to find relevant file
2. Read ARCHITECTURE.md section for that component
3. Check PATTERNS_AND_INSIGHTS.md for design intent
4. Reference actual code to understand current behavior
5. Modify while maintaining established patterns

---

## Documentation Statistics

- **ARCHITECTURE.md**: 24 KB, 14 sections, 50+ code examples
- **PATTERNS_AND_INSIGHTS.md**: 13 KB, 20+ subsections, design rationale
- **QUICK_REFERENCE.md**: 6.7 KB, easy lookup tables and snippets
- **CLAUDE.md**: 2.2 KB, high-level overview
- **This index**: Navigation and learning paths

**Total**: ~50 KB of comprehensive documentation covering all aspects of the codebase.

---

## Keeping Documentation Updated

When modifying the codebase:
1. Update relevant ARCHITECTURE.md section if changing core functionality
2. Update QUICK_REFERENCE.md if adding new patterns or files
3. Update PATTERNS_AND_INSIGHTS.md if changing architectural approach
4. Update this index if adding new docs

---

Generated: November 4, 2025
Canvas CLI Documentation Suite
