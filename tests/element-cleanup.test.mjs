import assert from 'node:assert/strict';
import test from 'node:test';

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
