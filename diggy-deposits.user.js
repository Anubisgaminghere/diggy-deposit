// ==UserScript==
// @name         Diggy Deposits
// @namespace    TornDiggyDeposits
// @version      2.2
// @description  Turns the money element of torn.com to a button, right click for settings, left click to navigate to desired deposit area. 1 beep for money changes, 2 for dangerous amount. Added page visibility to be sure it follows rules.
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
        get target() { return localStorage.getItem('vUtilTarget') || 'vault'; },
        get limitRaw() { return localStorage.getItem('vUtilLimit') || '1m'; },
        get limit() { return parseMoney(this.limitRaw); },
        // New Toggle States
        get allowChange() { return localStorage.getItem('vUtilBeepChange') !== 'false'; },
        get allowDanger() { return localStorage.getItem('vUtilBeepDanger') !== 'false'; },
        danger: false, lastM: -1
    };

    /* --- 2. AUDIO --- */
    let ac = null;
    const beep = (isAlarm) => {
        // Logic Check: Should we actually beep?
        if (!isAlarm && !state.allowChange) return;
        if (isAlarm && !state.allowDanger) return;

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

            <div style="margin-bottom:12px; display:flex; flex-direction:column; gap:6px;">
                <label style="display:flex; align-items:center; font-size:10px; color:#eee; cursor:pointer;">
                    <input type="checkbox" id="v-beep-change" ${state.allowChange ? 'checked' : ''} style="margin-right:8px;"> ENABLE CHANGE BEEP (1)
                </label>
                <label style="display:flex; align-items:center; font-size:10px; color:#eee; cursor:pointer;">
                    <input type="checkbox" id="v-beep-danger" ${state.allowDanger ? 'checked' : ''} style="margin-right:8px;"> ENABLE DANGER BEEP (2)
                </label>
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

    /* --- 4. LOGIC ENGINE --- */
    const navigate = (e) => {
        if (e && (e.button === 2)) return;
        const finalTarget = localStorage.getItem('vUtilTarget') || 'vault';
        const url = (finalTarget === 'vault') ? 'https://www.torn.com/properties.php#/p=options&tab=vault' : 'https://www.torn.com/factions.php?step=your&type=1#/tab=armoury';
        window.location.assign(url);
    };

    const initMoneyButton = () => {
        const mEl = document.querySelector('#user-money') || document.querySelector('span[class*="money_"]');
        if (mEl && !mEl.classList.contains('v-integrated')) {
            mEl.classList.add('v-integrated');
            mEl.addEventListener('click', navigate);
            mEl.oncontextmenu = (e) => {
                e.preventDefault();
                updateMenu();
                menu.style.display = 'block';
            };
            let pressTimer;
            mEl.addEventListener('touchstart', () => {
                if (ac) ac.resume();
                pressTimer = setTimeout(() => { updateMenu(); menu.style.display = 'block'; }, 800);
            }, {passive: true});
            mEl.addEventListener('touchend', () => clearTimeout(pressTimer));
        }
        return mEl;
    };

    /* --- 5. MONITOR LOOP --- */
    setInterval(() => {
        if (document.visibilityState !== 'visible' || !document.hasFocus()) return;

        const mEl = initMoneyButton();
        if (mEl) {
            let mVal = parseMoney(mEl.innerText);
            state.danger = (mVal >= state.limit);
            if (state.lastM !== -1 && mVal !== state.lastM) beep(state.danger);
            state.danger ? mEl.classList.add('v-danger-active') : mEl.classList.remove('v-danger-active');
            state.lastM = mVal;
        }
    }, 1500);

    /* --- 6. STYLES --- */
    const applyStyles = () => {
        if (document.getElementById('diggy-style-v2-2')) return;
        const s = document.createElement('style'); s.id = 'diggy-style-v2-2';
        s.innerHTML = `
            .v-integrated { cursor: pointer !important; border: 1px solid #373 !important; background: rgba(0, 255, 0, 0.05) !important; padding: 1px 6px !important; border-radius: 4px !important; transition: all 0.2s ease; box-shadow: inset 0 0 5px rgba(0,255,0,0.1); }
            .v-integrated:hover { border-color: #0f0 !important; background: rgba(0, 255, 0, 0.15) !important; box-shadow: 0 0 8px rgba(0,255,0,0.3); }
            @keyframes vMoneyPulse { 0% { background: rgba(255,0,0,0.3); border-color: #f00; color: #ff0000; } 50% { background: rgba(255,0,0,0.6); border-color: #f00; color: #fff; box-shadow: 0 0 15px #f00; } 100% { background: rgba(255,0,0,0.3); border-color: #f00; color: #ff0000; } }
            .v-danger-active { animation: vMoneyPulse 0.8s infinite !important; font-weight: bold !important; }
            .deposit-box .input-money-group, form[data-action="donateCash"] .input-money-group { display: flex !important; flex-direction: row !important; align-items: stretch !important; gap: 0px !important; }
            .deposit-box .input-money-symbol, .deposit-box .torn-btn, form[data-action="donateCash"] .input-money-symbol, form[data-action="donateCash"] .btn-wrap, form[data-action="donateCash"] .btn-wrap .torn-btn { background: #000 !important; color: #0f0 !important; height: 34px !important; display: flex !important; align-items: center !important; justify-content: center !important; padding: 0 12px !important; border: 1px solid #0f0 !important; font-weight: 800 !important; cursor: pointer !important; box-sizing: border-box !important; font-size: 11px !important; text-transform: uppercase; }
        `;
        document.head.appendChild(s);
    };

    /* Save Logic */
    document.addEventListener('click', (e) => {
        if (e.target.id === 'v-close-settings') {
            localStorage.setItem('vUtilVol', document.getElementById('v-vol-slide').value);
            localStorage.setItem('vUtilTarget', document.getElementById('v-target-select').value);
            localStorage.setItem('vUtilLimit', document.getElementById('v-limit-input').value);
            // Save Checkbox States
            localStorage.setItem('vUtilBeepChange', document.getElementById('v-beep-change').checked);
            localStorage.setItem('vUtilBeepDanger', document.getElementById('v-beep-danger').checked);
            menu.style.display = 'none';
            location.reload();
        }
        if (e.target.id === 'v-test-beep') beep(true);
    });

    applyStyles();
    initMoneyButton();
    new MutationObserver(() => { applyStyles(); initMoneyButton(); }).observe(document.body, {childList: true, subtree: true});
})();
