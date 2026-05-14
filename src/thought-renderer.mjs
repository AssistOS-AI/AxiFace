import { normalizeThoughtMode } from './state-machine.mjs';

export function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function renderThought(text, mode) {
    const thought = String(text || '').trim();
    const thoughtMode = normalizeThoughtMode(mode, 'none');
    if (!thought || thoughtMode === 'none') return '';
    return `<span class="thought thought-${thoughtMode}" part="thought">${escapeHtml(thought)}</span>`;
}
