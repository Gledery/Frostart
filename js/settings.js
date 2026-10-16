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
        // 当前选中的渐变预设 id（浅/深成对，见 services.js 的 WALLPAPER_PRESETS）；
        // 'custom' 表示用户手动改过色或角度，脱离预设、不再随主题切换跟随
        gradientPreset: 'mistBlue',
        // 光斑颜色：空字符串=跟随渐变/壁纸自动派生（保持 PhasWer 风格），非空则使用自定义色
        blobColor1: '',
        blobColor2: '',
        linkAccentToBlob: true,
        searchEngine: 'google',
        // 已加入搜索框快捷切换的引擎 key 列表（仅这些会出现在 engine-popup 里）
        pinnedEngines: ['google', 'bing', 'baidu', 'duckduckgo'],
        // 是否启用搜索框左侧引擎图标的快捷切换
        engineQuickSwitch: true,
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
        // 已下线的设置项：全局文本色、图标单独模糊度，清理存量/导入数据中的死键
        delete settings.globalTextColor;
        delete settings.iconBlur;
        // 旧配置没有 gradientPreset：用当前渐变三字段反查匹配的预设浅色变体，
        // 命中即记为该预设 id（获得成对跟随主题的能力），否则视为自定义
        if (!settings.gradientPreset) {
            settings.gradientPreset = this._matchPresetByColors(settings) || 'custom';
        }
        settings.version = this.VERSION;
        return settings;
    },

    /* 按当前渐变颜色/角度反查预设 id（只比对预设的浅色变体）。
       依赖 services.js 的 WALLPAPER_PRESETS，运行时已加载，做防御性存在检查。 */
    _matchPresetByColors(settings) {
        if (typeof WALLPAPER_PRESETS === 'undefined') return null;
        const norm = (v) => String(v == null ? '' : v).trim().toLowerCase();
        const angle = parseInt(settings.gradientAngle, 10) || 135;
        for (const id of Object.keys(WALLPAPER_PRESETS)) {
            const light = WALLPAPER_PRESETS[id].light;
            if (norm(light.c1) === norm(settings.gradientColor1)
                && norm(light.c2) === norm(settings.gradientColor2)
                && light.angle === angle) {
                return id;
            }
        }
        return null;
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
