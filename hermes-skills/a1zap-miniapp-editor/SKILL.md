---
name: a1zap-miniapp-editor
description: Build, edit, preview, and publish A1Zap mini apps through the a1zap CLI.
version: 1.0.0
author: A1Zap
license: MIT
platforms: [macos, linux, windows]
metadata:
  hermes:
    tags: [Development, A1Zap, MiniApps, CLI, React]
    config:
      - key: a1zap.workspace
        description: Optional local workspace path for pulled A1Zap mini apps.
        default: "~/a1zap-apps"
        prompt: A1Zap workspace path
required_environment_variables:
  - name: A1ZAP_API_KEY
    prompt: A1Zap developer API key
    help: Use this for authenticated a1zap CLI commands without storing the key in command history.
    required_for: listing, pulling, and pushing user mini apps
  - name: A1ZAP_ADMIN_API_KEY
    prompt: A1Zap admin API key
    help: Optional; only needed for a1zap-admin create, copy, attach, and update workflows.
    required_for: admin mini app workflows
---
# A1Zap Mini App Editor

## When to Use

Use this skill when the user wants to create, inspect, edit, preview, or publish an A1Zap mini app, or asks about the `a1zap` / `a1zap-admin` CLI.

Prefer the CLI plus local files. Do not build a custom Hermes tool unless the task needs Hermes-native auth flows, binary streaming, or real-time integration beyond shell commands.

## Quick Reference

| Task | Command |
| --- | --- |
| Check install | `a1zap --help` |
| Install CLI on macOS/Linux | `curl -fsSL https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install.sh \| bash` |
| Install CLI on Windows PowerShell | `irm https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install.ps1 \| iex` |
| Show config | `a1zap config` |
| List apps | `a1zap list` |
| Pull app with agent docs | `a1zap pull @handle --agent-docs` |
| Pull into current directory | `a1zap pull @handle --here --agent-docs` |
| Start preview | `a1zap dev @handle -p 4321` |
| Print local app path | `a1zap open @handle` |
| Push changes | `a1zap push @handle -m "message"` |
| Install admin CLI | `curl -fsSL https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install-admin.sh \| bash` |
| Admin create | `a1zap-admin create handle --name "Name"` |
| Admin copy | `a1zap-admin copy @source new-handle` |
| Admin attach | `a1zap-admin attach @handle --community-handle community --status approved` |

## Environment

The CLI can authenticate from environment variables or saved config.

- Prefer `A1ZAP_API_KEY` in Hermes sessions. Hermes can pass this secret to terminal commands without exposing the raw value to the model.
- Use `A1ZAP_ADMIN_API_KEY` only for admin workflows.
- Set `A1ZAP_WORKSPACE` when the user wants a non-default app workspace.
- If Hermes injects `a1zap.workspace` skill config, use that value as `A1ZAP_WORKSPACE` for CLI commands.
- Set `A1ZAP_API_URL` only for staging or custom backends.

If env auth is unavailable, ask the user to configure the CLI outside the chat or run `a1zap config "<api-key>"` only when they explicitly provide the key.

## Procedure

1. Check that Node.js 18+ and the CLI are available with `node --version` and `a1zap --help`.
2. If `a1zap` is missing, tell the user the install command. Run the installer only when the user asked you to set up the machine.
3. Confirm authentication with `a1zap config` or a harmless `a1zap list`.
4. For existing apps, pull with `a1zap pull @handle --agent-docs` unless the user wants a specific directory. Use `--here` or `--dir <path>` when appropriate.
5. Open the local app folder with `a1zap open @handle`, then inspect `AGENTS.md` and the relevant files in `agent-docs/` before editing.
6. Preserve the existing app's visual identity unless the user explicitly asks for a redesign.
7. Use `a1zap dev @handle -p <port>` for local preview and hot reload.
8. Before `a1zap push`, summarize the changes and ask for confirmation because push updates the remote A1Zap app.

## Mini App Coding Guidance

Pulled apps usually contain:

```text
a1zap.json
App.tsx
styles.css
AGENTS.md
agent-docs/
```

Read `AGENTS.md` first. It is the compact routing guide for the larger runtime references. Only load deep references from `agent-docs/` when the change touches that capability, such as AI, uploads, maps, sharing, security, games, data, or themes.

For implementation work:

- Keep app state compatible with the A1Zap runtime props.
- Do not add client-side secrets.
- Use platform bridges described in `agent-docs/` instead of browser APIs that are blocked in the sandbox.
- If the app already works visually, integrate new platform features into the current layout before changing the design.

## Admin Workflows

Use `a1zap-admin` for platform/admin operations:

- `create` creates a new mini app record and pulls it locally by default.
- `copy` duplicates another app into a new handle.
- `attach` adds an existing app to a community.
- `update` is an admin alias for `push`.

Ask before running admin commands that create, copy, attach, change publication status, or push remote changes.

## Pitfalls

- Missing auth: use `A1ZAP_API_KEY` / `A1ZAP_ADMIN_API_KEY` in Hermes, or ask the user to run `a1zap config`.
- Wrong workspace: check `a1zap config` and `a1zap open @handle`; use `A1ZAP_WORKSPACE` or `a1zap config --workspace <path>` if needed.
- Existing local app: `a1zap pull @handle --agent-docs` refreshes docs only. Use `--force` only when intentionally overwriting local app files.
- Dev server port conflict: retry with `a1zap dev @handle -p 4322` or another free port.
- Remote side effects: `push`, admin `create`, `copy`, `attach`, and publication changes should not run without user confirmation.

## Verification

After setup or edits, verify with the smallest useful command:

- CLI setup: `a1zap --help` and `a1zap config`
- Auth/listing: `a1zap list`
- Local app path: `a1zap open @handle`
- Preview: `a1zap dev @handle -p 4321`, then inspect the browser preview
- Before publish: review changed files, run the preview, and confirm the push message with the user
