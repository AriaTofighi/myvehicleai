# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router (pages, layout, global styles).
- `components/ui/`: Shadcn UI components; files are lowercase, exports are PascalCase (e.g., `button.tsx` exports `Button`).
- `lib/`: Utilities (e.g., `lib/utils.ts`).
- `public/`: Static assets.
- `docs/`: Internal documentation.
- Aliases: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils` (see `tsconfig.json` and `components.json`).

## Build, Test, and Development Commands

- `npm run dev`: Start dev server with Turbopack at `http://localhost:3000`.
- `npm run build`: Production build using Turbopack.
- `npm run start`: Start the production server (after build).
- `npm run lint`: Run ESLint (Next.js + TypeScript config).
- Shadcn: `npx shadcn@latest add <component>` to add UI components.

## Coding Style & Naming Conventions

- Language: TypeScript (strict mode), React 19, Next.js 15 App Router.
- Imports use path aliases (`@/...`). Prefer absolute over relative when possible.
- Files: component files lowercase (e.g., `button.tsx`), exported components PascalCase.
- Formatting: follow existing style (double quotes, no semicolons). Run `npm run lint` before PRs.
- Styling: Tailwind CSS v4 in `app/globals.css`; prefer utility classes, compose variants via `class-variance-authority` and `cn()` from `lib/utils`.

## Commit & Pull Request Guidelines

- Commits: current history is free-form. Prefer Conventional Commits going forward (e.g., `feat: add vehicle card`, `fix(ui): button focus ring`).
- PRs: include clear description, linked issue, and screenshots/GIFs for UI changes. Ensure `npm run lint` passes and avoid unrelated diffs.
- Small, focused PRs are favored. Reference paths (e.g., `app/page.tsx`) when describing changes.

## Security & Configuration Tips

- Secrets: use environment files (`.env.local`) for local secrets; do not commit them.
- ESLint ignores `node_modules`, `.next`, and build outputs; keep generated artifacts out of PRs.
- Tailwind/PostCSS is configured via `postcss.config.mjs`; theme tokens live in `app/globals.css`.
