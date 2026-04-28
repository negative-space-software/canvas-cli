# Negative Space Software — CLI Implementation Guide

This guide specifies how to build a CLI tool that meets Negative Space Software (NSS) standards. All NSS CLIs share the same look, feel, and architecture so users can pick up any of them and feel at home.

The reference implementation is **canvas-cli** (this repository). Wherever this guide says "see `src/foo.js`", that file is the canonical example — copy from it rather than recreating from scratch.

---

## 1. What is an NSS CLI?

An NSS CLI is a Node.js command-line tool that:

- Runs interactively with arrow-key navigation (Inquirer.js)
- Uses ASCII text icons, never Unicode emojis
- Uses a fixed color palette (chalk) — cyan/green/yellow/red/gray/magenta with consistent meanings
- Stores config in `~/.{app-name}/.env` so it works from any directory
- Displays a branded `about` screen with logo + license
- Is published to npm under the Apache 2.0 license, authored by Negative Space Software
- Stands alone — no shared runtime dependencies between NSS CLIs (each is independently installable)

Each app writes its own `display.js` against the conventions in §5. There is no shared `@nss/cli-ui` package today; if duplication becomes painful across 3+ apps, extract one then.

---

## 2. Project Skeleton

```
{app-name}/
├── package.json
├── LICENSE                  # Apache 2.0, full text
├── README.md                # npm-facing docs: install, commands, auth
├── .gitignore               # node_modules, .env, .DS_Store
├── .npmignore               # node_modules, .env, .DS_Store, *.log
├── logo.png                 # used by `about` command (ASCII art)
└── src/
    ├── index.js             # #!/usr/bin/env node — Commander entry point
    ├── commands/
    │   ├── auth.js          # if app needs auth
    │   ├── about.js         # required
    │   └── {your commands}.js
    ├── ui/
    │   ├── select.js        # interactive prompts
    │   └── display.js       # app-specific output formatting
    ├── api/                 # only if app talks to an HTTP API
    │   └── client.js
    └── utils/
        ├── config.js        # ~/.{app-name}/.env management
        └── errors.js        # displayError, requireAuth
```

User config lives at `~/.{app-name}/.env`, *not* in the project directory.

---

## 3. Naming & npm Conventions

### Package name
- Lowercase, kebab-case: `nss-foo-cli` or `foo-cli`
- Scoped (`@negative-space/foo-cli`) is acceptable but unscoped is preferred for shorter `npm install -g` commands

### Bin name
- Often shorter than the package name (e.g. package `canvas-cli`, bin `canvas`)
- Set in `package.json`:
  ```json
  "bin": { "canvas": "./src/index.js" }
  ```
- The bin name is what users type, so make it short and memorable

### Config directory
- `~/.{bin-name}/` or `~/.{package-name}/` — use whichever is shorter and more recognizable
- Always `.env` inside it: `~/.canvas-cli/.env`

### Versioning
- Semver, start at `1.0.0` for first published release
- Bump minor for new commands, patch for fixes, major for breaking config or command changes

### README expectations
The README is the npm landing page. It must include:
- One-line description matching `package.json` `description`
- `npm install -g {package-name}` install snippet
- All commands with brief examples
- Auth setup (if applicable)
- Link to issues / repo
- License line

---

## 4. Dependencies

Pin to these major versions. **The CommonJS-only versions are required** — newer versions are ESM-only and break the rest of the stack.

| Package | Version | Why this version |
|---|---|---|
| `commander` | `^14` | CLI framework |
| `inquirer` | `^8.2.7` | **Not 9+** — 9.x is ESM-only |
| `chalk` | `^4.1.2` | **Not 5+** — 5.x is ESM-only |
| `dotenv` | `^17` | `.env` loading |
| `open` | `^8.4.2` | **Not 9+** — 9.x is ESM-only |
| `asciify-image` | `^0.1.10` | ASCII art for `about` |
| `axios` | `^1` | Only if HTTP needed |
| `form-data` | `^4` | Only if uploading files |

Set `"type": "commonjs"` in `package.json`.

---

## 5. Conventions

### Icons (ASCII text only — never emoji)

```javascript
const ICONS = {
  INFO:    '[*]',      // cyan      — loading, info
  SUCCESS: '[+]',      // green     — completion
  WARNING: '[!]',      // yellow    — caution, alternates
  ERROR:   '[X]',      // red       — failure
  NAV:     '[>]',      // default   — "show more", navigation
  HEADER:  '[ERROR]',  // red       — error block header
};
```

### Color palette (chalk)

| Color | Use |
|---|---|
| `chalk.cyan` | Section headers, info messages, loading |
| `chalk.green` | Success, version numbers |
| `chalk.yellow` | Warnings, alternate options, author |
| `chalk.red` | Errors, destructive actions |
| `chalk.gray` | Labels, secondary text, muted info |
| `chalk.magenta` | License display |
| `chalk.blue` | URLs, links |
| `chalk.bold` | Field labels in details views |

### Time format
24-hour (`hour12: false`). Show "Today at HH:MM" / "Tomorrow at HH:MM" for nearby dates; `MMM DD, YYYY HH:MM` otherwise.

### Separators & layout
- Major dividers: `'='.repeat(80)`
- Tree views for nested lists: `├─` for non-last items, `└─` for last
- Vertical continuation: `│ ` prefix, two-space indent below
- Truncate long content to terminal width (`process.stdout.columns || 80`)
- Action menus are numbered: `1. Open in browser`, `2. Return to terminal`

### Inquirer pageSize
Default to `pageSize: 15` for `list`-type prompts.

### Empty / cancellation states
- Empty results: `console.log(chalk.yellow('\nNo {items} found\n'))` — yellow, not red
- User cancels (returns null/undefined from prompt): return early without error

---

## 6. Core Modules

For each, the *contract* is below. The reference implementation lives in canvas-cli's source — copy and adapt rather than re-derive.

### `src/utils/config.js`

**Exports** (minimum):
- `isAuthenticated()` — boolean (only if app needs auth)
- `saveConfig(...)` — persist to `~/.{app-name}/.env`
- Per-key getters (`getToken`, `getApiUrl`, etc.) — one per env var

**Behavior:**
- Create `~/.{app-name}/` on require if it doesn't exist
- Load `.env` from that path on require
- `saveConfig` writes the file *and* updates `process.env` so the current run sees new values

**Reference:** `src/utils/config.js`

### `src/utils/errors.js`

**Exports:**
- `displayError(error)` — print error, never truncate
- `requireAuth(config)` — exit with helpful message if not authenticated (only if app uses auth)

**Behavior of `displayError`:**
- Print `[ERROR]` header in red
- For HTTP errors (`error.response`): show status, status text, URL, full response body as JSON
- For network errors (`error.request`): note no response received
- For other errors: show `error.message`
- **Always print full stack trace** — this is non-negotiable. Truncating errors hides bugs.
- Special-case 503s with a friendly "service unavailable" message and skip the stack trace (optional, see canvas-cli)

**Reference:** `src/utils/errors.js`

### `src/ui/select.js`

**Exports** (minimum):
- `select(message, choices)` — generic list prompt, `pageSize: 15`
- `confirm(message)` — yes/no prompt, default false

**App-specific wrappers** (encouraged): `selectCourse`, `selectAssignment`, `selectFile`, etc. Each wraps `select` with a domain-specific formatter and an empty-state message.

**Choice format:** `{ name: 'Display text', value: actualObject }` — return the actual object so callers don't have to re-look-up.

**Reference:** `src/ui/select.js`

### `src/ui/display.js`

App-specific. Implements the conventions in §5 against your domain. Common building blocks:

- **List view** — tree-style with `├─` / `└─` connectors, course/category tag in domain color, due date in semantic color
- **Details view** — 80-char `=` separators top and bottom, bold title, gray labels
- **Action menu after details** — numbered list, always include "Return to terminal" as the last option
- **Color caching** — if your domain has user-customizable colors (e.g. canvas course colors), cache the chalk function in a `Map` keyed by ID so the same item renders the same color across views

**Reference:** `src/ui/display.js`

---

## 7. Command Structure

Every command follows the same 7-step flow:

```javascript
async function myCommand(options) {
  try {
    // 1. Authenticate (if required)
    requireAuth(config);

    // 2. Load / fetch data
    console.log(chalk.cyan('\n[*] Loading...\n'));
    const data = await fetchData();

    // 3. Filter
    const filtered = options.all ? data : data.filter(predicate);
    if (filtered.length === 0) {
      console.log(chalk.yellow('\nNo items found\n'));
      return;
    }

    // 4. Transform
    const sorted = filtered.sort(byDate);

    // 5. Display
    if (options.interactive) {
      const picked = await selectItem(sorted);
      if (!picked) return; // user cancelled
      await displayDetails(picked);
    } else {
      displayList(sorted);
    }

    // 6. Action menu (optional)
    // — handled inside displayDetails when applicable

  } catch (error) {
    // 7. Error handling — never truncate
    displayError(error);
    process.exit(1);
  }
}

module.exports = myCommand;
```

**Reference:** `src/commands/list.js` is a clean example.

---

## 8. The `about` Command

Every NSS CLI must have an `about` command. It is the brand surface.

### Required output
- ASCII art logo (from `logo.png` in project root)
- App name in `chalk.cyan.bold`
- `Version:` — green, from `package.json`
- `Author:` — yellow, "Negative Space Software"
- `License:` — magenta, "Apache License 2.0"
- Repo URL or website — blue
- Optional: app-specific status (e.g. canvas-cli shows authenticated institution)
- Two lines of gray description at the end

### Logo handling
- Use `asciify-image` with `width: 30, height: 18, color: true` (or `color: false` for single-color logos)
- Logo can fail to load — fall back to text-only `about` without crashing
- Indent all output by 2 spaces

### Spacing
- Blank line above the logo, blank line below the description
- No `=` separators in `about` (keep it clean and modern)

**Reference:** `src/commands/about.js`

---

## 9. Auth Pattern (Optional)

Only if your CLI talks to an authenticated service. Skip this section otherwise.

### Token entry
- Inquirer `password` prompt with `mask: '*'`
- Validate non-empty before accepting

### Verification
- Make a test request with the token *before* saving
- On 401: clear error, exit, do not save
- On success: save and confirm with the user's name/email

### Storage
- Plain text in `~/.{app-name}/.env`
- Never log the token after entry, never display it in error messages
- File mode `0600` is acceptable but not required (relies on home dir permissions)

### Auto-detection (when applicable)
If the service has multiple instances (like Canvas across schools), try to detect the URL from the token before asking the user. canvas-cli's `detectCanvasUrl` is one approach.

**Reference:** `src/commands/auth.js`

---

## 10. Licensing

All NSS CLIs are Apache 2.0.

### `LICENSE` file
Project root. Full Apache 2.0 text with copyright line:

```
Copyright {YEAR} Negative Space Software

Licensed under the Apache License, Version 2.0 (the "License");
...
```

### Source file headers
Every `.js` file gets the standard header. Place it after the shebang on `src/index.js`, before any imports otherwise:

```javascript
/*
 * Copyright {YEAR} Negative Space Software
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
```

### `package.json`
```json
{
  "license": "Apache-2.0",
  "author": "Negative Space Software"
}
```

### `about` command
Must display `License: Apache License 2.0` in magenta (see §8).

---

## 11. Publishing to npm

### Pre-publish checklist
- [ ] `package.json` has `name`, `version`, `description`, `bin`, `license: "Apache-2.0"`, `author: "Negative Space Software"`
- [ ] `bin` points to `./src/index.js`
- [ ] `src/index.js` starts with `#!/usr/bin/env node` (no leading whitespace, no BOM)
- [ ] `LICENSE` exists in project root
- [ ] All `.js` files have license headers
- [ ] `README.md` covers install, commands, auth (if any)
- [ ] `.npmignore` excludes `node_modules/`, `.env`, `.DS_Store`, scratch files
- [ ] `logo.png` is in project root (for `about`)
- [ ] App tested via `npm install -g .` from project directory

### Publish flow
```bash
# Verify what will be published
npm pack --dry-run

# Test global install locally
npm install -g .
{bin-name} about        # should show logo + version + license
{bin-name} --help       # should list all commands

# Publish (use --access public for scoped packages)
npm publish

# Tag the release in git
git tag v1.0.0 && git push --tags
```

### Version bumps
- Patch (`1.0.1`): bug fixes, no command/config changes
- Minor (`1.1.0`): new commands or options, backward-compatible
- Major (`2.0.0`): renamed commands, changed config keys, removed flags

---

## 12. Implementation Checklist

For a brand-new NSS CLI:

**Setup**
- [ ] `package.json` with correct name, bin, license, author, dependencies pinned per §4
- [ ] Project skeleton from §2
- [ ] `LICENSE` (Apache 2.0)
- [ ] `.gitignore` and `.npmignore`
- [ ] `logo.png` in project root

**Code**
- [ ] `src/index.js` with shebang, license header, Commander setup, default command
- [ ] `src/utils/config.js` storing in `~/.{app-name}/.env`
- [ ] `src/utils/errors.js` with `displayError` (never truncates)
- [ ] `src/ui/select.js` with `select` + `confirm` + domain wrappers
- [ ] `src/ui/display.js` following §5 conventions
- [ ] `src/commands/about.js` per §8
- [ ] `src/commands/auth.js` per §9 (if applicable)
- [ ] License header on every `.js` file

**Behavior**
- [ ] All errors show full stack traces
- [ ] Time displays in 24h format
- [ ] No emojis anywhere — text icons only
- [ ] Inquirer prompts use `pageSize: 15`
- [ ] `requireAuth` called at top of every authenticated command
- [ ] User cancellation (null from prompt) handled with early return
- [ ] Empty states use yellow `[!]` not red `[X]`

**Pre-publish**
- [ ] `npm install -g .` works
- [ ] All commands work from a directory other than the project
- [ ] `about` displays logo, version, license, author
- [ ] `--help` lists every command with a description
- [ ] `npm pack --dry-run` shows only intended files

---

## Appendix: Common Pitfalls

1. **Chalk colors not rendering** → using chalk 5.x. Downgrade to `^4.1.2`.
2. **`require('inquirer')` throws** → using inquirer 9.x. Downgrade to `^8.2.7`.
3. **`require('open')` throws** → using open 9+. Downgrade to `^8.4.2`.
4. **Config doesn't persist across directories** → storing `.env` in project dir instead of `~/.{app-name}/`.
5. **`bin` doesn't run after `npm install -g`** → missing shebang on `src/index.js`, or shebang has leading whitespace/BOM.
6. **ASCII logo prints garbage** → terminal doesn't support color; pass `color: false` to `asciify-image` or check `process.stdout.isTTY`.
7. **Errors are mysteriously short** → someone added truncation. Remove it. Always show the full stack.
