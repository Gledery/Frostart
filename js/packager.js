/* =========================================
   packager.js  —  安装包下载入口
   职责：为在线预览（网页版）用户提供「获取项目文件以安装」入口，
         从 GitHub Releases 下载最新正式版的安装 ZIP（源码 ZIP 兜底）。
   说明：扩展环境下该卡片隐藏，面向用户的分发一律走正式 Release，
         不自行打包工作树文件。
   加载顺序：在 widgets.js 之后加载
   ========================================= */

const Packager = {
    /* 按环境分发：file:// 不可用；其余（在线网页版）下载正式 Release */
    async download() {
        const btn = document.getElementById('pack-download-btn');
        if (!btn || btn.disabled) return;

        if (location.protocol === 'file:') {
            showToast(I18N.t('packager.localToast'), 'error');
            return;
        }
        await this._downloadRelease(btn);
    },

    /* 网页环境：下载最新正式 Release 的资产，安装 ZIP 优先，源码 ZIP 兜底 */
    async _downloadRelease(btn) {
        const label = btn.querySelector('.pack-btn-label');
        const originalText = label ? label.textContent : '';
        btn.disabled = true;
        if (label) label.textContent = I18N.t('state.checking');

        try {
            const api = (typeof UPDATE_API !== 'undefined')
                ? UPDATE_API
                : 'https://api.github.com/repos/Gledery/Frostart/releases/latest';
            const page = (typeof UPDATE_RELEASES_PAGE !== 'undefined')
                ? UPDATE_RELEASES_PAGE
                : 'https://github.com/Gledery/Frostart/releases/latest';

            let url = null;
            let isAsset = false;
            try {
                const res = await fetch(api);
                if (res.ok) {
                    const data = await res.json();
                    const assets = data.assets || [];
                    const zip = assets.find(a => /\.zip$/i.test(a.name || '')) || assets[0];
                    if (zip && zip.browser_download_url) {
                        url = zip.browser_download_url;
                        isAsset = true;
                    } else if (data.zipball_url) {
                        url = data.zipball_url;
                    }
                }
            } catch (e) {}

            if (!url) {
                window.open(page, '_blank', 'noopener');
                showToast(I18N.t('packager.releasePage'), 'error');
                return;
            }

            const a = document.createElement('a');
            a.href = url;
            a.rel = 'noopener';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            showToast(isAsset ? I18N.t('packager.releaseDownload') : I18N.t('packager.sourceDownload'));
        } finally {
            btn.disabled = false;
            if (label) label.textContent = originalText;
        }
    }
};

/* =========================================
   初始化
   ========================================= */
function initPackager() {
    const btn = document.getElementById('pack-download-btn');
    if (btn) btn.addEventListener('click', () => Packager.download());

    /* 「获取项目文件以安装」卡片是给在线预览（网页版）用户准备的——
       他们还没安装扩展，需要下载 ZIP 来加载。
       已安装为扩展的用户（运行在 chrome-extension: 协议下）隐藏此卡片。 */
    const packSection = document.querySelector('.pack-section');
    if (packSection) {
        const isExtension = location.protocol === 'chrome-extension:';
        if (isExtension) {
            packSection.style.display = 'none';
        }
    }
}

/* 显式导出：被其他模块跨文件消费的顶层声明 */
window.initPackager = initPackager;
