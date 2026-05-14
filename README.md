# a1zap-miniapp-editor

CLI tool for local development of A1Zap MicroApps.

## Quick Install (Recommended)

### macOS / Linux

Copy and paste this into your terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install.sh | bash
```

Then restart your terminal and configure your API key:

```bash
a1zap config "your-api-key"
```

Run `a1zap list` to see your apps.

### Windows (PowerShell)

You only need one command at a time.

This setup installs the CLI tool. It does not publish anything or change your live app by itself.

Before you start, install Node.js 18 or newer from [nodejs.org](https://nodejs.org).

If you already have Node installed, keep going with the steps below.

1. Open PowerShell from the Start menu.
2. Install the CLI:

```powershell
irm https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install.ps1 | iex
```

3. Open a fresh PowerShell window so the updated PATH is loaded.
4. Connect the CLI to your account:

```powershell
a1zap config "your-api-key"
```

5. Check that it worked:

```powershell
a1zap list
```

Optional next step:

```powershell
a1zap create hello-world --name "Hello World"
```

Need a fallback install?

```powershell
npm install -g a1zap-miniapp-editor
```

---

## Admin CLI

For admin workflows like creating, copying, attaching, pulling, and updating mini apps with a separate workspace, install the dedicated `a1zap-admin` binary:

```bash
curl -fsSL https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install-admin.sh | bash
```

On Windows:

```powershell
irm https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install-admin.ps1 | iex
```

Then configure it separately:

```bash
a1zap-admin config "your-api-key"
```

`a1zap-admin` stores its config in `~/.a1zap-admin/config.json` on macOS/Linux and `%USERPROFILE%\.a1zap-admin\config.json` on Windows, uses `~/a1zap-admin-apps` by default on macOS/Linux and `%USERPROFILE%\a1zap-admin-apps` on Windows, and adds `a1zap-admin update` as an alias for `push`.

<details>
<summary>Alternative: Install via npm</summary>

```bash
npm install -g a1zap-miniapp-editor
```

</details>

## Setup

Configure your API key:

```bash
a1zap config "your-developer-api-key"
```

The API key is stored in `~/.a1zap/config.json` on macOS/Linux and `%USERPROFILE%\.a1zap\config.json` on Windows.

On the first successful `a1zap config`, the CLI also pulls all of your remote apps into the local workspace automatically. Existing local apps are left alone.

## Commands

### List Apps

List all available apps with their local status:

```bash
a1zap list
```

Output shows which apps are pulled locally and if they're outdated:

```
  Remote Apps                          Local
  ──────────────────────────────────────────────
  @sit-stay-board      v12             [pulled]
  @pet-tracker         v5              [pulled] (outdated v3)
  @new-app             v1              -

  Local apps: ~/a1zap-apps/
```

### Pull an App

Download an app to your local workspace:

```bash
a1zap pull @my-app
# or without the @:
a1zap pull my-app
# or by ID:
a1zap pull xs726ffzxzmra3rawxqbtgmryh7zge0s
```

Apps are stored in `~/a1zap-apps/<handle>/` on macOS/Linux and `%USERPROFILE%\a1zap-apps\<handle>\` on Windows.

Every pull includes local agent docs for Codex, Cursor, and other coding agents. The CLI copies `agent-docs/` into the app folder and creates a small root `AGENTS.md` entrypoint that tells agents to read the deep guides only when the change touches that area.

If the app already exists locally, `a1zap pull @my-app` refreshes only the docs and leaves `App.tsx`, `styles.css`, and `a1zap.json` untouched. Use `--merge` to safely bring in newer remote code, or `--force` when you intentionally want to replace local app files.

### Safely Update an Existing Local App

If `a1zap list` shows an app is outdated, use merge mode:

```bash
a1zap pull --merge @my-app
```

`--merge` keeps your local edits, brings in newer remote files when it can do so safely, and stops without changing app files if the same file changed in both places. When that happens, it writes a conflict package under `.a1zap/conflicts/` with `base`, `local`, and `remote` folders, plus a `flagged-files/` folder with easy snapshots such as `LOCAL_v3_App.tsx` and `REMOTE_v5_App.tsx`. Give that folder to Codex or another editor and ask it to resolve the conflict.

`a1zap push` also checks the remote version before publishing. If your local copy is behind, it stops and tells you to run `a1zap pull --merge @my-app` instead of overwriting newer work.

### Create a Template App (Admin)

Create a hello-world template mini app:

```bash
# If you're using a user-scoped Developer API key:
a1zap-admin create my-new-app --name "My New App"

# Use owner handle
a1zap-admin create my-new-app --owner alice --name "My New App"

# Or use owner user ID / Stack Auth ID
a1zap-admin create my-new-app --owner-id <userId>
a1zap-admin create my-new-app --owner-stack-auth-id <stackAuthUserId>

# Create using local App.tsx as template code
a1zap-admin create my-new-app --copy ./my-template/App.tsx

# Create using another mini app's code as template
a1zap-admin create my-new-app --copy @source-app
```

Create and auto-attach to a community:

```bash
a1zap-admin create my-new-app --owner alice --community-handle stanford --community-status approved
```

Useful options:
- `--publication draft|private|unlisted|public|community_only`
- `--community-description "Custom copy for this community"`
- `--featured`
- `--copy <path|@handle|id>` (use local App.tsx or another mini app's code as template)
- pulls locally by default (use `--no-pull` to skip)
- `--force` (when pull is enabled)

### Attach Existing App to a Community

Attach an existing app by handle or ID:

```bash
a1zap-admin attach @my-new-app --community-handle stanford --status approved
```

Useful options:
- `--status pending|approved`
- `--publication draft|private|unlisted|public|community_only`
- `--community-description "Custom copy for this community"`
- `--featured`

### Copy an Existing App

Copy an app into a brand-new app record:

```bash
# Copy by handle, keep same owner by default
a1zap-admin copy @source-app copied-app-handle

# Copy to a different owner and attach to a community
a1zap-admin copy @source-app copied-app-handle --owner pasha --community-handle unsw --community-status approved
```

Useful options:
- `--owner <handle>` (or `--owner-id`, `--owner-stack-auth-id`)
- `--publication draft|private|unlisted|public|community_only`
- `--community-handle` / `--community-id`
- `--community-status pending|approved`
- `--community-description "Custom copy for this community"`
- `--featured`
- pulls locally by default (use `--no-pull` to skip)

### Start Development Server

Start the dev server with hot reload:

```bash
# By handle (from anywhere):
a1zap dev @my-app

# Or from inside an app folder (macOS/Linux):
cd ~/a1zap-apps/my-app
a1zap dev

# PowerShell:
Set-Location ~/a1zap-apps/my-app
a1zap dev

# Custom port:
a1zap dev @my-app -p 3000
```

The dev server provides:
- Live preview at http://localhost:4321
- Hot reload on file changes
- Mock user context for testing
- A Load JSON popup for injecting local `data`, `sharedData`, `myPersonalData`, or a full runtime fixture into the browser preview

### Push Changes

Push your local changes back to A1Zap:

```bash
# By handle (from anywhere):
a1zap push @my-app -m "Fixed button styling"

# Or from inside an app folder:
a1zap push -m "Updated layout"

# Admin alias:
a1zap-admin update @my-app -m "Admin refresh"
```

### View and Revert Versions

List published versions:

```bash
a1zap versions @my-app
# or from inside an app folder:
a1zap versions
```

Revert the live app to an earlier published version:

```bash
a1zap revert @my-app v12 -m "Revert to stable v12"
# or from inside an app folder:
a1zap revert v12
```

Reverting publishes the selected version as a new latest version, so version numbers keep moving forward. If you have a local copy, pull after reverting:

```bash
a1zap pull --merge @my-app
```

### Open App Folder

Print the path to an app's folder (useful for shell navigation):

```bash
# Navigate to app folder (macOS/Linux):
cd $(a1zap open my-app)

# PowerShell:
Set-Location (a1zap open my-app)

# Or just print the path:
a1zap open my-app
```

## Project Structure

Each pulled app has this structure:

```
~/a1zap-apps/<handle>/
├── a1zap.json    # App metadata
├── App.tsx       # Main component
├── styles.css    # Optional CSS
├── AGENTS.md     # Agent entrypoint
└── agent-docs/   # Runtime and design references refreshed by pull
```

On Windows, the default workspace path is `%USERPROFILE%\a1zap-apps\<handle>\`.

### a1zap.json

```json
{
  "appId": "abc123",
  "name": "My App",
  "handle": "my-app",
  "entryFile": "App.tsx",
  "version": 5
}
```

## Development

### Building from Source

```bash
git clone <repo>
cd a1zap-miniapp-editor
npm install
npm run build
```

### Local Development

```bash
npm run dev   # Watch mode
npm link      # Link globally for testing
```

### Keeping Your Branch Updated

If `git pull` says your branch has diverged and asks how to reconcile it, use rebase for this repo:

```bash
git config pull.rebase true
git pull
```

For a one-off pull without changing repo config:

```bash
git pull --rebase
```

## Environment Variables

- `A1ZAP_API_URL` - Override the API URL (default: https://a1zap.com)

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/uninstall.sh | bash
```

Or manually:
```bash
rm -rf ~/.a1zap/cli ~/.local/bin/a1zap
```

## License

MIT
