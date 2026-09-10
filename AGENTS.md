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

## Plan and Issue Tracking

### plan.md
`plan.md` is the source of truth for project progress.

- Before starting work, read `plan.md` to understand the current milestone.
- Work on the current incomplete milestone before moving to later milestones.
- When a milestone is fully completed and verified, mark it as complete in `plan.md`.
- Do not mark a milestone complete if it only partially works.
- If an issue blocks progress, document it in `issues.md`.

### issues.md
`issues.md` is the source of truth for development issues and attempted solutions.

Whenever you encounter an error, unexpected behavior, blocker, or failed implementation:

1. Check `issues.md` for the same or similar issue.
2. Record the issue before attempting fixes.
3. Record each solution attempt and whether it worked or failed.
4. Do not repeat a solution that has already failed unless there is a specific reason to try it again.
5. If a solution fails, explain why it failed when possible.
6. If a solution works, record the successful solution and update `plan.md` if the related milestone is now complete.
7. Keep issue entries concise and focused on useful information for future agents.

### Issue Entry Format

Each issue should contain:

- Location: where the issue occurs
- Problem: what is happening
- Suspected cause: why the agent thinks it is happening
- Attempts: every solution that has been tried
- Result: whether the attempt succeeded or failed
- Current status: unresolved, resolved, or blocked
- Next step: what should be tried next

Before attempting a fix, always review previous attempts in `issues.md` to avoid repeating failed approaches.

## Project structure

- Follow `.agents/skills/expo-project-structure` — routes in `src/app/`, screens in `src/screens/`, theme in `src/theme/`.
