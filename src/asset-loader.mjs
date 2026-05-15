export function resolveRelativeUrl(baseUrl, relativeUrl) {
    const base = String(baseUrl || '').trim();
    const value = String(relativeUrl || '').trim();
    if (!value) return '';
    return new URL(value, base || globalThis.location?.href || 'http://localhost/').href;
}

export function resolvePackAssetUrl(packSrc, assetPath) {
    const base = resolveRelativeUrl(globalThis.location?.href || 'http://localhost/', packSrc);
    return resolveRelativeUrl(base, assetPath);
}

export async function loadPackManifest(packSrc, fetchImpl = globalThis.fetch) {
    if (!packSrc) throw new Error('Missing pack-src.');
    if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable.');
    const response = await fetchImpl(packSrc);
    if (!response?.ok) {
        throw new Error(`Unable to load AxiFace pack manifest: ${response?.status || 'unknown'}`);
    }
    const manifest = await response.json();
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('Invalid AxiFace pack manifest.');
    }
    return manifest;
}

export function getPackEmotionSource(manifest, emotion) {
    const emotions = manifest?.emotions && typeof manifest.emotions === 'object' ? manifest.emotions : {};
    const defaultEmotion = String(manifest?.defaultEmotion || 'neutral').trim() || 'neutral';
    return String(emotions[emotion] || emotions[defaultEmotion] || emotions.neutral || '').trim();
}

export function sanitizeSvgText(svgText) {
    const text = String(svgText || '');
    if (/<\s*script\b/i.test(text)) {
        throw new Error('Inline SVG contains a script element.');
    }
    if (/<\s*(?:foreignObject|iframe|object|embed|audio|video|image)\b/i.test(text)) {
        throw new Error('Inline SVG contains unsupported embedded content.');
    }
    if (/\son[a-z]+\s*=/i.test(text)) {
        throw new Error('Inline SVG contains inline event handlers.');
    }
    if (/@import\b/i.test(text)) {
        throw new Error('Inline SVG contains external style imports.');
    }
    if (/\b(?:href|xlink:href|src)\s*=\s*["']\s*(?:https?:|data:|javascript:|\/\/)/i.test(text)) {
        throw new Error('Inline SVG contains external or unsafe resources.');
    }
    if (/\b(?:href|xlink:href|src)\s*=\s*["']\s*(?!#)[^"']+/i.test(text)) {
        throw new Error('Inline SVG contains external or unsafe resources.');
    }
    if (/url\s*\(\s*["']?\s*(?!#)[^)]+/i.test(text)) {
        throw new Error('Inline SVG contains external or unsafe resources.');
    }
    return text;
}

export async function loadInlineSvg(src, fetchImpl = globalThis.fetch) {
    if (!src) throw new Error('Missing SVG source.');
    if (typeof fetchImpl !== 'function') throw new Error('Fetch is unavailable.');
    const response = await fetchImpl(src);
    if (!response?.ok) {
        throw new Error(`Unable to load inline SVG: ${response?.status || 'unknown'}`);
    }
    return sanitizeSvgText(await response.text());
}
