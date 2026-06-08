import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

test('shape none removes the frame background', async () => {
    const css = await fs.readFile(path.resolve(import.meta.dirname, '../src/default-styles.css'), 'utf8');
    assert.match(css, /\.frame\.none\s*\{[\s\S]*background:\s*transparent;/);
});

test('element destroy removes global listeners and timers', async () => {
    const listenerCalls = [];
    globalThis.window = {
        addEventListener(type, handler) {
            listenerCalls.push(['add', type, handler]);
        },
        removeEventListener(type, handler) {
            listenerCalls.push(['remove', type, handler]);
        }
    };
    globalThis.HTMLElement = class {
        constructor() {
            this.attributes = new Map();
            this.style = { setProperty() {} };
        }
        attachShadow() {
            this.shadowRoot = {
                innerHTML: '',
                addEventListener() {},
                removeEventListener() {},
                querySelector() {
                    return null;
                }
            };
            return this.shadowRoot;
        }
        getAttribute(name) {
            return this.attributes.get(name) ?? null;
        }
        hasAttribute(name) {
            return this.attributes.has(name);
        }
        setAttribute(name, value = '') {
            this.attributes.set(name, String(value));
        }
        removeAttribute(name) {
            this.attributes.delete(name);
        }
        dispatchEvent() {
            return true;
        }
    };
    globalThis.location = { href: 'http://localhost/demo/' };
    globalThis.CustomEvent = class {
        constructor(type, options = {}) {
            this.type = type;
            this.detail = options.detail;
            this.bubbles = Boolean(options.bubbles);
            this.composed = Boolean(options.composed);
        }
    };

    const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
    const element = new AxiFaceElement();
    element.setAttribute('listen', '');
    element.connectedCallback();
    const timer = setTimeout(() => {}, 10_000);
    element.timers.add(timer);
    element.destroy();

    assert.equal(listenerCalls.some(([kind, type]) => kind === 'add' && type === 'axi-face:command'), true);
    assert.equal(listenerCalls.some(([kind, type]) => kind === 'remove' && type === 'axi-face:command'), true);
    assert.equal(element.timers.size, 0);
});

test('event-driven mode listens for global commands without listen attribute', async () => {
    const listenerCalls = [];
    globalThis.window = {
        addEventListener(type, handler) {
            listenerCalls.push(['add', type, handler]);
        },
        removeEventListener(type, handler) {
            listenerCalls.push(['remove', type, handler]);
        }
    };

    const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
    const element = new AxiFaceElement();
    element.setAttribute('mode', 'event-driven');
    element.connectedCallback();
    element.destroy();

    assert.equal(listenerCalls.some(([kind, type]) => kind === 'add' && type === 'axi-face:command'), true);
});

test('non-asset attribute changes preserve resolved pack source', async () => {
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {}
    };

    const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
    const element = new AxiFaceElement();
    element.isConnected = true;
    element.setAttribute('pack-src', '/packs/robot-soft/manifest.json');
    element.machine.state.src = '/packs/robot-soft/happy.svg';

    element.setAttribute('thought', 'Still using the selected pack face');
    element.attributeChangedCallback('thought', null, 'Still using the selected pack face');

    assert.equal(element.machine.state.src, '/packs/robot-soft/happy.svg');
});

test('duration timers remove themselves after firing', async () => {
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {}
    };

    const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
    const element = new AxiFaceElement();
    element.showThought('Short lived', { duration: 1 });

    await new Promise((resolve) => setTimeout(resolve, 5));

    assert.equal(element.timers.size, 0);
});

test('destroy cancels queued asset updates', async () => {
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {}
    };

    const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
    const element = new AxiFaceElement();
    let updateCalls = 0;
    element.updateAsset = async () => {
        updateCalls += 1;
    };

    element.requestAssetUpdate();
    element.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(updateCalls, 0);
});

test('autonomous mode starts per-instance timers and clears them on destroy', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    const scheduled = [];
    globalThis.setTimeout = (callback, delay) => {
        const timer = { callback, delay, cleared: false };
        scheduled.push(timer);
        return timer;
    };
    globalThis.clearTimeout = (timer) => {
        if (timer) timer.cleared = true;
    };
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {}
    };

    try {
        const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
        const first = new AxiFaceElement();
        first.setAttribute('agent-id', 'agent-a');
        first.setAttribute('mode', 'autonomous');
        first.connectedCallback();

        const second = new AxiFaceElement();
        second.setAttribute('agent-id', 'agent-b');
        second.setAttribute('mode', 'autonomous');
        second.connectedCallback();

        assert.equal(first.autonomousTimers.size, 2);
        assert.equal(second.autonomousTimers.size, 2);
        assert.notEqual(scheduled[0].delay, scheduled[2].delay);

        first.destroy();
        assert.equal(first.autonomousTimers.size, 0);
        assert.equal(scheduled[0].cleared, true);
        assert.equal(scheduled[1].cleared, true);

        second.destroy();
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
    }
});

test('autonomous mode does not keep timers while speaking', async () => {
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    globalThis.setTimeout = (callback, delay) => ({ callback, delay, cleared: false });
    globalThis.clearTimeout = (timer) => {
        if (timer) timer.cleared = true;
    };
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {}
    };

    try {
        const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
        const element = new AxiFaceElement();
        element.setAttribute('mode', 'autonomous');
        element.connectedCallback();

        assert.equal(element.autonomousTimers.size, 2);
        element.speakStart();
        assert.equal(element.machine.state.speaking, true);
        assert.equal(element.autonomousTimers.size, 0);

        element.speakEnd();
        assert.equal(element.machine.state.speaking, false);
        assert.equal(element.autonomousTimers.size, 2);
        element.destroy();
    } finally {
        globalThis.setTimeout = originalSetTimeout;
        globalThis.clearTimeout = originalClearTimeout;
    }
});

test('generated style supports data-axi-style when native style carries CSS', async () => {
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {}
    };

    const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
    const element = new AxiFaceElement();
    element.setAttribute('generated', '');
    element.setAttribute('style', '--axi-face-size: 72px;');
    element.setAttribute('data-axi-style', 'sketch');

    const svg = element.generatedSvg;

    assert.equal(svg.includes('data-axi-part="hatch"') || svg.includes('C48 27'), true);
    assert.equal(svg.includes('<rect data-axi-part="head" x="25"'), false);
});

test('generated palette accepts a JSON color array attribute', async () => {
    globalThis.window = {
        addEventListener() {},
        removeEventListener() {}
    };

    const { AxiFaceElement } = await import('../src/axi-face-element.mjs');
    const element = new AxiFaceElement();
    element.setAttribute('generated', '');
    element.setAttribute('data-axi-style', 'terminal');
    element.setAttribute('palette', '["#111827","#ec4899","#f8fafc","#22d3ee"]');

    const svg = element.generatedSvg;

    assert.equal(svg.includes('<rect width="128" height="128"'), false);
    assert.match(svg, /#ec4899|#22d3ee|#f8fafc/);
    assert.equal(svg.includes('fill="#052e16"'), false);
});
