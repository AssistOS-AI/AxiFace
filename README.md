# AxiFace

AxiFace is a small framework-free JavaScript library for rendering simple expressive SVG faces in web applications. It is designed for agent avatars, chat presence, meeting assistants, and lightweight contextual UI indicators.

AxiFace is not a 3D avatar engine and does not try to simulate a realistic face. It provides an isolated Web Component, `<axi-face>`, backed by SVG image assets, optional asset packs, local micro-animations, and custom events.

## Install

```js
import "@axiologic/axi-face";
```

During local development, import the module directly:

```html
<script type="module" src="../axi-face.mjs"></script>
```

When installed in an application, the direct package path is:

```html
<script type="module" src="/node_modules/@axiologic/axi-face/axi-face.mjs"></script>
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

With autonomous local behavior:

```html
<axi-face
  mode="autonomous"
  asset-mode="inline"
  src="/packs/robot-soft/neutral.svg"
  agent-id="assistant">
</axi-face>
```

`mode="autonomous"` uses per-instance timers for blink and idle pulse behavior. Timers are deterministic from `agent-id`/`seed`, cleaned up on disconnect, and paused while the face is speaking.

With a controllable inline SVG:

```html
<axi-face
  src="/avatars/robot-layered.svg"
  asset-mode="inline"
  emotion="happy">
</axi-face>
```

Inline SVGs may expose `data-axi-part` markers such as `left-eye`, `right-eye`, `mouth`, `brow-left`, `brow-right`, `glow`, and `symbol`. AxiFace applies expression updates to those parts after the SVG passes sanitizer checks.

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

Integrations that need to preserve a one-off color scheme across serialization boundaries may also pass a JSON palette array through the `palette` attribute:

```html
<axi-face generated palette='["#101010","#ff0066","#f8fafc","#00d1ff"]'></axi-face>
```

The generated style is configured with the design-document `style` attribute:

```html
<axi-face generated style="sketch" seed="assistant"></axi-face>
```

When the host also needs the native HTML `style` attribute for CSS custom properties, use `data-axi-style` for the generated face style:

```html
<axi-face generated data-axi-style="sketch" style="--axi-face-size: 72px"></axi-face>
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

## Included Asset Packs

The package includes original internal SVG packs:

- `packs/robot-soft`
- `packs/robot-minimal`
- `packs/sketch-simple`
- `packs/emoji-simple`

Each pack has a manifest and SVGs for `neutral`, `idle`, `listening`, `thinking`, `speaking`, `happy`, `amused`, `confused`, `concerned`, `alert`, and `sleepy`.

## Asset Sources

This package ships only minimal internal SVG assets. DiceBear/Bottts, Open Peeps, OpenMoji, and Twemoji may be useful for future asset packs, but their licenses must be reviewed before redistribution or modification.

## Attribution / Licenses

Avatars generated using DiceBear (https://www.dicebear.com/)  and OpenMoji (https://openmoji.org/).
See full license details: https://www.dicebear.com/licenses/


**Emoji  classic**
Source: https://openmoji.org/library/
License URL: https://creativecommons.org/licenses/by-sa/4.0/


**Emoji brown** 
Source: https://www.dicebear.com/playground/
License URL: https://creativecommons.org/licenses/by/4.0/

**Emoji colors**
Source: https://www.dicebear.com/playground/
License URL: https://creativecommons.org/licenses/by/4.0/


**Robot-minimal**
Source: https://www.dicebear.com/styles/bottts-neutral
License URL: https://bottts.com/


**Robot-soft-classic and Robot-soft-colors**
Source: https://www.dicebear.com/styles/bottts
License URL: https://bottts.com/


**Sketch-expressive**
Source: https://www.dicebear.com/styles/lorelei/
License URL: https://creativecommons.org/publicdomain/zero/1.0/

**Sketch-flat**
Source: https://www.dicebear.com/styles/notionists-neutral/
License URL: https://creativecommons.org/publicdomain/zero/1.0/

**Sketch-rounded**
Source: https://www.dicebear.com/styles/lorelei-neutral/
License URL: https://creativecommons.org/publicdomain/zero/1.0/


