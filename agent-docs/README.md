# Mini App Feature Guides

This folder is the canonical docs hub for mini app builders and codegen agents.

Build mini apps to be social-first, but fully usable solo. The strongest mini apps on A1Zap get better as more people join, more shared content accumulates, or more history builds up over time, while still giving one person a complete experience on day one.

Design for:

- compounding value from people, shared content, or historical data
- shared sessions that feel additive, not mandatory
- storage and UX patterns that scale from one person to many

Most important usage rule:

- these guides are for feature integration, not automatic redesign
- if an app already has a strong UI, preserve its layout, hierarchy, spacing, and visual identity
- add platform features into the existing app before considering any reskin or restyle
- only redesign when the prompt explicitly asks for a redesign

Use these docs together:

- [AGENTS.md](AGENTS.md) for the fast agent guardrails on what not to do if you want a mini app to keep working.
- [AGENTS_FEATURE_SETS.md](AGENTS_FEATURE_SETS.md) for practical feature-set recipes and which runtime patterns to combine.
- [MINI_APP_FEATURE_MASTER_LIST.md](MINI_APP_FEATURE_MASTER_LIST.md) for the feature matrix and where each capability shows up.
- [MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md](MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md) for runtime-safe game patterns, score submission, leaderboards, and social/solo fallback.
- [MINI_APP_MAPS_AND_LOCATION_REFERENCE.md](MINI_APP_MAPS_AND_LOCATION_REFERENCE.md) for map-first app patterns, location, geocoding, iframe map shells, and social place data.
- [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) for `ai()` requests, streaming, schemas, tools, and multimodal prompts.
- [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md) for image, audio, and video uploads plus playback helpers.
- [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) for storage, multiplayer, members, profiles, and session data patterns.
- [MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md](MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md) for blocked APIs, fetch limits, preview-vs-runtime differences, and platform security constraints.
- [MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md](MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md) for vibe selection, `designSystem`, and runtime CSS variables.
- [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) for `/feed`, app show, shared sessions, builder, editor, post-publish, and embed behavior.

Suggested read order:

1. Start with [AGENTS.md](AGENTS.md) for the non-negotiable runtime guardrails.
2. Read [AGENTS_FEATURE_SETS.md](AGENTS_FEATURE_SETS.md) to choose the right implementation shape for the app.
3. Use [MINI_APP_FEATURE_MASTER_LIST.md](MINI_APP_FEATURE_MASTER_LIST.md) as the capability matrix.
4. If the app is a game, read [MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md](MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md) next. If it is map-first or location-aware, read [MINI_APP_MAPS_AND_LOCATION_REFERENCE.md](MINI_APP_MAPS_AND_LOCATION_REFERENCE.md) next.
5. Read the runtime guides you actually need for the app you are building.
6. Check [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) before writing copy or UX that depends on feed, share, or builder behavior.
