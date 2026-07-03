import { normalizeEmotion } from './state-machine.mjs';
import {
    GENERATED_FACE_STYLES,
    getGeneratedFacePalette
} from './generated-face-config.mjs';

function hashString(value) {
    let hash = 2166136261;
    for (const char of String(value || 'axi-face')) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function pick(list, index) {
    return list[index % list.length];
}

function normalizeStyle(value) {
    const style = String(value || 'robot-soft').trim();
    return GENERATED_FACE_STYLES.includes(style) ? style : 'robot-soft';
}

function normalizeComplexity(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 0.7;
    if (raw === 'low' || raw === 'minimal') return 0.35;
    if (raw === 'medium' || raw === 'default') return 0.7;
    if (raw === 'high' || raw === 'detailed') return 1;
    const number = Number(raw);
    if (!Number.isFinite(number)) return 0.7;
    return Math.max(0, Math.min(1, number));
}

function mouthPath(emotion) {
    switch (normalizeEmotion(emotion)) {
    case 'idle':
        return '<path d="M50 79 H78" opacity="0.85" />';
    case 'listening':
        return '<path d="M51 79 Q64 83 77 79" />';
    case 'happy':
    case 'amused':
        return '<path d="M45 75 Q64 91 83 75" />';
    case 'confused':
        return '<path d="M48 78 Q58 71 66 78 T82 78" />';
    case 'concerned':
    case 'alert':
        return '<path d="M47 83 Q64 70 81 83" />';
    case 'speaking':
        return '<ellipse cx="64" cy="78" rx="13" ry="8" />';
    case 'sleepy':
        return '<path d="M48 78 H80" />';
    default:
        return '<path d="M48 78 Q64 84 80 78" />';
    }
}

function eyesMarkup(emotion) {
    switch (normalizeEmotion(emotion)) {
    case 'idle':
        return '<g data-axi-part="left-eye"><path d="M38 56 H52" /></g><g data-axi-part="right-eye"><path d="M76 56 H90" /></g>';
    case 'listening':
        return '<g data-axi-part="left-eye"><circle cx="45" cy="55" r="5" /></g><g data-axi-part="right-eye"><circle cx="83" cy="55" r="7" /></g>';
    case 'sleepy':
        return '<g data-axi-part="left-eye"><path d="M37 55 H52" /></g><g data-axi-part="right-eye"><path d="M76 55 H91" /></g>';
    case 'thinking':
        return '<g data-axi-part="left-eye"><circle cx="45" cy="56" r="5" /></g><g data-axi-part="right-eye"><circle cx="83" cy="54" r="5" /></g>';
    case 'alert':
        return '<g data-axi-part="left-eye"><circle cx="45" cy="54" r="7" /></g><g data-axi-part="right-eye"><circle cx="83" cy="54" r="7" /></g>';
    default:
        return '<g data-axi-part="left-eye"><circle cx="45" cy="55" r="6" /></g><g data-axi-part="right-eye"><circle cx="83" cy="55" r="6" /></g>';
    }
}

function browsMarkup(emotion) {
    switch (normalizeEmotion(emotion)) {
    case 'idle':
        return '<g data-axi-part="brow-left"><path d="M36 46 H52" opacity="0.7" /></g><g data-axi-part="brow-right"><path d="M76 46 H92" opacity="0.7" /></g>';
    case 'listening':
        return '<g data-axi-part="brow-left"><path d="M36 41 Q44 38 52 41" /></g><g data-axi-part="brow-right"><path d="M76 41 Q84 38 92 41" /></g>';
    case 'confused':
        return '<g data-axi-part="brow-left"><path d="M36 42 L52 39" /></g><g data-axi-part="brow-right"><path d="M76 39 L92 43" /></g>';
    case 'concerned':
    case 'alert':
        return '<g data-axi-part="brow-left"><path d="M36 41 L52 46" /></g><g data-axi-part="brow-right"><path d="M76 46 L92 41" /></g>';
    case 'happy':
    case 'amused':
        return '<g data-axi-part="brow-left"><path d="M36 42 Q44 37 52 42" /></g><g data-axi-part="brow-right"><path d="M76 42 Q84 37 92 42" /></g>';
    case 'sleepy':
        return '<g data-axi-part="brow-left"><path d="M36 47 H52" /></g><g data-axi-part="brow-right"><path d="M76 47 H92" /></g>';
    default:
        return '<g data-axi-part="brow-left"><path d="M36 43 H52" /></g><g data-axi-part="brow-right"><path d="M76 43 H92" /></g>';
    }
}

function symbolMarkup(fill = 'currentColor') {
    return `<text data-axi-part="symbol" x="64" y="31" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="800" fill="${fill}" stroke="none" opacity="0"></text>`;
}

function listeningCueMarkup(emotion, accent) {
    if (normalizeEmotion(emotion) !== 'listening') {
        return '';
    }
    return `<g data-axi-part="listening-cue" stroke="${accent}" stroke-width="4" opacity="0.9" fill="none">
    <path d="M18 55 Q10 64 18 73" />
    <path d="M110 55 Q118 64 110 73" />
  </g>`;
}

function robotSoftFace({ emotion, palette, hash, complexity }) {
    const accent = palette[1];
    const ink = palette[2];
    const antenna = complexity >= 0.55 && (hash % 2) === 0
        ? `<g stroke="${accent}"><path data-axi-part="antenna" d="M64 25 V13" /><circle cx="64" cy="10" r="4" fill="none" /></g>`
        : '';

    return `${symbolMarkup(ink)}
  <g fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    ${antenna}
    <rect data-axi-part="head" x="25" y="30" width="78" height="74" rx="24" fill="none" stroke="${accent}"/>
    ${browsMarkup(emotion)}
    <g fill="${ink}">${eyesMarkup(emotion)}</g>
    <g data-axi-part="mouth" fill="none">${mouthPath(emotion)}</g>
    ${listeningCueMarkup(emotion, accent)}
  </g>`;
}

function robotMinimalFace({ emotion, palette, complexity }) {
    const accent = palette[1];
    const ink = palette[2];
    const detail = complexity >= 0.75
        ? `<path data-axi-part="detail" d="M43 38 H85" stroke="${ink}" opacity="0.45"/>`
        : '';

    return `${symbolMarkup(ink)}
  <g fill="none" stroke="${accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <rect data-axi-part="head" x="28" y="35" width="72" height="64" rx="14" fill="none" stroke="${accent}"/>
    ${detail}
    <g stroke="${ink}">${browsMarkup(emotion)}</g>
    <g fill="${ink}" stroke="${ink}">${eyesMarkup(emotion)}</g>
    <g data-axi-part="mouth" stroke="${ink}" fill="none">${mouthPath(emotion)}</g>
    ${listeningCueMarkup(emotion, accent)}
  </g>`;
}

function sketchFace({ emotion, palette, hash, complexity }) {
    const accent = palette[1];
    const ink = palette[2];
    const wobble = hash % 5;
    const hatch = complexity >= 0.65
        ? `<path data-axi-part="hatch" d="M34 96 L46 86 M52 101 L68 86 M76 101 L91 86" stroke="${accent}" opacity="0.55"/>`
        : '';

    return `${symbolMarkup(ink)}
  <g fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <path data-axi-part="head" d="M32 ${38 + wobble} C48 27 84 28 98 43 C108 60 103 91 88 101 C72 112 43 105 31 91 C20 76 22 51 32 ${38 + wobble}Z" fill="none" stroke="${accent}"/>
    ${browsMarkup(emotion)}
    <g fill="${ink}">${eyesMarkup(emotion)}</g>
    <g data-axi-part="mouth" fill="none">${mouthPath(emotion)}</g>
    ${hatch}
    ${listeningCueMarkup(emotion, accent)}
  </g>`;
}

function emojiFace({ emotion, palette, complexity }) {
    const accent = palette[1];
    const ink = palette[2];
    return `${symbolMarkup(ink)}
  <circle data-axi-part="head" cx="64" cy="64" r="44" fill="none" stroke="${accent}" stroke-width="5"/>
  <g fill="${ink}" stroke="${ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    ${browsMarkup(emotion)}
    ${eyesMarkup(emotion)}
    <g data-axi-part="mouth" fill="none">${mouthPath(emotion)}</g>
    ${listeningCueMarkup(emotion, accent)}
  </g>`;
}

function terminalFace({ emotion, palette, hash, complexity }) {
    const accent = palette[1];
    const ink = palette[2];
    const scan = complexity >= 0.55
        ? `<path data-axi-part="scanlines" d="M24 49 H104 M24 70 H104 M24 91 H104" opacity="0.16"/>`
        : '';
    const cursor = complexity >= 0.9 || (hash % 3) === 0
        ? '<path data-axi-part="cursor" d="M84 78 H94" opacity="0.75"/>'
        : '';

    return `${symbolMarkup(ink)}
  <g fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
    <rect data-axi-part="head" x="20" y="28" width="88" height="76" rx="6" fill="none" stroke="${accent}"/>
    ${scan}
    ${browsMarkup(emotion)}
    <g fill="${ink}" stroke="${ink}">${eyesMarkup(emotion)}</g>
    <g data-axi-part="mouth" stroke="${ink}" fill="none">${mouthPath(emotion)}</g>
    ${cursor}
    ${listeningCueMarkup(emotion, accent)}
  </g>`;
}

export function generateFaceSvg(options = {}) {
    const seed = String(options.seed || 'axi-face');
    const emotion = normalizeEmotion(options.emotion, 'neutral');
    const style = normalizeStyle(options.style);
    const complexity = normalizeComplexity(options.complexity);
    const fallbackPaletteName = style === 'terminal' || style === 'emoji' ? style : 'default';
    const palette = Array.isArray(options.palette)
        ? options.palette.map((color) => String(color || '').trim()).filter(Boolean)
        : getGeneratedFacePalette(options.palette || fallbackPaletteName, fallbackPaletteName);
    const hash = hashString(`${seed}:${emotion}:${style}:${complexity}`);
    const renderOptions = { emotion, palette, hash, complexity };
    const body = {
        'robot-soft': robotSoftFace,
        'robot-minimal': robotMinimalFace,
        sketch: sketchFace,
        emoji: emojiFace,
        terminal: terminalFace
    }[style](renderOptions);

    return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AxiFace ${emotion}">
  ${body}
</svg>`;
}

export function generateFaceDataUrl(options = {}) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generateFaceSvg(options))}`;
}
