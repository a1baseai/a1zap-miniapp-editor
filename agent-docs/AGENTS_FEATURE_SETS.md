# Mini App Agent Feature Sets

This guide helps agents turn a product request into a runtime-safe mini app implementation plan.

Use it after reading [AGENTS.md](AGENTS.md). The goal is to choose the smallest feature set that solves the request cleanly.

For any new app, redesign, or UI-heavy change, also read [MINI_APP_MOBILE_NATIVE_DESIGN_GUIDE.md](MINI_APP_MOBILE_NATIVE_DESIGN_GUIDE.md) before implementing layout, navigation, typography, or responsive behavior.

## How To Use This Guide

1. Start with the base app shape.
2. Add only the feature sets that materially improve the app.
3. Keep solo mode complete even when the app supports shared sessions.
4. Pick a phone-native shell and navigation pattern before styling details.
5. Read the linked deep-dive docs before writing code in that area.

## Cross-Cutting Storage Rules

- Treat `data` and `sharedData` being `null` as "not loaded yet", not "saved state is empty".
- During hydration or reconnects, keep reading from the last known non-null snapshot when possible or show a loading or sync state.
- Never persist demo cards, seed rows, placeholder places, or other fallback UI data.
- For delayed saves such as `await`, `.then()`, timers, AI callbacks, uploads, or media events, keep refs pinned to the last known non-null stored snapshot and read that state right before writing.
- If you are only appending to a shared list, prefer `pushToSharedArray`.

## Base App Shapes

### 1. Solo Utility App

Use when:

- one person can get full value without a shared room
- the app mostly needs saved preferences, history, drafts, or results

Reach for:

- `data`
- `setData`
- `user`
- `openAuth` when sign-in unlocks extra capability
- `designSystem` CSS variables for any new UI

Good fit for:

- calculators
- generators
- habit tools
- trackers
- planners
- personal assistants

Avoid:

- forcing a shared session for the core workflow
- adding unnecessary multiplayer state just because it exists

Read:

- [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md)
- [MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md](MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md)

### 2. Shared Social App

Use when:

- the app gets better when people contribute to one shared state
- the app needs room-level context, members, or append-only social history

Reach for:

- `sharedData`
- `setSharedData`
- `patchSharedData`
- `pushToSharedArray`
- `myPersonalData`
- `members`
- `memberActivity`
- `instanceName`

Good fit for:

- collaborative boards
- social trackers
- party planning
- group lists
- room-based workflows

Implementation pattern:

- keep editing drafts, form state, and transient interaction local
- commit only stable changes to shared state
- use append-only arrays for feeds, history, submissions, and logs

Avoid:

- using shared state like a websocket transport
- putting every intermediate edit into `sharedData`

Read:

- [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md)

## Specialized Feature Sets

### 3. Game Or Score App

Use when:

- the app has runs, rounds, turns, scores, or leaderboards

Reach for:

- local React state for the active loop
- `setData` for solo progress and personal bests
- `pushToSharedArray` for leaderboard submissions and result history
- `myPersonalData` for per-player private stats in shared sessions
- `patchSharedData` only for turn commits, round transitions, or lobby state

Good fit for:

- arcade games
- quizzes
- puzzle games
- async challenges
- board and card games

Implementation pattern:

- sync outcomes, not every action
- submit end-of-run summaries instead of per-frame updates
- make shared play additive through leaderboards, turns, match results, and rematches

Avoid:

- syncing timers, collisions, movement, hover state, or rapid score ticks
- replacing the full shared object for tiny events

Read:

- [MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md](MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md)
- [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md)

### 4. Map Or Location App

Use when:

- the map is a core part of the product
- location, geocoding, places, or geo-tagged social content matters

Reach for:

- local state for map camera, hover, selection, and search input
- `data` for solo saved places and notes
- `sharedData` for shared place records, labels, votes, or check-ins
- `pushToSharedArray` for map activity feeds
- `getCurrentLocation()` only when location is enabled
- proxy-backed `fetch()` for geocoding and external map search

Good fit for:

- recommendation maps
- travel guides
- campus maps
- event maps
- check-in apps
- collaborative label maps

Implementation pattern:

- persist durable place-level contributions
- keep viewport chatter local
- if the runtime path supports it, prefer `appType: "map"` for map-first apps

Avoid:

- storing pan or zoom in shared state
- embedding provider secrets
- assuming raw third-party fetch or geolocation APIs are always available

Read:

- [MINI_APP_MAPS_AND_LOCATION_REFERENCE.md](MINI_APP_MAPS_AND_LOCATION_REFERENCE.md)
- [MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md](MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md)

### 5. AI-Powered App

Use when:

- the app needs generation, transformation, classification, extraction, or tool-using AI workflows

Reach for:

- `ai({ intent: "chat_stream" })` for text generation and chat
- `ai({ intent: "json", responseSchema })` for structured output
- `ai({ intent: "function_calls", tools })` for tool plans
- `ai({ intent: "image_generation" })` for generated images
- multimodal `messages` or `context` with text, image assets, or audio assets
- `openAuth` when signed-out users need to sign in first

Good fit for:

- assistants
- copilot flows
- summarizers
- structured extractors
- image prompt tools
- audio understanding tools

Implementation pattern:

- treat `ai()` as the platform AI boundary
- use schemas when the UI needs predictable structure
- stream where responsiveness matters
- keep prompts focused on the current task

Avoid:

- assuming AI works for anonymous users
- pulling in a different client SDK for the same job
- shipping features that depend on unsupported video generation

Read:

- [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md)
- [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md) when prompts include uploaded assets

### 6. Media Capture Or Gallery App

Use when:

- users create or attach image, audio, or video content

Reach for:

- `pickAndUploadPhoto` or `uploadImage`
- `pickAndUploadAudio` or `uploadAudio`
- `pickAndUploadVideo` or `uploadVideo`
- `resolveImageUrl`, `getAudioUrl`, and `getVideoUrl` for playback

Implementation pattern:

- store asset refs or asset IDs in app state
- use `target: "personal"` for solo flows
- use `target: "shared"` for shared-session flows
- default to `visibility: "instance_private"` unless public media is required

Good fit for:

- journals
- social diaries
- voice-note tools
- submission flows
- media-backed place or game apps

Avoid:

- storing temporary playback URLs as durable data
- relying on preview to fully exercise camera or microphone features

Read:

- [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md)
- [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) if media will be used for intro or gallery surfaces

### 7. Feed, Share, And Surface-Optimized App

Use when:

- the app needs to present well in feed, standalone, shared-session, create/edit, or post-publish flows

Reach for:

- strong metadata such as `utilityDescription`, `subtitle`, `coverImageUrl`, and maker attribution
- `mediaSlots.intro` for demo or intro video
- app copy that works in feed cards and share previews

Implementation pattern:

- let host surfaces own outer chrome
- make app content survive being embedded inline or shown standalone
- keep share-facing summaries short and clear

Avoid:

- duplicating maker rows, share buttons, floating action shells, or fake feed headers inside the app
- assuming the app controls the full page frame on every surface

Read:

- [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md)

### 8. Existing App Feature Extension

Use when:

- the task is to add features into an app that already has a UI and interaction model

Reach for:

- the smallest runtime additions needed for the requested feature
- `var(--app-...)` tokens when new UI elements need to fit the existing design

Implementation pattern:

- preserve layout, hierarchy, spacing, and visual identity
- plug platform features into the current screens first
- treat reskinning as opt-in, not default

Avoid:

- replacing intentional UI with a generic theme pass
- rebuilding screens to mirror the docs or host shells

Read:

- [MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md](MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md)
- [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md)

## Storage Split Cheat Sheet

| Need | Use |
| --- | --- |
| Private solo state | `data`, `setData` |
| Shared room state | `sharedData`, `setSharedData`, `patchSharedData` |
| Append-only shared history | `pushToSharedArray` |
| Private per-user state inside a shared room | `myPersonalData`, `setMyPersonalData` |
| Current user display in runtime code | `user.name` |
| Other members' display in shared sessions | `member.displayName` |

## Common Combinations

### AI + Media

Use uploaded image or audio assets as AI context, store the asset refs, and keep generated outputs in `data` unless the output is meant to be shared.

Read:

- [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md)
- [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md)

### Map + Shared Social Layer

Keep the map interaction local, persist places and votes, and append activity such as check-ins or wishlist actions into shared history.

Read:

- [MINI_APP_MAPS_AND_LOCATION_REFERENCE.md](MINI_APP_MAPS_AND_LOCATION_REFERENCE.md)
- [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md)

### Game + Async Challenge

Keep live play local, store personal bests privately, and push final run results to a shared leaderboard or challenge feed.

Read:

- [MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md](MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md)

### Existing App + Platform Upgrade

Add auth, sharing, AI, uploads, or shared-session state into the existing app without replacing its visual system or page structure.

Read:

- [AGENTS.md](AGENTS.md)
- [MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md](MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md)

## If You Are Unsure

Start with the smallest viable shape:

1. Solo-first with `data`.
2. Add shared state only for durable collaborative value.
3. Add media, AI, or location only when the product truly needs them.
4. Re-check [AGENTS.md](AGENTS.md) before shipping.
