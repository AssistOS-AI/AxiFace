import { loadInlineSvg, loadPackManifest, getPackEmotionSource, resolvePackAssetUrl } from './asset-loader.mjs';
import { generateFaceDataUrl, generateFaceSvg } from './generated-faces.mjs';
import { renderThought } from './thought-renderer.mjs';
import {
    AxiFaceState,
    normalizeBooleanAttribute,
    normalizeEmotion,
    normalizeSize,
    normalizeThoughtMode,
    shouldHandleCommand
} from './state-machine.mjs';

const DEFAULT_STYLES = `
:host {
    --axi-face-size: 48px;
    --axi-face-bg: transparent;
    --axi-face-text: #0f172a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    vertical-align: middle;
    color: var(--axi-face-text);
}

.root {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.frame {
    width: var(--axi-face-size);
    height: var(--axi-face-size);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: var(--axi-face-bg);
}

.frame.circle { border-radius: 999px; }
.frame.square { border-radius: 0; }
.frame.rounded { border-radius: 12px; }
.frame.none { border-radius: 0; overflow: visible; }

img, .inline-svg {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
}

.thought {
    max-width: min(220px, 45vw);
    font-size: 0.75rem;
    line-height: 1.25;
    color: var(--axi-face-text);
}

.thought-bubble {
    padding: 0.45rem 0.6rem;
    border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
    border-radius: 0.7rem;
    background: color-mix(in srgb, white 88%, currentColor 12%);
    box-shadow: 0 10px 28px rgb(15 23 42 / 0.12);
}

.thought-caption {
    position: absolute;
    top: calc(100% + 0.3rem);
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    white-space: nowrap;
}

.thought-ticker {
    overflow: hidden;
    white-space: nowrap;
    animation: axi-face-ticker 4s linear infinite;
}

.thought-inside {
    position: absolute;
    inset: auto 8% 8% 8%;
    text-align: center;
    padding: 0.15rem 0.25rem;
    border-radius: 0.35rem;
    background: rgb(255 255 255 / 0.78);
}

.root.animated .frame {
    animation: axi-face-idle 4s ease-in-out infinite;
}

.root.animated.emotion-thinking .frame {
    animation: axi-face-thinking 1.2s ease-in-out infinite;
}

.root.animated.emotion-speaking .frame {
    animation: axi-face-speaking 0.42s ease-in-out infinite;
}

.pulse {
    animation: axi-face-pulse 0.7s ease-out 1;
}

@keyframes axi-face-idle {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
}

@keyframes axi-face-thinking {
    0%, 100% { transform: rotate(-1deg); }
    50% { transform: rotate(1deg); }
}

@keyframes axi-face-speaking {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.045); }
}

@keyframes axi-face-pulse {
    0% { box-shadow: 0 0 0 0 color-mix(in srgb, currentColor 28%, transparent); }
    100% { box-shadow: 0 0 0 14px transparent; }
}

@keyframes axi-face-ticker {
    from { transform: translateX(15%); }
    to { transform: translateX(-15%); }
}
`;

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
        this.timers = new Set();
        this.handleCommand = (event) => this.onCommand(event);
        this.handleClick = () => this.emit('axi-face:clicked', { state: this.machine.snapshot });
        this.render();
    }

    connectedCallback() {
        this.syncFromAttributes();
        this.configureGlobalListener();
        this.shadowRoot.addEventListener('click', this.handleClick);
        this.updateAsset();
        this.emit('axi-face:ready', { state: this.machine.snapshot });
    }

    disconnectedCallback() {
        this.destroy();
    }

    attributeChangedCallback() {
        if (!this.isConnected) return;
        this.syncFromAttributes();
        this.configureGlobalListener();
        this.updateAsset();
        this.render();
    }

    syncFromAttributes() {
        const state = this.machine.state;
        state.agentId = String(this.getAttribute('agent-id') || '').trim();
        state.src = String(this.getAttribute('src') || '').trim();
        state.emotion = normalizeEmotion(this.getAttribute('emotion'), state.emotion);
        state.visibleThought = String(this.getAttribute('thought') || '');
        state.thoughtMode = normalizeThoughtMode(this.getAttribute('thought-mode'), state.visibleThought ? 'bubble' : 'none');
        state.packSrc = String(this.getAttribute('pack-src') || '').trim();
        state.assetMode = String(this.getAttribute('asset-mode') || 'img').trim() === 'inline' ? 'inline' : 'img';
        state.generated = this.hasAttribute('generated');
        state.animated = this.hasAttribute('animated') ? normalizeBooleanAttribute(this.getAttribute('animated')) : true;
    }

    configureGlobalListener() {
        window.removeEventListener('axi-face:command', this.handleCommand);
        if (this.hasAttribute('listen')) {
            window.addEventListener('axi-face:command', this.handleCommand);
        }
    }

    async updateAsset() {
        try {
            if (this.machine.state.packSrc) {
                this.packManifest = await loadPackManifest(this.machine.state.packSrc);
                const source = getPackEmotionSource(this.packManifest, this.machine.state.emotion);
                if (source) {
                    this.machine.state.src = resolvePackAssetUrl(this.machine.state.packSrc, source);
                }
            }
            this.render();
            if (this.machine.state.assetMode === 'inline' && this.machine.state.src) {
                const svg = await loadInlineSvg(this.machine.state.src);
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
        this.shadowRoot.innerHTML = `
            <style>${DEFAULT_STYLES}</style>
            <div class="root ${animationClass} emotion-${state.emotion}" part="root">
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
        this.updateAsset();
    }

    setSource(src) {
        this.machine.setSource(src);
        this.setAttribute('src', this.machine.state.src);
        this.updateAsset();
    }

    setPack(pack) {
        const packSrc = typeof pack === 'string' ? pack : pack?.src || pack?.packSrc || '';
        this.machine.setPack(packSrc);
        if (packSrc) this.setAttribute('pack-src', packSrc);
        this.updateAsset();
    }

    showThought(text, options = {}) {
        this.machine.showThought(text, options);
        this.emit('axi-face:thought-shown', { text: String(text || ''), state: this.machine.snapshot });
        this.render();
        if (options.duration) {
            const timer = setTimeout(() => this.hideThought(), Number(options.duration));
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
        this.updateAsset();
    }

    speakStart(options = {}) {
        this.machine.speakStart(options);
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        this.updateAsset();
    }

    speakEnd() {
        this.machine.speakEnd();
        this.emit('axi-face:emotion-changed', { state: this.machine.snapshot });
        this.updateAsset();
    }

    pulse(options = {}) {
        const frame = this.shadowRoot.querySelector('.frame');
        frame?.classList.add('pulse');
        const duration = Number(options.duration || 700);
        const timer = setTimeout(() => frame?.classList.remove('pulse'), duration);
        this.timers.add(timer);
    }

    reset() {
        this.machine.reset();
        this.updateAsset();
    }

    destroy() {
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
            emotion: this.machine.state.emotion
        });
    }
}
