/* =========================================
   math-utils.js  —  数学工具函数
   职责：数值钳制 clamp / 数值舍入 round
   ========================================= */

/**
 * 将数值钳制在指定范围内
 * @param {number} v - 要钳制的值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number}
 */
function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}

/**
 * 将数值舍入到指定小数位
 * @param {number} v - 要舍入的值
 * @param {number} digits - 小数位数
 * @returns {number}
 */
function round(v, digits) {
    const p = Math.pow(10, digits);
    return Math.round(v * p) / p;
}

/* 显式导出：被其他模块跨文件消费的顶层声明 */
window.clamp = clamp;
window.round = round;
