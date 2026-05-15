export const GENERATED_FACE_STYLES = Object.freeze([
    'robot-soft',
    'robot-minimal',
    'sketch',
    'emoji',
    'terminal'
]);

export const DEFAULT_GENERATED_FACE_PALETTES = Object.freeze({
    default: Object.freeze(['#f8fafc', '#2563eb', '#0f172a', '#38bdf8']),
    warm: Object.freeze(['#fff7ed', '#ea580c', '#431407', '#facc15']),
    mono: Object.freeze(['#f8fafc', '#475569', '#0f172a', '#cbd5e1']),
    terminal: Object.freeze(['#020617', '#22c55e', '#bbf7d0', '#16a34a']),
    emoji: Object.freeze(['#fff7ed', '#facc15', '#422006', '#fb923c'])
});

const generatedFacePalettes = new Map(
    Object.entries(DEFAULT_GENERATED_FACE_PALETTES)
);

function normalizePaletteColors(colors) {
    if (!Array.isArray(colors)) {
        throw new TypeError('Generated face palette must be an array of CSS color strings.');
    }
    const normalized = colors.map((color) => String(color || '').trim());
    if (normalized.length < 3 || normalized.some((color) => !color)) {
        throw new TypeError('Generated face palette requires at least background, accent, and ink colors.');
    }
    return Object.freeze(normalized.slice(0, 4));
}

export function registerGeneratedFacePalette(name, colors) {
    const paletteName = String(name || '').trim();
    if (!paletteName) {
        throw new TypeError('Generated face palette name is required.');
    }
    generatedFacePalettes.set(paletteName, normalizePaletteColors(colors));
}

export function unregisterGeneratedFacePalette(name) {
    const paletteName = String(name || '').trim();
    if (!paletteName || Object.hasOwn(DEFAULT_GENERATED_FACE_PALETTES, paletteName)) {
        return false;
    }
    return generatedFacePalettes.delete(paletteName);
}

export function getGeneratedFacePalette(name, fallbackName = 'default') {
    const paletteName = String(name || '').trim();
    const fallbackPaletteName = String(fallbackName || 'default').trim() || 'default';
    return generatedFacePalettes.get(paletteName)
        || generatedFacePalettes.get(fallbackPaletteName)
        || DEFAULT_GENERATED_FACE_PALETTES.default;
}

export function listGeneratedFacePalettes() {
    return Object.freeze(Object.fromEntries(generatedFacePalettes));
}
