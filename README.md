# No-Code Studio

A visual, drag-and-drop builder for websites and small web apps. You design pages on a canvas, connect them to data with variables and actions, preview them live, and export a single HTML file that you can host anywhere. You don't write any code.

## Features

- **Drag-and-drop canvas**: drag components or whole blocks onto the page, reorder them by dragging, and double-click text to edit it in place.
- **20 components**: sections, boxes, columns, cards, headings, text, buttons, links, images, video (YouTube, Vimeo, MP4), lists, dividers, spacers, inputs, text areas, checkboxes, dropdowns and a data **repeater**.
- **Ready-made blocks**: navbar, hero, features, stats, pricing, testimonial, gallery, FAQ, contact form, call to action and footer.
- **Visual styling**: layout (direction, alignment, gap, wrap), spacing, size, typography, backgrounds and gradients, borders and shadows. A project-wide theme sets colors, font and corner radius.
- **Responsive design**: preview at desktop, tablet and mobile widths. Columns stack on phones, and any element can be hidden per device.
- **Multiple pages**, each with its own URL path and browser-tab title.
- **Data and logic, without code**
  - *Variables* (text, number, true/false, lists/objects).
  - *Bindings*: write `{{ expression }}` in any text, URL or style value.
  - *Form fields* that save what the user types into a variable.
  - *Actions* on click, on Enter, or when a page loads: go to page, open URL, set variable, add to number, toggle, add/remove list items, show a message, or **call an API** and store the response. Each action can have an "only if" condition.
  - *Conditional visibility*: show an element only when an expression is true.
  - *Repeater*: render a list of items, using `{{item.field}}` and `{{index}}` inside.
- **Live preview** where every action, variable and page link works.
- **Export** to a self-contained `.html` file with every page, plus JSON backup and import.
- **Undo/redo**, copy/paste, duplicate, a layers tree and keyboard shortcuts.
- **Autosave**: projects are saved in the browser's local storage as you edit.
- **Starter templates**: business website, portfolio, task app, and an API-driven team directory.

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev        # open http://localhost:5173
```

Other scripts:

| Command             | What it does                                     |
| ------------------- | ------------------------------------------------ |
| `npm run build`     | Type-check and build the production app to `dist/` |
| `npm run preview`   | Serve the production build                       |
| `npm test`          | Run the test suite (Vitest + happy-dom)          |
| `npm run typecheck` | TypeScript only                                  |
| `npm run lint`      | Lint with oxlint                                 |

The built app in `dist/` is static, so you can deploy it to any static host (GitHub Pages, Netlify, Vercel, S3, …).

## Using the builder

1. **Create a project** from a template or a blank page.
2. **Add content**: drag items from the *Add* panel onto the canvas, or click an item to insert it after the current selection.
3. **Edit**: select an element and use the inspector on the right. The *Content*, *Style*, *Actions* and *Advanced* tabs hold its settings. Double-click headings, text and links to edit them in place.
4. **Add data**: create variables in the *Data* panel. Show them with `{{name}}` and change them with actions.
5. **Preview** to try the site for real, then use **Export → Website (.html)** to publish it.

### Expressions

Expressions are written inside `{{ }}` in text, or used directly in conditions. They support:

- variables and paths: `user.name`, `todos.0.title`, `todos[index].done`, `items.length`
- arithmetic: `price * quantity`, `count + 1`
- comparison and logic: `email != ''`, `count >= 3 && !done`
- the ternary operator: `done ? 'Completed' : 'Open'`

Expressions are evaluated by a small built-in interpreter, never with `eval`.

### Example: a to-do list

- Variables: `newTodo` (text) and `todos` (JSON, `[]`).
- An **Input** saves its value to `newTodo`.
- An **Add** button runs two actions:
  1. *Add item to list* `todos` with item `{"title": "{{newTodo}}", "done": false}`, only if `newTodo != ''`.
  2. *Set variable* `newTodo` to an empty value.
- A **Repeater** over `todos` contains a **Checkbox** bound to `todos.{{index}}.done` with the label `{{item.title}}`.

The *Task app* template is this exact app.

## How it works

```
src/
  runtime/   Framework-free renderer and app runtime (no React)
    types.ts       Project model: pages, node tree, variables, actions, theme
    expression.ts  Safe expression parser/evaluator and {{ }} templates
    render.ts      Node tree → DOM, used for the canvas, preview and exports
    app.ts         Live runtime: state, actions, routing (hash or in-memory)
    theme.ts       Runtime CSS and theme variables
    standalone.ts  Entry for the bundle embedded in exported sites
  editor/    Editor logic (no UI)
    registry.ts    Component metadata: defaults, inspector fields, events
    blocks.ts      Prebuilt sections
    templates.ts   Starter projects
    store.ts       Zustand store with undo/redo history
    operations.ts  Editing commands (add, move, duplicate, pages, variables…)
    storage.ts     localStorage persistence and import validation
    exporter.ts    HTML/JSON export
  ui/        React components for the editor and dashboard
```

The canvas, the preview and the exported site all use the same renderer (`src/runtime/render.ts`), so the canvas matches what gets published. The canvas renders in *design* mode, which adds selection hooks and turns off behaviour. The preview and exported sites render in *live* mode.

To export, the build compiles `src/runtime/standalone.ts` into a small standalone script (about 9 KB gzipped) through the `virtual:nocode-runtime` module in `vite.config.ts`. Export inlines that script and the project JSON into one HTML file. Pages are reachable at `#/path` URLs.

## Limitations

- Projects live in your browser's local storage. Use **Export → Project backup** to move them between browsers or machines.
- There are no user accounts, server-side database or hosting service. Publishing means exporting an HTML file and uploading it to a host.
- The *Call an API* action runs in the visitor's browser, so the API must allow cross-origin requests (CORS).
