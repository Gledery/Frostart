/* =========================================
   version-utils.js  —  版本号比较工具
   职责：语义化版本比较 compareVersions
   ========================================= */

/**
 * 语义化版本比较
 * @param {string} a - 版本号 a
 * @param {string} b - 版本号 b
 * @returns {number} 1(a>b) / -1(a<b) / 0(相等)
 */
function compareVersions(a, b) {
    const pa = String(a).split('.').map(function(n) { return parseInt(n, 10) || 0; });
    const pb = String(b).split('.').map(function(n) { return parseInt(n, 10) || 0; });
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        if ((pa[i] || 0) > (pb[i] || 0)) return 1;
        if ((pa[i] || 0) < (pb[i] || 0)) return -1;
    }
    return 0;
}

/* 显式导出：被其他模块跨文件消费的顶层声明 */
window.compareVersions = compareVersions;
