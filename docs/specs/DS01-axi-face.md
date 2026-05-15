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

## Modes And Themes

Supported modes are:

- `static`
- `controlled`
- `event-driven`
- `autonomous`

`static` is the default mode and does not attach a global command listener. `controlled` is intended for direct JavaScript API calls. `event-driven` attaches the `axi-face:command` window listener without requiring the `listen` attribute.

`autonomous` keeps local rendering and animation state isolated and does not attach a global command listener. It starts per-instance blink and idle pulse timers only when animation is enabled. Timer jitter is deterministic from `agent-id` and `seed` so multiple instances do not animate in lockstep. Autonomous timers must stop on disconnect, `destroy()`, mode changes, or while `speaking` is active.

Supported themes are:

- `auto`
- `light`
- `dark`

`auto` follows the browser color scheme for component text and thought rendering.

## Assets

The default asset mode is `img`. In this mode, SVG is rendered as an external image.

`asset-mode="inline"` may load and insert SVG into Shadow DOM only after sanitization. Inline SVG must reject script elements, unsupported embedded content, inline event handlers, style imports, and external or unsafe resource URLs.

Inline controllable SVGs may expose these standard parts:

- `left-eye`
- `right-eye`
- `mouth`
- `brow-left`
- `brow-right`
- `glow`
- `symbol`

When those parts exist, AxiFace applies emotion changes through DOM updates on the sanitized inline SVG. If a part is missing, the component must degrade cleanly and keep the existing frame/class behavior.

Asset packs are JSON manifests with `defaultEmotion` and an `emotions` map. Asset URLs resolve relative to `pack-src`. If a requested emotion is unavailable, the component falls back to `neutral`.

Included internal asset packs are:

- `robot-soft`
- `robot-minimal`
- `sketch-simple`
- `emoji-simple`

Each pack must include SVG assets for every stable emotion.

Generated faces must be deterministic for a given `seed`, `emotion`, `style`, `palette`, and `complexity`. Supported generated styles are `robot-soft`, `robot-minimal`, `sketch`, `emoji`, and `terminal`.

Generated face palettes live in `generated-face-config.mjs`, not inside the renderer implementation. Consumers may register additional named palettes through `registerGeneratedFacePalette(name, colors)` and then use them through the `palette` attribute.

## Events

When `listen` is present, or when `mode="event-driven"` is set, the component listens to `window` event `axi-face:command`. It handles commands only when `detail.agentId` matches the component `agent-id`, or when `detail.broadcast === true`.

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
