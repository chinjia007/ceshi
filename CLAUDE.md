# CLAUDE.md — AI Assistant Guide for ceshi

This file provides context for AI assistants working on this repository.

---

## Project Overview

**神奇喵喵AI聚合平台** (Magic Meow AI Aggregation Platform) is a static single-page web application that displays up to four Chinese AI chat tools simultaneously in a 2×2 grid layout. Users can select which AI tools to load in each pane via dropdown menus.

- **Type**: Static frontend-only SPA (no backend, no build step)
- **Languages**: HTML, CSS, Vanilla JavaScript
- **Entry point**: `神奇喵喵AI聚合平台/ai-tools-dashboard/index.html`
- **No framework, no package manager, no bundler**

---

## Repository Structure

```
ceshi/
├── CLAUDE.md                             # This file
├── README.md                             # Minimal root readme
└── 神奇喵喵AI聚合平台/
    └── ai-tools-dashboard/
        ├── README.md                     # Project documentation (Chinese)
        ├── index.html                    # Full application markup + inline styles
        ├── script.js                     # All application logic (~1,554 lines)
        └── styles.css                    # All styles (~1,339 lines)
```

---

## Running the Application

There is no build step. Open the HTML file directly in a browser:

```bash
# Option 1: Open directly
open 神奇喵喵AI聚合平台/ai-tools-dashboard/index.html

# Option 2: Serve with any static server
npx serve 神奇喵喵AI聚合平台/ai-tools-dashboard/
python3 -m http.server 8080 --directory 神奇喵喵AI聚合平台/ai-tools-dashboard/
```

**No `npm install`, no compilation, no environment variables required.**

---

## External Dependencies (CDN only)

| Library | Version | URL |
|---------|---------|-----|
| Font Awesome | 6.4.0 | `cdnjs.cloudflare.com` |
| Google Fonts | — | Noto Sans SC family |

Do **not** add npm/pip packages. All dependencies must be loaded via CDN `<link>` or `<script>` tags in `index.html`.

---

## Code Architecture

### `index.html`
- Houses the full HTML skeleton, grid layout, sidebar, and dropdowns
- Contains inline `<style>` block for critical above-the-fold styles
- Four dropdown selectors: `#tool1` through `#tool4`
- Four grid windows: `#window1` through `#window4`, each containing an iframe `#iframe1`–`#iframe4`

### `script.js`
All logic is initialised in a single `DOMContentLoaded` listener that calls:

| Function | Responsibility |
|----------|---------------|
| `initPixelCat()` | Animated pixel-art cat mascot in the sidebar |
| `initLayoutControls()` | Layout switching (2×2, 1×2, 2×1, single) |
| `initWindowControls()` | Per-window refresh / fullscreen / close / split buttons |
| `initToolSelectors()` | Handles dropdown changes, loads AI tools into iframes |
| `initZoomControls()` | Zoom in/out for individual panes |
| `initDefaultTools()` | Sets the four default tools on first load |
| `initUnifiedControls()` | Global panel controls |

Key helper functions:
- `retryLoadTool(windowId)` — shows retry dialog after 30-second iframe timeout
- `showToolLoading(windowId)` — cat-paw loading animation during iframe fetch

### `styles.css`
- CSS custom properties (`--primary`, `--accent`, etc.) define the colour scheme
- CSS Grid powers the 2×2 layout; breakpoints adjust for smaller viewports
- Extensive `@keyframes` blocks for cat animations and loading states
- All selectors use kebab-case BEM-style classes (`.window-header`, `.cat-paws-container`)

---

## Supported AI Tools

| Display Name | URL |
|---|---|
| 元宝 (Yuanbao) | `https://yuanbao.tencent.com/chat/` |
| 豆包 (Doubao) | `https://www.doubao.com/chat/` |
| Kimi | `https://kimi.moonshot.cn/` |
| ChatGLM | `https://chatglm.cn/chat` |
| MetaSo | `https://metaso.cn/` |
| Kling AI | `https://klingai.kuaishou.com/` |

To add a new tool, add an `<option>` to each `<select>` in `index.html` and (optionally) a corresponding icon entry in `script.js`'s tool config map.

---

## Conventions

### Naming
| Context | Convention | Example |
|---------|-----------|---------|
| HTML IDs | `camelCase` or sequential suffix | `tool1`, `window2`, `iframe3` |
| CSS classes | `kebab-case` | `.grid-container`, `.window-header` |
| JS functions | `camelCase` | `initToolSelectors`, `showToolLoading` |
| JS variables | `camelCase` | `iframeContainer`, `windowId` |
| Data attributes | `data-<noun>` | `data-window="1"` |

### Language
- **UI text and code comments**: Simplified Chinese
- **Identifiers (variables, functions, CSS classes)**: English

### Error Handling
- Wrap all cross-origin `iframe.contentWindow` access in `try/catch` — browsers block this for third-party domains
- Use the 30-second timeout pattern already in `initToolSelectors()` for any new iframe loading

### Style Guidelines
- Keep all styles in `styles.css`; avoid inline `style=""` attributes except for dynamically set values via JS
- Prefer CSS custom properties for any new colour or spacing values
- Match the existing cat/paw animation aesthetic for any new loading states

---

## Testing

There are **no automated tests**. Manual testing:
1. Open `index.html` in Chrome/Edge (recommended) or Firefox
2. Select different AI tools from each dropdown and verify iframes load
3. Test window controls: refresh, fullscreen, close, layout toggle
4. Verify the pixel cat animation renders in the sidebar

---

## Git Workflow

- **Main branch**: `master` (tracks `origin/main`)
- **Feature branches**: `claude/<description>-<session-id>` (e.g. `claude/add-claude-documentation-l0g8m`)
- Commit messages should be descriptive English sentences
- Push with: `git push -u origin <branch-name>`

---

## Key Constraints for AI Assistants

1. **Do not introduce a build system** — the project is intentionally zero-dependency at the tooling level.
2. **Do not add a backend** — all AI tools are loaded via iframe; there is no server-side component.
3. **Respect cross-origin limitations** — iframes load third-party domains; JS cannot read their DOM.
4. **Keep the cat theme** — the pixel cat mascot and paw animations are intentional design elements, not clutter.
5. **Chinese UI text** — any new user-facing strings should be written in Simplified Chinese to match the existing UX.
6. **No test framework needed** — do not add Jest, Vitest, or similar unless explicitly requested.
