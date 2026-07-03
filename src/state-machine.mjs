export const EMOTIONS = Object.freeze([
    'neutral',
    'listening',
    'thinking',
    'speaking',
    'happy',
    'confused',
    'alert',
    'sleepy'
]);

export const THOUGHT_MODES = Object.freeze([
    'none',
    'bubble',
    'caption',
    'ticker',
    'inside'
]);

export const MODES = Object.freeze([
    'static',
    'controlled',
    'event-driven',
    'autonomous'
]);

export const THEMES = Object.freeze([
    'light',
    'dark',
    'auto'
]);

export function normalizeEmotion(value, fallback = 'neutral') {
    const emotion = String(value || '').trim();
    return EMOTIONS.includes(emotion) ? emotion : fallback;
}

export function normalizeThoughtMode(value, fallback = 'none') {
    const mode = String(value || '').trim();
    return THOUGHT_MODES.includes(mode) ? mode : fallback;
}

export function normalizeMode(value, fallback = 'static') {
    const mode = String(value || '').trim();
    return MODES.includes(mode) ? mode : fallback;
}

export function normalizeTheme(value, fallback = 'auto') {
    const theme = String(value || '').trim();
    return THEMES.includes(theme) ? theme : fallback;
}

export function normalizeBooleanAttribute(value) {
    return value !== null && value !== false && String(value).toLowerCase() !== 'false';
}

export function normalizeSize(value, fallback = '48px') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^\d+(\.\d+)?$/.test(raw)) return `${raw}px`;
    return raw;
}

export function clampIntensity(value, fallback = 1) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(0, Math.min(1, number));
}

export function createInitialState(overrides = {}) {
    return {
        agentId: String(overrides.agentId || '').trim(),
        emotion: normalizeEmotion(overrides.emotion, 'neutral'),
        activity: String(overrides.activity || 'idle').trim(),
        intensity: clampIntensity(overrides.intensity, 1),
        speaking: Boolean(overrides.speaking),
        visibleThought: String(overrides.visibleThought || ''),
        thoughtMode: normalizeThoughtMode(overrides.thoughtMode, 'none'),
        mode: normalizeMode(overrides.mode, 'static'),
        theme: normalizeTheme(overrides.theme, 'auto'),
        assetMode: String(overrides.assetMode || 'img').trim() === 'inline' ? 'inline' : 'img',
        src: String(overrides.src || '').trim(),
        packSrc: String(overrides.packSrc || '').trim(),
        generated: Boolean(overrides.generated),
        animated: overrides.animated === undefined ? true : Boolean(overrides.animated)
    };
}

export function shouldHandleCommand(agentId, detail = {}) {
    if (!detail || typeof detail !== 'object') return false;
    if (detail.broadcast === true) return true;
    return String(detail.agentId || '').trim() === String(agentId || '').trim();
}

export class AxiFaceState {
    constructor(overrides = {}) {
        this.state = createInitialState(overrides);
    }

    get snapshot() {
        return { ...this.state };
    }

    setEmotion(emotion, options = {}) {
        this.state.emotion = normalizeEmotion(emotion, this.state.emotion);
        this.state.intensity = clampIntensity(options.intensity, this.state.intensity);
        this.state.activity = this.state.emotion;
        this.state.speaking = this.state.emotion === 'speaking';
        return this.snapshot;
    }

    setSource(src) {
        this.state.src = String(src || '').trim();
        this.state.generated = false;
        return this.snapshot;
    }

    setPack(packSrc) {
        this.state.packSrc = String(packSrc || '').trim();
        return this.snapshot;
    }

    showThought(text, options = {}) {
        this.state.visibleThought = String(text || '');
        this.state.thoughtMode = normalizeThoughtMode(options.mode || this.state.thoughtMode, this.state.thoughtMode);
        return this.snapshot;
    }

    hideThought() {
        this.state.visibleThought = '';
        return this.snapshot;
    }

    think(text = '', options = {}) {
        this.setEmotion('thinking', options);
        if (text) {
            this.showThought(text, options);
        }
        return this.snapshot;
    }

    speakStart(options = {}) {
        this.setEmotion('speaking', options);
        this.state.speaking = true;
        return this.snapshot;
    }

    speakEnd() {
        this.state.speaking = false;
        if (this.state.emotion === 'speaking') {
            this.state.emotion = 'neutral';
            this.state.activity = 'idle';
        }
        return this.snapshot;
    }

    reset() {
        const agentId = this.state.agentId;
        const src = this.state.src;
        const packSrc = this.state.packSrc;
        const assetMode = this.state.assetMode;
        const generated = this.state.generated;
        const animated = this.state.animated;
        const mode = this.state.mode;
        const theme = this.state.theme;
        this.state = createInitialState({ agentId, src, packSrc, mode, theme, assetMode, generated, animated });
        return this.snapshot;
    }
}
