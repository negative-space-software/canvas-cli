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

/**
 * Generic terminal-output primitives shared across NSS CLIs.
 * Domain-specific renderers live in display.js.
 */

/**
 * Get terminal width, with fallback to 80
 */
function getTerminalWidth() {
  return process.stdout.columns || 80;
}

/**
 * Truncate text to fit within maxLength, adding ellipsis if needed
 */
function truncate(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  if (maxLength <= 3) return '...'.slice(0, maxLength);
  return text.slice(0, maxLength - 3) + '...';
}

module.exports = {
  getTerminalWidth,
  truncate
};
