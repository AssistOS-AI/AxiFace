import { AxiFaceElement } from './axi-face-element.mjs';

if (typeof customElements !== 'undefined' && !customElements.get('axi-face')) {
    customElements.define('axi-face', AxiFaceElement);
}

export { AxiFaceElement };
export * from './asset-loader.mjs';
export * from './generated-faces.mjs';
export * from './state-machine.mjs';
export * from './thought-renderer.mjs';
