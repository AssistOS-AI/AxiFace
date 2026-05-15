import assert from 'node:assert/strict';
import test from 'node:test';

import {
    AxiFaceState,
    normalizeEmotion,
    normalizeMode,
    normalizeTheme,
    shouldHandleCommand
} from '../src/state-machine.mjs';

test('normalizes emotions to a stable set', () => {
    assert.equal(normalizeEmotion('thinking'), 'thinking');
    assert.equal(normalizeEmotion('unknown'), 'neutral');
});

test('normalizes mode and theme attributes', () => {
    assert.equal(normalizeMode('event-driven'), 'event-driven');
    assert.equal(normalizeMode('unknown'), 'static');
    assert.equal(normalizeTheme('dark'), 'dark');
    assert.equal(normalizeTheme('unknown'), 'auto');
});

test('state machine supports thinking, speaking, thoughts, and reset', () => {
    const machine = new AxiFaceState({ agentId: 'agent-a', src: '/face.svg', mode: 'event-driven', theme: 'dark' });
    machine.think('Checking context', { intensity: 0.4, mode: 'bubble' });
    assert.equal(machine.snapshot.emotion, 'thinking');
    assert.equal(machine.snapshot.visibleThought, 'Checking context');
    assert.equal(machine.snapshot.thoughtMode, 'bubble');
    assert.equal(machine.snapshot.intensity, 0.4);

    machine.speakStart();
    assert.equal(machine.snapshot.emotion, 'speaking');
    assert.equal(machine.snapshot.speaking, true);

    machine.speakEnd();
    assert.equal(machine.snapshot.emotion, 'neutral');
    assert.equal(machine.snapshot.speaking, false);

    machine.reset();
    assert.equal(machine.snapshot.agentId, 'agent-a');
    assert.equal(machine.snapshot.src, '/face.svg');
    assert.equal(machine.snapshot.mode, 'event-driven');
    assert.equal(machine.snapshot.theme, 'dark');
    assert.equal(machine.snapshot.emotion, 'neutral');
});

test('command routing requires matching agent id or broadcast', () => {
    assert.equal(shouldHandleCommand('agent-a', { agentId: 'agent-a' }), true);
    assert.equal(shouldHandleCommand('agent-a', { agentId: 'agent-b' }), false);
    assert.equal(shouldHandleCommand('agent-a', { broadcast: true }), true);
});
