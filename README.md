# a1zap-miniapp-editor

CLI tool for local development of A1Zap MicroApps.

## Quick Install (Recommended)

Copy and paste this into your Terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/a1baseai/a1zap-miniapp-editor/main/install.sh | bash
```

Then restart your terminal and configure your API key:

```bash
a1zap config "your-api-key"
```

That's it! Run `a1zap list` to see your apps.

---

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

The API key is stored in `~/.a1zap/config.json`.

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

  Local apps: ~/.a1zap/apps/
```

### Pull an App

Download an app to your local workspace:

```bash
a1zap pull @my-app
# or by ID:
a1zap pull xs726ffzxzmra3rawxqbtgmryh7zge0s
```

Apps are stored in `~/.a1zap/apps/<handle>/`.

### Create a Template App (Admin)

Create a hello-world template mini app for a specific owner:

```bash
# Use owner handle
a1zap create my-new-app \
  --owner alice \
  --name "My New App"

# Or use owner user ID / Stack Auth ID
a1zap create my-new-app --owner-id <userId>
a1zap create my-new-app --owner-stack-auth-id <stackAuthUserId>
```

Create and auto-attach to a community:

```bash
a1zap create my-new-app \
  --owner alice \
  --community-handle stanford \
  --community-status approved
```

Useful options:
- `--publication draft|private|unlisted|public|community_only`
- `--community-description "Custom copy for this community"`
- `--featured`
- `--pull` (also supports `--force`)

### Attach Existing App to a Community

Attach an existing app by handle or ID:

```bash
a1zap attach @my-new-app \
  --community-handle stanford \
  --status approved
```

Useful options:
- `--status pending|approved`
- `--publication draft|private|unlisted|public|community_only`
- `--community-description "Custom copy for this community"`
- `--featured`

### Start Development Server

Start the dev server with hot reload:

```bash
# By handle (from anywhere):
a1zap dev @my-app

# Or from inside an app folder:
cd ~/.a1zap/apps/my-app
a1zap dev

# Custom port:
a1zap dev @my-app -p 3000
```

The dev server provides:
- Live preview at http://localhost:4321
- Hot reload on file changes
- Mock user context for testing

### Push Changes

Push your local changes back to A1Zap:

```bash
# By handle (from anywhere):
a1zap push @my-app -m "Fixed button styling"

# Or from inside an app folder:
a1zap push -m "Updated layout"
```

### Open App Folder

Print the path to an app's folder (useful for shell navigation):

```bash
# Navigate to app folder:
cd $(a1zap open my-app)

# Or just print the path:
a1zap open my-app
```

## Project Structure

Each pulled app has this structure:

```
~/.a1zap/apps/<handle>/
├── a1zap.json    # App metadata
├── App.tsx       # Main component
└── styles.css    # Optional CSS
```

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
