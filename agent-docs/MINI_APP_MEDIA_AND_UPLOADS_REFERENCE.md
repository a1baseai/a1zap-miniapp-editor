# Mini App Media And Uploads Reference

This guide covers the runtime helpers for image, audio, and video uploads inside mini apps.

It reflects the current web runtime behavior in `MicroAppRuntimeSucrase.tsx`, including camera and microphone capture support.

## Availability

These helpers are runtime-injected props.

Recommended signature:

```javascript
function App({
  user,
  isMultiplayer,
  data,
  setData,
  sharedData,
  patchSharedData,
  myPersonalData,
  setMyPersonalData,
  uploadImage,
  pickAndUploadPhoto,
  resolveImageUrl,
  getImageUrl,
  uploadAudio,
  pickAndUploadAudio,
  getAudioUrl,
  uploadVideo,
  pickAndUploadVideo,
  getVideoUrl,
}) {
  // ...
}
```

### Important Scope Notes

- Image uploads work in solo or shared apps.
- Audio and video uploads also work in solo or shared apps, but `target: "shared"` requires an actual shared instance.
- Be explicit about `target` and `visibility` instead of relying on defaults.

## Helper Reference

| Helper | What It Does | Result |
| --- | --- | --- |
| `uploadImage(file, options)` | Upload an image `Blob` or `File` | Wrapped asset ref |
| `pickAndUploadPhoto(options)` | Open camera or library, then upload | Flat `{ assetId, visibility, publicUrl? }` or `{ cancelled: true }` |
| `resolveImageUrl(assetRef)` | Resolve a URL from an image asset ref or URL string | `string` |
| `getImageUrl(assetId)` | Resolve a URL from an image asset ID | `string` |
| `uploadAudio(file, options)` | Upload audio `Blob` or `File` | Wrapped asset ref |
| `pickAndUploadAudio(options)` | Open microphone or file picker, then upload | Flat `{ assetId, visibility, publicUrl? }` or `{ cancelled: true }` |
| `getAudioUrl(assetId)` | Resolve a playable URL for an audio asset | `string` |
| `uploadVideo(file, options)` | Upload video `Blob` or `File` | Wrapped asset ref |
| `pickAndUploadVideo(options)` | Open camera capture or file picker, then upload | Flat `{ assetId, visibility, publicUrl? }` or `{ cancelled: true }` |
| `getVideoUrl(assetId)` | Resolve a playable URL for a video asset | `string` |

## Result Shapes

### Wrapped Upload Helpers

`uploadImage`, `uploadAudio`, and `uploadVideo` return a wrapped asset reference:

```javascript
{
  assetRef: {
    assetId,
    visibility,
    publicUrl?
  },
  uploadId?,
  objectKey?,
  visibility,
  publicUrl?
}
```

### Picker Helpers

`pickAndUploadPhoto`, `pickAndUploadAudio`, and `pickAndUploadVideo` return:

```javascript
{ assetId, visibility, publicUrl? }
```

or:

```javascript
{ cancelled: true }
```

## Supported Types And Limits

### Images

- Max size: `10MB`
- Supported types:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`
  - `image/heic`
  - `image/heif`

### Audio

- Max size: `25MB`
- Supported types:
  - `audio/webm`
  - `audio/mp4`
  - `audio/x-m4a`
  - `audio/m4a`
  - `audio/mpeg`
  - `audio/mp3`
  - `audio/wav`

### Video

- Max size: `100MB`
- Supported types:
  - `video/mp4`
  - `video/webm`
  - `video/quicktime`
  - `video/x-m4v`

## Options

### Shared Options

```javascript
{
  target?: "shared" | "personal",
  visibility?: "public" | "instance_private",
  sha256?: string
}
```

### Image Upload Options

```javascript
{
  target?: "shared" | "personal",
  visibility?: "public" | "instance_private",
  sha256?: string,
  width?: number,
  height?: number
}
```

### Audio Upload Options

```javascript
{
  target?: "shared" | "personal",
  visibility?: "public" | "instance_private",
  source?: "microphone" | "files",
  sha256?: string,
  durationMs?: number,
  originalFilename?: string,
  metadata?: Record<string, unknown>
}
```

### Video Upload Options

```javascript
{
  target?: "shared" | "personal",
  visibility?: "public" | "instance_private",
  source?: "camera" | "files",
  sha256?: string,
  durationMs?: number,
  width?: number,
  height?: number,
  originalFilename?: string,
  metadata?: Record<string, unknown>
}
```

### Photo Picker Source Values

For `pickAndUploadPhoto`, the runtime supports:

```javascript
{
  source?: "library" | "camera"
}
```

## Visibility And Target

- `target: "shared"` means the asset belongs to the shared session flow.
- `target: "personal"` means the asset belongs to the current user.
- `visibility: "public"` means a public URL can be returned directly.
- `visibility: "instance_private"` means playback goes through signed URL resolution.

Recommended defaults for user-generated media inside shared apps:

```javascript
{
  target: "shared",
  visibility: "instance_private"
}
```

Recommended defaults for solo/private apps:

```javascript
{
  target: "personal",
  visibility: "instance_private"
}
```

## Most Common Patterns

### Pattern 1: Upload A Photo And Store The Asset Ref

```javascript
function App({ data, setData, pickAndUploadPhoto }) {
  async function addPhoto() {
    const result = await pickAndUploadPhoto({
      source: "library",
      target: "personal",
      visibility: "instance_private",
    });

    if (result.cancelled) return;

    setData({
      ...(data || {}),
      photo: {
        assetId: result.assetId,
        visibility: result.visibility,
        publicUrl: result.publicUrl,
      },
    });
  }

  return <button onClick={addPhoto}>Add photo</button>;
}
```

### Pattern 2: Resolve A Private Image For Playback

```javascript
function App({ data, resolveImageUrl }) {
  const [imageUrl, setImageUrl] = React.useState(null);

  React.useEffect(() => {
    async function load() {
      if (!data?.photo || !resolveImageUrl) return;
      const url = await resolveImageUrl(data.photo);
      setImageUrl(url);
    }

    load();
  }, [data?.photo, resolveImageUrl]);

  return imageUrl ? <img src={imageUrl} alt="" /> : null;
}
```

### Pattern 3: Record And Upload A Voice Note

```javascript
function App({ sharedData, patchSharedData, pickAndUploadAudio, getAudioUrl }) {
  const [audioUrl, setAudioUrl] = React.useState(null);

  async function addVoiceNote() {
    const result = await pickAndUploadAudio({
      source: "microphone",
      target: "shared",
      visibility: "instance_private",
    });

    if (result.cancelled) return;

    patchSharedData({
      voiceNote: {
        assetId: result.assetId,
        visibility: result.visibility,
        publicUrl: result.publicUrl,
      },
    });
  }

  React.useEffect(() => {
    async function load() {
      if (!sharedData?.voiceNote?.assetId || !getAudioUrl) return;
      const url = await getAudioUrl(sharedData.voiceNote.assetId);
      setAudioUrl(url);
    }

    load();
  }, [sharedData?.voiceNote?.assetId, getAudioUrl]);

  return (
    <div>
      <button onClick={addVoiceNote}>Record voice note</button>
      {audioUrl ? <audio controls src={audioUrl} /> : null}
    </div>
  );
}
```

### Pattern 4: Capture Video From The Camera

```javascript
function App({ sharedData, patchSharedData, pickAndUploadVideo, getVideoUrl }) {
  const [videoUrl, setVideoUrl] = React.useState(null);

  async function captureClip() {
    const result = await pickAndUploadVideo({
      source: "camera",
      target: "shared",
      visibility: "instance_private",
    });

    if (result.cancelled) return;

    patchSharedData({
      clip: {
        assetId: result.assetId,
        visibility: result.visibility,
        publicUrl: result.publicUrl,
      },
    });
  }

  React.useEffect(() => {
    async function load() {
      if (!sharedData?.clip?.assetId || !getVideoUrl) return;
      const url = await getVideoUrl(sharedData.clip.assetId);
      setVideoUrl(url);
    }

    load();
  }, [sharedData?.clip?.assetId, getVideoUrl]);

  return (
    <div>
      <button onClick={captureClip}>Capture clip</button>
      {videoUrl ? <video controls playsInline src={videoUrl} style={{ width: "100%" }} /> : null}
    </div>
  );
}
```

### Pattern 5: Upload A Blob Or File You Already Have

```javascript
const upload = await uploadVideo(fileOrBlob, {
  target: "shared",
  visibility: "instance_private",
  durationMs: 18000,
  width: 1080,
  height: 1920,
  originalFilename: fileOrBlob.name,
});

const assetRef = upload.assetRef;
```

### Pattern 6: Use A Latest Ref In Upload And Recorder Callbacks

Upload flows often finish later than they start. If a callback needs to rebuild shared arrays or objects after `uploadAudio`, `uploadVideo`, `pickAndUploadAudio`, `pickAndUploadVideo`, `MediaRecorder.onstop`, `MediaRecorder.ondataavailable`, or media metadata events, read the latest `sharedData` from a ref instead of from the original closure.

```javascript
function App({ sharedData, patchSharedData, uploadAudio }) {
  const sharedDataRef = React.useRef(sharedData);

  React.useEffect(() => {
    if (sharedData !== null) {
      sharedDataRef.current = sharedData;
    }
  }, [sharedData]);

  async function handleFinishedRecording(blob) {
    const upload = await uploadAudio(blob, {
      target: "shared",
      visibility: "instance_private",
      source: "microphone"
    });

    const newVoiceNote = {
      id: `voice_${Date.now()}`,
      assetId: upload.assetRef.assetId,
      visibility: upload.assetRef.visibility,
      publicUrl: upload.assetRef.publicUrl,
      createdAt: Date.now()
    };

    const latest = sharedDataRef.current || {};
    const voiceNotes = latest.voiceNotes || [];

    patchSharedData({
      voiceNotes: voiceNotes.some((note) => note.id === newVoiceNote.id)
        ? voiceNotes
        : [newVoiceNote, ...voiceNotes]
    });
  }
}
```

If you are only appending to a shared list, `pushToSharedArray` is usually safer. If you must rebuild the array after an async upload, prepend the new item only if it is not already present in the latest state, and keep your ref pinned to the last known non-null snapshot during reconnects.

## Playback Rules

- For private assets, always resolve playback URLs with the matching helper.
- Prefer storing asset refs or asset IDs in `data`, `sharedData`, or `myPersonalData`.
- Do not store temporary signed URLs as your source of truth.

Examples:

```javascript
const imageUrl = await resolveImageUrl(photoAssetRef);
const audioUrl = await getAudioUrl(audioAssetId);
const videoUrl = await getVideoUrl(videoAssetId);
```

## Agent Rules

1. Always handle `{ cancelled: true }`.
2. Persist `assetId` or full `assetRef`, not the resolved playback URL.
3. Be explicit about `target` and `visibility`.
4. Use `instance_private` unless the asset truly needs a public URL.
5. Prefer `source: "camera"` for quick capture flows and `source: "files"` for picker-only flows.
6. If upload or recorder callbacks update `sharedData`, read the latest state from a ref before rebuilding lists or nested objects.

## Common Mistakes

### Wrong: Seeding shared media defaults in a mount-time effect

```javascript
React.useEffect(() => {
  patchSharedData({ voiceNotes: [] });
}, []);
```

`sharedData` hydrates asynchronously. This kind of mount-time write can wipe previously saved media on page load.

### Wrong: Assuming uploads are multiplayer-only

Image, audio, and video uploads can all work in solo apps. The important distinction is whether you choose `target: "personal"` or `target: "shared"`.

### Wrong: Assuming video capture does not exist

The current runtime supports camera capture through:

```javascript
await pickAndUploadVideo({ source: "camera" });
```

### Wrong: Storing only a resolved playback URL

```javascript
patchSharedData({ clipUrl });
```

Store the asset, then resolve on load:

```javascript
patchSharedData({
  clip: {
    assetId: result.assetId,
    visibility: result.visibility,
    publicUrl: result.publicUrl,
  },
});
```

### Wrong: Rebuilding `voiceNotes` or `clips` from stale shared state after an async upload

When an upload or recorder callback resolves, other writes may already have changed `sharedData`. Mirror it into a ref and read the latest value before rebuilding arrays or nested media maps.

### Wrong: Using `target: "shared"` outside a shared instance for audio/video

Audio and video shared uploads require an actual shared instance.

## What This Does Not Do

- No transcoding workflow in mini app code
- No HLS or DASH manifest generation
- No built-in waveform generation
- No automatic transcription
- No automatic poster generation for uploaded videos
