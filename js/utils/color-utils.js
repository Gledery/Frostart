/* =========================================
   color-utils.js  —  色彩转换工具函数
   职责：hex 转 HSL / HSL 转 RGB 三元组 /
         hex 转 RGB 三元组 / 光斑颜色派生 /
         RGB 三元组转 hex
   ========================================= */

/**
 * 将十六进制颜色转换为 HSL 对象
 * @param {string} hex - 十六进制颜色值（支持 #rgb 和 #rrggbb）
 * @returns {{h: number, s: number, l: number}}
 */
function hexToHsl(hex) {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(function(c) { return c + c; }).join('');
    const num = parseInt(h, 16);
    if (isNaN(num) || h.length !== 6) return { h: 215, s: 70, l: 62 };
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let hue = 0;
    let sat = 0;
    const light = (max + min) / 2;
    const d = max - min;
    if (d !== 0) {
        sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: hue = ((b - r) / d + 2); break;
            case b: hue = ((r - g) / d + 4); break;
        }
        hue *= 60;
    }
    return { h: hue, s: sat * 100, l: light * 100 };
}

/**
 * 将 HSL 转换为 "R,G,B" 三元组字符串
 * @param {number} h - 色相 (0-360)
 * @param {number} s - 饱和度 (0-100)
 * @param {number} l - 明度 (0-100)
 * @returns {string} 格式为 "r, g, b"
 */
function hslToRgbTriplet(h, s, l) {
    s /= 100; l /= 100;
    const k = function(n) { return (n + h / 30) % 12; };
    const a = s * Math.min(l, 1 - l);
    const f = function(n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    const r = Math.round(f(0) * 255);
    const g = Math.round(f(8) * 255);
    const b = Math.round(f(4) * 255);
    return r + ', ' + g + ', ' + b;
}

/**
 * 将十六进制颜色直接转换为 "R,G,B" 三元组字符串
 * @param {string} hex - 十六进制颜色值
 * @returns {string} 格式为 "r, g, b"
 */
function hexToRgbTriplet(hex) {
    let h = (hex || '').replace('#', '').trim();
    if (h.length === 3) h = h.split('').map(function(c) { return c + c; }).join('');
    const num = parseInt(h, 16);
    if (isNaN(num) || h.length !== 6) return '91, 110, 225';
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return r + ', ' + g + ', ' + b;
}

/**
 * 从背景色提取光斑颜色
 * 根据背景色的色相/饱和度/明度派生适合的光斑色
 * @param {string} hex - 背景十六进制色
 * @param {number} hueShift - 色相偏移度数，用于让第二个光斑与第一个拉开差异
 * @returns {string} "R,G,B" 三元组
 */
function hexToBlobRgb(hex, hueShift) {
    if (hueShift === undefined) hueShift = 0;
    const hsl = hexToHsl(hex);
    const h = hsl.h, s = hsl.s, l = hsl.l;
    let outH = (h + hueShift + 360) % 360;
    let outS;
    let outL;
    if (s < 8 || l > 92) {
        outH = (hueShift === 0 ? 215 : 265);
        outS = 70;
        outL = 62;
    } else {
        outS = Math.min(85, Math.max(45, s + 30));
        outL = Math.min(66, Math.max(50, l + 10));
    }
    return hslToRgbTriplet(outH, outS, outL);
}

/**
 * 将 "R,G,B" 三元组字符串转换为十六进制颜色
 * @param {string} triplet - 格式如 "91, 110, 225"
 * @returns {string} 十六进制颜色值，如 "#5b6ee1"
 */
function rgbTripletToHex(triplet) {
    const parts = String(triplet).split(',').map(function(p) { return parseInt(p.trim(), 10); });
    if (parts.length !== 3 || parts.some(function(n) { return isNaN(n); })) return '#5b6ee1';
    return '#' + parts.map(function(n) {
        return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
    }).join('');
}

/* 显式导出：被其他模块跨文件消费的顶层声明 */
window.hexToBlobRgb = hexToBlobRgb;
window.hexToRgbTriplet = hexToRgbTriplet;
window.rgbTripletToHex = rgbTripletToHex;
