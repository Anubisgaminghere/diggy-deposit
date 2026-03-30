// ==UserScript==
// @name         Diggy Deposits
// @namespace    TornDiggyDeposits
// @version      1.5
// @description  Simple script that keeps data local to you, i want none of your nasty data. There is no external sharing period. 1 beep wallet change, 2 beeps and red D you have too much on you, set whether you deposit faction or vault when pressing the moveable floating D, buttons on both pages editted for ease to click. available on all versions. Right click on pc or touch and hold on mobile to access settings.
// @author       User
// @match        *.torn.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /* --- 1. CONFIG & PARSER --- */
    const parseMoney = (str) => {
        if (!str) return 0;
        let s = str.toString().toLowerCase().replace(/[^0-9.kmb]/g, '');
        let val = parseFloat(s) || 0;
        if (s.includes('k')) val *= 1000;
        if (s.includes('m')) val *= 1000000;
        if (s.includes('b')) val *= 1000000000;
        return val;
    };

    const state = {
        get vol() { return parseFloat(localStorage.getItem('vUtilVol')) || 0.3; },
        get size() { return parseInt(localStorage.getItem('vUtilSize')) || 48; },
        get target() { return localStorage.getItem('vUtilTarget') || 'vault'; },
        get limitRaw() { return localStorage.getItem('vUtilLimit') || '1m'; },
        get limit() { return parseMoney(this.limitRaw); },
        danger: false, lastM: -1
    };

    /* --- 2. AUDIO --- */
    let ac = null;
    const beep = (isAlarm) => {
        try {
            if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
            if (ac.state === 'suspended') ac.resume();
            const play = (offset = 0) => {
                const osc = ac.createOscillator(); const g = ac.createGain();
                osc.connect(g); g.connect(ac.destination);
                osc.type = "triangle"; osc.frequency.value = 440;
                g.gain.setValueAtTime(state.vol, ac.currentTime + offset);
                g.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + offset + 0.2);
                osc.start(ac.currentTime + offset); osc.stop(ac.currentTime + offset + 0.2);
            };
            play(0); if (isAlarm) play(0.25);
        } catch (e) {}
    };

    /* --- 3. SETTINGS UI --- */
    const menu = document.createElement('div');
    menu.id = 'v-util-settings';
    const updateMenu = () => {
        menu.innerHTML = `
            <div style="color:#0f0; font-weight:bold; text-align:center; margin-bottom:15px; font-size:13px; font-family:sans-serif;">DIGGY DEPOSITS SETTINGS</div>
            <div style="margin-bottom:12px;">
                <label style="display:flex; justify-content:space-between; font-size:10px; color:#999; font-family:sans-serif;">VOLUME <span style="color:#0f0;">${(state.vol*100).toFixed(0)}%</span></label>
                <input type="range" id="v-vol-slide" min="0" max="1" step="0.05" value="${state.vol}" style="width:100%;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="display:flex; justify-content:space-between; font-size:10px; color:#999; font-family:sans-serif;">HUD SIZE <span style="color:#0f0;">${state.size}px</span></label>
                <input type="range" id="v-size-slide" min="30" max="80" step="2" value="${state.size}" style="width:100%;">
            </div>
            <div style="margin-bottom:12px;">
                <label style="font-size:10px; color:#999; font-family:sans-serif; display:block; margin-bottom:4px;">DANGER LIMIT (e.g. 10m, 5b)</label>
                <input type="text" id="v-limit-input" value="${state.limitRaw}" style="width:100%; background:#222; color:#0f0; border:1px solid #444; border-radius:4px; padding:4px; box-sizing:border-box;">
            </div>
            <div style="margin-bottom:15px;">
                <label style="font-size:10px; color:#999; font-family:sans-serif; display:block; margin-bottom:4px;">DEPOSIT TARGET</label>
                <select id="v-target-select" style="width:100%; background:#222; color:#fff; border:1px solid #444; border-radius:4px; padding:4px;">
                    <option value="vault" ${state.target === 'vault' ? 'selected' : ''}>Property Vault</option>
                    <option value="faction" ${state.target === 'faction' ? 'selected' : ''}>Faction Armory</option>
                </select>
            </div>
            <div style="display:flex; gap:8px;">
                <button id="v-test-beep" style="flex:1; padding:6px; background:#333; color:#fff; border:1px solid #555; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">TEST</button>
                <button id="v-close-settings" style="flex:1; padding:6px; background:#040; color:#0f0; border:1px solid #0f0; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">SAVE & CLOSE</button>
            </div>
        `;
    };
    menu.setAttribute('style', `position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background:#111; color:#eee; border:1px solid #333; padding:15px; border-radius:8px; z-index:2147483647; display:none; width:220px; box-shadow:0 0 30px #000;`);
    document.body.appendChild(menu);

    /* --- 4. HUD --- */
    const hud = document.createElement('div');
    hud.id = 'v-utils-hud'; hud.innerHTML = 'D';
    const hY = localStorage.getItem('vHudY') || '20%', hX = localStorage.getItem('vHudX') || '80%';
    hud.setAttribute('style', `position:fixed; top:${hY}; left:${hX}; width:${state.size}px; height:${state.size}px; z-index:2147483646; background:#000; color:#0f0; border:2px solid #0f0; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:system-ui, sans-serif; font-size:22px; font-weight:800; cursor:grab; user-select:none !important; -webkit-user-select:none !important; -webkit-touch-callout:none !important; touch-action:none !important; box-shadow: 0 4px 10px rgba(0,0,0,0.5);`);

    /* --- 5. NAVIGATION --- */
    let pressTimer, isMoving = false, startX, startY, initX, initY, hasMoved = false;
    const navigate = () => {
        const finalTarget = localStorage.getItem('vUtilTarget') || 'vault';
        const url = (finalTarget === 'vault') ? 'https://www.torn.com/properties.php#/p=options&tab=vault' : 'https://www.torn.com/factions.php?step=your&type=1#/tab=armoury';
        window.location.assign(url);
    };
    const start = (e) => {
        const t = e.type.includes('touch') ? e.touches[0] : e;
        isMoving = true; hasMoved = false; startX = t.clientX; startY = t.clientY; initX = hud.offsetLeft; initY = hud.offsetTop;
        if (ac) ac.resume();
        if (e.type.includes('touch')) {
            pressTimer = setTimeout(() => {
                if (!hasMoved) { updateMenu(); menu.style.display = 'block'; isMoving = false; }
            }, 800);
        }
    };
    const move = (e) => {
        if (!isMoving) return; const t = e.type.includes('touch') ? e.touches[0] : e;
        const dx = t.clientX - startX, dy = t.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { clearTimeout(pressTimer); hasMoved = true; hud.style.left = (initX + dx) + 'px'; hud.style.top = (initY + dy) + 'px'; }
    };
    const stop = (e) => {
        clearTimeout(pressTimer);
        if (isMoving && hasMoved) { localStorage.setItem('vHudY', hud.style.top); localStorage.setItem('vHudX', hud.style.left); }
        else if (isMoving && !hasMoved && e.target.id === 'v-utils-hud') { navigate(); }
        isMoving = false;
    };
    hud.addEventListener('touchstart', start, {passive: false});
    window.addEventListener('touchmove', move, {passive: false});
    window.addEventListener('touchend', stop);
    hud.addEventListener('contextmenu', (e) => { e.preventDefault(); return false; }); // Block system menu

    hud.onmousedown = start; window.onmousemove = move; window.onmouseup = stop;
    hud.oncontextmenu = (e) => { e.preventDefault(); updateMenu(); menu.style.display = 'block'; };

    /* --- 6. MONITOR & STYLES --- */
    setInterval(() => {
        const mEl = document.querySelector('#user-money') || document.querySelector('span[class*="money_"]');
        if (mEl) {
            let mVal = parseMoney(mEl.innerText);
            state.danger = (mVal >= state.limit);
            if (state.lastM !== -1 && mVal !== state.lastM) beep(state.danger);
            state.danger ? hud.classList.add('v-danger-alert') : hud.classList.remove('v-danger-alert');
            state.lastM = mVal;
        }
    }, 2000);

    const applyStyles = () => {
        if (document.getElementById('diggy-style-v1')) return;
        const s = document.createElement('style'); s.id = 'diggy-style-v1';
        s.innerHTML = `
            @keyframes vPulseX { 0% { border-color: #f00; box-shadow: 0 0 5px #f00; } 50% { border-color: #a00; box-shadow: 0 0 20px #f00; } 100% { border-color: #f00; box-shadow: 0 0 5px #f00; } }
            .v-danger-alert { border-color: #f00 !important; color: #f00 !important; animation: vPulseX 1.5s infinite !important; }
            .deposit-box .input-money-group, form[data-action="donateCash"] .input-money-group { display: flex !important; flex-direction: row !important; align-items: stretch !important; gap: 0px !important; }
            .deposit-box .input-money-symbol, .deposit-box .torn-btn, form[data-action="donateCash"] .input-money-symbol, form[data-action="donateCash"] .btn-wrap, form[data-action="donateCash"] .btn-wrap .torn-btn { background: #000 !important; color: #0f0 !important; height: 34px !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 0 12px !important; border: 1px solid #0f0 !important; box-shadow: 0 0 5px rgba(0, 255, 0, 0.2) !important; font-weight: 800 !important; cursor: pointer !important; box-sizing: border-box !important; font-size: 11px !important; text-transform: uppercase; }
            .deposit-box .input-money-symbol, form[data-action="donateCash"] .input-money-symbol { border-radius: 4px 0 0 4px !important; border-right: none !important; }
            form[data-action="donateCash"] .btn-wrap { border-radius: 0 4px 4px 0 !important; border-left: none !important; margin-top: 0 !important; width: auto !important; }
            form[data-action="donateCash"] .btn-wrap .torn-btn { border: none !important; padding: 0 15px !important; width: 100% !important; }
            .deposit-box .torn-btn { border-radius: 0 4px 4px 0 !important; line-height: 34px !important; border-left: none !important; }
            .deposit-box .input-money, form[data-action="donateCash"] .input-money { margin-top: 0px !important; border-radius: 0 !important; border: 1px solid #444 !important; background: #111 !important; color: #fff !important; }
        `;
        document.head.appendChild(s);
    };

    /* Save and Close Logic */
    document.addEventListener('click', (e) => {
        if (e.target.id === 'v-close-settings') {
            localStorage.setItem('vUtilVol', document.getElementById('v-vol-slide').value);
            localStorage.setItem('vUtilSize', document.getElementById('v-size-slide').value);
            localStorage.setItem('vUtilTarget', document.getElementById('v-target-select').value);
            localStorage.setItem('vUtilLimit', document.getElementById('v-limit-input').value);
            menu.style.display = 'none';
            location.reload();
        }
        if (e.target.id === 'v-test-beep') beep(true);
    });

    document.body.appendChild(hud);
    applyStyles();
    autoScroll();
    new MutationObserver(applyStyles).observe(document.body, {childList: true, subtree: true});
})();
