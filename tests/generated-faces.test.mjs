import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getGeneratedFacePalette,
    listGeneratedFacePalettes,
    registerGeneratedFacePalette,
    unregisterGeneratedFacePalette
} from '../src/generated-face-config.mjs';
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

test('generated face styles and complexity affect the SVG output', () => {
    const robot = generateFaceSvg({ seed: 'agent', emotion: 'neutral', style: 'robot-soft', complexity: 'low' });
    const terminal = generateFaceSvg({ seed: 'agent', emotion: 'neutral', style: 'terminal', complexity: 'low' });
    const detailed = generateFaceSvg({ seed: 'agent', emotion: 'neutral', style: 'terminal', complexity: 'high' });

    assert.notEqual(robot, terminal);
    assert.notEqual(terminal, detailed);
    assert.equal(terminal.includes('data-axi-part="head"'), true);
});

test('generated face palettes are configurable', () => {
    registerGeneratedFacePalette('brand', ['#101010', '#ff0066', '#f8fafc', '#00d1ff']);

    const palette = getGeneratedFacePalette('brand');
    const svg = generateFaceSvg({ seed: 'brand-agent', emotion: 'happy', palette: 'brand', style: 'terminal' });
    const palettes = listGeneratedFacePalettes();

    assert.deepEqual([...palette], ['#101010', '#ff0066', '#f8fafc', '#00d1ff']);
    assert.equal(svg.includes('#ff0066'), true);
    assert.equal(Object.hasOwn(palettes, 'brand'), true);
    assert.equal(unregisterGeneratedFacePalette('brand'), true);
    assert.equal(Object.hasOwn(listGeneratedFacePalettes(), 'brand'), false);
});

test('generated faces render without a filled background tile', () => {
    const svg = generateFaceSvg({ seed: 'agent', emotion: 'neutral', style: 'robot-soft' });
    assert.doesNotMatch(svg, /<rect width="128" height="128"/);
});

test('emoji generated faces do not fill the head shape with palette colors', () => {
    const svg = generateFaceSvg({ seed: 'agent', emotion: 'neutral', style: 'emoji', palette: 'default' });
    assert.match(svg, /data-axi-part="head"[^>]+fill="none"/);
    assert.doesNotMatch(svg, /fill="%232563eb"|fill="#2563eb"/);
});
