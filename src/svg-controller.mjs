import { normalizeEmotion } from './state-machine.mjs';

const PART_SELECTORS = Object.freeze({
    leftEye: '[data-axi-part="left-eye"]',
    rightEye: '[data-axi-part="right-eye"]',
    mouth: '[data-axi-part="mouth"]',
    browLeft: '[data-axi-part="brow-left"]',
    browRight: '[data-axi-part="brow-right"]',
    glow: '[data-axi-part="glow"]',
    symbol: '[data-axi-part="symbol"]'
});

const EXPRESSION_TRANSFORMS = Object.freeze({
    neutral: {
        eyes: 'translateY(0) scaleY(1)',
        mouth: 'translateY(0) scaleY(1)',
        brows: 'translateY(0) rotate(0deg)',
        glow: '1',
        symbol: ''
    },
    idle: {
        eyes: 'translateY(1px) scaleY(0.92)',
        mouth: 'translateY(0) scaleY(0.92)',
        brows: 'translateY(1px) rotate(0deg)',
        glow: '0.72',
        symbol: ''
    },
    listening: {
        eyes: 'translateY(-1px) scaleY(1.06)',
        mouth: 'translateY(0) scaleY(0.75)',
        brows: 'translateY(-2px) rotate(0deg)',
        glow: '1',
        symbol: ''
    },
    thinking: {
        eyes: 'translateY(-1px) scaleY(1)',
        mouth: 'translateY(1px) scaleY(0.65)',
        brows: 'translateY(-2px) rotate(-7deg)',
        glow: '1',
        symbol: '?'
    },
    speaking: {
        eyes: 'translateY(0) scaleY(1.08)',
        mouth: 'translateY(0) scaleY(1.2)',
        brows: 'translateY(-1px) rotate(0deg)',
        glow: '1',
        symbol: ''
    },
    happy: {
        eyes: 'translateY(-1px) scaleY(0.82)',
        mouth: 'translateY(-2px) scaleY(1.18)',
        brows: 'translateY(-2px) rotate(3deg)',
        glow: '1',
        symbol: '✓'
    },
    amused: {
        eyes: 'translateY(-1px) scaleY(0.72)',
        mouth: 'translateY(-2px) scaleY(1.12)',
        brows: 'translateY(-2px) rotate(8deg)',
        glow: '1',
        symbol: '•'
    },
    confused: {
        eyes: 'translateY(0) scaleY(1)',
        mouth: 'translateY(1px) scaleY(0.8)',
        brows: 'translateY(-1px) rotate(-12deg)',
        glow: '0.86',
        symbol: '?'
    },
    concerned: {
        eyes: 'translateY(1px) scaleY(0.88)',
        mouth: 'translateY(2px) scaleY(0.9)',
        brows: 'translateY(1px) rotate(10deg)',
        glow: '0.78',
        symbol: '!'
    },
    alert: {
        eyes: 'translateY(-2px) scaleY(1.24)',
        mouth: 'translateY(0) scaleY(1.05)',
        brows: 'translateY(-3px) rotate(-10deg)',
        glow: '1',
        symbol: '!'
    },
    sleepy: {
        eyes: 'translateY(2px) scaleY(0.28)',
        mouth: 'translateY(1px) scaleY(0.7)',
        brows: 'translateY(2px) rotate(0deg)',
        glow: '0.55',
        symbol: 'z'
    }
});

function selectPart(root, key) {
    return root?.querySelector?.(PART_SELECTORS[key]) || null;
}

function applyTransform(element, transform) {
    if (!element) return;
    element.style.transformBox = 'fill-box';
    element.style.transformOrigin = 'center';
    element.style.transform = transform;
}

function applyOpacity(element, opacity) {
    if (!element) return;
    element.style.opacity = opacity;
}

function applySymbol(element, value) {
    if (!element) return;
    if ('textContent' in element) {
        element.textContent = value;
    }
    element.style.opacity = value ? '1' : '0';
}

export function applyInlineSvgExpression(root, emotion) {
    const normalizedEmotion = normalizeEmotion(emotion, 'neutral');
    const expression = EXPRESSION_TRANSFORMS[normalizedEmotion] || EXPRESSION_TRANSFORMS.neutral;
    if (!root?.querySelector) return false;

    const parts = {
        leftEye: selectPart(root, 'leftEye'),
        rightEye: selectPart(root, 'rightEye'),
        mouth: selectPart(root, 'mouth'),
        browLeft: selectPart(root, 'browLeft'),
        browRight: selectPart(root, 'browRight'),
        glow: selectPart(root, 'glow'),
        symbol: selectPart(root, 'symbol')
    };

    applyTransform(parts.leftEye, expression.eyes);
    applyTransform(parts.rightEye, expression.eyes);
    applyTransform(parts.mouth, expression.mouth);
    applyTransform(parts.browLeft, expression.brows);
    applyTransform(parts.browRight, expression.brows);
    applyOpacity(parts.glow, expression.glow);
    applySymbol(parts.symbol, expression.symbol);

    return Object.values(parts).some(Boolean);
}

export function applyInlineSvgBlink(root, closed = true) {
    if (!root?.querySelector) return false;
    const transform = closed ? 'translateY(1px) scaleY(0.12)' : '';
    const leftEye = selectPart(root, 'leftEye');
    const rightEye = selectPart(root, 'rightEye');
    applyTransform(leftEye, transform || 'translateY(0) scaleY(1)');
    applyTransform(rightEye, transform || 'translateY(0) scaleY(1)');
    return Boolean(leftEye || rightEye);
}
