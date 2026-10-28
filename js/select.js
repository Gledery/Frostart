/* =========================================
   select.js — 通用下拉选择组件
   职责：
   - 声明式 HTML（.select > .select-trigger + .select-menu > .select-option）的行为绑定
   - 开合管理：同页互斥、点击外部 / Esc / 容器滚动关闭、空间不足向上弹出
   - 选中：更新触发器文案与 i18n 键、标记选中项、派发 selectchange 事件
   - FrostartSelect.setValue 供设置初始化 / 导入 / 重置 / 右键菜单同步 UI
   加载顺序：utils/* 之后、services.js 之前（DOMContentLoaded 前完成定义即可）
   ========================================= */
const FrostartSelect = (() => {
    const openSelects = new Set();

    function closeSelect(select) {
        select.classList.remove('open');
        select.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
        openSelects.delete(select);
    }

    function closeAll() {
        [...openSelects].forEach(closeSelect);
    }

    function openSelect(select) {
        closeAll();
        const menu = select.querySelector('.select-menu');
        if (!menu) return;
        select.classList.remove('select--up');
        select.classList.add('open');
        select.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'true');
        /* 下方空间不足时翻转向上弹出 */
        const rect = select.getBoundingClientRect();
        if (rect.bottom + menu.offsetHeight + 12 > window.innerHeight) {
            select.classList.add('select--up');
        }
        openSelects.add(select);
    }

    function markOption(select, option) {
        const valueSpan = select.querySelector('.select-value');
        if (valueSpan) {
            valueSpan.textContent = option.textContent;
            /* 同步 i18n 键，切换语言时触发器文案可被重新翻译 */
            if (option.dataset.i18n) {
                valueSpan.setAttribute('data-i18n', option.dataset.i18n);
            } else {
                valueSpan.removeAttribute('data-i18n');
            }
        }
        select.querySelectorAll('.select-option').forEach(o => {
            o.classList.toggle('active', o === option);
            o.setAttribute('aria-selected', o === option ? 'true' : 'false');
        });
    }

    function setValue(select, value, silent) {
        const option = [...select.querySelectorAll('.select-option')]
            .find(o => o.dataset.value === String(value));
        if (!option) return;
        markOption(select, option);
        if (!silent) {
            select.dispatchEvent(new CustomEvent('selectchange', {
                detail: { value: option.dataset.value },
                bubbles: true
            }));
        }
    }

    function init() {
        document.querySelectorAll('.select').forEach(select => {
            const trigger = select.querySelector('.select-trigger');
            if (!trigger) return;
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                if (openSelects.has(select)) {
                    closeSelect(select);
                } else {
                    openSelect(select);
                }
            });
            select.querySelectorAll('.select-option').forEach(option => {
                option.addEventListener('click', () => {
                    markOption(select, option);
                    closeSelect(select);
                    select.dispatchEvent(new CustomEvent('selectchange', {
                        detail: { value: option.dataset.value },
                        bubbles: true
                    }));
                });
            });
        });

        document.addEventListener('click', closeAll);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAll();
        });
        document.querySelector('.drawer-content')?.addEventListener('scroll', closeAll);
    }

    return { init, setValue, closeAll };
})();

document.addEventListener('DOMContentLoaded', FrostartSelect.init);
