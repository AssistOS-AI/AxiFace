# DS01 - AxiFace Web Component

## Purpose

AxiFace is a small JavaScript Web Component library for displaying and orchestrating simple expressive SVG faces in web applications. It provides a lightweight visual presence for agents, chat interfaces, video conference assistants, and contextual AI indicators.

AxiFace is not a 3D avatar engine and must not imply that visible thoughts are model reasoning. Visible thoughts are UI activity hints only.

## Component Contract

The public element is `<axi-face>`. The simplest valid usage is:

```html
<axi-face src="/face.svg"></axi-face>
```

The component must use Shadow DOM, keep state per instance, keep timers per instance, and remove global event listeners and timers when destroyed or disconnected.

Supported attributes:

- `agent-id`
- `src`
- `emotion`
- `size`
- `thought`
- `thought-mode`
- `mode`
- `shape`
- `theme`
- `pack-src`
- `animated`
- `listen`
- `asset-mode`
- `generated`
- `seed`
- `style`
- `palette`
- `complexity`

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

## Emotions And Thoughts

The stable emotion set is:

- `neutral`
- `idle`
- `listening`
- `thinking`
- `speaking`
- `happy`
- `amused`
- `confused`
- `concerned`
- `alert`
- `sleepy`

Thought modes are:

- `none`
- `bubble`
- `caption`
- `ticker`
- `inside`

Thought text must be treated as a visual activity hint, not as real model reasoning.

## Assets

The default asset mode is `img`. In this mode, SVG is rendered as an external image.

`asset-mode="inline"` may load and insert SVG into Shadow DOM only after sanitization. Inline SVG must reject script elements, inline event handlers, and external or unsafe resource URLs.

Asset packs are JSON manifests with `defaultEmotion` and an `emotions` map. Asset URLs resolve relative to `pack-src`. If a requested emotion is unavailable, the component falls back to `neutral`.

## Events

When `listen` is present, the component listens to `window` event `axi-face:command`. It handles commands only when `detail.agentId` matches the component `agent-id`, or when `detail.broadcast === true`.

Supported commands:

- `setEmotion`
- `setSource`
- `setPack`
- `think`
- `showThought`
- `hideThought`
- `speakStart`
- `speakEnd`
- `pulse`
- `reset`

The component emits:

- `axi-face:ready`
- `axi-face:loaded`
- `axi-face:emotion-changed`
- `axi-face:thought-shown`
- `axi-face:clicked`
- `axi-face:error`

## Asset Licensing

The package ships only internal minimal SVG assets. Third-party sources such as DiceBear/Bottts, Open Peeps, OpenMoji, and Twemoji require license review before being copied, modified, or redistributed.
