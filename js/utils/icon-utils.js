/* =========================================
   icon-utils.js  —  UI 图标渲染工具函数
   职责：统一生成 icons/ui-sprite.svg 的 <use> 引用标记（Lucide 图标）
   加载顺序：位于 js/utils/* 段，供 panels.js / widgets.js 等动态模板调用
   ========================================= */

const ICON_SPRITE = 'icons/ui-sprite.svg';

/**
 * 生成图标 SVG 标记
 * @param {string} name - sprite 中的 symbol id，如 "trash-2"
 * @param {string} [cls] - 追加到宿主 svg 的 class
 * @param {number|string} [stroke] - 覆盖默认描边宽度（默认取 --icon-stroke）
 * @returns {string} svg 字符串
 */
function iconHtml(name, cls = '', stroke) {
    const clsAttr = cls ? ` icon ${cls}` : ' icon';
    const strokeAttr = stroke ? ` style="stroke-width:${stroke}"` : '';
    return `<svg class="${clsAttr.trim()}"${strokeAttr} aria-hidden="true"><use href="${ICON_SPRITE}#${name}"/></svg>`;
}
