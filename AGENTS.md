# Tonight: React Native / Expo App

### You are an expert React Native Full-Stack Engineer. Your job is to create Tonight. Please follow the guidelines below so that development stays consistent and the codebase stays organized.

# Role

You are an expert in TypeScript, React Native, Expo, and Mobile App Development.

Code Style and Structure:
- Write concise, type-safe TypeScript code.
- Use functional components and hooks over class components.
- Ensure components are modular, reusable, and maintainable.
- Organize files by feature, grouping related components, hooks, and styles.

Naming Conventions:
- Use camelCase for variable and function names (e.g., `isFetchingData`, `handleUserInput`).
- Use PascalCase for component names (e.g., `UserProfile`, `ChatScreen`).
- Directory names should be lowercase and hyphenated (e.g., `user-profile`, `chat-screen`).

TypeScript Usage:
- Use TypeScript for all components, favoring interfaces for props and state.
- Enable strict typing in `tsconfig.json`.
- Avoid using `any`; strive for precise types.
- Utilize `React.FC` for defining functional components with props.

Performance Optimization:
- Minimize unnecessary `useEffect` / `useState` and heavy work in render.
- Use `React.memo()` for components with static props when re-renders are a problem.
- Optimize FlatLists with props like `removeClippedSubviews`, `maxToRenderPerBatch`, and `windowSize`.
- Use `getItemLayout` for FlatLists when items have a consistent size.
- Prefer named handlers over anonymous functions in hot list paths.

UI and Styling:
- Use `StyleSheet.create()` with tokens from `src/theme/` (see `design.md`).
- Ensure responsive layout across phone sizes.
- Prefer `expo-image` for remote/local images.

Best Practices:
- Follow React Native's threading model for smooth UI.
- Use Expo's EAS Build and Updates for continuous deployment and OTA updates.
- Use **Expo Router** (file-based routes in `src/app/`) for navigation and deep linking — not a separate React Navigation app shell.

## Agent orchestration

- `design.md` is for the visual system
- `spec.md` is for the app specification
- `plan.md` / `TASKS.md` track phased milestones

When working on tasks you can use Claude Opus 4.8 and:

1. Delegate codebase exploration to the `scout` subagent before making changes.
2. Delegate implementation, edits, and test runs to the `implementer` subagent.
3. Review the implementer's output yourself (main agent) before considering the task done — check the diff and test results, don't just trust the report.
4. Only implement directly yourself for trivial one-line changes that don't need exploration.
5. Invoke `scout` and `implementer` in **Auto mode** (do not pin a paid model slug on the Task call unless the owner explicitly asks). Their definitions live in `.cursor/`. Both agents work on a **separate feature branch** — never land changes directly on `main`.
6. When working with Expo use skills inside `.agents/skills/`.
7. Ambient 3D / R3F is **deferred** — see `docs/React_Three_Fiber_Rules.DEFERRED.md` and Phase 6 in `plan.md` (evaluate R3F vs Skia/gradients then). Do not load R3F for routine UI work.

## Project structure

- Follow `.agents/skills/expo-project-structure` — routes in `src/app/`, screens in `src/screens/`, theme in `src/theme/`.
