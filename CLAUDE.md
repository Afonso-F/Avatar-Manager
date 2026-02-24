# CLAUDE.md — Avatar-Manager

This file provides context, conventions, and guidance for AI assistants (and human contributors) working in this repository.

## Project Overview

**Avatar-Manager** is a project owned by [Afonso-F](https://github.com/Afonso-F). As of the initial commit, the codebase is in its bootstrapping phase — no source code, dependencies, or configuration exist yet beyond a standard `.gitattributes` file.

This document will grow alongside the codebase. Update it whenever new conventions, dependencies, or architectural decisions are introduced.

---

## Current Repository State

| Aspect | Status |
|---|---|
| Source code | None yet |
| Package manager / dependencies | Not configured |
| Test framework | Not configured |
| Build system | Not configured |
| CI/CD | Not configured |
| Linting / formatting | Not configured |
| Documentation | This file only |

---

## Repository Structure

```
Avatar-Manager/
├── .gitattributes      # Git line-ending normalization (text=auto)
└── CLAUDE.md           # This file
```

Add new entries here as the project grows.

---

## Git Workflow

### Branches

| Branch | Purpose |
|---|---|
| `master` | Primary / stable branch |
| `claude/<session-id>` | AI-assisted feature or documentation branches |

### Commit Conventions

Use clear, imperative commit messages:

```
Add user avatar upload endpoint
Fix avatar deletion not removing file from storage
Refactor avatar resizing logic into shared utility
```

- Keep the subject line under 72 characters.
- Use the body to explain *why*, not *what*, for non-obvious changes.
- Reference issue numbers when applicable: `Closes #42`.

### Push Workflow

```bash
# Push a branch and set its upstream in one step
git push -u origin <branch-name>
```

Claude-session branches follow the naming convention:

```
claude/claude-md-<session-suffix>
```

---

## Development Guidelines (To Be Established)

The sections below are placeholders. Fill them in once the technology stack and workflows are decided.

### Language & Runtime

> _Not yet decided. Update this section once a language/runtime is chosen._

### Package Management

> _Not yet decided. Common choices: `npm`/`pnpm` (Node.js), `pip`/`uv` (Python), `cargo` (Rust), etc._

### Running the Project

> _To be documented once a dev server or entry point exists._

### Running Tests

> _To be documented once a test framework is configured._

### Linting & Formatting

> _To be documented once linters/formatters are configured._

### Environment Variables

> _List required environment variables here, e.g.:_
>
> ```
> # .env.example
> DATABASE_URL=
> STORAGE_BUCKET=
> ```
>
> Never commit secrets. Use `.env` locally and the appropriate secrets manager in production.

---

## AI Assistant Instructions

When working in this repository, AI assistants (Claude and others) should:

1. **Read this file first** before making any changes.
2. **Update this file** when adding new dependencies, introducing new conventions, or changing the project structure.
3. **Work on the correct branch**: always develop on the designated `claude/<session-id>` branch, not directly on `master`.
4. **Commit atomically**: one logical change per commit. Avoid giant "WIP" commits.
5. **Do not add speculative code**: only implement what is explicitly requested. Avoid adding features, abstractions, or error-handling for scenarios that don't exist yet.
6. **Do not create files unless necessary**: prefer editing existing files when extending functionality.
7. **Document new conventions here**: if you establish a pattern (naming, folder layout, testing approach), add it to this file so future sessions inherit the decision.

---

## Contact

- Repository owner: **Afonso-F** (`afonsoferreira212@gmail.com`)
