# Mini App Games And Score Sync Reference

A practical guide for engineers and AI agents building games on A1Zap.

---

## Core Principle

Build games to be social-first, but fully playable solo.

The best mini app games get more valuable as more people join, more scores accumulate, or more shared history builds up over time. That does not mean every game should require a live shared session. Solo play should still feel complete, and shared play should make the game richer rather than merely usable.

For this runtime, the safest default is:

- keep the active game loop local
- persist outcomes, checkpoints, and summaries
- use shared state for coordination and results, not for every in-game action

---

## Quick Rules

| Do This | Why |
| --- | --- |
| Keep active play state in React state | Avoids write pressure during gameplay |
| Use `setData` for solo progress and best scores | Persists private results without needing a shared session |
| Use `setSharedData` or `patchSharedData` only for meaningful shared transitions | Shared storage works best for coarse coordination |
| Use `pushToSharedArray` for leaderboard submissions and result feeds | Atomic append is the safest path for shared score lists |
| Use `myPersonalData` for per-player stats in shared sessions | Lets each player keep private progress without polluting shared state |
| Add `_user` and `_timestamp` to score entries | Makes leaderboards attributable and sortable |
| Treat `data` and `sharedData` being `null` as loading or reconnect state | `null` does not mean there is no saved game data |
| Never persist demo leaderboards, placeholder winners, or fallback score rows | Fallback UI content must stay render-only |
| Prefer async, turn-based, or round-based shared play over constant shared simulation | Fits the runtime better than per-frame syncing |

---

## Runtime Behaviors That Matter

Current runtime behavior already pushes builders toward coarse-grained shared writes:

- `setSharedData` is debounced, so it should be treated as a coarse full-state replacement rather than a real-time transport.
- `patchSharedData` is throttled and batched, so it is best for meaningful state transitions instead of the gameplay loop.
- High-frequency shared writes are treated as a bug signal and can trigger runtime warnings.
- Higher-contention shared sessions use queued writes under the hood.
- Rate-limit cooldowns exist, so excessive shared write volume can lead to skipped or delayed updates.

At the time of writing, the runtime debounces `setSharedData` by about 500ms, batches `patchSharedData` about every 200ms, and warns when shared write calls get into very high frequency territory. Use those protections as a safety net, not as the architecture for a real-time game loop.

The practical takeaway is simple: sync outcomes, not every action.

Hydration matters too:

- `data` and `sharedData` can be `null` before hydration completes and during brief reconnects
- treat that as "not loaded yet", not as proof there is no saved leaderboard, board state, or run history
- keep using the last known non-null snapshot when possible or show a loading or sync state

---

## Recommended Architecture Patterns

### Pattern 1: Local Gameplay, End-Of-Run Submission

This is the default pattern for arcade games, puzzles, quizzes, reaction games, and score chasers.

- Keep score, timers, combos, physics, and moment-to-moment state local.
- Save private progress or best score with `setData`.
- Submit the finished run to a shared leaderboard only when the round ends.

```jsx
function App({
  data,
  setData,
  pushToSharedArray,
  user,
}) {
  const [runScore, setRunScore] = useState(0);
  const [lives, setLives] = useState(3);

  const bestScore = data?.bestScore || 0;

  const finishRun = () => {
    const finalScore = runScore;

    setData({
      ...data,
      bestScore: Math.max(bestScore, finalScore),
      lastRun: {
        score: finalScore,
        endedAt: Date.now(),
      },
    });

    pushToSharedArray?.("leaderboard", {
      score: finalScore,
      _user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
      },
      _timestamp: Date.now(),
    });

    setRunScore(0);
    setLives(3);
  };

  // Keep active gameplay state local while the run is in progress.
}
```

Use this when the social layer is about comparing outcomes, not sharing every intermediate event.

### Pattern 2: Turn-Based Shared Commits

This is a strong fit for board games, card games, async strategy, and social puzzle games.

- Let players think, drag, aim, or preview locally.
- Write to shared state only when the player commits a move.
- Store shared turn data, board state, or round status in `sharedData`.

```jsx
function App({ sharedData, patchSharedData, members, user }) {
  const board = sharedData?.board || Array(9).fill(null);
  const currentTurn = sharedData?.currentTurn || members?.[0]?.id;

  const commitMove = (index) => {
    if (currentTurn !== user.id || board[index]) return;

    const nextBoard = [...board];
    nextBoard[index] = user.id;

    const nextPlayer =
      members?.find((member) => member.id !== user.id)?.id || user.id;

    patchSharedData({
      board: nextBoard,
      currentTurn: nextPlayer,
      lastMove: {
        index,
        userId: user.id,
        at: Date.now(),
      },
    });
  };
}
```

Do not patch shared state while the player is hovering, dragging, or animating the move.

### Pattern 3: Shared Session, Private Progress

Use `myPersonalData` when players share a room but some progress should remain private to each person.

Examples:

- practice streaks inside a multiplayer trivia room
- a player-specific deck, loadout, or upgrade path
- private run history during a shared weekly challenge

```jsx
function App({ myPersonalData, setMyPersonalData, pushToSharedArray, user }) {
  const bestScore = myPersonalData?.bestScore || 0;

  const finishChallengeRun = (score) => {
    setMyPersonalData({
      ...myPersonalData,
      bestScore: Math.max(bestScore, score),
      runsPlayed: (myPersonalData?.runsPlayed || 0) + 1,
      lastPlayedAt: Date.now(),
    });

    pushToSharedArray?.("submissions", {
      score,
      _user: {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
      },
      _timestamp: Date.now(),
    });
  };
}
```

### Pattern 4: Async Social Challenges

This is often a better fit than trying to sync active play in real time.

Good social layers that do not create unnecessary write pressure:

- leaderboards
- daily or weekly challenges
- streaks
- rematch or challenge invites
- community score goals
- append-only match history
- result feeds showing who finished what

These patterns make a game feel social without turning shared storage into a live simulation channel.

---

## What To Persist Vs Keep Local

### Usually Keep Local

- current movement or cursor position
- physics state
- animation state
- timer ticks
- combo counters while a run is active
- drag or hover previews
- rapidly changing score increments

### Usually Persist

- end-of-run score
- best score
- checkpoint reached
- match result
- current turn owner
- board state after a committed move
- lobby membership choices
- challenge submission
- append-only result history

If a value changes many times per second, it probably belongs in local state.

---

## Anti-Patterns

### Wrong: Syncing Every Score Change

```jsx
const collectCoin = () => {
  const nextScore = score + 1;
  setScore(nextScore);
  patchSharedData({ score: nextScore });
};
```

Better:

- keep the live score local during the run
- submit the final score or checkpoint later

### Wrong: Writing On Every Timer Tick

```jsx
useEffect(() => {
  const id = setInterval(() => {
    patchSharedData({ elapsedMs: Date.now() - startTime });
  }, 100);

  return () => clearInterval(id);
}, [startTime, patchSharedData]);
```

Better:

- keep the timer local
- write only when the round ends or a checkpoint is reached

### Wrong: Using Shared State For A Real-Time Simulation

```jsx
patchSharedData({
  playerX,
  playerY,
  velocity,
  angle,
});
```

Better:

- keep transient simulation state local
- use shared writes for turn commits, round transitions, or final outcomes

### Wrong: Replacing The Whole Shared Object For Minor Game Events

```jsx
setSharedData({
  ...sharedData,
  coinsCollected,
  combo,
  timerMs,
  playerState,
});
```

Better:

- use local state for active play
- use `patchSharedData` only for coarse shared transitions
- use `pushToSharedArray` for append-only score or result events

### Wrong: Persisting A Winner From Fallback Leaderboard UI

```jsx
const leaderboard = sharedData?.leaderboard || demoLeaderboard;
const weeklyWinner = leaderboard[0] || null;

patchSharedData({ weeklyWinner });
```

Better:

- render fallback rows only for UI
- derive persisted winners from the latest real stored leaderboard
- if the leaderboard has not loaded yet, wait instead of saving placeholder data

---

## Recommended Game Shapes For This Runtime

These tend to work especially well:

- arcade games with end-of-run leaderboards
- trivia and quiz games
- puzzle games with challenge submissions
- turn-based games
- async competitive games
- party games that resolve in rounds
- community goal or score-attack games

These require more care:

- games that try to mirror every player action into shared storage
- twitch-action multiplayer with a continuously shared world state
- designs that depend on sub-second shared updates for core gameplay

When possible, redesign those games around turns, rounds, checkpoints, or result submission.

---

## Prompting Guidance For Builders And Agents

When prompting an AI builder or generating code for a game, ask for patterns like these:

1. Build this as a social-first game that still works completely solo.
2. Keep the active gameplay loop in local React state.
3. Persist only checkpoints, end-of-run summaries, match outcomes, or final scores.
4. Use `setData` for solo progress and `myPersonalData` for per-player private progress in shared sessions.
5. Use `pushToSharedArray` for leaderboard entries, match history, or result feeds.
6. Include `_user` and `_timestamp` on appended score or result objects.
7. Avoid calling `setSharedData` or `patchSharedData` on every move, frame, timer tick, or collision.
8. Prefer async, turn-based, or round-based multiplayer over constant shared simulation.
9. Treat `data` and `sharedData` being `null` as "not loaded yet", not as empty game state.
10. Never derive persisted winners, summaries, or leaderboard picks from fallback demo rows.

Good phrasing:

- "Sync outcomes, not every action."
- "Keep moment-to-moment play local and persist only meaningful shared state transitions."
- "Make the game feel richer with more people or more score history, while still being fully playable solo."

---

## Final Recommendation

If you are unsure, use this default:

1. Keep the live game loop local.
2. Save private progress with `setData`.
3. Use `myPersonalData` for per-player stats in shared rooms.
4. Use `patchSharedData` only for meaningful room state changes.
5. Use `pushToSharedArray` for score submissions and append-only social history.
6. Do not let fallback leaderboard UI become persisted game data.

That pattern fits the runtime well, scales better under load, and still gives you a social game that gets better as more people or more data show up.
