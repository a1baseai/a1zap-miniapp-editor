# Micro App Data And User Profile Reference

A practical guide for engineers and AI agents building mini apps on A1Zap.

This updates older examples so they match the current runtime shape in `MicroAppRuntimeSucrase.tsx`.

## Quick Reference

| Mode | Read From | Save With | User Context |
| --- | --- | --- | --- |
| Solo | `data` | `setData(obj)` | `user` |
| Shared session | `sharedData` | `setSharedData(obj)`, `patchSharedData(patch)` | `user`, `members`, `memberActivity` |
| Shared session personal | `myPersonalData` | `setMyPersonalData(obj)` | `user` |
| Atomic shared list writes | `sharedData` | `pushToSharedArray(path, item)` | `user` |

## Props Reference

### Core Props

```jsx
function App({
  // Current user
  user,              // { id, name, email, handle, avatarUrl }

  // Solo mode storage
  data,              // User's private persisted data (starts null, can briefly be null during reconnects)
  setData,           // (data) => void

  // Shared-session detection
  isMultiplayer,     // boolean

  // Shared-session storage
  sharedData,        // Shared state for the session (starts null, hydrates async, can briefly be null during reconnects)
  setSharedData,     // (data) => void - full replacement
  patchSharedData,   // (patch) => void - deep merge patch
  pushToSharedArray, // (path, item) => void - atomic append

  // Shared-session personal storage
  myPersonalData,    // This user's private data inside the session
  setMyPersonalData, // (data) => void

  // Shared-session member info
  members,           // [{ id, role, displayName, handle, avatarUrl, email, joinedAt }]
  memberActivity,    // { [memberId]: { lastActiveAt } }
  isOwner,           // boolean
  instanceName,      // session name

  // Navigation/auth
  openProfile,       // (handle) => void
  openAuth,          // (intent?) => void
  getCurrentLocation // (options?) => Promise<{ latitude, longitude, ... }> when location is enabled
}) {
  // ...
}
```

### Important Shape Detail

- `user` has `name`.
- `members` have `displayName`.

Use:

```javascript
const myName = user.name || user.handle || "Guest";
const memberName = member.displayName || member.handle || "Member";
```

## User And Profile Handling

### The `user` Prop

```javascript
const { id, name, email, handle, avatarUrl } = user;

const currentUserName = user.name || user.handle || "Guest";
```

Logged-out users can still exist in runtime code, so do not assume `user.id` means a fully authenticated account.

### The `members` Array

Each shared-session member has:

```javascript
{
  id: "member_123",
  role: "owner" | "editor" | "viewer",
  displayName: "Bobby Smith",
  handle: "bobby",
  avatarUrl: "https://...",
  email: "bobby@example.com",
  joinedAt: 1712345678901
}
```

### Member Activity

`memberActivity` is a lightweight map keyed by member ID:

```javascript
const lastActiveAt = memberActivity[member.id]?.lastActiveAt ?? null;
```

### Opening Profiles

Use `openProfile(handle)` to open a user's profile.

```jsx
function ProfileAvatar({ handle, avatarUrl, name, openProfile, size = 40 }) {
  return (
    <button
      type="button"
      onClick={() => handle && openProfile?.(handle)}
      style={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "transparent",
        border: 0,
        padding: 0,
      }}
    >
      <img
        src={avatarUrl || "https://via.placeholder.com/40"}
        alt={name || ""}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
      <span style={{ fontSize: 14, color: "#666" }}>
        {handle ? `@${handle}` : name || "User"}
      </span>
    </button>
  );
}
```

### Opening Auth

Use `openAuth()` when your app needs sign-in or sign-up.

```javascript
if (!user?.id || user.id === "anonymous") {
  openAuth?.({ mode: "signin" });
  return;
}
```

### Location

`getCurrentLocation` is only injected when the app enables location in its config.

```javascript
if (!getCurrentLocation) {
  return;
}

const location = await getCurrentLocation({
  enableHighAccuracy: true,
  timeout: 10000,
});
```

Result shape:

```javascript
{
  latitude,
  longitude,
  accuracy,
  altitude?,
  altitudeAccuracy?,
  heading?,
  speed?,
  timestamp
}
```

## Data Storage Patterns

### Pattern 1: Solo Mode

```jsx
function App({ data, setData, user }) {
  const highScore = data?.highScore || 0;
  const todos = data?.todos || [];

  const saveScore = (score) => {
    setData({
      ...(data || {}),
      highScore: Math.max(highScore, score),
      lastPlayedAt: Date.now(),
      lastPlayerName: user.name || user.handle || "Guest",
    });
  };

  const addTodo = (text) => {
    setData({
      ...(data || {}),
      todos: [...todos, { id: Date.now(), text, done: false }],
    });
  };
}
```

### Pattern 2: Shared Session State

```jsx
function App({ sharedData, setSharedData, patchSharedData }) {
  const count = sharedData?.count || 0;

  const resetAll = () => {
    setSharedData({ count: 0, settings: { mode: "easy" } });
  };

  const increment = () => {
    patchSharedData({ count: count + 1 });
  };
}
```

`sharedData` can be `null` on the first render even when the session already has saved data. Read it defensively and do not treat the initial empty render as proof that the server has no state yet.

### Pattern 3: Unified Storage That Works In Both Modes

```jsx
function App({
  data,
  setData,
  isMultiplayer,
  sharedData,
  setSharedData,
  user,
  members,
}) {
  const appData = isMultiplayer ? sharedData : data;
  const saveData = isMultiplayer ? setSharedData : setData;

  const memberList =
    isMultiplayer && members?.length
      ? members
      : [
          {
            id: user.id,
            displayName: user.name,
            handle: user.handle,
            avatarUrl: user.avatarUrl,
            role: "owner",
          },
        ];

  const highScore = appData?.highScore || 0;

  const saveScore = (score) => {
    saveData({
      ...(appData || {}),
      highScore: Math.max(highScore, score),
    });
  };

  return (
    <div>
      <h2>High Score: {highScore}</h2>
      {memberList.map((member) => (
        <div key={member.id}>
          {member.displayName || member.handle || "Player"}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 4: Per-User Data Inside A Shared Session

```jsx
function App({ myPersonalData, setMyPersonalData }) {
  const stats = myPersonalData?.stats || {
    gamesPlayed: 0,
    totalScore: 0,
  };

  const recordGame = (score) => {
    setMyPersonalData({
      ...(myPersonalData || {}),
      stats: {
        gamesPlayed: stats.gamesPlayed + 1,
        totalScore: stats.totalScore + score,
        lastPlayedAt: Date.now(),
      },
    });
  };
}
```

### Pattern 5: User-Attributed Lists

If you want to show who added a score, post, or item, add attribution yourself.

```jsx
function App({ sharedData, setSharedData, user, openProfile }) {
  const scores = sharedData?.scores || [];

  const submitScore = (score) => {
    const entry = {
      score,
      _user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
      },
      _timestamp: Date.now(),
    };

    setSharedData({
      ...(sharedData || {}),
      scores: [...scores, entry],
    });
  };

  return (
    <div>
      {scores.map((entry, index) => (
        <button
          key={index}
          onClick={() => entry._user?.handle && openProfile?.(entry._user.handle)}
        >
          {(entry._user?.name || entry._user?.handle || "Anonymous")}: {entry.score}
        </button>
      ))}
    </div>
  );
}
```

Recommended `_user` shape:

```javascript
{
  id: user.id,
  name: user.name,
  handle: user.handle,
  avatarUrl: user.avatarUrl
}
```

### Pattern 6: Atomic Shared Array Appends

Use `pushToSharedArray(path, item)` when you want the runtime to enqueue an atomic append.

```jsx
function App({ pushToSharedArray, user }) {
  const addMessage = () => {
    pushToSharedArray?.("messages", {
      text: "Hello",
      _user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
      },
      _timestamp: Date.now(),
    });
  };

  return <button onClick={addMessage}>Add message</button>;
}
```

This is usually the safest write path for shared list-style data such as chat messages, votes, or score submissions.

## Shared Write Behavior

You do not need to manually switch between direct writes and queued writes in app code.

The runtime already handles:

- direct writes for normal low-contention shared sessions
- queued writes for global, community, and canonical shared sessions
- optimistic local updates
- version tracking
- rate-limit cooldowns

Use `setSharedData`, `patchSharedData`, or `pushToSharedArray` normally.

## Storage Hydration And Persistence Rules

### Rule 1: Treat `null` As "Not Loaded Yet," Not "Empty"

`data` and `sharedData` can be `null` on first render and during brief reconnects. That means hydration has not finished yet. It does not mean the app has no saved state.

While hydration is pending:

- keep reading from the last known non-null snapshot when possible
- or show a loading or sync state
- only fall back to demo, seed, or placeholder content after hydration has completed and persisted state is still empty

Use a render-time snapshot pattern like this:

```jsx
function App({ data, isMultiplayer, sharedData }) {
  const liveAppData = isMultiplayer ? sharedData : data;
  const lastNonNullAppDataRef = React.useRef(null);

  React.useEffect(() => {
    if (liveAppData !== null) {
      lastNonNullAppDataRef.current = liveAppData;
    }
  }, [liveAppData]);

  const appData = liveAppData ?? lastNonNullAppDataRef.current;
  const isAppDataLoading =
    liveAppData === null && lastNonNullAppDataRef.current === null;

  if (isAppDataLoading) {
    return <div>Loading...</div>;
  }

  const cards = appData?.cards || [];

  return <CardGrid cards={cards} />;
}
```

### Rule 2: Do Not Seed `sharedData` From A Mount-Time Effect

`sharedData` is hydrated asynchronously. A mount-only effect that writes defaults can race the server payload and overwrite real session data on every load.

Wrong:

```jsx
React.useEffect(() => {
  patchSharedData({
    voiceNotes: [],
    notesBySport: {},
  });
}, []);
```

Correct:

- Render with defensive defaults such as `const voiceNotes = sharedData?.voiceNotes || [];`
- Write defaults only when the user actually creates a new record, or when you intentionally initialize a brand-new shared document.

### Rule 3: Never Persist Fallback UI Data

Demo cards, seed rows, placeholder maps, and other fallback content are for rendering only. They must never become the source of truth for `setData`, `setSharedData`, `patchSharedData`, or derived persisted values such as summaries, winners, counters, leaderboards, or "post of the week" picks.

Wrong:

```jsx
const leaderboard = sharedData?.leaderboard || demoLeaderboard;
const winner = leaderboard[0] || null;

patchSharedData({ winner });
```

If `sharedData` has not loaded yet, this can persist a fake winner from fallback UI data.

Correct:

```jsx
const lastNonNullSharedDataRef = React.useRef(null);

React.useEffect(() => {
  if (sharedData !== null) {
    lastNonNullSharedDataRef.current = sharedData;
  }
}, [sharedData]);

const latest = sharedData ?? lastNonNullSharedDataRef.current;
const leaderboard = latest?.leaderboard || [];

if (!leaderboard.length) {
  return;
}

patchSharedData({
  winner: leaderboard[0],
});
```

If a write depends on stored arrays or objects, derive it from the latest real persisted state, not from fallback render state.

### Rule 4: Async Callbacks Must Read The Latest App Data From A Ref

Any callback that runs later can capture stale state. This includes `await ai()`, `.then()`, `setTimeout`, `setInterval`, `fetch()` promises, `MediaRecorder` events, upload completion handlers, and audio or video metadata callbacks.

Use this copy-pasteable pattern when async work needs to read and rewrite the latest app state:

```jsx
function App({
  data,
  setData,
  isMultiplayer,
  sharedData,
  patchSharedData,
  ai,
}) {
  const dataRef = React.useRef(data);
  const sharedDataRef = React.useRef(sharedData);

  React.useEffect(() => {
    if (data !== null) {
      dataRef.current = data;
    }
  }, [data]);

  React.useEffect(() => {
    if (sharedData !== null) {
      sharedDataRef.current = sharedData;
    }
  }, [sharedData]);

  const getLatestAppData = () =>
    (isMultiplayer ? sharedDataRef.current : dataRef.current) || {};

  const saveItems = (items) => {
    const latest = getLatestAppData();

    if (isMultiplayer) {
      patchSharedData({ items });
      return;
    }

    setData({
      ...latest,
      items,
    });
  };

  async function generateItem(prompt) {
    const result = await ai({
      intent: "chat_stream",
      messages: [{ role: "user", content: prompt }],
      stream: false,
    });

    const newItem = {
      id: `item_${Date.now()}`,
      text: result.text || "",
      createdAt: Date.now(),
    };

    const latest = getLatestAppData();
    const items = latest.items || [];

    const nextItems = items.some((item) => item.id === newItem.id)
      ? items
      : [newItem, ...items];

    saveItems(nextItems);
  }
}
```

These refs intentionally preserve the last known non-null snapshot during reconnects instead of being cleared back to `null`.

If you are only appending to a shared array, prefer `pushToSharedArray`. If you must rebuild the array after async work, read the latest value first and prepend the new item only if it is not already present.

### Rule 5: Normalize Nested `sharedData` Additively

When you normalize nested shared objects, preserve keys that are not part of the current UI selection. Rebuilding the object from only the currently selected category list will permanently drop categories that are not in that list right now.

Wrong:

```jsx
const nextNotesBySport = {};

selectedSports.forEach((sport) => {
  nextNotesBySport[sport] = sharedData?.notesBySport?.[sport] || [];
});

patchSharedData({ notesBySport: nextNotesBySport });
```

That drops previously saved categories like `tennis` or `hockey` if they are not in `selectedSports`.

Correct:

```jsx
function normalizeNotesBySport(sharedData, selectedSports) {
  const previous = sharedData?.notesBySport || {};
  const next = { ...previous };

  selectedSports.forEach((sport) => {
    next[sport] = Array.isArray(previous[sport]) ? previous[sport] : [];
  });

  return next;
}

patchSharedData({
  notesBySport: normalizeNotesBySport(sharedData, selectedSports),
});
```

If you truly want to delete a category, do it intentionally and explicitly instead of letting a normalization step erase it by omission.

## Common Mistakes

### Wrong: Assuming `user.displayName` exists

```javascript
const name = user.displayName;
```

Use `user.name`.

### Wrong: Forgetting null checks

```javascript
const score = data.highScore;
```

Use:

```javascript
const score = data?.highScore || 0;
```

### Wrong: Using `localStorage` or `sessionStorage` for app state

Mini apps should persist through platform storage helpers:

- `setData`
- `setSharedData`
- `patchSharedData`
- `setMyPersonalData`

### Wrong: Writing in render loops or hot effects

The runtime debounces and batches shared writes, and it can pause an app that gets stuck in update loops.

Prefer:

- discrete user actions
- coarse-grained patches
- atomic list appends with `pushToSharedArray`

### Wrong: Seeding shared defaults in `useEffect(() => ..., [])`

`sharedData` starts as `null` and hydrates asynchronously. A mount-time write can overwrite real session state before hydration finishes.

### Wrong: Treating `null` storage as proof that nothing has been saved

When `data` or `sharedData` is `null`, hydration may still be pending or reconnecting. Keep using the last known non-null snapshot or show a loading state instead of assuming the stored value is empty.

### Wrong: Persisting fallback demo or placeholder content

Never let demo rows, seed cards, placeholder maps, or fake leaderboards flow into `setData`, `setSharedData`, `patchSharedData`, or any derived persisted result.

### Wrong: Reusing closed-over `sharedData` after async work finishes

If a callback runs after `await ai()`, a `fetch()`, an upload, or a recorder event, read the latest state from a ref before you rebuild arrays or objects.

### Wrong: Normalizing nested shared objects by rebuilding only the current subset

Preserve untouched keys when you normalize nested objects such as `notesBySport`, `savedByUser`, or grouped media maps.

## Prompt Tips For Codegen Agents

1. Use `user.name`, not `user.displayName`.
2. Use a unified storage pattern when the app should work in solo and shared modes.
3. Use `pushToSharedArray` for append-heavy lists.
4. Include manual `_user` attribution and `_timestamp` fields for lists that need authorship.
5. Always guard `data`, `sharedData`, and `myPersonalData` with optional chaining or defaults.
6. Treat `data` and `sharedData` being `null` as "not loaded yet", not as proof that saved state is empty.
7. Never persist fallback UI content such as demo rows, seed cards, or placeholder maps.
8. Never seed `sharedData` from a mount-time effect just because it is initially `null`.
9. For async writes, mirror `data` and `sharedData` into refs and read the latest value right before saving.
10. Normalize nested shared objects additively so hidden categories do not get deleted by accident.
