# Mini App Surfaces And Sharing Reference

This guide documents the user-facing mini app surfaces that matter most when you are building copy, prompts, themes, or UX flows.

It is a compatibility guide for host surfaces and platform chrome. It is not a brief to redesign the app itself.

It covers `/feed`, app show pages, shared-session pages, the create and edit flows, and the post-publish share toolkit.

## Core Rule

When you use this guide against an existing app:

- preserve the app's internal layout and interaction model
- let host surfaces provide the outer chrome they already own
- add required metadata, share flows, media slots, and shell compatibility without rebuilding the runtime UI
- only do a broader visual reskin when the task explicitly asks for one

## Surface Overview

| Surface | What It Does |
| --- | --- |
| `/feed` | Renders mini apps inline with overlay chrome, intro video PiP, share, and bookmark actions |
| `/micro-apps/[id]` | Runs the standalone app experience with floating action menu and optional session selector |
| `/micro-apps/[id]/instance/[instanceId]` | Runs a shared session with invite links, share-in-chat, and optional agent handoff |
| `/micro-apps/new` | Prompt-first builder with templates, vibes, mode, privacy, and community targeting |
| `/micro-apps/[id]/edit` | Draft editor with AI updates, reskin vibe, preview-before-publish, and draft locking |
| `/micro-apps/[id]/post-publish` | Share toolkit with app links, session links, social copy, and embed output |

## Feed Surface

The feed renders mini apps through `ZapFeedItemSucrase` and `MicroAppRuntimeSucrase`.

### What Users See

- the live mini app runtime inside the feed card
- an optional intro/demo video PiP when `mediaSlots.intro` contains a video
- overlay chrome with:
  - app icon
  - total sessions count
  - share count
  - bookmark toggle
  - maker avatar and profile link
  - community badge stack
  - app description with expandable truncation

### Intro Video Behavior

- the feed looks for a video in `mediaSlots.intro`
- if one exists, it can auto-show as a contained PiP overlay
- inactive feed items preload the demo video source for faster playback when swiped in

### Feed Overlay Info Priorities

- description: `utilityDescription` -> `subtitle` -> `publication.shortDescription` -> `description`
- maker link: `/u/{owner.handle}` when a handle exists, otherwise `/u/{owner.id}`
- share count: `app.stats.shareCount`

Practical integration rule:

- do not add a second fake feed header, fake maker row, or duplicate share chrome inside the app just because the feed already has those elements

## Standalone App Show Page

The standalone show page is `/micro-apps/[id]`.

### What Users Get

- full-screen app runtime
- floating action menu
- optional intro video PiP
- owner-facing edit entry point
- app share sheet
- optional session selector for returning users

### Floating Action Menu

The floating action menu can include:

- `My Sessions` when private sessions are available
- `Share App`
- `Edit App` for owners
- quick action: `Copy URL`
- secondary action: `Exit app`

The menu uses:

- app icon
- app name
- maker avatar and name
- primary color accent from `designSystem.colors.primary`

Practical integration rule:

- the standalone page already owns this outer menu and shell
- do not rebuild a generic top bar or utility shell inside the app unless it is genuinely part of the product

### Standalone Theme Usage

The show page shell uses:

- `designSystem.colors.primary` for accenting and loaders
- `designSystem.colors.background` for page background
- `designSystem.colors.text` for shell text

## Shared Session Page

The shared-session surface is `/micro-apps/[id]/instance/[instanceId]`.

### What Users Get

- shared runtime with `sharedData`, `members`, and `myPersonalData`
- invite link generation
- copy current URL
- share-in-chat flow
- optional “chat with agent” handoff for eligible owner agents
- optional logged-out viewing for canonical live sessions

### Sharing Features

The session page supports:

- invite link generation through a share code
- copy invite link to clipboard
- share the session into chat with a rich `micro_app_instance_card`
- DM-code gating if the selected user requires it

### Logged-Out Canonical Live View

Some canonical sessions can allow logged-out viewing through session policy.

That means:

- users may see a live shared instance without signing in
- sign-up/sign-in flows still preserve return paths and share attribution

## Create Flow

The create surface is `/micro-apps/new`.

### What Builders Get

- prompt prefill from `?prompt=...`
- fallback prompt prefill from `sessionStorage.ideation_prompt`
- optional base template prefill from `?templateSlug=...`
- vibe selection from the style catalog
- multiplayer vs single-player mode choice
- privacy choice:
  - `private`
  - `public`
  - `community_only`
- optional community targeting and branding context
- streamed planning flow
- editable plan review for non-quick builds
- preview and auto-publish flow

### Notable Builder Rules

- crew mode forces private publication
- build ideas can be auto-saved as drafts in local storage
- quick build auto-continues after planning
- regular build pauses on the plan view until approved

## Edit Flow

The edit surface is `/micro-apps/[id]/edit`.

### What Builders Get

- private draft editing before anything goes live
- AI-generated draft updates from natural-language prompts
- single-vibe reskin request support
- draft preview runtime
- live vs draft version indicators
- publish and discard actions
- lock state when another editor owns the draft

### Important Behavior

- edits stay private to the draft until publish
- the preview uses draft code and design, not live session data
- publishing is the only step that updates the live app
- reskin support exists for explicit style-change requests; it should not be treated as the default behavior when the task is feature integration

## Post-Publish And Share Toolkit

The post-publish surface is `/micro-apps/[id]/post-publish`.

### What It Includes

- direct app link copy
- share-in-A1Zap flow
- shared-session or live-session link preparation
- embed dialog
- LinkedIn and social-share helper content
- live app preview mode
- social copy variants for chat, LinkedIn, Instagram, and TikTok-style scripts

### Embed Behavior

The embed snippet points to `/micro-apps/[id]/embed` and currently includes:

- `allow="camera; microphone; clipboard-write"`
- `allowfullscreen`

That means embedded mini apps are expected to work with media capture and clipboard flows when the host environment allows them.

## Media Slots And Demo Video

Mini apps can expose media attachments through slots.

Current slot model:

```javascript
{
  intro: [...],
  gallery: [...]
}
```

The current UX especially uses:

- `intro` for demo or intro video PiP
- `gallery` for additional media surfaces

## App Title, Description, And Preview Info Priorities

### Title

Standalone page titles prefer:

- `funTitle`
- `utilityTitle`
- `name`

### Description

Metadata and preview text often prefer:

- `publication.shortDescription`
- `subtitle`
- `utilityDescription`
- `description`

### Share Copy Summary

Share helper text prefers:

- `subtitle`
- `description`
- fallback headline based on app name

### Preview Image

Open Graph and social preview images prefer:

- `coverImageUrl`
- `iconUrl`

### Maker Attribution

Maker identity usually prefers:

- `owner.displayName`
- `owner.handle`
- `owner.profileImageUrl`

## Practical Prompt Tips

1. If you are generating feed-facing copy, optimize for short names and one strong `utilityDescription` or `subtitle`.
2. If you want the show and feed surfaces to feel alive, give the app an intro video in `mediaSlots.intro`.
3. If you want clean share previews, make sure `coverImageUrl`, `subtitle`, and maker attribution are populated.
4. If the app is meant to be collaborative, design it so solo mode still works and shared sessions feel additive.
