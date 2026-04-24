# Mini App Feature Master List

This is the fastest way to see what exists today for mini apps on A1Zap.

## Runtime Capability Matrix

| Capability | Available | Notes | Guide |
| --- | --- | --- | --- |
| `data`, `setData` | Yes | Solo/private persisted app data | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `sharedData`, `setSharedData`, `patchSharedData` | Yes | Shared session state with runtime-managed direct vs queued writes | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `pushToSharedArray` | Yes | Best for atomic shared array appends | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `myPersonalData`, `setMyPersonalData` | Yes | Per-user data inside shared sessions | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `user` | Yes | `{ id, name, email, handle, avatarUrl }` | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `members`, `memberActivity`, `isOwner`, `instanceName` | Yes | Shared-session member metadata and lightweight activity info | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `openProfile(handle)` | Yes | Opens `/u/{handle}` on web | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `openAuth(intent)` | Yes | Sign-in / sign-up bridge | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `uploadImage`, `pickAndUploadPhoto`, `resolveImageUrl`, `getImageUrl` | Yes | Images support upload plus private/public playback resolution | [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md) |
| `uploadAudio`, `pickAndUploadAudio`, `getAudioUrl` | Yes | Audio supports file upload and microphone capture | [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md) |
| `uploadVideo`, `pickAndUploadVideo`, `getVideoUrl` | Yes | Video supports file upload and camera capture | [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md) |
| `ai()` text/chat | Yes | Streaming by default for `chat_stream` | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| `ai()` structured JSON | Yes | Strict schema output supported | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| `ai()` tool calls | Yes | Tool/function call responses supported | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| `ai()` image generation | Yes | Returns `dataUrl` images, not uploaded assets | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| AI image understanding | Yes | `image` and `image_asset` parts supported | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| AI audio understanding | Yes | `audio` and `audio_asset` parts supported | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| AI video understanding | Not ready | `video_asset` exists in types but is not ready to document as supported | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| AI video generation | No | No runtime intent for this today | [MINI_APP_AI_RUNTIME_REFERENCE.md](MINI_APP_AI_RUNTIME_REFERENCE.md) |
| `getCurrentLocation()` | Conditional | Only injected when `appConfig.features.usesLocation` is enabled | [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md) |
| `designSystem` to CSS vars | Yes | Runtime maps colors, typography, layout, and custom vars | [MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md](MINI_APP_THEME_AND_DESIGN_SYSTEM_REFERENCE.md) |
| sandboxed execution and restricted globals | Yes | Static validation, sanitization, restricted globals, and proxy-only network model | [MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md](MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md) |

## Surface Matrix

| Surface | What Users Get | Guide |
| --- | --- | --- |
| `/feed` | Embedded runtime, intro video PiP, share/bookmark overlay, maker profile link, community badges | [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) |
| `/micro-apps/[id]` | Full-screen standalone app, floating action menu, share flow, owner edit access, intro video PiP | [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) |
| `/micro-apps/[id]/instance/[instanceId]` | Shared-session runtime, invite links, share-in-chat, eligible agent handoff, optional logged-out live view | [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) |
| `/micro-apps/new` | Prompt-first builder, template prefill, vibes, mode/privacy/community choices, planning/build flow | [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) |
| `/micro-apps/[id]/edit` | Draft-only AI editor, reskin vibes, preview-before-publish, lock state | [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) |
| `/micro-apps/[id]/post-publish` | Share toolkit, social copy, embed dialog, session link prep | [MINI_APP_SURFACES_AND_SHARING_REFERENCE.md](MINI_APP_SURFACES_AND_SHARING_REFERENCE.md) |

## Specialized Build Guides

| Guide | Use It When |
| --- | --- |
| [MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md](MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md) | You are building a game and need safe patterns for local gameplay, score submission, leaderboards, and social/solo fallback |
| [MINI_APP_MAPS_AND_LOCATION_REFERENCE.md](MINI_APP_MAPS_AND_LOCATION_REFERENCE.md) | You are building a map-first or location-aware app and need patterns for map shells, geocoding, social place data, and durable map state |

## Quick Rules For Builders And Agents

1. Prefer platform helpers over rolling your own storage, auth, sharing, or AI calls.
2. When applying these guides to an existing app, preserve the app's current layout, hierarchy, and visual identity unless a redesign is explicitly requested.
3. Add features into the current structure first. Do not rebuild screens just to match theme or surface docs.
4. Use `user.name`, not `user.displayName`, in runtime app code. `members` have `displayName`.
5. Store asset refs or asset IDs, not temporary playback URLs.
6. Build mini apps to be social-first, but keep solo mode complete and satisfying.
7. Shared sessions should enrich an app that already works for one person; they should not be the only way the app makes sense.
8. Use the runtime `designSystem` CSS variables to style new or extended UI so it fits the app, not as a reason to repaint the whole product.
9. Do not document AI video generation or claim video understanding is production-ready yet.
10. If you need location, make sure the app enables `appConfig.features.usesLocation`; otherwise `getCurrentLocation` is not injected.
11. For map apps, keep viewport and interaction state local; persist durable contributions like places, labels, check-ins, votes, and media metadata.

## Extra Rules For Games

1. Prefer syncing outcomes, not every interaction.
2. Keep moment-to-moment gameplay state in local component state.
3. Persist checkpoints, end-of-run summaries, round results, and final scores instead of every move, frame, timer tick, or collision.
4. Use `pushToSharedArray` for leaderboard submissions, match history, and append-only result feeds.
5. Use `myPersonalData` for per-player progress or stats that do not need to be visible to every participant.
6. Reserve shared writes for meaningful multiplayer transitions such as lobby setup, round start/end, turn handoff, voting, match completion, or score submission.
7. For games, shared storage should capture results and state transitions, not the entire game loop.
8. If you are building a game, also read [MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md](MINI_APP_GAMES_AND_SCORE_SYNC_REFERENCE.md).
