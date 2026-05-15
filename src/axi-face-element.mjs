import { loadInlineSvg, loadPackManifest, getPackEmotionSource, resolvePackAssetUrl } from './asset-loader.mjs';
import { generateFaceDataUrl, generateFaceSvg } from './generated-faces.mjs';
import { renderThought } from './thought-renderer.mjs';
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
        'palette',
        'complexity'
    ];

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.machine = new AxiFaceState();
        this.packManifest = null;
        this.loadedPackSrc = '';
        this.timers = new Set();
        this.assetUpdateSeq = 0;
        this.assetUpdateQueued = false;
        this.destroyed = false;
        this.handleCommand = (event) => this.onCommand(event);
        this.handleClick = () => this.emit('axi-face:clicked', { state: this.machine.snapshot });
        this.render();
    }

    connectedCallback() {
        this.destroyed = false;
        this.syncFromAttributes();
        this.configureGlobalListener();
        this.shadowRoot.removeEventListener('click', this.handleClick);
        this.shadowRoot.addEventListener('click', this.handleClick);
        this.requestAssetUpdate();
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
                const host = this.shadowRoot.querySelector('[data-role="asset"]');
                if (host) {
                    host.innerHTML = `<span class="inline-svg">${svg}</span>`;
                }
            }
            this.emit('axi-face:loaded', { state: this.machine.snapshot });
        } catch (error) {
            this.emit('axi-face:error', { message: error instanceof Error ? error.message : String(error) });
        }
    }

    render() {
        const state = this.machine.snapshot;
        const size = normalizeSize(this.getAttribute('size'), '48px');
        const shape = String(this.getAttribute('shape') || 'circle').trim() || 'circle';
        const generatedSrc = generateFaceDataUrl({
            seed: this.getAttribute('seed') || state.agentId || 'axi-face',
            style: this.getAttribute('style') || 'robot-soft',
            palette: this.getAttribute('palette') || 'default',
            complexity: this.getAttribute('complexity') || '',
            emotion: state.emotion
        });
        const source = state.generated || !state.src ? generatedSrc : state.src;
        const asset = state.assetMode === 'inline' && state.src
            ? '<span data-role="asset"></span>'
            : `<img data-role="asset" src="${source}" alt="" part="image">`;
        this.style.setProperty('--axi-face-size', size);
        const animationClass = state.animated ? 'animated' : '';
        const rootClasses = [
            'root',
            animationClass,
            `emotion-${state.emotion}`,
            `mode-${state.mode}`,
            `theme-${state.theme}`
        ].filter(Boolean).join(' ');
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${DEFAULT_STYLES_URL}">
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
        this.requestAssetUpdate();
    }

    showThought(text, options = {}) {
        this.machine.showThought(text, options);
        this.emit('axi-face:thought-shown', { text: String(text || ''), state: this.machine.snapshot });
        this.render();
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
        this.render();
    }

    think(text = '', options = {}) {
        this.machine.think(text, options);
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        if (text) this.emit('axi-face:thought-shown', { text, state: this.machine.snapshot });
        this.requestAssetUpdate();
    }

    speakStart(options = {}) {
        this.machine.speakStart(options);
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        this.requestAssetUpdate();
    }

    speakEnd() {
        this.machine.speakEnd();
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
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
        this.requestAssetUpdate();
    }

    destroy() {
        this.destroyed = true;
        this.assetUpdateSeq += 1;
        this.assetUpdateQueued = false;
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
            style: this.getAttribute('style') || 'robot-soft',
            palette: this.getAttribute('palette') || 'default',
            complexity: this.getAttribute('complexity') || '',
            emotion: this.machine.state.emotion
        });
    }
}
