import assert from 'node:assert/strict';
import test from 'node:test';

import { generateFaceDataUrl, generateFaceSvg } from '../src/generated-faces.mjs';

test('generated faces are deterministic for seed and emotion', () => {
    const first = generateFaceSvg({ seed: 'meeting-agent-1', emotion: 'thinking' });
    const second = generateFaceSvg({ seed: 'meeting-agent-1', emotion: 'thinking' });
    assert.equal(first, second);
});

test('generated faces produce SVG data URLs', () => {
    const url = generateFaceDataUrl({ seed: 'agent', emotion: 'happy' });
    assert.equal(url.startsWith('data:image/svg+xml;charset=utf-8,'), true);
    assert.equal(decodeURIComponent(url).includes('<svg'), true);
});
