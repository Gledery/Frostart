const SettingsManager = {
    // 从 changelog.js 的 versions 数组取最新版本号，避免多处硬编码不同步
    get VERSION() {
        if (typeof versions !== 'undefined' && versions[0] && versions[0].version) {
            return versions[0].version;
        }
        return '0.0.0';
    },
    STORAGE_KEY: 'frostartSettings',
    BACKUP_KEY: 'frostartSettings_backup',
    
    defaultSettings: {
        // 界面语言：auto=跟随浏览器，也可手动指定 zh/en
        lang: 'auto',
        theme: 'auto',
        // 自定义主题色：默认雾蓝 #5f96f2（默认晨雾蓝渐变在光斑联动下的派生色）；
        // 空字符串则回退主题自带 accent（浅色#5b6ee1 / 深色#7c8aef）
        accentColor: '#5f96f2',
        // 角落颜文字开关
        kaomoji: true,
        blur: 8,
        opacity: 100,
        saturation: 150,
        iconSize: 72,
        borderRadius: 24,
        iconBgOpacity: -1,
        shortcutGap: 24,
        shortcutNameSize: 13,
        searchHeight: 58,
        searchRadius: 9999,
        customFont: '',
        clockFont: 'Outfit',
        clockColor: '',
        dateColor: '',
        shortcutNameColor: '',
        searchTextColor: '',
        searchPlaceholderColor: '',
        clockSize: 100,
        searchWidth: 650,
        contentPosition: 18,
        iconMaxWidth: 960,
        iconMaxWidthUnit: 'px',
        timeFormat: 24,
        showSeconds: false,
        showWeek: true,
        showLunar: false,
        wallpaperMode: 'gradient',
        wallpaperImage: '',
        wallpaperUrl: '',
        wallpaperColor: '#e6eef7',
        wallpaperMask: 20,
        wallpaperBlur: 0,
        // 必应每日壁纸：缓存的当日图片 URL / 日期 / 标题 / 版权（直连官方接口，按天刷新）
        bingWallpaperUrl: '',
        bingWallpaperDate: '',
        bingWallpaperTitle: '',
        bingWallpaperCopyright: '',
        gradientColor1: '#e8eef7',
        gradientColor2: '#dde6f5',
        gradientAngle: 135,
        // 光斑颜色：调色盘值，预设整套写入或手动自定义（默认取晨雾蓝浅色变体的烘焙色）
        blobColor1: '#5a93e2',
        blobColor2: '#5f96f2',
        linkAccentToBlob: true,
        searchEngine: 'google',
        // 已加入搜索框快捷切换的引擎 key 列表（仅这些会出现在 engine-popup 里）
        pinnedEngines: ['google', 'bing', 'baidu', 'duckduckgo'],
        customEngines: [],
        searchInNewTab: false,
        openInNewTab: true,
        shortcuts: [
            { id: 1, name: 'Google', url: 'https://www.google.com', icon: 'icons/search-engine/google.svg' },
            { id: 2, name: 'YouTube', url: 'https://www.youtube.com', icon: 'icons/search-engine/youtube.svg' },
            { id: 3, name: 'GitHub', url: 'https://github.com', icon: 'icons/search-engine/github.svg' },
            { id: 4, name: 'Bilibili', url: 'https://www.bilibili.com', icon: 'icons/search-engine/bilibili.svg' }
        ]
    },

    settings: null,
    lastSaveTime: null,
    _saveTimer: null,
    _SAVE_DEBOUNCE: 300,

    async load() {
        return new Promise((resolve) => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.get([this.STORAGE_KEY, this.BACKUP_KEY], (result) => {
                        this.settings = this._loadWithFallback(result[this.STORAGE_KEY], result[this.BACKUP_KEY]);
                        // 同步缓存到 localStorage，供下次首屏无闪烁加载
                        this._cacheToLocalStorage();
                        resolve(this.settings);
                    });
                } else {
                    const stored = localStorage.getItem(this.STORAGE_KEY);
                    const backup = localStorage.getItem(this.BACKUP_KEY);
                    this.settings = this._loadWithFallback(stored ? JSON.parse(stored) : null, backup ? JSON.parse(backup) : null);
                    resolve(this.settings);
                }
            } catch (e) {
                console.error('Settings load error:', e);
                this.settings = { ...this.defaultSettings };
                resolve(this.settings);
            }
        });
    },

    /* 同步加载：从 localStorage 快速读取，消除首屏从默认值到用户配置的闪烁。
       仅用于 DOMContentLoaded 时抢先应用视觉设置；随后 load() 的 chrome.storage
       回调会做权威校正。localStorage 无缓存时返回 null。 */
    loadSync() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
            this.settings = { ...this.defaultSettings, ...this._migrateSettings(data) };
            return this.settings;
        } catch (e) {
            return null;
        }
    },

    /* 把当前 settings 写入 localStorage 作为首屏快速缓存 */
    _cacheToLocalStorage() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
        } catch (e) { /* 放弃缓存 */ }
    },

    _loadWithFallback(primary, backup) {
        const validate = (data) => {
            return data && typeof data === 'object' && !Array.isArray(data);
        };

        if (validate(primary)) {
            return { ...this.defaultSettings, ...this._migrateSettings(primary) };
        }
        if (validate(backup)) {
            console.warn('Using backup settings');
            return { ...this.defaultSettings, ...this._migrateSettings(backup) };
        }
        return { ...this.defaultSettings };
    },

    _migrateSettings(settings) {
        // 已下线的设置项：全局文本色、图标单独模糊度、渐变预设模式标签、引擎快捷切换开关，清理存量/导入数据中的死键
        delete settings.globalTextColor;
        delete settings.iconBlur;
        delete settings.gradientPreset;
        delete settings.engineQuickSwitch;
        // 光斑改为显式调色盘值：旧数据中的空值（派生态）按当时的壁纸底色烘焙一次；
        // 工具函数不可用（如 converter 单文件环境）时回退默认烘焙值
        if (!settings.blobColor1 || !settings.blobColor2) {
            const derive = (hex, shift) => (typeof hexToBlobRgb === 'function' && typeof rgbTripletToHex === 'function')
                ? rgbTripletToHex(hexToBlobRgb(hex, shift))
                : (shift === 40 ? '#5f96f2' : '#5a93e2');
            const isSolid = settings.wallpaperMode === 'solid';
            const base = isSolid ? (settings.wallpaperColor || '#e6eef7') : (settings.gradientColor1 || '#e8eef7');
            const base2 = isSolid ? (settings.wallpaperColor || '#e6eef7') : (settings.gradientColor2 || '#dde6f5');
            if (!settings.blobColor1) settings.blobColor1 = derive(base, 0);
            if (!settings.blobColor2) settings.blobColor2 = isSolid ? derive(base2, 40) : derive(base2, 0);
        }
        settings.version = this.VERSION;
        return settings;
    },

    // 防抖保存：连续 set()（如点击预设会连续改 3 个字段）时，
    // 每次调用重置计时器，最后一次变更后 _SAVE_DEBOUNCE 毫秒才真正写盘。
    // 这样既避免高频写盘，又保证最终状态一定被持久化（修复旧节流会丢弃中途值的问题）。
    async save() {
        return new Promise((resolve) => {
            if (this._saveTimer) clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => {
                this._saveTimer = null;
                this._persist().then(resolve);
            }, this._SAVE_DEBOUNCE);
        });
    },

    // 立即写盘（绕过防抖），用于导入/重置等必须立即生效的场景
    async saveNow() {
        if (this._saveTimer) {
            clearTimeout(this._saveTimer);
            this._saveTimer = null;
        }
        return this._persist();
    },

    async _persist() {
        return new Promise((resolve) => {
            try {
                this.settings.version = this.VERSION;

                if (typeof chrome !== 'undefined' && chrome.storage) {
                    chrome.storage.local.set({
                        [this.STORAGE_KEY]: this.settings,
                        [this.BACKUP_KEY]: this.settings
                    }, () => {
                        this.lastSaveTime = Date.now();
                        resolve();
                    });
                    // 同步写入 localStorage 作为首屏快速缓存
                    this._cacheToLocalStorage();
                } else {
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
                    localStorage.setItem(this.BACKUP_KEY, JSON.stringify(this.settings));
                    this.lastSaveTime = Date.now();
                    resolve();
                }
            } catch (e) {
                console.error('Settings save error:', e);
                if (e.name === 'QuotaExceededError') {
                    // localStorage 满了，尝试清理后重试
                    try {
                        localStorage.removeItem(this.BACKUP_KEY);
                        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
                        this.lastSaveTime = Date.now();
                    } catch (e2) {
                        console.error('Storage full, cannot save:', e2);
                    }
                }
                resolve();
            }
        });
    },

    get(key) {
        return this.settings[key];
    },

    set(key, value) {
        this.settings[key] = value;
        this.save();
    },

    getAll() {
        return this.settings;
    },

    export() {
        const exportData = {
            // 导出格式版本占位，异常排查时用
            version: '-.--.--',
            exportDate: new Date().toISOString().split('T')[0],
            settings: this.settings
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Frostart-config-${exportData.exportDate}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    async import(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const imported = data.settings || data;
                    // 智能合并：保留默认值作为基础，用导入数据覆盖；迁移会清理已下线的死键
                    this.settings = { ...this.defaultSettings, ...this._migrateSettings({ ...imported }) };
                    this.saveNow();
                    resolve(this.settings);
                } catch (err) {
                    reject(new Error(I18N.t('error.configFormat')));
                }
            };
            reader.onerror = () => reject(new Error(I18N.t('error.readFailed')));
            reader.readAsText(file);
        });
    },

    addShortcut(shortcut) {
        const newId = this.settings.shortcuts.length > 0
            ? Math.max(...this.settings.shortcuts.map(s => s.id)) + 1
            : 1;
        this.settings.shortcuts.push({ ...shortcut, id: newId });
        this.save();
        return newId;
    },

    updateShortcut(id, updates) {
        const index = this.settings.shortcuts.findIndex(s => s.id === id);
        if (index !== -1) {
            this.settings.shortcuts[index] = { ...this.settings.shortcuts[index], ...updates };
            this.save();
        }
    },

    removeShortcut(id) {
        this.settings.shortcuts = this.settings.shortcuts.filter(s => s.id !== id);
        this.save();
    },

    async reset() {
        this.settings = JSON.parse(JSON.stringify(this.defaultSettings));
        await this.saveNow();
    }
};

window.SettingsManager = SettingsManager;
