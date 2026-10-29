/* =========================================
   select.js — 通用下拉选择组件
   职责：
   - 声明式 HTML（.select > .select-trigger + .select-menu > .select-option）的行为绑定
   - 开合管理：同页互斥、点击外部 / Esc / 容器滚动 / 窗口缩放关闭、空间不足向上弹出
   - 菜单打开时挂到 body 下以 fixed 定位：抽屉自身带 backdrop-filter，
     嵌套在其内部的浮层无法正确采样毛玻璃背景，必须脱离抽屉这一层渲染
   - 选中：更新触发器文案与 i18n 键、标记选中项、派发 selectchange 事件
   - FrostartSelect.setValue 供设置初始化 / 导入 / 重置 / 右键菜单同步 UI
   加载顺序：utils/* 之后、services.js 之前（DOMContentLoaded 前完成定义即可）
   ========================================= */
const FrostartSelect = (() => {
    const MENU_GAP = 8;
    const MENU_LEAVE = 320;
    const openSelects = new Set();
    const menuMap = new Map();
    const restoreTimers = new Map();

    function closeSelect(select) {
        const menu = menuMap.get(select);
        select.classList.remove('open');
        select.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'false');
        if (menu) {
            menu.classList.remove('open');
            /* 等退场动画播完再归位，中途移动 DOM 会打断过渡 */
            restoreTimers.set(menu, setTimeout(() => {
                select.appendChild(menu);
                menu.style.left = '';
                menu.style.top = '';
                menu.style.width = '';
                menu.classList.remove('select-menu--up');
                restoreTimers.delete(menu);
            }, MENU_LEAVE));
        }
        openSelects.delete(select);
    }

    function closeAll() {
        [...openSelects].forEach(closeSelect);
    }

    function openSelect(select) {
        closeAll();
        const menu = getMenu(select);
        if (!menu) return;
        const pending = restoreTimers.get(menu);
        if (pending) {
            clearTimeout(pending);
            restoreTimers.delete(menu);
        }

        document.body.appendChild(menu);
        menuMap.set(select, menu);

        const rect = select.getBoundingClientRect();
        menu.style.left = `${rect.left}px`;
        menu.style.width = `${rect.width}px`;

        /* 下方空间不足且上方放得下时翻转向上弹出 */
        const height = menu.offsetHeight;
        const openUp = rect.bottom + height + MENU_GAP > window.innerHeight
            && rect.top - height - MENU_GAP > 0;
        menu.classList.toggle('select-menu--up', openUp);
        menu.style.top = openUp
            ? `${rect.top - height - MENU_GAP}px`
            : `${rect.bottom + MENU_GAP}px`;

        select.classList.add('open');
        menu.classList.add('open');
        select.querySelector('.select-trigger')?.setAttribute('aria-expanded', 'true');
        openSelects.add(select);
    }

    function getMenu(select) {
        /* 菜单打开时已挂到 body 下，节点引用仍有效，但不能再从 select 里查 */
        return menuMap.get(select) || select.querySelector('.select-menu');
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
        const menu = getMenu(select);
        if (menu) menu.querySelectorAll('.select-option').forEach(o => {
            o.classList.toggle('active', o === option);
            o.setAttribute('aria-selected', o === option ? 'true' : 'false');
        });
    }

    function setValue(select, value, silent) {
        const menu = getMenu(select);
        if (!menu) return;
        const option = [...menu.querySelectorAll('.select-option')]
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
        window.addEventListener('resize', closeAll);
    }

    return { init, setValue, closeAll };
})();

document.addEventListener('DOMContentLoaded', FrostartSelect.init);
