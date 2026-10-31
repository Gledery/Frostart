/* =========================================
   kaomoji.js  —  角落颜文字（移植自 PhasWer corner-kaomoji）
   改造点：
   1. 暴露 initKaomoji() / destroyKaomoji() 供开关控制（Frostart 设置）
   2. 移除了原 pageWelcome（PhasWer 子页面欢迎语），Frostart 只有一个页面
   3. 文案适配 Frostart 语境
   4. 幂等：重复调用 initKaomoji 不会创建多个实例
   ========================================= */

const KaomojiWidget = (function () {
    const defaultFace = '(・ω・)';

    const facesEarly = [
        '(・ω・)', '(≧▽≦)', '(ノ´▽`)ノ♪', '(￣▽￣)~*',
        '(・∀・)', '(ﾟ∀ﾟ)', '(*´▽`*)', '(*´∇`*)',
        '(≧∇≦)b', '(・ω・)ノ', '(o´ω`o)ﾉ', '(。・▽・。)'
    ];
    const facesMid = [
        '(。・ω・。)', '(´・ω・`)', '(｀・ω・´)', '(〃￣︶￣)人(￣︶￣〃)',
        '(─▽─)', '(´-ω-`)', '(￣ω￣)'
    ];
    const facesLate = [
        '(Ｔ▽Ｔ)', '(つд⊂)', '(。_。)', '(・_・)',
        '(　´_ゝ`)', '( ˘ω˘ )', '(－ω－)'
    ];

    // 消息池不做模块级缓存：用时直接从 I18N.tArray 取，
    // 这样运行中切换语言，下一条气泡就是新语言
    const idleFaces = [
        '(－ω－) zzZ', '(´-ω-`)', '(。_。)', '(￣ω￣)',
        '(・_・)', '(　´_ゝ`)', '(´・ω・`)', '( ˘ω˘ )'
    ];

    let el = null;
    let faceEl = null;
    let bubbleEl = null;

    let clickCount = 0;
    let lastFace = '';
    let lastMessage = '';
    let bubbleTimer = null;
    let idleResetTimer = null;
    let idleActionTimer = null;
    let idleWiggleTimer = null;
    let popTimeout = null;
    let initFrame = null;
    let isIdle = false;
    let wasIdle = false;
    let generation = 0;
    let active = false;

    function onNaughtyDone() {
        if (isIdle) startIdleWiggle();
    }

    const naughtyActions = [
        function () {
            const g = generation;
            el.style.transition = 'left 0.6s ease';
            // 必须用可插值的具体数值（calc(100vw - 100px)），不能用 left:auto/right:30px：
            // 因为 transition 设在 left 上，而 left:auto 无法被插值，会导致瞬间跳变（无动画）+ 闪回
            el.style.left = 'calc(100vw - 100px)';
            faceEl.textContent = '(＞ω＜)';
            showBubble(I18N.t('kaomoji.n1'), 3000);
            setTimeout(function () {
                if (generation !== g) return;
                el.style.left = '';
                setTimeout(function () {
                    if (generation !== g) return;
                    el.style.transition = '';
                    faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                    onNaughtyDone();
                }, 700);
            }, 3000);
        },
        function () {
            const g = generation;
            el.style.transition = 'bottom 0.5s ease';
            el.style.bottom = '-80px';
            showBubble(I18N.t('kaomoji.n2a'), 1500);
            setTimeout(function () {
                if (generation !== g) return;
                hideBubble();
                setTimeout(function () {
                    if (generation !== g) return;
                    el.style.bottom = '';
                    faceEl.textContent = '(ﾟ∀ﾟ)';
                    showBubble(I18N.t('kaomoji.n2b'), 2500);
                    setTimeout(function () {
                        if (generation !== g) return;
                        el.style.transition = '';
                        faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                        onNaughtyDone();
                    }, 2800);
                }, 2000);
            }, 2000);
        },
        function () {
            const g = generation;
            faceEl.style.transform = 'scaleX(-1)';
            faceEl.textContent = '(・ω・)';
            showBubble(I18N.t('kaomoji.n3'), 3000);
            setTimeout(function () {
                if (generation !== g) return;
                faceEl.style.transform = '';
                onNaughtyDone();
            }, 3000);
        },
        function () {
            const g = generation;
            el.style.transition = 'left 0.8s ease';
            el.style.left = '50%';
            el.style.transform = 'translateX(-50%)';
            faceEl.textContent = '(ノ´▽`)ノ♪';
            showBubble(I18N.t('kaomoji.n4'), 3000);
            setTimeout(function () {
                if (generation !== g) return;
                el.style.left = '';
                el.style.transform = '';
                setTimeout(function () {
                    if (generation !== g) return;
                    el.style.transition = '';
                    faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                    onNaughtyDone();
                }, 900);
            }, 3500);
        },
        function () {
            const g = generation;
            const spinFaces = ['(・ω・)', '(・∀・)', '(ﾟ∀ﾟ)', '(≧▽≦)', '(Ｔ▽Ｔ)'];
            let i = 0;
            faceEl.textContent = spinFaces[0];
            showBubble(I18N.t('kaomoji.n5'), 2000);
            const spinTimer = setInterval(function () {
                if (generation !== g) { clearInterval(spinTimer); return; }
                i++;
                if (i >= spinFaces.length) {
                    clearInterval(spinTimer);
                    faceEl.textContent = pickUnique(idleFaces, faceEl.textContent);
                    onNaughtyDone();
                    return;
                }
                faceEl.textContent = spinFaces[i];
            }, 300);
        }
    ];

    const wakeFace = '(ﾟ∀ﾟ)';

    function pickUnique(arr, last) {
        if (arr.length <= 1) return arr[0];
        let choice;
        let attempts = 0;
        do {
            choice = arr[Math.floor(Math.random() * arr.length)];
            attempts++;
        } while (choice === last && attempts < 10);
        return choice;
    }

    function getStagePool(arrEarly, arrMid, arrLate, stage) {
        if (stage >= 2) return arrLate;
        if (stage >= 1) return arrMid;
        return arrEarly;
    }

    function showBubble(text, duration) {
        clearTimeout(bubbleTimer);
        bubbleEl.textContent = text;
        bubbleEl.classList.add('show');
        bubbleTimer = setTimeout(hideBubble, duration || 2500);
    }

    function hideBubble() {
        clearTimeout(bubbleTimer);
        bubbleEl.classList.remove('show');
    }

    function pop() {
        clearTimeout(popTimeout);
        faceEl.style.transform = 'scale(1.2)';
        popTimeout = setTimeout(function () {
            faceEl.style.transform = '';
        }, 150);
    }

    function startIdleWiggle() {
        stopIdleWiggle();
        const transforms = ['rotate(-4deg)', 'rotate(4deg)', 'translateY(3px)', 'translateX(-3px)', 'translateX(3px)'];
        function step() {
            if (!isIdle) return;
            faceEl.style.transform = transforms[Math.floor(Math.random() * transforms.length)];
            idleWiggleTimer = setTimeout(function () {
                if (!isIdle) return;
                faceEl.style.transform = '';
                idleWiggleTimer = setTimeout(step, 800 + Math.random() * 1200);
            }, 600 + Math.random() * 800);
        }
        idleWiggleTimer = setTimeout(step, 500);
    }

    function stopIdleWiggle() {
        clearTimeout(idleWiggleTimer);
        faceEl.style.transform = '';
    }

    function resetPosition() {
        el.style.transition = '';
        el.style.left = '';
        el.style.bottom = '';
        el.style.transform = '';
        faceEl.style.transform = '';
    }

    function clearAllTimers() {
        generation++;
        clearTimeout(idleResetTimer);
        clearTimeout(idleActionTimer);
        clearTimeout(bubbleTimer);
        clearTimeout(popTimeout);
        stopIdleWiggle();
        resetPosition();
    }

    function resetToDefault() {
        isIdle = false;
        wasIdle = false;
        clickCount = 0;
        generation++;
        stopIdleWiggle();
        resetPosition();
        faceEl.textContent = defaultFace;
        hideBubble();
        scheduleIdleAction(10000);
    }

    function scheduleIdleReset() {
        clearTimeout(idleResetTimer);
        idleResetTimer = setTimeout(resetToDefault, 4000);
    }

    function scheduleIdleAction(delay) {
        clearTimeout(idleActionTimer);
        idleActionTimer = setTimeout(doIdleAction, delay || 10000);
    }

    function doIdleAction() {
        if (isIdle) {
            const r = Math.random();
            if (r < 0.35) {
                lastFace = pickUnique(idleFaces, lastFace);
                faceEl.textContent = lastFace;
                lastMessage = pickUnique(I18N.tArray('kaomoji.idle'), lastMessage);
                showBubble(lastMessage, 3000);
            } else if (r < 0.5) {
                stopIdleWiggle();
                naughtyActions[Math.floor(Math.random() * naughtyActions.length)]();
            } else {
                lastFace = pickUnique(idleFaces, lastFace);
                faceEl.textContent = lastFace;
            }
            scheduleIdleAction(8000 + Math.random() * 10000);
            return;
        }

        isIdle = true;
        wasIdle = true;
        stopIdleWiggle();

        lastFace = pickUnique(idleFaces, lastFace);
        faceEl.textContent = lastFace;
        lastMessage = pickUnique(I18N.tArray('kaomoji.idle'), lastMessage);
        showBubble(lastMessage, 3500);
        startIdleWiggle();

        scheduleIdleAction(6000 + Math.random() * 8000);
    }

    function onClick() {
        clearAllTimers();

        if (wasIdle) {
            isIdle = false;
            wasIdle = false;
            clickCount++;
            faceEl.textContent = wakeFace;
            const wakeMsg = pickUnique(I18N.tArray('kaomoji.wake'), lastMessage);
            pop();
            showBubble(wakeMsg);
            lastMessage = wakeMsg;
            lastFace = wakeFace;
            scheduleIdleReset();
            return;
        }

        isIdle = false;
        clickCount++;

        const stage = clickCount < 10 ? 0 : (clickCount < 24 ? 1 : 2);
        const facePool = getStagePool(facesEarly, facesMid, facesLate, stage);
        const msgPool = getStagePool(
            I18N.tArray('kaomoji.early'),
            I18N.tArray('kaomoji.mid'),
            I18N.tArray('kaomoji.late'),
            stage
        );

        lastFace = pickUnique(facePool, lastFace);
        faceEl.textContent = lastFace;

        lastMessage = pickUnique(msgPool, lastMessage);

        pop();
        showBubble(lastMessage);
        scheduleIdleReset();
    }

    function onKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
        }
    }

    // ===== 对外接口 =====

    // 初始化（幂等）：创建 DOM、绑定事件、启动动画
    function init() {
        if (active) return;
        active = true;

        el = document.createElement('div');
        el.className = 'kaomoji';
        el.setAttribute('aria-label', I18N.t('kaomoji.aria'));
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');
        el.innerHTML = '<span class="face">' + defaultFace + '</span><span class="bubble"></span>';
        document.body.appendChild(el);

        faceEl = el.querySelector('.face');
        bubbleEl = el.querySelector('.bubble');

        el.addEventListener('click', onClick);
        el.addEventListener('keydown', onKeydown);

        clickCount = 0;
        isIdle = false;
        wasIdle = false;
        generation = 0;
        faceEl.textContent = defaultFace;

        // 双 rAF 确保初始态（opacity:0 + translateX(-20px)）被浏览器渲染后再添加 .animate-in，
        // 否则浏览器会把两态合并成同一帧，过渡不触发，元素直接出现
        // 错峰延迟交给 CSS transition-delay（见 components.css .kaomoji）
        initFrame = requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                if (!active) return;
                el.classList.add('animate-in');
                scheduleIdleAction(10000);
            });
        });
    }

    // 销毁：移除 DOM、清理所有定时器
    function destroy() {
        active = false;
        clearAllTimers();
        cancelAnimationFrame(initFrame);
        if (el) {
            el.removeEventListener('click', onClick);
            el.removeEventListener('keydown', onKeydown);
            if (el.parentNode) el.parentNode.removeChild(el);
            el = null;
            faceEl = null;
            bubbleEl = null;
        }
    }

    function isActive() {
        return active;
    }

    return { init: init, destroy: destroy, isActive: isActive };
})();

window.KaomojiWidget = KaomojiWidget;
