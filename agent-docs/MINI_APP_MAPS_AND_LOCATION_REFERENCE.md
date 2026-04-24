# Mini App Maps And Location Reference

A practical guide for engineers and AI agents building map-first mini apps on A1Zap.

This guide is based on current runtime behavior in:

- `src/components/micro-app/MicroAppRuntimeSucrase.tsx`
- `src/components/micro-app/sandboxedExecution.ts`
- `src/app/api/micro-apps/proxy/route.ts`

---

## Core Principle

Build map apps to be social-first, but fully usable solo.

The best mini app maps get more useful as more people add check-ins, labels, votes, wishlists, media, or local knowledge. They should still work for one person exploring alone on day one.

Good map apps on this runtime usually follow this split:

- keep live map interaction local
- persist user-generated places, labels, votes, check-ins, and summaries
- make shared data enrich the experience instead of blocking solo use

---

## What Works Well

Map-first mini apps are a strong fit for:

- place explorers and recommendation maps
- campus, event, or neighborhood guides
- collaborative vibe maps and label maps
- wishlist and planning maps
- check-in or "been here / want to go" maps
- social maps with comments, photos, audio, or video attached to places

These are especially strong when the app becomes more valuable as people contribute:

- saved spots
- ratings or votes
- comments and replies
- check-ins
- media
- activity history

---

## Quick Rules

| Do This | Why |
| --- | --- |
| Keep pan, zoom, hover, drag, and selected viewport local | These change too often to belong in persisted shared state |
| Persist places, labels, votes, check-ins, and media metadata | These are durable contributions that should survive reloads |
| Use `getCurrentLocation()` only when location is enabled | Location is opt-in and not always injected |
| Use proxy-backed `fetch()` for geocoding or external map search | Arbitrary direct API access is not the runtime model |
| Do not hardcode provider API keys in app source | Mini apps run client-side and source should be treated as public |
| Use `pushToSharedArray` for append-only activity feeds | It is the safest shared write path for social event streams |
| Use `patchSharedData` for coarse map data updates, not viewport chatter | Shared writes are throttled and should represent meaningful state |
| Treat `data` and `sharedData` being `null` as loading or reconnect state | `null` does not mean there are no saved places yet |
| Never persist placeholder places, fallback markers, or demo map summaries | Fallback UI content must stay render-only |
| If available, mark map-first apps as `appType: "map"` | The host/runtime treats map-first apps more safely on activation |

---

## Runtime Features That Matter For Maps

### Storage And Social State

Use the normal mini app storage model:

- `data` and `setData` for solo/private map state
- `sharedData`, `setSharedData`, and `patchSharedData` for shared map state
- `pushToSharedArray` for append-only shared activity
- `myPersonalData` for private per-user state inside a shared map session

For map apps, this usually means:

- solo state stores saved spots, personal notes, or recent searches
- shared state stores place records, labels, votes, or check-ins
- personal shared state stores private preferences or per-user progress

### Location

`getCurrentLocation()` is only injected when the app explicitly enables location in its config.

If location is not enabled, the function is not available.

```jsx
async function centerOnCurrentUser(getCurrentLocation) {
  if (!getCurrentLocation) return null;

  const location = await getCurrentLocation({
    enableHighAccuracy: true,
    timeout: 10000,
  });

  return {
    lat: location.latitude,
    lng: location.longitude,
  };
}
```

### Proxy-Backed External Data

For map search, geocoding, or other external lookups, use proxy-backed `fetch()`.

Current allowlisted upstreams include MapTiler and Algolia. For MapTiler, the proxy currently allows `/geocoding` and `/tiles`.

```jsx
async function searchPlaces(query) {
  const path = `/geocoding/${encodeURIComponent(query)}.json`;
  const params = new URLSearchParams({
    limit: "6",
    language: "en",
  });

  const response = await fetch(
    `/api/micro-apps/proxy?upstream=maptiler&path=${encodeURIComponent(path)}&${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Map search failed");
  }

  return response.json();
}
```

Do not embed provider secrets in app code. If you see older examples with inline map API keys, treat that as legacy and not the recommended pattern.

### Map-First App Type

The runtime has special activation handling for apps whose metadata is marked as `map`.

If the builder/runtime path exposes app metadata or magic spec fields, prefer setting map-first experiences to:

```javascript
appType: "map"
```

This helps the host recover fit-to-container map runtimes more safely when they become active.

---

## Recommended Map Architectures

### Pattern 1: React App Owns State, Embedded Map Owns Map DOM

This is the most proven pattern for map-heavy mini apps.

- The React app owns filters, selected place, social data, uploads, and panels.
- The map library lives inside an `iframe srcDoc` shell.
- The iframe sends click or cluster events to the parent.
- The parent sends render updates back into the iframe.

This works well for Leaflet-style maps, heavy marker layers, and highly custom map DOM.

```jsx
const MAP_HTML = `
<!DOCTYPE html>
<html>
  <body>
    <div id="map"></div>
    <script>
      window.onmessage = function (event) {
        const msg = event.data || {};
        if (msg.type === "render") {
          // render pins or update selected state
        }
      };

      function emitPinClick(id) {
        try {
          window.parent.postMessage({ type: "pin-click", id }, "*");
        } catch (_) {}
      }
    <\/script>
  </body>
</html>`;

function App({ data, setData }) {
  const [selectedId, setSelectedId] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const frameRef = useRef(null);

  useEffect(() => {
    if (!mapReady || !frameRef.current?.contentWindow) return;

    frameRef.current.contentWindow.postMessage({
      type: "render",
      pins: data?.pins || [],
      selectedId,
    }, "*");
  }, [mapReady, data, selectedId]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "pin-click") {
        setSelectedId(event.data.id);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <iframe
      ref={frameRef}
      srcDoc={MAP_HTML}
      sandbox="allow-scripts allow-same-origin"
      onLoad={() => setMapReady(true)}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}
```

Practical note:

- keep the bridge small
- send render payloads or selected IDs
- do not try to mirror every pointer event back into persisted app state

### Pattern 2: Social Place Guide On Top Of A Map

This is a strong default for recommendation maps and travel/campus maps.

Persist stable place-level state such as:

- wishlisted or saved
- interested / been here
- notes
- comments
- uploaded media

Keep local UI state for:

- open panels
- current search text
- selected marker
- active cluster
- temporary resolved URLs
- map camera state

Recommended storage split:

- `data` for solo saved places and notes
- `sharedData` for shared place records and aggregate check-ins
- `pushToSharedArray` for social activity such as "Alice wishlisted this place"

### Pattern 3: Collaborative Label Or Vibe Map

This is a strong fit for campus maps, neighborhood maps, event heatmaps, and collaborative tagging.

Persist:

- snapped cells or normalized coordinates
- label objects
- votes
- totals
- authorship

Keep local:

- current brush or category selection
- active tool
- hover preview
- drag strokes
- temporary draft labels

For collaborative maps, prefer normalized data models like:

- snapped grid cells
- label records
- per-user votes

instead of persisting raw freehand pointer streams.

---

## What To Persist Vs Keep Local

### Usually Keep Local

- current map center
- current zoom level
- hover state
- drag state
- cluster expansion UI
- brush preview
- search box text
- selected tab or open sheet state
- temporary geocoder results

### Usually Persist

- place records
- label text and coordinates
- place categories
- per-place notes
- check-ins
- votes
- wishlists
- comments and replies
- uploaded media metadata
- append-only activity history

If a value changes continuously as someone pans, zooms, drags, or hovers, it usually belongs in local component state.

---

## Social Data Patterns That Fit Maps Well

### Unified Solo + Shared Storage

Many map apps should work in solo or shared mode with the same UI.

```jsx
function App({
  data,
  setData,
  isMultiplayer,
  sharedData,
  patchSharedData,
  pushToSharedArray,
  user,
}) {
  const appData = isMultiplayer ? sharedData : data;

  const savePatch = (patch) => {
    if (isMultiplayer) {
      patchSharedData?.(patch);
      return;
    }

    setData({
      ...(appData || {}),
      ...patch,
    });
  };

  const toggleSaved = (placeId) => {
    const savedByUser = { ...(appData?.savedByUser || {}) };
    savedByUser[placeId] = !savedByUser[placeId];
    savePatch({ savedByUser });

    if (isMultiplayer && pushToSharedArray && savedByUser[placeId]) {
      pushToSharedArray("activity", {
        type: "saved-place",
        placeId,
        _user: {
          id: user.id,
          name: user.name,
          handle: user.handle,
          avatarUrl: user.avatarUrl,
        },
        _timestamp: Date.now(),
      });
    }
  };
}
```

If `data` or `sharedData` is `null`, hydration may still be pending or reconnecting. Keep using the last known non-null snapshot when possible or show a loading or sync state instead of treating `null` as an empty map.

### Per-Place Social Layer

Great map apps often attach small social objects to place IDs:

- `checkinsByPlaceId`
- `commentsByPlaceId`
- `photosByPlaceId`
- `audioByPlaceId`
- `videoByPlaceId`
- `votesByPlaceId`
- `wishlistByUserId`

This keeps the map model simple and makes panels easy to render.

### Media On Places

If users can upload media to a place:

- store asset refs or asset IDs, not temporary playback URLs
- resolve playback URLs at render time with `getImageUrl`, `getAudioUrl`, or `getVideoUrl`
- attach `_user` and `_timestamp` metadata so contributions feel social and attributable

Cross-reference:

- [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md)

---

## Performance And Shared Write Rules

Map apps can accidentally create write storms if they persist live interaction.

Do not persist:

- every pan
- every zoom
- every drag point
- every hover
- every pointer move
- every intermediate brush sample as a separate shared write

Prefer:

- local interaction state during map use
- snapped or normalized map contributions
- batched or coarse shared updates
- append-only event feeds for social history

### Wrong: Persisting Viewport Chatter

```jsx
map.on("move", () => {
  patchSharedData({
    center: map.getCenter(),
    zoom: map.getZoom(),
  });
});
```

Better:

- keep viewport local
- persist only user-created places, labels, votes, or meaningful state changes

### Wrong: Persisting Placeholder Places Or Fallback Picks

```jsx
const places = appData?.places || demoPlaces;
const featuredPlace = places[0] || null;

savePatch({ featuredPlace });
```

Better:

- use placeholder places only for rendering
- derive persisted featured places, summaries, or map picks from the latest real stored place data
- if persisted map data has not loaded yet, wait instead of saving fallback content

### Wrong: Shared Writes On Every Paint Sample

```jsx
const onBrushMove = (lat, lng) => {
  patchSharedData({ lastBrushPoint: { lat, lng } });
};
```

Better:

- keep brush movement local
- convert the finished stroke into snapped cells or a normalized result
- save that coarse result instead of the raw stream

### Good Shared Events For Maps

- place created
- label saved
- vote submitted
- check-in added
- comment posted
- media attached
- wishlist entry added
- social activity appended

---

## Preview And Sandbox Limitations

Map builders should account for three important constraints:

### 1. Preview Is Stricter Than Live Runtime

Preview denies geolocation, camera, microphone, and some other browser capabilities. A location-aware map can render in preview but still need live runtime testing for:

- `getCurrentLocation()`
- media capture
- auth-sensitive flows

### 2. External Data Must Follow The Runtime Model

Do not assume direct browser `fetch()` to arbitrary mapping providers will work. Use:

- `/api/micro-apps/proxy`
- allowlisted upstreams
- runtime helpers

### 3. Do Not Put Secrets In The App

Never hardcode map provider keys or other secrets in generated app source.

If you need geocoding or tiles from a keyed provider:

- prefer server-configured proxy access
- or choose a public/provider-approved non-secret setup

Cross-reference:

- [MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md](MINI_APP_SECURITY_AND_SANDBOX_REFERENCE.md)

---

## Recommended Social Map Shapes

These tend to work especially well on this runtime:

- exchange or travel explorer maps
- campus vibe maps
- best-of neighborhood maps
- study spot maps
- food finder maps
- event or festival maps
- collaborative place tagging maps
- check-in and memory maps

These require more care:

- fully real-time shared cursor or pointer maps
- apps that try to persist every map camera change
- apps that depend on continuous multi-user live movement sync

When possible, redesign those around durable contributions rather than constant shared motion.

---

## Prompting Guidance For Builders And Agents

When prompting an AI builder for a map app, ask for patterns like these:

1. Build this as a social-first map that still works fully solo.
2. Keep pan, zoom, hover, and temporary selection state local.
3. Persist only durable place data such as labels, check-ins, votes, notes, or media.
4. If the map is heavy or highly custom, use an `iframe srcDoc` map shell with a small message bridge back to the React app.
5. If location is needed, require `getCurrentLocation()` and gracefully handle it being unavailable.
6. Use proxy-backed `fetch()` for geocoding or place search.
7. Never embed provider secrets directly in the app source.
8. Use `pushToSharedArray` for append-only social activity and `patchSharedData` for coarse place updates.
9. Treat `data` and `sharedData` being `null` as "not loaded yet", not as an empty place dataset.
10. Never let demo places, placeholder markers, or fallback summaries become persisted map data.

Good phrasing:

- "Keep live map interaction local and persist only durable map contributions."
- "Make the map more useful as people add knowledge, but still valuable for one person alone."
- "Use shared state for places, labels, votes, check-ins, and media, not for every pan or drag."

---

## Final Recommendation

If you are unsure, use this default:

1. Build the map to work solo first, then make shared contributions additive.
2. Keep the map viewport and interaction state local.
3. Persist places, labels, votes, check-ins, and media metadata.
4. Use `getCurrentLocation()` only when the app explicitly enables location.
5. Use proxy-backed fetch for geocoding and search.
6. Use append-only shared activity for social proof and history.
7. Do not persist placeholder map data just because stored data has not loaded yet.

That pattern fits the runtime well, keeps map UX smooth, and gives you a map app that gets better as more people or more place data show up.
