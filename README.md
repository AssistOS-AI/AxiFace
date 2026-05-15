# AxiFace

AxiFace is a small framework-free JavaScript library for rendering simple expressive SVG faces in web applications. It is designed for agent avatars, chat presence, meeting assistants, and lightweight contextual UI indicators.

AxiFace is not a 3D avatar engine and does not try to simulate a realistic face. It provides an isolated Web Component, `<axi-face>`, backed by SVG image assets, optional asset packs, local micro-animations, and custom events.

## Install

```js
import "@axiologic/axi-face";
```

During local development, import the module directly:

```html
<script type="module" src="../src/axi-face.mjs"></script>
```

## Basic Usage

```html
<axi-face src="/face.svg"></axi-face>
```

With explicit identity and size:

```html
<axi-face
  id="assistant-face"
  agent-id="chat-agent"
  src="/avatars/robot-neutral.svg"
  emotion="neutral"
  size="48">
</axi-face>
```

With visible activity text:

```html
<axi-face
  agent-id="meeting-analyst"
  src="/avatars/robot-soft.svg"
  emotion="thinking"
  thought="Analyzing the conversation..."
  thought-mode="bubble"
  size="72">
</axi-face>
```

With an asset pack:

```html
<axi-face
  agent-id="chat-agent"
  pack-src="/packs/robot-soft/manifest.json"
  emotion="listening"
  mode="event-driven"
  theme="auto"
  thought-mode="bubble"
  >
</axi-face>
```

`mode="event-driven"` makes the component listen for `axi-face:command` without also requiring the `listen` attribute. The supported modes are `static`, `controlled`, `event-driven`, and `autonomous`. The supported themes are `auto`, `light`, and `dark`.

## JavaScript API

```js
const face = document.querySelector("axi-face");

face.setEmotion("thinking", { intensity: 0.7 });
face.showThought("Checking the context...");
face.speakStart();
face.speakEnd();
face.setSource("/avatars/robot-happy.svg");
face.reset();
```

Generated palettes can be extended without editing AxiFace internals:

```js
import { registerGeneratedFacePalette } from "@axiologic/axi-face";

registerGeneratedFacePalette("brand", [
  "#101010",
  "#ff0066",
  "#f8fafc",
  "#00d1ff"
]);
```

```html
<axi-face generated palette="brand"></axi-face>
```

Supported methods:

- `setEmotion(emotion, options)`
- `setSource(src)`
- `setPack(pack)`
- `showThought(text, options)`
- `hideThought()`
- `think(text, options)`
- `speakStart(options)`
- `speakEnd()`
- `pulse(options)`
- `reset()`
- `destroy()`

## Events

When `listen` is present, or when `mode="event-driven"` is set, the component listens for `axi-face:command` on `window`:

```js
window.dispatchEvent(new CustomEvent("axi-face:command", {
  detail: {
    agentId: "chat-agent",
    command: "think",
    text: "Preparing a better answer...",
    intensity: 0.6
  }
}));
```

The command is accepted only when `detail.agentId` matches the component `agent-id`, or when `detail.broadcast === true`.

Component events:

- `axi-face:ready`
- `axi-face:loaded`
- `axi-face:emotion-changed`
- `axi-face:thought-shown`
- `axi-face:clicked`
- `axi-face:error`

## Security

The default SVG mode is `asset-mode="img"`, which renders the source through an image element. Inline mode is stricter and sanitizes loaded SVG text before inserting it into Shadow DOM. Inline SVG rejects script elements, unsupported embedded content, inline event handlers, style imports, and external or unsafe resource URLs.

## Asset Sources

This package ships only minimal internal SVG assets. DiceBear/Bottts, Open Peeps, OpenMoji, and Twemoji may be useful for future asset packs, but their licenses must be reviewed before redistribution or modification.
