import { normalizeEmotion } from './state-machine.mjs';

const PALETTES = Object.freeze({
    default: ['#f8fafc', '#2563eb', '#0f172a', '#38bdf8'],
    warm: ['#fff7ed', '#ea580c', '#431407', '#facc15'],
    mono: ['#f8fafc', '#475569', '#0f172a', '#cbd5e1']
});

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

function mouthPath(emotion) {
    switch (normalizeEmotion(emotion)) {
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

function eyeMarkup(emotion) {
    switch (normalizeEmotion(emotion)) {
    case 'sleepy':
        return '<path d="M37 55 H52" /><path d="M76 55 H91" />';
    case 'thinking':
        return '<circle cx="45" cy="56" r="5" /><circle cx="83" cy="54" r="5" />';
    case 'alert':
        return '<circle cx="45" cy="54" r="7" /><circle cx="83" cy="54" r="7" />';
    default:
        return '<circle cx="45" cy="55" r="6" /><circle cx="83" cy="55" r="6" />';
    }
}

export function generateFaceSvg(options = {}) {
    const seed = String(options.seed || 'axi-face');
    const emotion = normalizeEmotion(options.emotion, 'neutral');
    const paletteName = String(options.palette || 'default').trim();
    const palette = PALETTES[paletteName] || PALETTES.default;
    const hash = hashString(`${seed}:${emotion}:${options.style || ''}`);
    const background = palette[0];
    const accent = pick(palette.slice(1), hash);
    const ink = palette[2];
    const glow = palette[3] || accent;
    const antenna = (hash % 2) === 0
        ? `<path data-axi-part="antenna" d="M64 25 V13" /><circle cx="64" cy="10" r="4" fill="${glow}" />`
        : '';

    return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="AxiFace ${emotion}">
  <rect width="128" height="128" rx="32" fill="${background}"/>
  <g fill="none" stroke="${ink}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
    ${antenna}
    <rect data-axi-part="head" x="25" y="30" width="78" height="74" rx="24" fill="${accent}" stroke="${ink}"/>
    <g data-axi-part="left-eye right-eye" fill="${ink}">${eyeMarkup(emotion)}</g>
    <g data-axi-part="mouth" fill="none">${mouthPath(emotion)}</g>
    <circle data-axi-part="glow" cx="96" cy="34" r="6" fill="${glow}" stroke="none"/>
  </g>
</svg>`;
}

export function generateFaceDataUrl(options = {}) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(generateFaceSvg(options))}`;
}
