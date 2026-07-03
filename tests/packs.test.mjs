import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getPackEmotionSource } from '../src/asset-loader.mjs';
import { EMOTIONS } from '../src/state-machine.mjs';

const PACKS = Object.freeze([
    'robot-soft',
    'robot-minimal',
    'sketch-simple',
    'emoji-simple'
]);

async function readPackManifest(packId) {
    const text = await readFile(new URL(`../packs/${packId}/manifest.json`, import.meta.url), 'utf8');
    return JSON.parse(text);
}

test('standard packs expose a full emotion manifest with neutral fallback', async () => {
    for (const packId of PACKS) {
        const manifest = await readPackManifest(packId);

        assert.equal(manifest.id, packId);
        assert.equal(manifest.defaultEmotion, 'neutral');
        for (const emotion of EMOTIONS) {
            assert.equal(manifest.emotions[emotion], `${emotion}.svg`);
        }
        assert.equal(getPackEmotionSource(manifest, 'missing-emotion'), 'neutral.svg');
    }
});

test('standard pack SVGs include controllable AxiFace parts', async () => {
    for (const packId of PACKS) {
        for (const emotion of EMOTIONS) {
            const svg = await readFile(new URL(`../packs/${packId}/${emotion}.svg`, import.meta.url), 'utf8');

            assert.match(svg, /<svg\b/);
            assert.match(svg, /data-axi-part="head"/);
            assert.match(svg, /data-axi-part="left-eye"/);
            assert.match(svg, /data-axi-part="right-eye"/);
            assert.match(svg, /data-axi-part="mouth"/);
        }
    }
});
