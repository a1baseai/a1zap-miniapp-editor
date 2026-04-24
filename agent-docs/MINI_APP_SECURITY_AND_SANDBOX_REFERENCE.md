# Mini App Security And Sandbox Reference

This guide explains the security model for mini app code on A1Zap and the limitations builders and agents need to account for.

It is based on the current runtime implementation in:

- `src/components/micro-app/sandboxedExecution.ts`
- `src/components/micro-app/MicroAppRuntimeSucrase.tsx`
- `src/components/micro-app/SandboxedMicroAppPreview.tsx`
- `src/app/api/micro-apps/proxy/route.ts`

## Security Model

Mini app code is not treated like trusted app code.

The platform protects users with several layers:

1. Static validation blocks dangerous patterns before code executes.
2. Sanitization rewrites a few risky constructs as defense in depth.
3. Runtime globals are restricted so dangerous browser APIs are missing or stubbed.
4. Network access is limited to a proxy-backed fetch bridge.
5. Preview uses an even stricter iframe sandbox than the live runtime.

## What Gets Blocked Before Execution

The validator blocks code patterns that could lead to sandbox escapes, exfiltration, or remote code execution.

Examples of blocked patterns include:

- `eval()`
- `new Function(...)`
- `Function("...")`
- `setTimeout("...")`
- `setInterval("...")`
- `XMLHttpRequest`
- `WebSocket`
- `navigator.sendBeacon`
- `document.cookie`
- `document.write`
- script element creation
- `.innerHTML = ...`
- `.outerHTML = ...`
- `localStorage`
- `sessionStorage`
- `indexedDB`
- `window.open(...)`
- `window.location = ...`
- `window.location.assign(...)`
- `window.location.replace(...)`
- `window.parent`, `window.top`, `window.frames`, `window.opener`
- dynamic `import()`
- `__proto__`
- `Object.setPrototypeOf`
- constructor-chain access like `.constructor.constructor`
- `AsyncFunction`, `GeneratorFunction`, `AsyncGeneratorFunction`
- `String.fromCharCode`
- `String.fromCodePoint`
- `atob()`
- `btoa()`
- `Proxy`
- `Reflect`
- `WebAssembly`
- `Atomics`
- `SharedArrayBuffer`
- `with (...)`
- `globalThis`

The validator also blocks:

- code over `500_000` characters
- suspicious control characters
- Unicode or hex escape attempts such as `\u0065val`

## What Only Generates Warnings

Some patterns are allowed but flagged because they are fragile or easy to misuse:

- `document.querySelector`
- `document.getElementById`
- `setTimeout(...)`
- `setInterval(...)`
- computed property function calls like `obj[key](...)`

Warnings do not block execution, but generated code should still avoid them unless there is a strong reason.

## Runtime Sandbox: What App Code Actually Sees

Even if code passes validation, mini app code still runs with restricted globals.

### Blocked Or Missing Globals

Inside mini app code, these are blocked, stubbed, or `undefined`:

- `eval`
- `Function`
- `XMLHttpRequest`
- `WebSocket`
- `localStorage`
- `sessionStorage`
- `indexedDB`
- `globalThis`
- `self`
- `top`
- `parent`
- `frames`
- `location`
- `history`
- `navigator`
- `postMessage`
- `BroadcastChannel`
- `MessageChannel`
- `Worker`
- `SharedWorker`
- `Proxy`
- `Reflect`
- `WebAssembly`
- `Atomics`
- `SharedArrayBuffer`
- `atob`
- `btoa`

That means mini app code should not depend on raw browser navigation, storage, worker, or low-level metaprogramming APIs.

### Window And Document Are Restricted

Mini app code gets a limited `window` and `document`.

Allowed or wrapped:

- `requestAnimationFrame`
- `cancelAnimationFrame`
- function-based timers
- safe viewport reads like `innerWidth`, `innerHeight`, `visualViewport`, and `screen`
- limited event listeners through an allowlist
- console methods

Blocked or missing:

- `window.open`
- `window.location`
- `window.parent`
- `window.top`
- `window.frames`
- `window.opener`
- `window.postMessage`
- `document.write`
- `document.writeln`
- `document.createElement`

`document.documentElement` and `document.body` exist only through limited proxies for layout reads, not full DOM control.

## Event Listener Limitations

Mini apps can subscribe to many normal interaction events, including:

- keyboard events
- mouse and pointer events
- touch events
- focus events
- form events
- resize and scroll
- animation and transition events
- drag events
- gamepad events
- `message` and `messageerror`

Explicitly blocked event types include:

- `storage`
- `beforeunload`
- `unload`
- `hashchange`
- `popstate`
- `pagehide`
- `pageshow`
- `devicemotion`
- `deviceorientation`

In practice:

- normal app interactivity is fine
- navigation interception and sensor-heavy code are not

## Network Security And `fetch()` Limitations

Mini app code does not get arbitrary network access.

The runtime only exposes `fetch()` through a fetch bridge, and that bridge allows:

- `GET`
- `POST`

Requests are only allowed to:

- the first-party mini app proxy path: `/api/micro-apps/proxy`
- specific allowlisted upstream domains that are transparently rewritten into proxy calls

Current allowlisted upstreams in the proxy route are:

- MapTiler
- Algolia

### Proxy Limits

The proxy layer currently enforces:

- upstream allowlists
- path-prefix allowlists
- method allowlists
- upstream timeouts
- max request body size of `64KB`
- max response size of `1MB`

The fetch bridge itself also enforces a client-side timeout of `15s`.

### Practical Rule

If your app needs data from outside the runtime:

- use a first-party proxy-backed fetch flow
- or use a platform helper like `ai()`, upload helpers, or other injected runtime APIs

Do not assume direct browser fetch to arbitrary third-party APIs will work.

## Auth And Secrets

Mini apps run client-side. Do not put secrets in generated app code.

Important rules:

- never embed API keys in mini app source
- never rely on hidden client secrets
- never assume browser storage is available for secure token persistence
- use runtime helpers such as `ai`, `uploadImage`, `uploadAudio`, `uploadVideo`, and `openAuth`

The platform handles auth-sensitive flows through first-party routes and runtime bridges.

## Safe Alternatives To Blocked APIs

| Do not use | Use instead |
| --- | --- |
| `localStorage`, `sessionStorage` | `data`, `setData`, `sharedData`, `setSharedData`, `patchSharedData`, `myPersonalData`, `setMyPersonalData` |
| `window.open`, `window.location` | `openProfile`, `openAuth`, or host-provided surface actions |
| direct image/audio/video URLs as long-term state | asset refs plus `resolveImageUrl`, `getAudioUrl`, `getVideoUrl` |
| third-party AI SDKs | runtime `ai()` |
| arbitrary external uploads | runtime upload helpers |
| `navigator.geolocation` | `getCurrentLocation()` when the app explicitly enables location |
| `innerHTML` / `outerHTML` | normal React rendering |
| `XMLHttpRequest` / `WebSocket` | proxy-backed `fetch()` when supported |

## Preview Security Versus Live Runtime

The editor preview is stricter than the live runtime.

`SandboxedMicroAppPreview` runs mini apps in an iframe with:

- `sandbox="allow-scripts"`
- no `allow-same-origin`
- `allow="accelerometer 'none'; camera 'none'; fullscreen 'none'; geolocation 'none'; microphone 'none'"`

This means preview code cannot:

- access parent storage
- access parent cookies
- access the parent DOM
- make authenticated requests as the logged-in user
- use camera, microphone, geolocation, or fullscreen inside preview

Important practical limitation:

- something can work in the live runtime through platform helpers and still be unavailable in preview because preview intentionally denies more browser capabilities

## Security Limitations Builders Should Expect

These are the main limitations that often surprise builders:

### 1. Browser APIs Are Not A Stable Contract

Even if a browser API exists on the real page, the mini app sandbox may shadow it to `undefined`.

### 2. Direct Navigation Is Not Yours To Control

Mini apps should not redirect the page, open new windows, or manipulate browser history.

### 3. Arbitrary Third-Party Networking Is Not Supported

Use the proxy path or approved runtime helpers instead of assuming open internet access from app code.

### 4. Secrets Cannot Be Hidden In Client Code

Anything inside the generated app bundle should be treated as public.

### 5. DOM Escape Hatches Are Intentionally Limited

Direct DOM construction and raw HTML injection are blocked because React rendering is the supported model.

### 6. Preview And Runtime Are Not Identical

Preview is intentionally harsher, so media capture, auth-sensitive flows, and some live integrations may only be testable in the real runtime surface.

## Common Security Mistakes

### Wrong: Using raw browser storage

```javascript
localStorage.setItem("token", "...");
```

### Correct

```javascript
setData({
  ...(data || {}),
  savedValue: "..."
});
```

### Wrong: Redirecting from inside app code

```javascript
window.location.assign("/somewhere");
```

### Correct

Use a platform helper or host surface flow such as `openAuth(...)`.

### Wrong: Calling arbitrary APIs directly

```javascript
await fetch("https://random-api.example.com/data");
```

### Correct

Use a proxy-backed request path or a platform helper that already runs through first-party infrastructure.

### Wrong: Building HTML strings and injecting them

```javascript
container.innerHTML = html;
```

### Correct

Render with React components.

## Security Checklist For Agents

When generating mini app code:

1. Avoid raw browser storage, navigation, workers, and low-level globals.
2. Prefer runtime helpers over browser APIs.
3. Keep all secrets out of app code.
4. Assume preview is more locked down than production runtime.
5. Store asset refs, not transient URLs.
6. Use React rendering, not HTML injection.
7. If networking is required, make sure it can run through the first-party proxy model.
