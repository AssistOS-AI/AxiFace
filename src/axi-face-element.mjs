import { loadInlineSvg, loadPackManifest, getPackEmotionSource, resolvePackAssetUrl } from './asset-loader.mjs';
import { generateFaceDataUrl, generateFaceSvg } from './generated-faces.mjs';
import { applyInlineSvgBlink, applyInlineSvgExpression } from './svg-controller.mjs';
import { escapeHtml, renderThought } from './thought-renderer.mjs';
import {
    AxiFaceState,
    normalizeBooleanAttribute,
    normalizeEmotion,
    normalizeMode,
    normalizeSize,
    normalizeTheme,
    normalizeThoughtMode,
    shouldHandleCommand
} from './state-machine.mjs';

const DEFAULT_STYLES_URL = new URL('./default-styles.css', import.meta.url).href;
const AUTONOMOUS_BLINK_BASE_MS = 2400;
const AUTONOMOUS_IDLE_BASE_MS = 5200;
const SHAPES = new Set(['circle', 'square', 'rounded', 'none']);

function hashString(value) {
    let hash = 2166136261;
    for (const char of String(value || 'axi-face')) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function normalizeShape(value, fallback = 'circle') {
    const shape = String(value || '').trim();
    return SHAPES.has(shape) ? shape : fallback;
}

function getGeneratedStyleAttribute(element) {
    const explicit = String(element.getAttribute('data-axi-style') || element.getAttribute('axi-style') || '').trim();
    if (explicit) return explicit;
    const nativeStyle = String(element.getAttribute('style') || '').trim();
    return nativeStyle && !/[;:]/.test(nativeStyle) ? nativeStyle : 'robot-soft';
}

function getGeneratedPaletteAttribute(element) {
    const raw = String(element.getAttribute('palette') || '').trim();
    if (!raw) return 'default';
    if (raw.startsWith('[')) {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                const normalized = parsed
                    .map((entry) => String(entry || '').trim())
                    .filter(Boolean);
                if (normalized.length >= 3) {
                    return normalized;
                }
            }
        } catch (_) {
            // Fall back to named palette handling below.
        }
    }
    return raw;
}

export class AxiFaceElement extends HTMLElement {
    static observedAttributes = [
        'agent-id',
        'src',
        'emotion',
        'size',
        'thought',
        'thought-mode',
        'mode',
        'shape',
        'theme',
        'pack-src',
        'animated',
        'listen',
        'asset-mode',
        'generated',
        'seed',
        'style',
        'axi-style',
        'data-axi-style',
        'palette',
        'complexity'
    ];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.machine = new AxiFaceState();
        this.packManifest = null;
        this.loadedPackSrc = '';
        this.inlineAssetSrc = '';
        this.timers = new Set();
        this.autonomousTimers = new Set();
        this.autonomousHash = 0;
        this.assetUpdateSeq = 0;
        this.assetUpdateQueued = false;
        this.destroyed = false;
        this.handleCommand = (event) => this.onCommand(event);
        this.handleClick = () => this.emit('axi-face:clicked', { state: this.machine.snapshot });
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${escapeHtml(DEFAULT_STYLES_URL)}">
            <div data-role="render-host"></div>
        `;
        this.render();
    }

    connectedCallback() {
        this.destroyed = false;
        this.syncFromAttributes();
        this.configureGlobalListener();
        this.shadowRoot.removeEventListener('click', this.handleClick);
        this.shadowRoot.addEventListener('click', this.handleClick);
        this.requestAssetUpdate();
        this.configureAutonomousBehavior();
        this.emit('axi-face:ready', { state: this.machine.snapshot });
    }

    disconnectedCallback() {
        this.destroy();
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;
        if (!this.isConnected) return;
        this.syncFromAttributes();
        this.configureGlobalListener();
        this.configureAutonomousBehavior();
        if (this.isAssetAttribute(name)) {
            this.requestAssetUpdate();
        } else {
            this.render();
        }
    }

    syncFromAttributes() {
        const state = this.machine.state;
        const attrSrc = String(this.getAttribute('src') || '').trim();
        const nextPackSrc = String(this.getAttribute('pack-src') || '').trim();
        state.agentId = String(this.getAttribute('agent-id') || '').trim();
        if (attrSrc || !nextPackSrc) {
            state.src = attrSrc;
        }
        state.emotion = normalizeEmotion(this.getAttribute('emotion'), state.emotion);
        state.visibleThought = String(this.getAttribute('thought') || '');
        state.thoughtMode = normalizeThoughtMode(this.getAttribute('thought-mode'), state.visibleThought ? 'bubble' : 'none');
        state.mode = normalizeMode(this.getAttribute('mode'), 'static');
        state.theme = normalizeTheme(this.getAttribute('theme'), 'auto');
        state.packSrc = nextPackSrc;
        state.assetMode = String(this.getAttribute('asset-mode') || 'img').trim() === 'inline' ? 'inline' : 'img';
        state.generated = this.hasAttribute('generated');
        state.animated = this.hasAttribute('animated') ? normalizeBooleanAttribute(this.getAttribute('animated')) : true;
        this.autonomousHash = hashString(`${state.agentId}:${this.getAttribute('seed') || ''}`);
    }

    configureGlobalListener() {
        window.removeEventListener('axi-face:command', this.handleCommand);
        if (this.isListeningEnabled()) {
            window.addEventListener('axi-face:command', this.handleCommand);
        }
    }

    isListeningEnabled() {
        return this.hasAttribute('listen') || this.machine.state.mode === 'event-driven';
    }

    isAssetAttribute(name) {
        return [
            'src',
            'emotion',
            'pack-src',
            'asset-mode',
            'generated',
            'seed',
            'style',
            'axi-style',
            'data-axi-style',
            'palette',
            'complexity'
        ].includes(name);
    }

    requestAssetUpdate() {
        if (this.assetUpdateQueued) return;
        this.assetUpdateQueued = true;
        queueMicrotask(() => {
            this.assetUpdateQueued = false;
            if (this.destroyed) return;
            void this.updateAsset();
        });
    }

    getInlineAssetHost() {
        return this.shadowRoot.querySelector('[data-role="asset"]');
    }

    applyInlineExpression() {
        if (this.machine.state.assetMode !== 'inline') return false;
        const host = this.getInlineAssetHost();
        if (!host) return false;
        return applyInlineSvgExpression(host, this.machine.state.emotion);
    }

    canUpdateInlineExpressionOnly() {
        return this.machine.state.assetMode === 'inline'
            && this.machine.state.src
            && this.inlineAssetSrc === this.machine.state.src
            && Boolean(this.getInlineAssetHost()?.querySelector?.('svg'));
    }

    updateThoughtRender() {
        const root = this.shadowRoot.querySelector('.root');
        if (!root?.insertAdjacentHTML) {
            this.render();
            return;
        }
        root.querySelectorAll?.('.thought')?.forEach((node) => node.remove());
        root.insertAdjacentHTML('beforeend', renderThought(this.machine.state.visibleThought, this.machine.state.thoughtMode));
    }

    updateRootClasses() {
        const root = this.shadowRoot.querySelector('.root');
        if (!root) return;
        const state = this.machine.snapshot;
        const animationClass = state.animated ? 'animated' : '';
        root.className = [
            'root',
            animationClass,
            `emotion-${state.emotion}`,
            `mode-${state.mode}`,
            `theme-${state.theme}`
        ].filter(Boolean).join(' ');
    }

    async updateAsset() {
        if (this.destroyed) return;
        const updateSeq = ++this.assetUpdateSeq;
        try {
            if (this.machine.state.packSrc) {
                if (this.loadedPackSrc !== this.machine.state.packSrc) {
                    this.packManifest = await loadPackManifest(this.machine.state.packSrc);
                    this.loadedPackSrc = this.machine.state.packSrc;
                }
                if (this.destroyed || updateSeq !== this.assetUpdateSeq) return;
                const source = getPackEmotionSource(this.packManifest, this.machine.state.emotion);
                if (source) {
                    this.machine.state.src = resolvePackAssetUrl(this.machine.state.packSrc, source);
                }
            } else {
                this.packManifest = null;
                this.loadedPackSrc = '';
            }
            this.render();
            if (this.machine.state.assetMode === 'inline' && this.machine.state.src) {
                const svg = await loadInlineSvg(this.machine.state.src);
                if (this.destroyed || updateSeq !== this.assetUpdateSeq) return;
                const host = this.getInlineAssetHost();
                if (host) {
                    host.innerHTML = `<span class="inline-svg">${svg}</span>`;
                    this.inlineAssetSrc = this.machine.state.src;
                    this.applyInlineExpression();
                }
            } else {
                this.inlineAssetSrc = '';
            }
            this.emit('axi-face:loaded', { state: this.machine.snapshot });
        } catch (error) {
            this.emit('axi-face:error', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    render() {
        const state = this.machine.snapshot;
        const size = normalizeSize(this.getAttribute('size'), '48px');
        const shape = normalizeShape(this.getAttribute('shape'), 'circle');
        const renderHost = this.shadowRoot.querySelector('[data-role="render-host"]');
        if (!renderHost) {
            return;
        }
        const generatedSrc = generateFaceDataUrl({
            seed: this.getAttribute('seed') || state.agentId || 'axi-face',
            style: getGeneratedStyleAttribute(this),
            palette: getGeneratedPaletteAttribute(this),
            complexity: this.getAttribute('complexity') || '',
            emotion: state.emotion
        });
        const source = state.generated || !state.src ? generatedSrc : state.src;
        const asset = state.assetMode === 'inline' && state.src
            ? '<span data-role="asset"></span>'
            : `<img data-role="asset" src="${escapeHtml(source)}" alt="" part="image">`;
        this.style.setProperty('--axi-face-size', size);
        const animationClass = state.animated ? 'animated' : '';
        const rootClasses = [
            'root',
            animationClass,
            `emotion-${state.emotion}`,
            `mode-${state.mode}`,
            `theme-${state.theme}`
        ].filter(Boolean).join(' ');
        renderHost.innerHTML = `
            <div class="${rootClasses}" part="root">
                <span class="frame ${shape}" part="frame">${asset}</span>
                ${renderThought(state.visibleThought, state.thoughtMode)}
            </div>
        `;
    }

    emit(type, detail = {}) {
        this.dispatchEvent(new CustomEvent(type, {
            detail,
            bubbles: true,
            composed: true
        }));
    }

    async onCommand(event) {
        const detail = event?.detail || {};
        if (!shouldHandleCommand(this.machine.state.agentId, detail)) return;
        const command = String(detail.command || '').trim();
        if (command === 'setEmotion') this.setEmotion(detail.emotion, detail);
        if (command === 'setSource') this.setSource(detail.src);
        if (command === 'setPack') this.setPack(detail.packSrc);
        if (command === 'think') this.think(detail.text || '', detail);
        if (command === 'showThought') this.showThought(detail.text || '', detail);
        if (command === 'hideThought') this.hideThought();
        if (command === 'speakStart') this.speakStart(detail);
        if (command === 'speakEnd') this.speakEnd();
        if (command === 'pulse') this.pulse(detail);
        if (command === 'reset') this.reset();
    }

    setEmotion(emotion, options = {}) {
        const previous = this.machine.state.emotion;
        this.machine.setEmotion(emotion, options);
        if (previous !== this.machine.state.emotion) {
            this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        }
        if (!this.machine.state.packSrc && this.canUpdateInlineExpressionOnly()) {
            this.updateRootClasses();
            this.applyInlineExpression();
            return;
        }
        this.requestAssetUpdate();
    }

    setSource(src) {
        this.machine.setSource(src);
        this.setAttribute('src', this.machine.state.src);
        this.requestAssetUpdate();
    }

    setPack(pack) {
        const packSrc = typeof pack === 'string' ? pack : pack?.src || pack?.packSrc || '';
        this.machine.setPack(packSrc);
        if (packSrc) this.setAttribute('pack-src', packSrc);
        this.inlineAssetSrc = '';
        this.requestAssetUpdate();
    }

    showThought(text, options = {}) {
        this.machine.showThought(text, options);
        this.emit('axi-face:thought-shown', { text: String(text || ''), state: this.machine.snapshot });
        this.updateThoughtRender();
        if (options.duration) {
            const timer = setTimeout(() => {
                this.timers.delete(timer);
                this.hideThought();
            }, Number(options.duration));
            this.timers.add(timer);
        }
    }

    hideThought() {
        this.machine.hideThought();
        this.updateThoughtRender();
    }

    think(text = '', options = {}) {
        this.machine.think(text, options);
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        if (text) this.emit('axi-face:thought-shown', { text, state: this.machine.snapshot });
        if (!this.machine.state.packSrc && this.canUpdateInlineExpressionOnly()) {
            this.updateRootClasses();
            this.updateThoughtRender();
            this.applyInlineExpression();
            return;
        }
        this.requestAssetUpdate();
    }

    speakStart(options = {}) {
        this.clearAutonomousTimers();
        this.machine.speakStart(options);
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        if (!this.machine.state.packSrc && this.canUpdateInlineExpressionOnly()) {
            this.updateRootClasses();
            this.applyInlineExpression();
            return;
        }
        this.requestAssetUpdate();
    }

    speakEnd() {
        this.machine.speakEnd();
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        this.configureAutonomousBehavior();
        if (!this.machine.state.packSrc && this.canUpdateInlineExpressionOnly()) {
            this.updateRootClasses();
            this.applyInlineExpression();
            return;
        }
        this.requestAssetUpdate();
    }

    pulse(options = {}) {
        const frame = this.shadowRoot.querySelector('.frame');
        frame?.classList.add('pulse');
        const duration = Number(options.duration || 700);
        const timer = setTimeout(() => {
            this.timers.delete(timer);
            frame?.classList.remove('pulse');
        }, duration);
        this.timers.add(timer);
    }

    reset() {
        this.machine.reset();
        this.configureAutonomousBehavior();
        this.requestAssetUpdate();
    }

    getAutonomousDelay(base, spread, salt = 0) {
        return base + ((this.autonomousHash + salt) % spread);
    }

    isAutonomousActive() {
        return this.machine.state.mode === 'autonomous'
            && this.machine.state.animated
            && !this.machine.state.speaking
            && !this.destroyed;
    }

    addAutonomousTimer(callback, delay) {
        const timer = setTimeout(() => {
            this.autonomousTimers.delete(timer);
            this.timers.delete(timer);
            callback();
        }, delay);
        this.autonomousTimers.add(timer);
        this.timers.add(timer);
        return timer;
    }

    clearAutonomousTimers() {
        for (const timer of this.autonomousTimers) {
            clearTimeout(timer);
            this.timers.delete(timer);
        }
        this.autonomousTimers.clear();
    }

    configureAutonomousBehavior() {
        this.clearAutonomousTimers();
        if (!this.isAutonomousActive()) return;
        this.scheduleAutonomousBlink();
        this.scheduleAutonomousIdlePulse();
    }

    scheduleAutonomousBlink() {
        if (!this.isAutonomousActive()) return;
        const delay = this.getAutonomousDelay(AUTONOMOUS_BLINK_BASE_MS, 1700, 41);
        this.addAutonomousTimer(() => {
            if (!this.isAutonomousActive()) return;
            if (this.machine.state.assetMode === 'inline') {
                const host = this.getInlineAssetHost();
                applyInlineSvgBlink(host, true);
                this.addAutonomousTimer(() => {
                    if (!this.isAutonomousActive()) return;
                    this.applyInlineExpression();
                }, 120);
            }
            this.scheduleAutonomousBlink();
        }, delay);
    }

    scheduleAutonomousIdlePulse() {
        if (!this.isAutonomousActive()) return;
        const delay = this.getAutonomousDelay(AUTONOMOUS_IDLE_BASE_MS, 2400, 211);
        this.addAutonomousTimer(() => {
            if (!this.isAutonomousActive()) return;
            this.pulse({ duration: 520 });
            this.scheduleAutonomousIdlePulse();
        }, delay);
    }

    destroy() {
        this.destroyed = true;
        this.assetUpdateSeq += 1;
        this.assetUpdateQueued = false;
        this.clearAutonomousTimers();
        window.removeEventListener('axi-face:command', this.handleCommand);
        this.shadowRoot?.removeEventListener?.('click', this.handleClick);
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers.clear();
    }

    get generatedSvg() {
        return generateFaceSvg({
            seed: this.getAttribute('seed') || this.machine.state.agentId || 'axi-face',
            style: getGeneratedStyleAttribute(this),
            palette: getGeneratedPaletteAttribute(this),
            complexity: this.getAttribute('complexity') || '',
            emotion: this.machine.state.emotion
        });
    }
}
