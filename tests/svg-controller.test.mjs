import assert from 'node:assert/strict';
import test from 'node:test';

import {
    applyInlineSvgBlink,
    applyInlineSvgExpression
} from '../src/svg-controller.mjs';

function createFakeInlineRoot() {
    const parts = new Map([
        ['[data-axi-part="left-eye"]', { style: {} }],
        ['[data-axi-part="right-eye"]', { style: {} }],
        ['[data-axi-part="mouth"]', { style: {} }],
        ['[data-axi-part="brow-left"]', { style: {} }],
        ['[data-axi-part="brow-right"]', { style: {} }],
        ['[data-axi-part="glow"]', { style: {} }],
        ['[data-axi-part="symbol"]', { style: {}, textContent: '' }]
    ]);
    return {
        parts,
        querySelector(selector) {
            return parts.get(selector) || null;
        }
    };
}

test('inline SVG expression updates standard data-axi-part elements', () => {
    const root = createFakeInlineRoot();

    assert.equal(applyInlineSvgExpression(root, 'thinking'), true);

    assert.match(root.parts.get('[data-axi-part="left-eye"]').style.transform, /scaleY/);
    assert.match(root.parts.get('[data-axi-part="mouth"]').style.transform, /scaleY/);
    assert.equal(root.parts.get('[data-axi-part="symbol"]').textContent, '?');
    assert.equal(root.parts.get('[data-axi-part="glow"]').style.opacity, '1');
});

test('inline SVG expression degrades cleanly when no standard parts exist', () => {
    const root = { querySelector() { return null; } };

    assert.equal(applyInlineSvgExpression(root, 'happy'), false);
});

test('inline SVG blink closes and restores eyes', () => {
    const root = createFakeInlineRoot();

    assert.equal(applyInlineSvgBlink(root, true), true);
    assert.match(root.parts.get('[data-axi-part="left-eye"]').style.transform, /0.12/);

    assert.equal(applyInlineSvgBlink(root, false), true);
    assert.match(root.parts.get('[data-axi-part="left-eye"]').style.transform, /scaleY\(1\)/);
});
