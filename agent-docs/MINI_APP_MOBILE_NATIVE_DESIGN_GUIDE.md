# Mini App Mobile Native Design Guide

This guide is the baseline for new mini apps and redesign requests. It exists because a technically correct app can still feel bad if it looks like a stretched web page, a generic AI card stack, or a desktop landing page squeezed into a phone.

Mini apps should feel like compact product experiences designed for a phone first.

## Design Target

Design first for a 360-430px wide phone viewport, then adapt upward.

The desktop preview should not be the main design target. On wide screens, either:

- center the phone-scale app in a constrained column, or
- intentionally adapt into a real tablet or desktop layout with new grid rules.

Do not let every section expand to full desktop width just because the host container is wide. A mobile-first mini app stretched across 1400px reads as broken.

## Non-Negotiables

- Every primary action has a stable 44-56px tap target.
- Main content is readable and usable at 360px wide without horizontal scroll.
- Bottom nav, floating buttons, stats, and chat controls never cover body text or primary actions.
- The first screen shows the actual product experience, not a marketing hero unless the app is explicitly a landing page.
- Use app-like navigation: top app bar, tabs, bottom nav, segmented controls, sheets, lists, detail views.
- Do not create fake host chrome inside the app. The host already owns share, feed, comments, and maker chrome.
- Do not use emojis as the main design system. A small emoji can add flavor, but icons, labels, and layout must carry the UI.
- Do not default every app to Inter, giant rounded cards, pastel gradients, glass panels, and pill clouds.

## App Shell Pattern

A good mini app shell usually has:

1. A compact top area with app identity and one contextual action.
2. One primary content surface per screen.
3. A predictable navigation zone only when the app has multiple destinations.
4. A safe bottom area so sticky controls do not overlap content.

For most apps, the top area should be 56-88px tall on mobile, not a large navbar plus a hero. Put the app title, a short status/context line, and one action there. Move richer context into the screen body.

### Good Top Bar

- title: 18-22px, one line when possible
- subtitle/status: 12-14px, muted
- one icon or compact button on the right
- sticky only when the app needs it
- respects `env(safe-area-inset-top)`

### Bad Top Bar

- oversized logo/title block above every screen
- duplicate share button when host share UI already exists
- nav tabs plus large hero plus floating status counters in the first viewport
- absolute-positioned buttons that drift over content on small phones

## Responsive Layout Rules

Use explicit constraints, not hope.

```css
.appRoot {
  min-height: 100dvh;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  background: var(--app-background, #fff);
  color: var(--app-text, #111827);
  font-family: var(--app-font-family, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  padding: calc(12px + env(safe-area-inset-top)) 16px calc(20px + env(safe-area-inset-bottom));
}

.screen {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.primaryAction {
  min-height: 48px;
  width: 100%;
}

.bottomNav {
  position: sticky;
  bottom: 0;
  z-index: 5;
  margin: 16px -16px calc(-20px - env(safe-area-inset-bottom));
  padding: 8px 16px calc(8px + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--app-background, #fff) 94%, transparent);
  border-top: 1px solid var(--app-border, rgba(17, 24, 39, 0.1));
}
```

If the app is meant to feel like a full-screen game, map, camera, or creation tool, the root can be full-bleed. Even then, controls need safe areas, stable hit targets, and small-screen layout checks.

## Typography

Typography should match the product personality. Do not use one generic font recipe for every app.

Good options:

- utility, campus, planning: `ui-sans-serif`, `SF Pro Text`, `Avenir Next`, `Inter` only when the rest of the design is not generic
- playful social apps: `ui-rounded`, `SF Pro Rounded`, `Avenir Next Rounded`, system sans fallback
- editorial or reflective apps: a restrained serif heading with system body, only if it supports the concept
- data-heavy apps: compact system sans, tighter line height, clear numeric alignment

Rules:

- body text: 14-16px
- labels: 11-13px
- screen titles: 20-28px
- avoid viewport-based font sizing
- letter spacing should usually be 0
- keep line length comfortable; do not let paragraphs run across wide desktop screens
- long names, handles, and locations must wrap or truncate intentionally

## Visual Identity

Pick a design direction from the app's actual subject, not from a generic vibe word.

Examples:

- campus challenge: ticket stubs, roster rows, event status, bold action button, restrained school color accent
- meal planner: calendar rhythm, pantry list density, soft food photography or ingredient color accents
- game: clear board/canvas, score, next action, compact rules access
- map app: map first, bottom sheet for details, no decorative hero above the map
- AI helper: conversation or workspace first, clear input surface, visible output state

Avoid:

- huge gradient hero cards for operational tools
- decorative glass panels with no information hierarchy
- rounded card inside rounded card
- one-note color palettes
- stock dashboard cards when the app is not a dashboard
- fake phone frames inside the actual phone viewport
- floating side stats on mobile unless there is reserved space for them

## Navigation

Use the smallest navigation system that fits the app.

- 1 destination: no nav, just a focused screen
- 2-3 peer modes: segmented control near the top
- 3-5 destinations: bottom tab bar
- drill-down content: list to detail, with a small back affordance
- temporary tasks: sheet or modal

Do not put a web-style navbar at the top of every mini app. Most mini apps need an app bar, not a website nav.

## Buttons And Controls

- Primary action should be obvious and reachable with one thumb.
- Use one primary button per screen state.
- Secondary actions can be icons, text buttons, or compact menu items.
- Button text must fit at 360px without clipping.
- Avoid full-width button stacks with identical visual weight.
- Use familiar controls: toggles, segmented controls, steppers, sliders, tabs, bottom sheets.

## Content Density

Mobile-native does not mean sparse. It means scannable.

Use:

- section headers that are short and concrete
- rows for repeated data
- cards only for truly grouped objects
- inline metadata instead of separate floating pills
- compact empty states with one next action

Avoid visible instructional copy that explains the UI. The interface should be understandable by shape, labels, and state.

## Common Failure Modes To Fix

### Desktop Stretch

Problem: the app looks acceptable on desktop but huge and clumsy on mobile.

Fix: constrain the root or define separate desktop grid rules. Test 360px and 393px widths first.

### Overlapping Bottom Chrome

Problem: tabs, chat, avatar, stats, or floating buttons cover content.

Fix: reserve bottom padding equal to the sticky/floating control height plus safe-area inset. Do not put important content under fixed elements.

### AI Hero Card

Problem: first screen is a giant gradient card with pills, a CTA, and no real app workflow.

Fix: show the actual interactive screen. Use a compact header and put the primary workflow in the first viewport.

### Generic Font And Pills

Problem: every app looks like the same generated template.

Fix: choose typography, spacing, component shape, and color from the app domain. Use fewer pills. Prefer rows, tabs, and controls.

### Duplicate Host UI

Problem: app includes its own share/feed/comment shell while the host also renders those controls.

Fix: remove duplicate host chrome. Keep only app-specific actions inside the app.

## Pre-Ship Mobile Design Checklist

- Checked at 360px, 393px, and a wide desktop viewport.
- No horizontal scroll.
- No overlapping text, controls, avatars, tabs, or floating actions.
- Top area is compact and useful.
- Navigation uses app-native patterns, not a website navbar.
- Primary action is reachable and has a 44px minimum hit target.
- Typography and component shapes match the app subject.
- The app does not look like the default AI gradient/card/pill template.
- The first screen contains the real workflow or game state.
- Empty, loading, error, and success states look designed, not bolted on.

## Prompt Notes For Codegen Agents

Use language like:

1. "Design this as a mobile-native app, not a responsive landing page."
2. "Use a compact app bar and app-native navigation. Do not add a website navbar."
3. "Constrain the phone layout to a comfortable mobile width on desktop unless you create a real tablet/desktop adaptation."
4. "Choose typography and component shapes from the app's subject; do not default to generic Inter plus rounded gradient cards."
5. "Reserve safe space for bottom nav and floating controls so nothing overlaps at 360px."
6. "The first viewport should show the actual app workflow, not explanatory marketing."
