import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getPackEmotionSource,
    loadPackManifest,
    sanitizeSvgText
} from '../src/asset-loader.mjs';

test('asset pack falls back to neutral when emotion is missing', () => {
    const manifest = {
        defaultEmotion: 'neutral',
        emotions: {
            neutral: 'neutral.svg',
            happy: 'happy.svg'
        }
    };
    assert.equal(getPackEmotionSource(manifest, 'happy'), 'happy.svg');
    assert.equal(getPackEmotionSource(manifest, 'thinking'), 'neutral.svg');
});

test('loads a pack manifest through injected fetch', async () => {
    const manifest = { defaultEmotion: 'neutral', emotions: { neutral: 'neutral.svg' } };
    const loaded = await loadPackManifest('/manifest.json', async () => ({
        ok: true,
        json: async () => manifest
    }));
    assert.deepEqual(loaded, manifest);
});

test('inline SVG sanitizer rejects scripts and unsafe handlers', () => {
    assert.equal(sanitizeSvgText('<svg><circle cx="1" cy="1" r="1"/></svg>').includes('<svg>'), true);
    assert.throws(() => sanitizeSvgText('<svg><script>alert(1)</script></svg>'), /script/);
    assert.throws(() => sanitizeSvgText('<svg onclick="alert(1)"></svg>'), /event handlers/);
    assert.throws(() => sanitizeSvgText('<svg><image href="https://example.com/a.png"/></svg>'), /unsafe resources/);
});
