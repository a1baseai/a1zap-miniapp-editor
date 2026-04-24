# Mini App Theme And Design System Reference

This guide documents how mini app theming works today, from builder vibes to runtime CSS variables.

It should not be read as an instruction to redesign an app that already has a strong UI. In this docs set, theme guidance is mainly about making new or extended UI fit the app that already exists.

## Theme Sources

There are two main theme layers:

1. Builder and editor vibe selection, which influences generated styling and design output for new builds or explicit reskin requests.
2. Runtime `designSystem`, which is converted into CSS variables and applied to the app container.

## Most Important Rule

If the core app already looks intentional, preserve it.

Use theme guidance to:

- style new UI so it feels native to the app
- keep additions visually aligned with the existing product
- expose reusable tokens for extensions and platform surfaces

Do not use theme guidance to:

- replace the app's layout with a generic shell
- swap typography, spacing, or component shapes just because a vibe exists
- flatten a distinctive design into default `var(--app-...)` fallbacks

## Runtime `designSystem` Shape

```javascript
{
  vibe?: string,
  colors?: {
    primary?: string,
    secondary?: string,
    accent?: string,
    background?: string,
    surface?: string,
    text?: string,
    textMuted?: string,
    border?: string,
    error?: string,
    success?: string
  },
  typography?: {
    fontFamily?: string,
    headingFont?: string,
    fontSize?: "compact" | "base" | "large" | string,
    fontWeight?: string
  },
  layout?: {
    borderRadius?: "none" | "sm" | "md" | "lg" | "xl" | "full" | string,
    spacing?: "compact" | "normal" | "relaxed" | string,
    maxWidth?: "sm" | "md" | "lg" | "xl" | "full" | string
  },
  customVars?: {
    "--token-name": "value"
  }
}
```

## CSS Variable Mapping

### Colors

| `designSystem` field | CSS variable |
| --- | --- |
| `colors.primary` | `--app-primary` |
| `colors.secondary` | `--app-secondary` |
| `colors.accent` | `--app-accent` |
| `colors.background` | `--app-background` |
| `colors.surface` | `--app-surface` |
| `colors.text` | `--app-text` |
| `colors.textMuted` | `--app-text-muted` |
| `colors.border` | `--app-border` |
| `colors.error` | `--app-error` |
| `colors.success` | `--app-success` |

### Typography

| `designSystem` field | CSS variable | Runtime mapping |
| --- | --- | --- |
| `typography.fontFamily` | `--app-font-family` | Raw string |
| `typography.headingFont` | `--app-heading-font` | Raw string |
| `typography.fontSize` | `--app-font-size` | `compact -> 14px`, `base -> 16px`, `large -> 18px`, otherwise raw |

### Layout

| `designSystem` field | CSS variable | Runtime mapping |
| --- | --- | --- |
| `layout.borderRadius` | `--app-border-radius` | `none -> 0`, `sm -> 4px`, `md -> 8px`, `lg -> 12px`, `xl -> 16px`, `full -> 9999px`, otherwise raw |
| `layout.spacing` | `--app-spacing` | `compact -> 0.5rem`, `normal -> 1rem`, `relaxed -> 1.5rem`, otherwise raw |
| `layout.maxWidth` | `--app-max-width` | `sm -> 640px`, `md -> 768px`, `lg -> 1024px`, `xl -> 1280px`, `full -> 100%`, otherwise raw |

### Custom Variables

Everything in `customVars` is merged straight onto the runtime root.

```javascript
customVars: {
  "--card-shadow": "0 12px 40px rgba(0,0,0,0.18)",
  "--brand-glow": "rgba(255, 102, 146, 0.28)",
}
```

## Runtime Defaults

The runtime root falls back to:

- `backgroundColor: var(--app-background, #ffffff)`
- `color: var(--app-text, #1f2937)`
- `fontFamily: var(--app-font-family, system-ui, sans-serif)`

These are safety-net defaults, not design goals. If an app already has a strong visual language, do not collapse it down to these generic fallbacks.

## Recommended Usage In App Code

Prefer CSS variables over duplicating theme values inside component logic.

For existing apps, the safest pattern is:

- keep the current layout and component design
- use `var(--app-...)` tokens where you add or extend UI
- only touch the broader visual system when the prompt explicitly asks for a redesign

```jsx
function App() {
  return (
    <div
      style={{
        background: "var(--app-background)",
        color: "var(--app-text)",
        borderRadius: "var(--app-border-radius, 16px)",
        padding: "var(--app-spacing, 1rem)",
      }}
    >
      <h1 style={{ fontFamily: "var(--app-heading-font, var(--app-font-family))" }}>
        Hello
      </h1>
      <button
        style={{
          background: "var(--app-primary)",
          color: "white",
          border: "1px solid var(--app-border, transparent)",
        }}
      >
        Continue
      </button>
    </div>
  );
}
```

## Builder Theme Surfaces

### Create Flow

The builder currently supports:

- prompt-first creation
- optional base template selection
- vibe selection from the style catalog
- up to 3 selected vibes during initial creation
- live preview during build flow
- mode and privacy choices that shape how the app is generated

### Edit Flow

The edit flow supports:

- draft-only AI edits
- a single reskin vibe selection per edit request
- preview before publish

That reskin capability is optional. It should not be treated as the default behavior when the task is simply to add features to an existing app.

## Theme Usage In User-Facing Surfaces

The app `designSystem` shows up outside the runtime too:

- standalone app pages use `designSystem.colors.primary`, `background`, and `text` for loading and shell chrome
- floating action menus use the app primary color as the accent
- session and app lists often use primary color and app icon for identity

These surface hooks are about shell-level compatibility. They do not mean the in-app UI should be rebuilt to match a generic shell.

## Best Practices

1. Preserve the app's existing visual language unless the task explicitly asks for a redesign.
2. Use the runtime CSS variables as the token layer for new or modified UI, not as a mandate to restyle everything.
3. Prefer `var(--app-...)` tokens over hard-coded hex values for reusable surfaces.
4. Use `customVars` when generated apps need a few extra tokens, not a second parallel theme system.
5. Treat builder vibes as generation input, not as a runtime API contract.
6. When prompting codegen agents, tell them to keep layout and hierarchy intact and use theme variables only where they touch the UI.

## Prompt Tips For Codegen Agents

1. “Preserve the current layout and visual identity. Do not redesign the app unless explicitly asked.”
2. “Use `var(--app-primary)`, `var(--app-background)`, and `var(--app-text)` for any new or modified UI instead of inventing a second color palette.”
3. “Respect `--app-border-radius` and `--app-spacing` when adding cards, buttons, and list items so new features blend into the app.”
4. “If the design needs one extra token, put it in `designSystem.customVars` and consume it with `var(--token)`.”
