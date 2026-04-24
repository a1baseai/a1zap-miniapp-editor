# Mini App AI Runtime Reference

This guide is for engineers and codegen agents writing mini app code inside:

```javascript
function App(props) {
  // mini app runtime code
}
```

It documents the built-in `ai()` helper for text generation, structured JSON, tool calls, image generation, and multimodal prompts with uploaded image and audio assets.

For uploads and playback, also read [MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md](MINI_APP_MEDIA_AND_UPLOADS_REFERENCE.md).

## What Is Available Today

| Capability | Supported | How |
| --- | --- | --- |
| Text generation / chat | Yes | `ai({ intent: "chat_stream", ... })` |
| Structured JSON | Yes | `ai({ intent: "json", responseSchema, ... })` |
| Tool / function calling | Yes | `ai({ intent: "function_calls", tools, ... })` |
| Image generation | Yes | `ai({ intent: "image_generation", ... })` |
| Image understanding | Yes | `messages` or `context` with `image` / `image_asset` parts |
| Audio understanding | Yes | `messages` or `context` with `audio` / `audio_asset` parts |
| Video understanding | Not ready | `video_asset` exists in types, but the current runtime path is not ready to document as supported |
| Video generation | No | No mini app runtime API exists for this today |

## Availability

`ai` is a runtime-injected prop:

```javascript
function App({ user, openAuth, ai }) {
  // ...
}
```

The user must be signed in before `ai()` can run. If no auth token is available, the runtime throws:

```javascript
new Error("Sign in required to use AI.");
```

Recommended guard:

```javascript
async function requireAI(user, openAuth, ai) {
  if (!user?.id || user.id === "anonymous") {
    openAuth?.({ mode: "signin" });
    return false;
  }

  if (!ai) {
    return false;
  }

  return true;
}
```

## The `ai()` Function

```javascript
const result = await ai(request, handlers);
```

### Request Shape

```javascript
{
  model?: string,
  intent: "chat_stream" | "json" | "function_calls" | "image_generation",
  outputType?: "text" | "json_schema" | "function_calls" | "image",
  systemPrompt?: string,
  messages?: [
    {
      role: "system" | "user" | "assistant",
      content: string | [
        { type: "text", text: string },
        { type: "image", url: string },
        { type: "image_asset", assetRef: { assetId, visibility, publicUrl? } | string },
        { type: "audio", url: string },
        { type: "audio_asset", assetRef: { assetId, visibility, publicUrl? } | string },
        { type: "video_asset", assetRef: { assetId, visibility, publicUrl? } | string }
      ]
    }
  ],
  context?: [
    { type: "text", text: string },
    { type: "image", url: string },
    { type: "image_asset", assetRef: { assetId, visibility, publicUrl? } | string },
    { type: "audio", url: string },
    { type: "audio_asset", assetRef: { assetId, visibility, publicUrl? } | string },
    { type: "video_asset", assetRef: { assetId, visibility, publicUrl? } | string }
  ],
  responseSchema?: { ... },
  tools?: [
    {
      name: string,
      description?: string,
      inputSchema: { ... }
    }
  ],
  toolChoice?: "auto" | "required" | { type: "tool", name: string },
  temperature?: number,
  maxOutputTokens?: number,
  stream?: boolean,
  metadata?: { [key: string]: string | number | boolean }
}
```

### Result Shape

```javascript
{
  requestId: string,
  status: "completed" | "blocked" | "failed",
  requestedModel?: string,
  actualModel?: string,
  text?: string,
  json?: any,
  toolCalls?: [{ name, arguments }],
  images?: [{ mimeType, dataUrl }],
  usage?: {
    inputTokens?: number,
    outputTokens?: number,
    totalTokens?: number
  },
  moderation?: {
    blocked: boolean,
    reason?: string
  },
  error?: {
    code: string,
    message: string,
    retryable: boolean
  }
}
```

## Streaming Events

For `intent: "chat_stream"`, streaming is enabled by default unless you explicitly pass `stream: false`.

```javascript
const result = await ai(
  {
    intent: "chat_stream",
    messages: [
      { role: "user", content: "Write a short caption for a beach photo." }
    ]
  },
  {
    onEvent(event) {
      if (event.type === "text_delta") {
        console.log(event.delta);
      }
    }
  }
);
```

Event types:

- `start`
- `text_delta`
- `json_delta`
- `tool_call_delta`
- `image`
- `done`
- `blocked`
- `error`

## Quick Patterns

### Pattern 1: Text Generation

```javascript
function App({ ai, user, openAuth }) {
  const [prompt, setPrompt] = React.useState("");
  const [answer, setAnswer] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function generateText() {
    if (!(await requireAI(user, openAuth, ai))) return;

    setLoading(true);
    setAnswer("");

    try {
      await ai(
        {
          intent: "chat_stream",
          systemPrompt: "You are a concise creative assistant for mini apps.",
          messages: [
            {
              role: "user",
              content: `Write 3 short taglines for: ${prompt}`
            }
          ]
        },
        {
          onEvent(event) {
            if (event.type === "text_delta") {
              setAnswer((prev) => prev + event.delta);
            }
          }
        }
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input value={prompt} onChange={(e) => setPrompt(e.target.value)} />
      <button onClick={generateText} disabled={loading || !prompt.trim()}>
        {loading ? "Generating..." : "Generate"}
      </button>
      <pre>{answer}</pre>
    </div>
  );
}
```

### Pattern 2: Structured JSON

```javascript
async function classifyIdea(ai, idea) {
  const result = await ai({
    intent: "json",
    messages: [
      {
        role: "user",
        content: `Classify this mini app idea: ${idea}`
      }
    ],
    responseSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        category: {
          type: "string",
          enum: ["game", "social", "utility", "education", "creator"]
        },
        audience: { type: "string" },
        safetyNotes: {
          type: "array",
          items: { type: "string" }
        }
      },
      required: ["category", "audience", "safetyNotes"]
    }
  });

  if (result.status !== "completed") {
    throw new Error(result.error?.message || "Classification failed");
  }

  return result.json;
}
```

### Pattern 3: Tool Calls

```javascript
async function getSuggestedAction(ai, task) {
  const result = await ai({
    intent: "function_calls",
    messages: [
      {
        role: "user",
        content: `Choose the best next action for this task: ${task}`
      }
    ],
    tools: [
      {
        name: "save_draft",
        description: "Save a draft result for later",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" }
          },
          required: ["title"]
        }
      },
      {
        name: "publish_now",
        description: "Publish the completed result immediately",
        inputSchema: {
          type: "object",
          properties: {
            channel: { type: "string" }
          },
          required: ["channel"]
        }
      }
    ],
    toolChoice: "auto"
  });

  return result.toolCalls || [];
}
```

### Pattern 4: Image Generation

```javascript
function App({ ai, user, openAuth }) {
  const [imageUrl, setImageUrl] = React.useState(null);
  const [caption, setCaption] = React.useState("");

  async function generateImage() {
    if (!(await requireAI(user, openAuth, ai))) return;

    const result = await ai({
      intent: "image_generation",
      messages: [
        {
          role: "user",
          content: `Generate a vibrant square sticker illustration of ${caption}`
        }
      ]
    });

    if (result.status !== "completed") {
      throw new Error(result.error?.message || "Image generation failed");
    }

    const firstImage = result.images?.[0];
    if (firstImage?.dataUrl) {
      setImageUrl(firstImage.dataUrl);
    }
  }

  return (
    <div>
      <input value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button onClick={generateImage}>Generate image</button>
      {imageUrl ? <img src={imageUrl} alt="" style={{ width: "100%", borderRadius: 16 }} /> : null}
    </div>
  );
}
```

### Pattern 5: Persist A Generated Image

Generated images come back as `dataUrl` strings. They are not uploaded automatically.

```javascript
function dataUrlToBlob(dataUrl) {
  const [header, base64] = dataUrl.split(",");
  const mimeMatch = header.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
  const bytes = atob(base64);
  const array = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i += 1) {
    array[i] = bytes.charCodeAt(i);
  }

  return new Blob([array], { type: mimeType });
}

async function generateAndStoreImage({
  ai,
  uploadImage,
  patchSharedData,
  prompt
}) {
  const result = await ai({
    intent: "image_generation",
    messages: [{ role: "user", content: prompt }]
  });

  const generated = result.images?.[0];
  if (!generated?.dataUrl) return;

  const blob = dataUrlToBlob(generated.dataUrl);
  const upload = await uploadImage(blob, {
    target: "shared",
    visibility: "instance_private"
  });

  patchSharedData({
    generatedImage: upload.assetRef
  });
}
```

### Pattern 6: Analyze An Uploaded Image

```javascript
async function describeUploadedPhoto(ai, photoAsset) {
  const result = await ai({
    intent: "chat_stream",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image in one sentence." },
          {
            type: "image_asset",
            assetRef: {
              assetId: photoAsset.assetId,
              visibility: photoAsset.visibility,
              publicUrl: photoAsset.publicUrl
            }
          }
        ]
      }
    ],
    stream: false
  });

  return result.text || "";
}
```

### Pattern 7: Analyze Uploaded Audio

```javascript
async function summarizeVoiceNote(ai, audioAsset) {
  const result = await ai({
    intent: "chat_stream",
    model: "gemini-2.5-flash",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Summarize this voice note in bullet points." },
          {
            type: "audio_asset",
            assetRef: {
              assetId: audioAsset.assetId,
              visibility: audioAsset.visibility,
              publicUrl: audioAsset.publicUrl
            }
          }
        ]
      }
    ],
    stream: false
  });

  return result.text || "";
}
```

### Pattern 8: Read Latest Shared State After AI Returns

AI callbacks are asynchronous, so they must not rebuild lists or nested objects from the `sharedData` value captured when the request started.

```javascript
function App({ sharedData, patchSharedData, ai, user, openAuth }) {
  const sharedDataRef = React.useRef(sharedData);

  React.useEffect(() => {
    if (sharedData !== null) {
      sharedDataRef.current = sharedData;
    }
  }, [sharedData]);

  async function addAISummary(prompt) {
    if (!(await requireAI(user, openAuth, ai))) return;

    const result = await ai({
      intent: "chat_stream",
      messages: [{ role: "user", content: prompt }],
      stream: false
    });

    const newSummary = {
      id: `summary_${Date.now()}`,
      text: result.text || "",
      createdAt: Date.now()
    };

    const latest = sharedDataRef.current || {};
    const summaries = latest.summaries || [];

    patchSharedData({
      summaries: summaries.some((item) => item.id === newSummary.id)
        ? summaries
        : [newSummary, ...summaries]
    });
  }
}
```

Use the same pattern for `await ai()`, `.then()` chains, timers, follow-up `fetch()` promises, and stream completion handlers. Keep the ref pinned to the last known non-null snapshot during reconnects instead of overwriting it with `null`. For the full dual-mode `dataRef` and `sharedDataRef` pattern, see [MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md](MICRO_APP_DATA_AND_USER_PROFILE_REFERENCE.md).

## Model Selection

You can omit `model` unless you have a specific reason to choose one.

Current defaults:

| Output | Default model |
| --- | --- |
| Text | `gpt-5-chat-latest` |
| JSON | `gpt-5-chat-latest` |
| Function calls | `gpt-5-chat-latest` |
| Image generation | `gemini-2.5-flash-image` |

Current allowlist:

- `gpt-5-chat-latest`
- `claude-opus-4-6`
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-image`
- `gemini-3.1-pro-preview`

Notes:

- Use a Gemini model when you want audio-input prompts.
- If you request an allowlisted model that cannot satisfy the output type, the server can fall back to a compatible model.

## Limits And Safety

The server enforces:

- sign-in and access checks
- input and output moderation
- model allowlist validation
- IP-based rate limiting
- per-request media limits

Current media limits:

- Max image parts: `6`
- Max audio parts: `4`
- Max image bytes per fetched image: `10MB`
- Max audio bytes per fetched audio file: `25MB`

If moderation blocks the request or response, the result returns:

```javascript
{
  status: "blocked",
  moderation: {
    blocked: true,
    reason: "..."
  }
}
```

## Common Mistakes

### Wrong: Rebuilding shared state from a stale AI closure

```javascript
async function addIdea() {
  const result = await ai({ intent: "chat_stream", messages: [...] });
  const ideas = sharedData?.ideas || [];
  patchSharedData({ ideas: [{ text: result.text }, ...ideas] });
}
```

If another user or callback changed `sharedData` while the AI request was running, this can clobber newer data. Mirror `sharedData` into a ref and read the latest value right before writing.

### Wrong: Passing a raw asset ID string as an asset ref

```javascript
{
  type: "image_asset",
  assetRef: "img_123"
}
```

That string is treated like a URL string, not an asset lookup.

### Correct: Pass the full asset ref

```javascript
{
  type: "image_asset",
  assetRef: {
    assetId: "img_123",
    visibility: "instance_private"
  }
}
```

### Wrong: Assuming image generation uploads for you

```javascript
const result = await ai({ intent: "image_generation", messages: [...] });
const assetId = result.images[0].assetId;
```

`result.images` contains `dataUrl`, not uploaded asset IDs.

### Correct: Upload generated images yourself if you need persistence

```javascript
const generated = result.images?.[0];
const blob = dataUrlToBlob(generated.dataUrl);
const upload = await uploadImage(blob, {
  target: "shared",
  visibility: "instance_private"
});
```

### Wrong: Shipping AI video generation docs

```javascript
await ai({
  intent: "video_generation",
  messages: [...]
});
```

There is no mini app `video_generation` intent today.

### Correct: Be explicit about current support

```javascript
// Text generation: supported
// Image generation: supported
// Audio understanding: supported
// Video generation: not available yet
```

## Recommended App Signature

```javascript
function App({
  user,
  data,
  setData,
  isMultiplayer,
  sharedData,
  setSharedData,
  patchSharedData,
  pushToSharedArray,
  myPersonalData,
  setMyPersonalData,
  pickAndUploadPhoto,
  resolveImageUrl,
  getImageUrl,
  uploadImage,
  pickAndUploadAudio,
  getAudioUrl,
  uploadAudio,
  pickAndUploadVideo,
  getVideoUrl,
  uploadVideo,
  openAuth,
  ai,
}) {
  // ...
}
```

## Prompt Tips For Codegen Agents

1. Use the runtime-injected `ai(request, handlers?)` helper instead of external AI SDKs.
2. For chat UIs, use `intent: "chat_stream"` and append `text_delta` events into local React state.
3. For structured output, use `intent: "json"` with a strict `responseSchema` and read `result.json`.
4. For generated images, read `result.images[0].dataUrl`, then upload with `uploadImage()` if you need persistence.
5. When sending uploaded images or audio into AI, pass a full asset ref object, not a raw asset ID.
6. Do not claim AI video generation exists in mini apps today.
7. If the user is not signed in, call `openAuth({ mode: "signin" })` before running AI.
8. If AI output updates `sharedData`, read the latest state from a ref after the request resolves instead of using the old closure.

## What This Does Not Do

- No AI video generation API
- No documented video understanding support yet
- No automatic upload or persistence for generated images
- No direct provider SDK usage from mini app code
- No bypass for moderation, auth, or rate limits
