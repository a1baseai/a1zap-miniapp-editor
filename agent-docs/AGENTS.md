# Mini App Agent Guardrails

This is the fast path for agents making mini app changes on A1Zap.

Use it to avoid breaking runtime behavior, storage, sharing, preview, and host-surface compatibility.

## Default Approach

1. Preserve the app's current layout and visual identity unless the prompt explicitly asks for a redesign.
2. Make the app fully usable solo first.
3. Add shared or social value as an enhancement, not as the only way the app works.
4. Use runtime helpers before inventing custom browser or network flows.
5. Read the feature-specific guide before implementing a non-trivial capability.

## Do Not Break The Runtime

### Storage

- Do not use `localStorage`, `sessionStorage`, or `indexedDB` in mini app runtime code.
- Use `data` and `setData` for solo/private persisted state.
- Use `sharedData`, `setSharedData`, `patchSharedData`, and `pushToSharedArray` for shared-session state.
- Use `myPersonalData` and `setMyPersonalData` for per-user private state inside a shared session.
- Use `user.name` in runtime app code. `members` use `displayName`.
- Treat `data` and `sharedData` as async-hydrated state that can be `null` on first render or during reconnects. `null` means "not loaded yet", not "empty".
- While hydration is pending, keep reading from the last known non-null snapshot when possible or show a loading or sync state.
- Do not seed shared defaults from `useEffect(() => ..., [])` just because `sharedData` is currently `null`.

### Shared Writes

- Do not write high-frequency state into shared storage.
- Do not sync timers, drag state, hover state, pointer movement, animation frames, physics, camera position, or per-frame gameplay.
- Keep active gameplay, live map interaction, and transient UI state local in React state.
- Persist only meaningful commits such as final scores, checkpoints, turn submissions, place records, votes, check-ins, labels, or append-only activity.
- Prefer `pushToSharedArray` for leaderboard entries, result feeds, and activity streams.
- Never persist demo cards, seed rows, placeholder maps, or other fallback UI data. Fallback content is for rendering only.
- If a persisted write depends on existing arrays or objects, derive it from the latest real stored state, not from fallback render state.
- When async work later reads or rewrites persisted state, mirror `data` and `sharedData` into refs, keep those refs pinned to the last known non-null snapshot, and read from them inside the callback instead of using a stale closure.
- Normalize nested shared objects additively. Do not rebuild them from only the currently visible subset unless you intentionally want to delete omitted keys.

### Browser APIs And Sandbox

- Do not use blocked APIs such as `eval`, `Function`, `XMLHttpRequest`, `WebSocket`, `window.open`, `window.location`, `document.write`, `innerHTML`, dynamic `import()`, `navigator.geolocation`, or raw browser storage.
- Do not assume unrestricted DOM access. Mini app code runs in a restricted sandbox.
- Use React rendering, injected helpers, and proxy-backed `fetch()` instead.
- Do not hardcode secrets or provider API keys into app code.

### Networking

- Do not assume arbitrary third-party `fetch()` will work.
- Use the first-party proxy flow or injected helpers such as `ai()`, media upload helpers, and auth helpers.
- Keep requests small and simple. The proxy only supports the allowed methods and upstreams documented in this folder.

### Media

- Do not persist resolved playback URLs as long-term state.
- Store asset refs or asset IDs, then resolve URLs at render time with `resolveImageUrl`, `getAudioUrl`, or `getVideoUrl`.
- Be explicit about `target` and `visibility`.
- Use shared media defaults only when the app is actually in a shared session.

### AI

- Do not bring in a separate browser AI SDK for normal mini app AI features.
- Use the injected `ai()` helper for chat, JSON, tool calls, image generation, and multimodal prompts.
- Guard AI usage behind auth because signed-out users cannot run `ai()`.
- Do not document or ship AI video generation as supported.
- Do not treat AI video understanding as production-ready in this docs set.

### Location And Maps

- Do not call `getCurrentLocation()` unless the app enables `appConfig.features.usesLocation`.
- Do not store map pan, zoom, hover, or viewport chatter in shared persisted state.
- Keep map interaction local and persist durable place-level contributions.
- Do not embed provider secrets in map code.

### Preview And Surfaces

- Do not assume preview and live runtime have the same capabilities.
- Preview is stricter and can block camera, microphone, geolocation, fullscreen, and authenticated flows.
- Do not rebuild feed chrome, standalone shell chrome, share UI, or maker attribution inside the app when the host surface already provides it.
- Add compatibility with host surfaces before adding duplicate shell UI.

## Practical Build Order

1. Classify the app: solo utility, shared social app, game, map app, AI app, or media-heavy app.
2. Pick the storage split first.
3. Add only the runtime helpers the feature actually needs.
4. Keep transient state local and persisted state coarse-grained.
5. Use `designSystem` CSS variables only to make additions fit the current UI.
6. Check surface behavior before adding feed, share, edit, or post-publish UX assumptions.

## Pre-Ship Checklist

- Solo mode is complete and usable.
- Shared mode adds value without becoming a real-time transport layer.
- `data` and `sharedData` treat `null` as not-loaded-yet, not as empty saved state.
- No mount-time effect seeds or resets `sharedData`.
- Fallback or demo UI content never becomes persisted source-of-truth data.
- Async callbacks that update persisted state read the latest last-known snapshot from a ref, not from an old closure.
- No blocked browser APIs or client-side secrets are used.
- No high-frequency shared writes are used.
- Media is stored as asset refs or asset IDs, not ephemeral URLs.
- AI flows handle signed-out users safely.
- Location usage is optional and correctly gated.
- New UI fits the existing app instead of forcing a reskin.
- The app does not duplicate host-surface chrome.

## Read Next

- [MINI_APP_FEATURE_MASTER_LIST.md](MINI_APP_FEATURE_MASTER_LIST.md) for the runtime capability matrix.
- [AGENTS_FEATURE_SETS.md](AGENTS_FEATURE_SETS.md) for practical feature recipes.
- [MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md](MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md) if the change touches browser APIs, fetch, preview, or security-sensitive behavior.
