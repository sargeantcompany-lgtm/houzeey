# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with HMR (http://localhost:5173)
npm run build      # Production build to dist/
npm run preview    # Preview production build locally
npm run lint       # Run ESLint
```

## Architecture

This is a React 19 + Vite 7 single-page application using JavaScript (not TypeScript).

- **Entry point**: `src/main.jsx` mounts the React app into `index.html`
- **Root component**: `src/App.jsx`
- **Styling**: Plain CSS files co-located with components (`App.css`, `index.css`)
- **Static assets**: `public/` for root-served files, `src/assets/` for imported assets

## ESLint Configuration

- Targets `**/*.{js,jsx}` files
- Uses `eslint-plugin-react-hooks` (enforces hooks rules) and `eslint-plugin-react-refresh` (Vite HMR compatibility)
- `no-unused-vars` error is suppressed for identifiers matching `^[A-Z_]` (components and constants)
