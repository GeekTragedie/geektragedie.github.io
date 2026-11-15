// ND Self-Retreat Builder: state engine, renderers, and printable binder builder.
// Content and presets live in retreat-data.js (RETREAT_DATA).
/* global RETREAT_DATA */
(function () {
    'use strict';

    const D = RETREAT_DATA;
    const STORAGE_KEY = 'nd_self_retreat_builder_v2';
    const LEGACY_KEY = 'nd_self_retreat_binder_v1';
    const SAVE_FLAG_KEY = 'nd_self_retreat_builder_save_enabled';
    const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const TAB_IDS = ['tab-setup', 'tab-overview', 'tab-prep', 'tab-tracker', 'tab-rhythm', 'tab-menus', 'tab-sensory'];
    const DAY_FIELDS = {
        dateStr: '', catOut: false, coffeeFood: false, morningWeather: {}, wakeupChoice: '', disciplineChoice: '',
        morningFlowChoice: '', lunchEaten: false, lunchDishwasher: false, ptDone: false, middayWeather: {},
        afternoonActivity: '', afternoonEndpoint: '', dinnerDishwasher: false, spouseWindow: false,
        coffeePrepped: false, sensoryExp: '', sensoryRating: '', sensoryObs: '', eveningUnmasking: '',
        eveningWin: '', eveningOther: ''
    };

    // ---------- Small helpers ----------
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const clone = (obj) => JSON.parse(JSON.stringify(obj));
    const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
    const titleCase = (s) => (s ? s.replace(/(^|[\s/-])(\w)/g, (m, a, b) => a + b.toUpperCase()) : s);
    const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
    const localDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    function esc(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function getPath(obj, path) {
        return path.split('.').reduce((o, k) => (o === undefined || o === null ? undefined : o[k]), obj);
    }
    function setPath(obj, path, value) {
        const keys = path.split('.');
        let o = obj;
        keys.slice(0, -1).forEach((k) => {
            if (o[k] === undefined || o[k] === null) o[k] = {};
            o = o[k];
        });
        o[keys[keys.length - 1]] = value;
    }

    // Fill in any keys the saved data is missing, keeping everything the user entered.
    function mergeDefaults(def, val) {
        if (val === undefined || val === null) return clone(def);
        if (isObj(def) && isObj(val)) {
            const out = { ...val };
            Object.keys(def).forEach((k) => { out[k] = mergeDefaults(def[k], val[k]); });
            return out;
        }
        if (Array.isArray(def)) return Array.isArray(val) ? val : clone(def);
        return typeof val === typeof def ? val : def;
    }

    // ---------- Template text ----------
    // **bold**, _italic_, {token}. Markup is applied to the template only, and
    // user-entered token values are escaped, so typed text never becomes HTML.
    function sub(str, c, escape) {
        return str.replace(/\{(\w+)\}/g, (m, k) => (c[k] === undefined ? m : (escape ? esc(c[k]) : String(c[k]))));
    }
    function html(t, c) {
        const marked = esc(t)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/(^|[\s(“"])_([^_]+)_/g, '$1<em>$2</em>');
        return sub(marked, c || ctx(), true);
    }
    function plain(t, c) {
        return sub(t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[\s(“"])_([^_]+)_/g, '$1$2'), c || ctx(), false);
    }

    // ---------- Neurotype tags & setup flags ----------
    function ntMatch(tags, nt) {
        if (!tags || !tags.length || tags.includes('all')) return true;
        return tags.some((t) => t.split('+').every((k) => nt[k]));
    }
    function reqMet(req, f) {
        if (!req) return true;
        return [].concat(req).every((r) => (r.startsWith('!') ? !f[r.slice(1)] : !!f[r]));
    }
    function shown(item, p) {
        p = p || P();
        return ntMatch(item.for, p.setup.neurotypes) && reqMet(item.requires, flags(p));
    }
    function badges(item) {
        if (!item.for) return '';
        return item.for.filter((t) => t !== 'all').map((t) => {
            const parts = t.split('+');
            const label = parts.length === 2 && parts.includes('autism') && parts.includes('adhd')
                ? 'AuDHD' : parts.map((k) => D.NT_LABELS[k]).join(' + ');
            return `<span class="nt-badge nt-${parts[0]}" title="Suggested for ${esc(label)}">${esc(label)}</span>`;
        }).join('');
    }
    function suggestedFor(item, p) {
        const tags = (item.for || []).filter((t) => t !== 'all');
        return tags.length > 0 && ntMatch(tags, p.setup.neurotypes);
    }

    // ---------- State ----------
    let state;

    function createEmptyDay() { return clone(DAY_FIELDS); }

    function normalizeProfile(raw, kind) {
        const def = kind === 'custom' ? D.customProfile() : D.creatorProfile();
        const p = mergeDefaults(def, raw || {});
        p.setup.length = [2, 3, 5, 7].includes(Number(p.setup.length)) ? Number(p.setup.length) : def.setup.length;
        p.setup.startWeekday = Math.min(6, Math.max(0, Number(p.setup.startWeekday) || 0));
        if (!Array.isArray(p.setup.excursion.days)) p.setup.excursion.days = [];
        if (!isObj(p.days)) p.days = {};
        Object.keys(p.days).forEach((k) => { p.days[k] = mergeDefaults(DAY_FIELDS, p.days[k]); });
        D.GAME_TIERS.forEach((t) => { if (!Array.isArray(p.menus.games[t.key])) p.menus.games[t.key] = []; });
        return p;
    }

    // The original single-person binder stored everything under LEGACY_KEY.
    function migrateLegacy(old) {
        const p = D.creatorProfile();
        const pi = isObj(old.persistInputs) ? { ...old.persistInputs } : {};
        D.LEGACY_BOOKMARK_KEYS.forEach((k, i) => {
            if (pi[k] && p.menus.practices[i]) p.menus.practices[i].bookmark = pi[k];
        });
        p.persistInputs = pi;
        p.prepChecks = {};
        Object.entries(isObj(old.prepChecks) ? old.prepChecks : {}).forEach(([k, v]) => {
            p.prepChecks[D.LEGACY_PREP_IDS[k] || k] = v;
        });
        p.days = isObj(old.days) ? old.days : {};
        p.masterJournal = old.masterJournal || '';
        return {
            mode: 'creator',
            activeTab: TAB_IDS.includes(old.activeTab) ? old.activeTab : 'tab-overview',
            activeDay: Number(old.activeDay) || 1,
            profiles: { creator: p }
        };
    }

    function normalizeState(st) {
        st = isObj(st) ? st : {};
        const profiles = isObj(st.profiles) ? st.profiles : {};
        const out = {
            mode: st.mode === 'custom' ? 'custom' : 'creator',
            activeTab: TAB_IDS.includes(st.activeTab) ? st.activeTab : 'tab-overview',
            activeDay: Number(st.activeDay) || 1,
            profiles: { creator: normalizeProfile(profiles.creator, 'creator') }
        };
        if (profiles.custom) out.profiles.custom = normalizeProfile(profiles.custom, 'custom');
        if (out.mode === 'custom' && !out.profiles.custom) out.profiles.custom = normalizeProfile(null, 'custom');
        return out;
    }

    function loadState() {
        let saveLocal = true;
        let raw = null;
        try {
            saveLocal = localStorage.getItem(SAVE_FLAG_KEY) !== 'false';
            if (saveLocal) {
                const saved = localStorage.getItem(STORAGE_KEY);
                if (saved) raw = JSON.parse(saved);
                else {
                    const legacy = localStorage.getItem(LEGACY_KEY);
                    if (legacy) raw = migrateLegacy(JSON.parse(legacy));
                }
            }
        } catch (e) {
            console.warn('Could not read saved retreat data', e);
        }
        const st = normalizeState(raw);
        st.saveLocal = saveLocal;
        return st;
    }

    function save() {
        if (!state.saveLocal) return;
        try {
            const { saveLocal, decisionFilter, ...rest } = state; // eslint-disable-line no-unused-vars
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, ...rest }));
        } catch (e) {
            console.warn('Could not save retreat data', e);
        }
    }

    function P() { return state.profiles[state.mode]; }
    function retreatLength() { return P().setup.length; }
    function day(n) {
        const p = P();
        n = n || state.activeDay;
        if (!p.days[n]) p.days[n] = createEmptyDay();
        return p.days[n];
    }

    // ---------- Derived setup values ----------
    function flags(p) {
        p = p || P();
        const s = p.setup;
        const mv = s.movement;
        return {
            pet: s.cue.type === 'pet',
            excursion: (s.excursion.days || []).length > 0,
            rescue: !!s.food.rescue,
            checkin: s.contact.mode !== 'zero',
            checkinAway: s.contact.mode === 'away',
            shared: s.contact.mode === 'shared',
            zero: s.contact.mode === 'zero',
            hypermobility: !!mv.hypermobility,
            movement: !!(mv.hypermobility || mv.stretching || mv.vagus)
        };
    }

    function e1Desc(nt) {
        if (nt.autism && nt.adhd) return D.E1_DESC.both;
        if (nt.autism) return D.E1_DESC.autism;
        if (nt.adhd) return D.E1_DESC.adhd;
        return D.E1_DESC.none;
    }

    function ctx(p) {
        p = p || P();
        const s = p.setup;
        const c = s.contact;
        const who = c.who || 'my household';
        const exDays = (s.excursion.days || []).slice().sort((a, b) => a - b);
        const windowText = `${c.windowStart || '6:00 PM'} – ${c.windowEnd || '6:20 PM'}`;
        const sanctuary = s.sanctuary.name || 'Sanctuary Space';
        const projects = p.menus.projects || [];
        return {
            cue: s.cue.text || 'My morning cue',
            cueShort: s.cue.short || s.cue.text || 'Morning Cue',
            pets: s.cue.pets || 'your pet',
            home: s.home || 'Comfy Spot',
            drink: s.drink || 'morning drink',
            Drink: cap(s.drink || 'morning drink'),
            DrinkT: titleCase(s.drink || 'morning drink'),
            drinkExtras: s.drinkExtras || '',
            sanctuary,
            who,
            Who: cap(who),
            window: windowText,
            windowStart: c.windowStart || '6:00 PM',
            quiet: c.quietHours || '',
            spot: s.excursion.spot || 'a calm outdoor spot',
            excursionTime: s.excursion.time || '',
            excursionDays: exDays.map((d) => SHORT_DAYS[d]).join(' & '),
            doomBox: s.doomBox || 'Retreat Clutter Doom Box',
            a1: s.anchors.a1 || '7:00 AM',
            a2: s.anchors.a2 || '1:00 PM',
            a3: s.anchors.a3 || '6:00 PM',
            rescueFoods: s.food.rescueFoods || 'crackers or a shake',
            rescueShort: s.food.rescueShort || 'Rescue Snack',
            avoid: s.food.avoid || '',
            project1: (projects[0] && projects[0].name) || 'special-interest project',
            e1: e1Desc(s.neurotypes),
            thresholdContact: c.mode === 'away' ? `20-minute check-in with ${who} at ${c.windowStart || '6:00 PM'}`
                : c.mode === 'shared' ? `share your "do not perceive me" hours (${c.quietHours}) with ${who}`
                    : 'park the phone; zero-contact begins',
            reentryBuffer: c.mode === 'away' ? `before ${who} gets home`
                : c.mode === 'shared' ? 'before evening household time' : 'before turning contact back on',
            reentryWhen: c.mode === 'away' ? `after ${who} comes home`
                : c.mode === 'shared' ? 'once my "do not perceive me" hours end' : 'after the retreat ends'
        };
    }

    function identityLine(p) {
        p = p || P();
        if (p.setup.identity) return p.setup.identity;
        const nt = p.setup.neurotypes;
        const parts = [];
        if (nt.autism && nt.adhd) parts.push('AuDHD');
        else if (nt.autism) parts.push('Autistic');
        else if (nt.adhd) parts.push('ADHD');
        if (nt.cptsd) parts.push('CPTSD');
        return parts.length ? `${parts.join(' & ')} Nervous System Sanctuary` : 'My Nervous System Sanctuary';
    }

    function startWeekday(p) {
        const s = p.setup;
        if (s.startDate) {
            const dt = new Date(`${s.startDate}T00:00:00`);
            if (!Number.isNaN(dt.getTime())) return dt.getDay();
        }
        return s.startWeekday;
    }

    function dayInfo(p) {
        p = p || P();
        const s = p.setup;
        const n = s.length;
        const c = ctx(p);
        const f = flags(p);
        const start = startWeekday(p);
        const seq = D.THEME_SEQUENCES[n] || D.THEME_SEQUENCES[7];
        const expCount = n >= 5 ? n - 2 : n - 1;
        const solo = s.contact.mode === 'shared' ? 'Full Day' : 'Full Solo Day';
        let startDate = null;
        if (s.startDate) {
            const dt = new Date(`${s.startDate}T00:00:00`);
            if (!Number.isNaN(dt.getTime())) startDate = dt;
        }
        return seq.map((key, i) => {
            const wd = (start + i) % 7;
            const theme = D.DAY_THEMES[key];
            let type;
            if (i === 0) type = n >= 5 ? 'Partial Day' : 'Arrival';
            else if (i === n - 1) type = n >= 5 ? 'Post-Retreat' : 'Soft Landing';
            else if (n >= 5 && i === n - 2) type = 'Partial Day';
            else type = solo;
            const hl = [];
            if (theme.hl) hl.push(plain(theme.hl, c));
            if (f.excursion && s.excursion.days.includes(wd)) hl.push(`Optional ${c.excursionTime} excursion to ${c.spot}`);
            if (i < expCount) hl.push(`Sensory Lab experiment #${i + 1}`);
            let dateLabel = '';
            if (startDate) {
                const dt = new Date(startDate);
                dt.setDate(dt.getDate() + i);
                dateLabel = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            }
            return {
                num: i + 1,
                weekday: WEEKDAYS[wd],
                short: SHORT_DAYS[wd],
                label: dateLabel ? `${WEEKDAYS[wd]}, ${dateLabel}` : WEEKDAYS[wd],
                theme: theme.theme,
                type,
                highlights: hl.join('; ') + '.'
            };
        });
    }

    function movementSummary(p) {
        const mv = p.setup.movement;
        const active = Object.keys(D.MOVEMENT_MODULES).filter((k) => mv[k] && k !== 'rest');
        if (!active.length) return { onlyRest: true, label: 'Rest-only reset (that counts!)', modules: mv.rest ? ['rest'] : [] };
        return {
            onlyRest: false,
            label: `5–10 min ${active.map((k) => D.MOVEMENT_MODULES[k].short).join(' / ')} completed`,
            modules: active
        };
    }

    // ---------- Content builders (shared by screen and print) ----------
    function prepGroups(p) {
        const c = ctx(p);
        const f = flags(p);
        const s = p.setup;
        const sanct = D.SANCTUARY_PRESETS[s.sanctuary.type] || D.SANCTUARY_PRESETS.custom;
        const focus = D.FOCUS[s.focus] || D.FOCUS.auditory;
        const cueStation = {
            pet: 'Stage comfy outdoor layers by the door for time outside with {pets}: slip-on shoes, a cozy oversized fleece or coat, and easy sweatpants or leggings.',
            natural: 'Turn off your alarms for the retreat days; keep blackout curtains or an eye mask ready in case you want to sleep in.',
            household: 'Agree on a quiet goodbye routine with {who} so the house goes calm without a big transition.',
            sunlight: 'Set up and test your sunrise lamp, or plan which curtains you will open first thing.',
            custom: 'Prepare whatever your morning cue needs: {cue}.'
        }[s.cue.type] || 'Prepare whatever your morning cue needs: {cue}.';
        const g = [
            {
                title: '1. Retreat Binder & Printables',
                items: [
                    { id: 'prep_binder', t: 'Assemble a physical binder (or bookmark this page): a 1" 3-ring binder, tab dividers, a pen, and lined sheets.' },
                    { id: 'prep_print', t: 'Print your binder pages with **Build printable binder** in the tool menu (if you want paper).' },
                    { id: 'prep_couch', t: 'Stage your {home}: place the binder and your therapy (work)books there.' },
                    { id: 'prep_queue', t: 'Queue up your yoga/meditation playlists and bookmarks in the Menus tab.' },
                    { id: 'prep_preview', for: ['autism'], t: 'Preview the whole retreat once (agenda + menus) so nothing comes as a surprise.' },
                    { id: 'prep_visible', for: ['adhd'], t: 'Put the binder, a pen, and water where you\'ll trip over them (visible = remembered).' },
                    { id: 'prep_permission', for: ['cptsd'], t: 'Write a "permission slip" listing everything you\'re allowed to skip this retreat.' }
                ]
            },
            { title: `2. Morning Cue Station (${c.cueShort})`, items: [{ id: 'prep_cat_door', t: cueStation }] },
            {
                title: `3. Your ${c.sanctuary}`,
                items: sanct.prep.map((t, i) => ({ id: `prep_sanct_${i + 1}`, t }))
            },
            {
                title: f.rescue ? '4. Healthy Anti-Nausea Food & Dish System' : '4. Healthy Food & Dish System',
                items: [
                    { id: 'prep_shop', t: f.rescue && c.avoid ? 'Shop the grocery list (rescue foods + 4-quadrant meals; zero {avoid}).' : 'Shop the grocery list (4-quadrant meals and easy snacks).' },
                    { id: 'prep_containers', t: 'Portion meals into sturdy containers and organize the fridge into 4 sensory quadrants.' },
                    { id: 'prep_same_meals', for: ['autism'], t: 'Pick 2–3 "same meal" safe defaults you could happily eat every day without deciding.' },
                    { id: 'prep_dishwasher', t: 'Run and completely empty the dishwasher the night before Day 1.' }
                ]
            },
            {
                title: '5. The 5 Clear Runways ("Do I Use This Right Here?" Rule)',
                note: 'Ask _"Do I use this right here?"_ If yes, give it a home on a small tray. Sweep everything else into the {doomBox}.',
                items: s.runways.map((r, i) => ({ id: `prep_runway_${i + 1}`, t: `**Runway ${i + 1} ({rn}):** {rd}`, vars: { rn: r.name || 'Untitled', rd: r.desc || '' } }))
            },
            {
                title: f.excursion ? '6. Sensory Kit, Excursion Go-Bag & Phone DND' : '6. Sensory Kit & Phone DND',
                items: [
                    { id: 'prep_playlists', t: focus.prep },
                    { id: 'prep_gobag', requires: 'excursion', t: 'Pack an excursion Go-Bag by the door: sunglasses, gloves, a blanket, snacks, a thermos, and keys.' },
                    { id: 'prep_dnd', t: f.checkin ? 'Configure the phone\'s "Retreat" Focus mode and review the Communication Boundary list with {who}.' : 'Configure the phone\'s "Retreat" Focus mode and tell the people who need to know that you\'ll be unreachable.' }
                ]
            }
        ];
        g.forEach((grp) => { grp.items = grp.items.filter((it) => shown(it, p)); });
        return g;
    }

    function shoppingGroups(p) {
        const c = ctx(p);
        const f = flags(p);
        const s = p.setup;
        const q = s.food.quadrants;
        const sanct = D.SANCTUARY_PRESETS[s.sanctuary.type] || D.SANCTUARY_PRESETS.custom;
        const moveGather = Object.keys(D.MOVEMENT_MODULES).filter((k) => s.movement[k] && D.MOVEMENT_MODULES[k].gather)
            .map((k) => D.MOVEMENT_MODULES[k].gather);
        const groceries = {
            title: f.rescue && c.avoid ? `Grocery Shopping List (zero ${c.avoid})` : 'Grocery Shopping List',
            items: [
                { id: 'shop_crackers', requires: 'rescue', t: 'Stomach-coating rescue bridge: {rescueFoods}' },
                { id: 'shop_electro', t: c.drinkExtras ? '{Drink} + {drinkExtras} + water/electrolytes' : '{Drink} + water/electrolytes' },
                { id: 'shop_q1', t: '**Warm & Savory:** {q}', vars: { q: q.warm } },
                { id: 'shop_q2', t: '**Cold & Crisp:** {q}', vars: { q: q.cold } },
                { id: 'shop_q3', t: '**Crunchy & Salty:** {q}', vars: { q: q.crunchy } },
                { id: 'shop_q4', t: '**Smooth & Sweet:** {q}', vars: { q: q.smooth } }
            ]
        };
        const gather = {
            title: 'Household Gather List',
            items: [
                { id: 'gath_binder', t: ['Workbooks and self-help books', 'a yoga mat'].concat(moveGather.filter((x) => x !== 'Yoga mat')).join(', ') },
                { id: 'gath_closet', t: 'For your {sanctuary}: {g}', vars: { g: sanct.gather } },
                { id: 'gath_bins', t: '"{doomBox}", a front-door mail bin, and 2–3 small runway trays' },
                { id: 'gath_containers', t: 'Sturdy meal-prep containers' },
                { id: 'gath_gobag', requires: 'excursion', t: 'Go-Bag: thermos, blanket, gloves, sunglasses' }
            ]
        };
        [groceries, gather].forEach((grp) => { grp.items = grp.items.filter((it) => shown(it, p)); });
        return [groceries, gather];
    }

    function phoneSteps(p) {
        const c = ctx(p);
        const f = flags(p);
        return [
            { id: 'dnd_1', t: '**Create a Focus:** Settings → Focus → + → name a custom Focus "Retreat".' },
            { id: 'dnd_2', t: f.checkin ? '**People boundaries:** Allow notifications from {who} for emergencies only.' : '**People boundaries:** Allow only your emergency contacts (or no one).' },
            { id: 'dnd_3', t: '**App boundaries:** Allow notifications from ONLY your music and timer apps.' },
            { id: 'dnd_4', t: '**Visual triggers:** Silence Notifications = Always, Hide Notification Badges = ON, Show on Lock Screen = OFF.' },
            { id: 'dnd_5', t: '**App placement:** Move text, email, and social apps into a folder off the main screen.' },
            { id: 'dnd_6', t: '**Parking spot:** Charge the phone away from your {home} and bed; control music over Bluetooth.' }
        ];
    }

    function boundaryBullets(p) {
        const items = D.BOUNDARY_BULLETS.filter((b) => shown(b, p));
        const extra = (p.setup.contact.extra || '').split('\n').map((x) => x.trim()).filter(Boolean)
            .map((x) => ({ t: x, user: true }));
        return items.concat(extra);
    }

    function allPrepIds(p) {
        return prepGroups(p).flatMap((g) => g.items)
            .concat(shoppingGroups(p).flatMap((g) => g.items), phoneSteps(p)).map((i) => i.id);
    }

    function morningRows(p) {
        const c = ctx(p);
        const f = flags(p);
        const focus = D.FOCUS[p.setup.focus] || D.FOCUS.auditory;
        return [
            { key: 'sleep', label: 'Sleep Quality Last Night', options: ['Rested', 'Woke Up A Lot', 'Trouble Falling Asleep', 'Exhausted'] },
            { key: 'body', label: f.hypermobility ? 'Ribs, Shoulders & Jaw' : 'Shoulders, Jaw & Joints', options: ['Supported & Loose', 'Tight/Bracing', f.hypermobility ? 'Rib Shifting' : 'Joints Achy', 'Jaw Clenched'] },
            { key: 'stomach', label: 'Stomach & Throat', options: ['Settled', 'Mildly Queasy', 'Throat Tight', f.rescue ? `Eating ${c.rescueShort} First` : 'Not Hungry Yet'] },
            { key: 'nervous', label: 'Nervous System State', options: ['Wired / Restless', 'Numb / Flat', 'Calm / Grounded', 'Exhausted / Foggy'] },
            { key: p.setup.focus === 'auditory' ? 'auditory' : `dial_${p.setup.focus}`, label: focus.dialLabel, options: focus.dial }
        ];
    }
    function middayRows(p) {
        const c = ctx(p);
        const focus = D.FOCUS[p.setup.focus] || D.FOCUS.auditory;
        return [
            { key: 'spoons', label: 'Current Energy / Spoons', options: ['Steady Spoons', 'Dipping', 'Running on Fumes', 'Restless Energy'] },
            { key: 'discipline', label: 'Morning Discipline Check', options: ['Completed It!', 'Did a Short Version', 'Pivoted Gently', 'Moving It to Afternoon'] },
            { key: 'next', label: 'What My Body Wants Next', options: [c.sanctuary, 'Nap', `${focus.word} + Heat`, 'Contained Table Project'] }
        ];
    }

    function experimentsSorted(p) {
        const focusCat = (D.FOCUS[p.setup.focus] || D.FOCUS.auditory).cat;
        const order = [focusCat].concat(['auditory', 'body', 'visual'].filter((x) => x !== focusCat));
        return order.flatMap((cat) => D.EXPERIMENTS.filter((e) => e.cat === cat));
    }
    const expValue = (e) => `${e.id}: ${e.title}`;

    function visiblePrompts(p) { return D.PROMPTS.filter((pr) => shown(pr, p)); }

    // ---------- Rendering: shared pieces ----------
    function pickList(items, type, mode) {
        const p = P();
        const c = ctx(p);
        const list = items.filter((it) => shown(it, p));
        if (mode === 'print') return `<ul>${list.map((it) => `<li>${html(it.t, c)}</li>`).join('')}</ul>`;
        return list.map((it) => `<button type="button" class="pick-item" data-action="pick" data-pick-type="${type}" data-pick-val="${esc(plain(it.t, c))}" title="Send to today's tracker">${html(it.t, c)}${badges(it)}<span class="sr-only"> (send to today's tracker)</span></button>`).join('');
    }

    function wakeupTable(mode) {
        const rows = D.WAKEUP.map((r) => `<tr>
            <td><strong>${esc(r.state)}</strong><br><span class="muted">${esc(r.sub)}</span></td>
            <td>${pickList(r.classics, 'wakeup', mode)}</td>
            <td>${pickList(r.somatic, 'wakeup', mode)}</td>
            <td>${pickList(r.brain, 'wakeup', mode)}</td></tr>`).join('');
        return `<table class="binder-table"><thead><tr><th>Morning Energy &amp; Sensory State</th><th>Your Go-To Classics (Music, Pets, YouTube)</th><th>Gentle Somatic &amp; Sensory Wake-Ups (Low Friction)</th><th>Brain-Warming &amp; Visual Novelty (Zero Pressure)</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    function decisionTable(mode, filter) {
        const rows = D.DECISION.filter((r, i) => mode === 'print' || filter === undefined || filter === 'all' || String(i) === String(filter))
            .map((r) => `<tr>
                <td><strong>${esc(r.state)}</strong></td>
                <td>${pickList(r.discipline, 'discipline', mode)}</td>
                <td>${pickList(r.reset, 'flow', mode)}</td>
                <td>${pickList(r.flow, 'afternoon', mode)}</td></tr>`).join('');
        return `<table class="binder-table"><thead><tr><th>My Current Internal State</th><th>Disciplined Retreat Challenge (1–2 / Day)</th><th>Nervous System &amp; Sensory Reset (Low Demand)</th><th>Contained Flow (Pick 1 Contained Unit)</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    function rhythmHtml(p) {
        const c = ctx(p);
        const f = flags(p);
        const s = p.setup;
        const nt = s.neurotypes;
        const mv = movementSummary(p);
        const rabbit = nt.adhd ? 'ADHD rabbit holes' : 'rabbit holes';
        const fuel = f.rescue
            ? html('**{Drink} + stomach-coating bridge:** Make your {drink} and grab morning food ({rescueFoods}). Eat _with_ your {drink}; never force food first.', c)
            : html('**{Drink} + easy fuel:** Make your {drink} and grab something easy to eat.', c);
        const excursion = f.excursion
            ? `<li>${html('**{excursionDays} at {excursionTime} (optional):** _Pre-scheduled excursion._ Grab the Go-Bag and a warm drink and head to {spot}, outside of rush hour. You have 100% pre-written permission to skip it.', c)}</li>` : '';
        const moveItems = mv.modules.flatMap((k) => D.MOVEMENT_MODULES[k].items).map((t) => `<li>${html(t, c)}</li>`).join('');
        const contact = f.checkin
            ? html('**{window} contained check-in window:** Turn off Retreat DND for about 20 minutes to check in with {who}. Afterward, turn Retreat DND back on and return the phone to its parking spot.', c)
            : html('**Phone stays parked:** No check-in today. If you want connection, write it in your journal instead.', c);
        return `
        <div class="rhythm-grid">
            <div class="rhythm-card subpanel">
                <h3>Anchor 1: ${esc(c.a1)} — ${esc(c.cueShort)}, ${esc(c.DrinkT)} Spot &amp; Grounding</h3>
                <ol>
                    <li>${html('**Morning cue:** {cue}.', c)}</li>
                    <li>${fuel}</li>
                    <li>${html('**{home}:** Take your {drink} and morning fuel to your {home}.', c)}</li>
                    <li>${html('**Morning binder check-in (3 mins):** Complete the Anchor 1 Body Weather Check in the Daily Tracker.', c)}</li>
                    <li>${html('**Set a morning intention:** Choose 1 _Wake-Up Activity_, 1 _Disciplined Retreat Practice_, and 1 _Sensory Reset or Contained Flow Activity_.', c)}</li>
                </ol>
                <div class="sub-block">
                    <h4>Open Morning Block (until ${esc(c.a2)})</h4>
                    <ul>
                        <li>Start with your chosen <strong>Wake-Up Activity</strong>, follow it with your <strong>Disciplined Retreat Practice</strong>, then open the floor to ${rabbit} or projects.</li>
                        ${excursion}
                    </ul>
                </div>
            </div>
            <div class="rhythm-card subpanel">
                <h3>Anchor 2: ${esc(c.a2)} — Mechanical Fuel &amp; Body Support</h3>
                <ul>
                    <li>${html('**Zero-interoception lunch:** Grab a healthy premade container meal from the fridge.', c)}${f.rescue ? ` ${html('_(If you\'re nauseous or your throat is tight: eat a little {rescueFoods} first, then the container meal 20 minutes later.)_', c)}` : ''}</li>
                    <li>${html('**Zero visual clutter:** Put the empty container straight into the pre-emptied dishwasher.', c)}</li>
                    <li>${mv.onlyRest ? html('**Rest-only reset:** Lie down with something warm. Rest counts as support.', c) : `${html('**5–10 min somatic / physical support:** Do 1–2 gentle options. Stop _before_ you feel fatigued:', c)}<ul>${moveItems}</ul>`}</li>
                    <li>${html('**Midday check-in:** Complete Anchor 2 in the Daily Tracker and pick your afternoon activity, with a natural closed-loop endpoint.', c)}</li>
                </ul>
                <div class="sub-block">
                    <h4>Open Afternoon Block (until ${esc(c.a3)})</h4>
                    <p>${html('**Contained flow or deep rest:** Use a bare table for a creative project or rabbit hole (pick 1 natural closed-loop endpoint before you start), nap, or retreat to your {sanctuary}.', c)}</p>
                </div>
            </div>
            <div class="rhythm-card subpanel">
                <h3>Anchor 3: ${esc(c.a3)} — ${f.checkin ? 'Check-In, ' : ''}Dinner &amp; Wind-Down</h3>
                <ul>
                    <li>${html('**Dinner:** Pick a prepared container meal, then put it straight into the dishwasher.', c)}</li>
                    <li>${contact}</li>
                    <li>${html('**Prep for tomorrow-you:** Set up your {drink} and morning food.', c)}</li>
                    <li>${html('**Evening reflection & lab log:** Complete Anchor 3 in the Daily Tracker.', c)}</li>
                </ul>
                <div class="sub-block">
                    <h4>Open Evening Block (Choose Mode A or Mode B)</h4>
                    <div class="evening-modes">
                        <div><strong>Mode A: Want Predictable Structure</strong>
                            <p>${html('1) Dim the overheads; switch on a warm lamp and the heating pad at your {home} or {sanctuary}.<br>2) Knit or color with your Comfort playlist, play 1 cozy/sorting game, or watch 1 comfort show.<br>3) Warm snack or electrolytes, then bed when your eyes feel heavy.', c).replace(/&lt;br&gt;/g, '<br>')}</p></div>
                        <div><strong>Mode B: Riding Today's Spark</strong>
                            <p>${html('1) Keep the lighting dim and warm so your body still knows it\'s evening.<br>2) Return to the craft, game, or project that lit you up earlier today.<br>3) Pick 1 natural closed-loop landing, OR stop as soon as your stamina dips, so you go to bed satisfied instead of wired.', c).replace(/&lt;br&gt;/g, '<br>')}</p></div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    // ---------- Rendering: tabs ----------
    function renderSetup() {
        const p = P();
        const s = p.setup;
        const f = flags(p);
        const opt = (obj, cur) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(v.label)}</option>`).join('');
        const text = (path, val, ph, rer = 'others') => `<input type="text" data-bind="${path}" data-rerender="${rer}" value="${esc(val)}" placeholder="${esc(ph || '')}">`;
        const ntBox = (k) => `<label class="check-inline"><input type="checkbox" data-bind="setup.neurotypes.${k}" data-rerender="all" ${s.neurotypes[k] ? 'checked' : ''}> ${D.NT_LABELS[k]}</label>`;
        const moveBox = (k) => `<label class="check-inline"><input type="checkbox" data-bind="setup.movement.${k}" data-rerender="all" ${s.movement[k] ? 'checked' : ''}> ${esc(D.MOVEMENT_MODULES[k].label)}</label>`;
        const exDay = (i) => `<label class="check-inline"><input type="checkbox" data-exday="${i}" ${s.excursion.days.includes(i) ? 'checked' : ''}> ${SHORT_DAYS[i]}</label>`;
        $('#tab-setup').innerHTML = `
        <div class="subpanel binder-section">
            <h2>Retreat Setup (Architect Phase)</h2>
            <p class="muted section-intro">Make these choices once during your prep week so retreat-you makes zero logistical decisions. Every tab updates to match. Nothing here is permanent; change it anytime.</p>
        </div>
        <div class="setup-grid">
            <div class="subpanel setup-card">
                <h3>Who this retreat is for</h3>
                <p class="muted section-intro">Turn on any that fit, whether diagnosed or self-identified. Suggestions throughout the binder shift to match, and small tags show why each one is there. With none on, you'll see the universal suggestions.</p>
                <div class="chip-row nt-toggles">${['autism', 'adhd', 'cptsd'].map(ntBox).join('')}</div>
                <div class="form-row mt-2">
                    <label for="setupIdentity">Binder subtitle</label>
                    <input type="text" id="setupIdentity" data-bind="setup.identity" data-rerender="others" value="${esc(s.identity)}" placeholder="${esc(identityLine({ setup: { ...s, identity: '' } }))}">
                    <p class="field-hint">Leave blank to use the automatic subtitle.</p>
                </div>
            </div>

            <div class="subpanel setup-card">
                <h3>Length &amp; dates</h3>
                <div class="form-row"><label for="setupLength">Retreat length</label>
                    <select id="setupLength" data-bind="setup.length" data-num data-rerender="all">${D.LENGTHS.map((l) => `<option value="${l.value}" ${l.value === s.length ? 'selected' : ''}>${esc(l.label)}</option>`).join('')}</select></div>
                <div class="field-grid">
                    <div class="form-row"><label for="setupStartDay">First day</label>
                        <select id="setupStartDay" data-bind="setup.startWeekday" data-num data-rerender="all" ${s.startDate ? 'disabled' : ''}>${WEEKDAYS.map((w, i) => `<option value="${i}" ${i === startWeekday(p) ? 'selected' : ''}>${w}</option>`).join('')}</select></div>
                    <div class="form-row"><label for="setupStartDate">Start date (optional)</label>
                        <input type="date" id="setupStartDate" data-bind="setup.startDate" data-rerender="all" value="${esc(s.startDate)}"></div>
                </div>
            </div>

            <div class="subpanel setup-card">
                <h3>Anchors &amp; home base</h3>
                <p class="muted section-intro">Three touchpoints a day, each linked to feeding your body.</p>
                <div class="field-grid">
                    <div class="form-row"><label>Anchor 1 (morning)</label>${text('setup.anchors.a1', s.anchors.a1, '7:00 AM')}</div>
                    <div class="form-row"><label>Anchor 2 (midday)</label>${text('setup.anchors.a2', s.anchors.a2, '1:00 PM')}</div>
                    <div class="form-row"><label>Anchor 3 (evening)</label>${text('setup.anchors.a3', s.anchors.a3, '6:00 PM')}</div>
                </div>
                <div class="field-grid">
                    <div class="form-row"><label>Home-base spot</label>${text('setup.home', s.home, 'e.g., Couch Spot')}</div>
                    <div class="form-row"><label>Morning drink</label>${text('setup.drink', s.drink, 'e.g., coffee, tea, cocoa')}</div>
                    <div class="form-row"><label>Drink extras to shop for</label>${text('setup.drinkExtras', s.drinkExtras, 'e.g., creamer, honey')}</div>
                </div>
            </div>

            <div class="subpanel setup-card">
                <h3>Morning cue</h3>
                <p class="muted section-intro">The natural trigger that starts Anchor 1.</p>
                <div class="form-row"><label for="setupCue">Cue type</label><select id="setupCue" data-preset="cue">${opt(D.CUE_PRESETS, s.cue.type)}</select></div>
                <div class="form-row"><label>What happens</label>${text('setup.cue.text', s.cue.text, 'e.g., Let the dog out')}</div>
                <div class="field-grid">
                    <div class="form-row"><label>Short name (tracker title)</label>${text('setup.cue.short', s.cue.short, 'e.g., Dog Out')}</div>
                    ${f.pet ? `<div class="form-row"><label>Your pets, as you'd say it</label>${text('setup.cue.pets', s.cue.pets, 'e.g., the dog')}</div>` : ''}
                </div>
            </div>

            <div class="subpanel setup-card">
                <h3>Low-sensory sanctuary space</h3>
                <p class="muted section-intro">Your go-to spot for darkness, quiet, warmth, or pressure.</p>
                <div class="form-row"><label for="setupSanct">Style</label><select id="setupSanct" data-preset="sanctuary">${opt(D.SANCTUARY_PRESETS, s.sanctuary.type)}</select></div>
                <div class="form-row"><label>What you call it</label>${text('setup.sanctuary.name', s.sanctuary.name, 'e.g., The Nest')}</div>
            </div>

            <div class="subpanel setup-card">
                <h3>Communication container</h3>
                <p class="muted section-intro">How much contact you'll have, and with whom.</p>
                <div class="form-row"><label for="setupContact">House setup</label><select id="setupContact" data-bind="setup.contact.mode" data-rerender="all">${opt(D.CONTACT_MODES, s.contact.mode)}</select></div>
                ${f.zero ? '' : `
                <div class="form-row"><label>Who you check in with</label>${text('setup.contact.who', s.contact.who, 'e.g., my partner, my roommates')}</div>
                <div class="field-grid">
                    <div class="form-row"><label>Check-in starts</label>${text('setup.contact.windowStart', s.contact.windowStart, '6:00 PM')}</div>
                    <div class="form-row"><label>Check-in ends</label>${text('setup.contact.windowEnd', s.contact.windowEnd, '6:20 PM')}</div>
                </div>`}
                ${f.shared ? `<div class="form-row"><label>"Do not perceive me" hours</label>${text('setup.contact.quietHours', s.contact.quietHours, '9:00 AM – 6:00 PM')}</div>` : ''}
                <div class="form-row"><label for="setupExtra">Extra boundary notes (one per line)</label>
                    <textarea id="setupExtra" rows="2" data-bind="setup.contact.extra" data-rerender="others" placeholder="e.g., Please don't ask about work this week.">${esc(s.contact.extra)}</textarea></div>
            </div>

            <div class="subpanel setup-card">
                <h3>Low-demand nature / horizon excursion</h3>
                <p class="muted section-intro">A short, optional outing to a wide view. Panoramic vision naturally calms the brain's threat response. Untick every day to skip excursions.</p>
                <div class="form-row"><label for="setupSpot">Spot</label><select id="setupSpot" data-preset="excursion">${opt(D.SPOT_PRESETS, s.excursion.type)}</select></div>
                <div class="field-grid">
                    <div class="form-row"><label>Spot, as you'd say it</label>${text('setup.excursion.spot', s.excursion.spot, 'e.g., the lake')}</div>
                    <div class="form-row"><label>Time</label>${text('setup.excursion.time', s.excursion.time, '10:30 AM')}</div>
                </div>
                <span class="field-label">Days</span>
                <div class="chip-row">${[0, 1, 2, 3, 4, 5, 6].map(exDay).join('')}</div>
            </div>

            <div class="subpanel setup-card">
                <h3>Doom Box &amp; 5 Clear Runways</h3>
                <p class="muted section-intro">Five surfaces you keep clear during the retreat, plus one box for everything else.</p>
                <div class="form-row"><label>Doom box name</label>${text('setup.doomBox', s.doomBox, 'Retreat Clutter Doom Box')}</div>
                ${s.runways.map((r, i) => `<div class="runway-row">
                    <input type="text" aria-label="Runway ${i + 1} name" data-bind="setup.runways.${i}.name" data-rerender="others" value="${esc(r.name)}" placeholder="Runway ${i + 1}">
                    <input type="text" aria-label="Runway ${i + 1} plan" data-bind="setup.runways.${i}.desc" data-rerender="others" value="${esc(r.desc)}" placeholder="What to do with it"></div>`).join('')}
            </div>

            <div class="subpanel setup-card">
                <h3>Anchor 2 movement</h3>
                <p class="muted section-intro">5–10 minutes of somatic or physical support after lunch. Pick any.</p>
                <div class="check-list">${Object.keys(D.MOVEMENT_MODULES).map(moveBox).join('')}</div>
            </div>

            <div class="subpanel setup-card">
                <h3>Food &amp; interoception</h3>
                <p class="muted section-intro">Mechanical fuel: you eat at the anchors, so you don't have to notice hunger. The fridge is sorted into 4 sensory quadrants.</p>
                <label class="check-inline mb-2"><input type="checkbox" data-bind="setup.food.rescue" data-rerender="all" ${s.food.rescue ? 'checked' : ''}> Nausea / low-appetite rescue bridge (eat a little safe food first)</label>
                ${f.rescue ? `
                <div class="form-row mt-2"><label>Safe rescue foods</label>${text('setup.food.rescueFoods', s.food.rescueFoods, 'e.g., crackers, shakes')}</div>
                <div class="field-grid">
                    <div class="form-row"><label>Short name (tracker)</label>${text('setup.food.rescueShort', s.food.rescueShort, 'e.g., Crackers')}</div>
                    <div class="form-row"><label>Foods to avoid</label>${text('setup.food.avoid', s.food.avoid, 'e.g., ginger')}</div>
                </div>` : ''}
                <div class="field-grid mt-2">
                    <div class="form-row"><label>Warm &amp; Savory</label>${text('setup.food.quadrants.warm', s.food.quadrants.warm)}</div>
                    <div class="form-row"><label>Cold &amp; Crisp</label>${text('setup.food.quadrants.cold', s.food.quadrants.cold)}</div>
                    <div class="form-row"><label>Crunchy &amp; Salty</label>${text('setup.food.quadrants.crunchy', s.food.quadrants.crunchy)}</div>
                    <div class="form-row"><label>Smooth &amp; Sweet</label>${text('setup.food.quadrants.smooth', s.food.quadrants.smooth)}</div>
                </div>
            </div>

            <div class="subpanel setup-card">
                <h3>Main sensory focus</h3>
                <p class="muted section-intro">Your biggest sensory trigger or need. It reorders the Sensory Lab and sets your sensory kit and tracker dial.</p>
                <div class="form-row"><select aria-label="Main sensory focus" data-bind="setup.focus" data-rerender="all">${opt(D.FOCUS, s.focus)}</select></div>
            </div>
        </div>`;
    }

    function renderOverview() {
        const p = P();
        const c = ctx(p);
        const n = p.setup.length;
        const info = dayInfo(p);
        const toc = [
            ['tab-setup', 'Retreat Setup', 'Who it\'s for, length, spaces, and plans', 'Before your prep week.'],
            ['tab-prep', 'Front Inside Pocket', 'Prep-Week Master Guide & Checklists', 'Complete during prep week (before Day 1).'],
            ['tab-overview', 'Page 1 (Front Cover)', '• Table of Contents<br>• Weekly Agenda Overview', 'Quick orientation for the retreat\'s arc.'],
            ['tab-tracker', 'Tab 1: TODAY\'S TRACKER', `• Daily Retreat Anchor Tracker (Days 1–${n})`, `Fill out 1 sheet daily at ${esc(c.a1)}, ${esc(c.a2)}, &amp; ${esc(c.a3)}.`],
            ['tab-rhythm', 'Tab 2: DAILY RHYTHM & MORNINGS', '• Page A: Daily Rhythm & 3 Anchors<br>• Page B: Morning Wake-Up Activity Menu', `Use during the ${esc(c.a1)} anchor with your ${esc(c.drink)}.`],
            ['tab-menus', 'Tab 3: ACTIVITY MENUS', '• Page A: Activity Decision Table<br>• Page B: Books, Crafts & Projects Menu<br>• Page C: Game & Media Menu', 'Reference during open morning & afternoon blocks.'],
            ['tab-sensory', 'Tab 4: SENSORY & JOURNALING', `• Page A: Sensory Lab Menu & ${esc((D.FOCUS[p.setup.focus] || D.FOCUS.auditory).kitTitle.replace(/^The /, ''))}<br>• Page B: Journal Prompts + Free-Write Log`, `Use after ${esc(c.a3)} for evening wind-down &amp; reflection.`]
        ];
        $('#tab-overview').innerHTML = `
        <div class="subpanel binder-section">
            <div class="head-flex">
                <div><h2>Personal Retreat Binder: Table of Contents</h2>
                <p class="muted section-intro">Click any row to jump to that binder tab.</p></div>
                <button type="button" class="btn btn-sm btn-primary" data-action="open-print">Build printable binder…</button>
            </div>
            <div class="table-responsive"><table class="binder-table">
                <thead><tr><th>Binder Section / Tab</th><th>Document / Section Title</th><th>When to Use It</th></tr></thead>
                <tbody>${toc.map(([tab, a, b, w]) => `<tr class="clickable-row" data-action="tab" data-tab="${tab}" tabindex="0"><td><strong>${esc(a)}</strong></td><td>${b.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;')}</td><td>${w}</td></tr>`).join('')}</tbody>
            </table></div>
        </div>
        <div class="subpanel binder-section">
            <h2>Retreat Agenda Overview (${esc(info[0].weekday)} – ${esc(info[n - 1].weekday)})</h2>
            <p class="muted section-intro">Every full retreat day follows your <strong>3 Core Anchors (${esc(c.a1)}, ${esc(c.a2)}, &amp; ${esc(c.a3)})</strong>, with 100% permission to adjust based on your nervous system.</p>
            <div class="table-responsive">${agendaTable('screen')}</div>
        </div>`;
    }

    function agendaTable(mode) {
        const p = P();
        const info = dayInfo(p);
        const rows = [`<tr><td><strong>Pre-Retreat</strong><br><em>(Prep Week)</em></td><td><strong>Architect Phase</strong></td><td>Prep complete; run &amp; empty the dishwasher the night before Day 1; review your communication plan.</td>${mode === 'screen' ? '<td><button type="button" class="btn btn-sm" data-action="tab" data-tab="tab-prep">Prep list →</button></td>' : ''}</tr>`]
            .concat(info.map((d) => `<tr><td><strong>Day ${d.num}: ${esc(d.label)}</strong><br><em>(${esc(d.type)})</em></td><td><strong>${esc(d.theme)}</strong></td><td>${esc(d.highlights)}</td>${mode === 'screen' ? `<td><button type="button" class="btn btn-sm" data-action="goto-day" data-day-num="${d.num}">Open Day ${d.num} →</button></td>` : ''}</tr>`));
        return `<table class="binder-table"><thead><tr><th>Day</th><th>Daily Theme &amp; Focus</th><th>Unique Highlights &amp; Key Events</th>${mode === 'screen' ? '<th>Action</th>' : ''}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
    }

    function checkItems(items, p, c) {
        return items.map((it) => {
            const checked = !!p.prepChecks[it.id];
            const label = html(it.t, it.vars ? { ...c, ...it.vars } : c);
            return `<label class="check-item${checked ? ' done' : ''}"><input type="checkbox" data-prep="${it.id}" ${checked ? 'checked' : ''}><span>${label}</span>${badges(it)}</label>`;
        }).join('');
    }

    function renderPrep() {
        const p = P();
        const c = ctx(p);
        const groups = prepGroups(p);
        const shop = shoppingGroups(p);
        const bullets = boundaryBullets(p);
        $('#tab-prep').innerHTML = `
        <div class="subpanel binder-section">
            <h2>Prep-Week Master Guide &amp; Checklists</h2>
            <p class="muted section-intro">Set up your environment, food, sensory kit, and phone boundaries before Day 1, so retreat-you makes zero logistical decisions.</p>
            <div class="progress-bar-wrap" aria-hidden="true"><div class="progress-bar-fill" id="prepProgressBar"></div></div>
            <div class="prep-grid">${groups.map((g) => `<div class="subpanel prep-cat-box"><h3>${esc(g.title)}</h3>${g.note ? `<p class="prep-note muted">${html(g.note, c)}</p>` : ''}${checkItems(g.items, p, c)}</div>`).join('')}</div>
        </div>
        <div class="two-col">
            <div class="subpanel binder-section">
                <h2>Master Shopping &amp; Household Gather Lists</h2>
                ${shop.map((g) => `<div class="prep-cat-box"><h3>${esc(g.title)}</h3>${checkItems(g.items, p, c)}</div>`).join('')}
            </div>
            <div class="subpanel binder-section">
                <h2>Phone "Retreat DND" Setup</h2>
                <div class="prep-cat-box">${checkItems(phoneSteps(p), p, c)}</div>
                <div class="callout-box subpanel">
                    <h3>Communication Boundary Review</h3>
                    <p class="muted prep-note">${flags(p).checkin ? `Review these points with ${esc(c.who)} before Day 1:` : 'Share these points with anyone who needs to know before Day 1:'}</p>
                    <ul>${bullets.map((b) => `<li>${b.user ? esc(b.t) : html(b.t, c)}${b.user ? '' : badges(b)}</li>`).join('')}</ul>
                </div>
            </div>
        </div>`;
        updatePrepProgress();
    }

    function prepPct() {
        const p = P();
        const ids = allPrepIds(p);
        if (!ids.length) return 0;
        return Math.round((ids.filter((id) => p.prepChecks[id]).length / ids.length) * 100);
    }
    function updatePrepProgress() {
        const pct = prepPct();
        $$('.prep-pct').forEach((elt) => { elt.textContent = `${pct}%`; });
        const bar = $('#prepProgressBar');
        if (bar) bar.style.width = `${pct}%`;
    }

    function weatherRows(which, rows, obj) {
        return rows.map((r) => {
            const sel = obj[r.key] || [];
            const opts = r.options.concat(sel.filter((o) => !r.options.includes(o)));
            return `<div class="weather-row"><div class="weather-label">${esc(r.label)}</div><div class="chip-row">${opts.map((o) => `<button type="button" class="chip-btn" data-action="weather" data-which="${which}" data-wkey="${esc(r.key)}" data-opt="${esc(o)}" aria-pressed="${sel.includes(o)}">${esc(o)}</button>`).join('')}</div></div>`;
        }).join('');
    }

    function dayPills(cls) {
        return dayInfo().map((d) => `<button type="button" class="day-pill${d.num === state.activeDay ? ' active' : ''}${cls ? ` ${cls}` : ''}" data-action="goto-day" data-day-num="${d.num}" aria-pressed="${d.num === state.activeDay}">Day ${d.num} (${d.short})</button>`).join('');
    }

    function renderTracker() {
        const p = P();
        const c = ctx(p);
        const f = flags(p);
        const n = state.activeDay;
        const d = day(n);
        const info = dayInfo(p)[n - 1];
        const mv = movementSummary(p);
        const nt = p.setup.neurotypes;
        const chk = (field, label) => `<label class="check-pill"><input type="checkbox" data-day="${field}" ${d[field] ? 'checked' : ''}> ${esc(label)}</label>`;
        const txt = (field, ph) => `<input type="text" data-day="${field}" value="${esc(d[field])}" placeholder="${esc(ph)}">`;
        const area = (field, ph) => `<textarea rows="3" data-day="${field}" placeholder="${esc(ph)}">${esc(d[field])}</textarea>`;
        const exps = experimentsSorted(p).map(expValue);
        const expOpts = ['', ...exps, 'Custom / Other Sensory Input'];
        if (d.sensoryExp && !expOpts.includes(d.sensoryExp)) expOpts.push(d.sensoryExp);
        const ratings = [['-2', '-2 Agitating'], ['-1', '-1 Draining'], ['0', '0 Numb/Neutral'], ['+1', '+1 Helpful'], ['+2', '+2 Deeply Soothing']];
        $('#tab-tracker').innerHTML = `
        <div class="subpanel day-selector-bar">
            <div class="day-pills">${dayPills()}</div>
            <label class="day-date">Day of week / date ${txt('dateStr', info.label)}</label>
        </div>
        <div class="subpanel binder-section">
            <h2>Daily Retreat Anchor &amp; Body Weather Tracker: Day ${n} <span class="muted">(${esc(d.dateStr || info.label)})</span></h2>

            <div class="anchor-block">
                <div class="anchor-header">
                    <h3>Anchor 1: ${esc(c.a1)} — ${esc(c.cueShort)}, ${esc(c.DrinkT)} + Food at ${esc(c.home)}</h3>
                    <div class="inline-checks">${chk('catOut', c.cue)}${chk('coffeeFood', `${c.Drink} + food at ${c.home}`)}</div>
                </div>
                <h4>Morning Body Weather Check <span class="muted">(Click all that apply${nt.cptsd ? ' — "Numb/Flat" is valid data!' : ''})</span></h4>
                <div class="weather-matrix">${weatherRows('morning', morningRows(p), d.morningWeather)}</div>
                <div class="intentions-box subpanel">
                    <h4>My Intentional Choices for This Morning <span class="muted">(Pick from Tab 2 &amp; Tab 3, or type your own)</span></h4>
                    <div class="form-row"><label>1. Wake-Up Activity (from the Wake-Up Menu)</label>${txt('wakeupChoice', 'e.g., 1 cozy video with my drink')}</div>
                    <div class="form-row"><label>2. 1 Disciplined Retreat Practice (yoga, meditation, therapy workbook, self-help)</label>${txt('disciplineChoice', 'e.g., 1 chapter of a self-help book')}</div>
                    <div class="form-row"><label>3. Morning Sensory Reset${f.excursion ? `, Excursion (${esc(c.excursionDays)} ${esc(c.excursionTime)})` : ''}, or Contained Flow Activity</label>${txt('morningFlowChoice', `e.g., ${c.sanctuary} reset or 1 painting layer`)}</div>
                </div>
            </div>
            <hr class="section-divider">

            <div class="anchor-block">
                <div class="anchor-header">
                    <h3>Anchor 2: ${esc(c.a2)} — Healthy Container Meal &amp; Body Support</h3>
                    <div class="inline-checks">
                        ${chk('lunchEaten', f.rescue ? `Ate container meal (or ${c.rescueShort.toLowerCase()} rescue first)` : 'Ate container meal')}
                        ${chk('lunchDishwasher', 'Container straight into dishwasher')}
                        ${chk('ptDone', mv.label)}
                    </div>
                </div>
                <h4>Midday Body Weather Check <span class="muted">(Click all that apply)</span></h4>
                <div class="weather-matrix">${weatherRows('midday', middayRows(p), d.middayWeather)}</div>
                <div class="intentions-box subpanel">
                    <h4>My Intentional Choice for This Afternoon <span class="muted">(Natural closed-loop endpoint, no jarring timers)</span></h4>
                    <div class="field-grid">
                        <div class="form-row"><label>Afternoon activity</label>${txt('afternoonActivity', 'e.g., 1 craft, 1 game, or 1 project')}</div>
                        <div class="form-row"><label>My natural closed-loop endpoint is</label>${txt('afternoonEndpoint', 'e.g., finish 1 quest, or stop when stamina dips')}</div>
                    </div>
                </div>
            </div>
            <hr class="section-divider">

            <div class="anchor-block">
                <div class="anchor-header">
                    <h3>Anchor 3: ${esc(c.a3)} — Dinner${f.checkin ? ', Check-In Window' : ''} &amp; Evening Log</h3>
                    <div class="inline-checks">
                        ${chk('dinnerDishwasher', 'Ate container dinner → straight into dishwasher')}
                        ${f.checkin ? chk('spouseWindow', `${c.window} check-in with ${c.who} → Retreat DND back ON & phone parked`) : ''}
                        ${chk('coffeePrepped', `Prepped ${c.drink} & morning food for ${c.a1} tomorrow`)}
                    </div>
                </div>
                <h4>Today's Sensory Lab Experiment Log</h4>
                <div class="intentions-box subpanel">
                    <div class="field-grid">
                        <div class="form-row"><label for="trackerExp">Experiment tested today</label>
                            <select id="trackerExp" data-day="sensoryExp">${expOpts.map((o) => `<option value="${esc(o)}" ${o === d.sensoryExp ? 'selected' : ''}>${o ? esc(o) : '-- Select an experiment --'}</option>`).join('')}</select></div>
                        <div class="form-row"><span class="field-label">Sensory rating</span>
                            <div class="chip-row">${ratings.map(([v, l]) => `<button type="button" class="chip-btn" data-action="rating" data-val="${v}" aria-pressed="${d.sensoryRating === v}">${l}</button>`).join('')}</div></div>
                    </div>
                    <div class="form-row"><label>Data observation (what did my body, senses, jaw, or breathing do?)</label>${txt('sensoryObs', 'e.g., shoulders dropped after 2 songs on loop')}</div>
                </div>
                <h4>Evening Reflection Prompts</h4>
                <div class="form-row"><label><strong>Unmasking &amp; Nervous System Observations</strong> <em>("What did my body, brain, or energy do today with zero external expectations?")</em></label>${area('eveningUnmasking', 'Write your observations here...')}</div>
                <div class="form-row"><label><strong>Listening &amp; Self-Trust Win</strong> <em>("Where did I successfully listen to a body cue, honor a sensory need, or gently hold a boundary for myself today?")</em></label>${area('eveningWin', 'Write your self-trust wins here...')}</div>
                <div class="form-row"><label><strong>Other Notes / Free Journal</strong></label>${area('eveningOther', 'Any extra thoughts, ideas, or reflections from today...')}</div>
            </div>
        </div>`;
    }

    function renderRhythm() {
        const p = P();
        const c = ctx(p);
        const pi = p.persistInputs;
        const guard = D.GUARDRAILS.filter((g) => shown(g, p));
        const yt = (k, ph) => `<input type="text" data-persist="${k}" value="${esc(pi[k])}" placeholder="${esc(ph)}" class="mb-2">`;
        $('#tab-rhythm').innerHTML = `
        <div class="subpanel binder-section">
            <h2>Page A: Daily Rhythm &amp; the 3 Anchors</h2>
            <p class="muted section-intro">No rigid schedules on this retreat. There are three touchpoints a day, each linked to feeding your body. Everything in between is guided by how your nervous system feels.</p>
            ${rhythmHtml(p)}
        </div>
        <div class="subpanel binder-section">
            <h2>Page B: Morning Wake-Up Activity Menu (By Energy Level)</h2>
            <div class="guardrails-banner">${guard.map((g) => `<div>${html(g.t, c)}${badges(g)}</div>`).join('')}</div>
            <p class="muted section-intro">Click any activity to send it to <strong>today's Anchor 1 Wake-Up slot</strong> in the Daily Tracker.</p>
            <div class="table-responsive">${wakeupTable('screen')}</div>
            <div class="sub-block">
                <h3>Morning Wake-Up YouTube Queue (save to a private "Retreat Morning" playlist)</h3>
                <div class="field-grid">
                    <div><span class="field-label">Cozy / low-stimulation videos (Level 1 exhausted mornings)</span>
                        ${yt('yt_cozy_1', '1) Cozy video title / creator...')}${yt('yt_cozy_2', '2) Cozy video title / creator...')}${yt('yt_cozy_3', '3) Cozy video title / creator...')}</div>
                    <div><span class="field-label">Interesting topic / deep-dive videos (Level 4 wired mornings)</span>
                        ${yt('yt_wired_1', '1) Deep-dive video title...')}${yt('yt_wired_2', '2) Deep-dive video title...')}${yt('yt_wired_3', '3) Deep-dive video title...')}</div>
                </div>
            </div>
        </div>`;
    }

    function chipList(list, path, kind) {
        return `<div class="chip-row">${list.map((item, i) => {
            const name = typeof item === 'string' ? item : item.name;
            const endpoint = typeof item === 'string' ? '' : item.endpoint;
            return `<span class="list-chip"><button type="button" class="chip-main" data-action="chip-pick" data-kind="${kind}" data-list="${path}" data-index="${i}" title="Send to today's afternoon activity">${esc(name)}${endpoint ? ` <span class="chip-endpoint">· ${esc(endpoint)}</span>` : ''}</button><button type="button" class="chip-x" data-action="chip-remove" data-list="${path}" data-index="${i}" aria-label="Remove ${esc(name)}">×</button></span>`;
        }).join('') || '<span class="muted text-sm">Nothing here yet. Add your own below.</span>'}</div>`;
    }
    function addRow(path, withEndpoint, ph) {
        const id = path.replace(/\./g, '-');
        return `<div class="add-row"><input type="text" id="add-${id}-name" data-enter-add="${path}" placeholder="${esc(ph)}" aria-label="New item name">${withEndpoint ? `<input type="text" id="add-${id}-endpoint" data-enter-add="${path}" placeholder="Closed-loop endpoint (e.g., 1 chapter)" aria-label="Closed-loop endpoint">` : ''}<button type="button" class="btn btn-sm" data-action="chip-add" data-list="${path}">+ Add</button></div>`;
    }

    function renderMenus() {
        const p = P();
        const m = p.menus;
        const pi = p.persistInputs;
        const filter = state.decisionFilter === undefined ? 'all' : state.decisionFilter;
        $('#tab-menus').innerHTML = `
        <div class="subpanel binder-section">
            <div class="head-flex">
                <div><h2>Page A: The Activity Decision Table</h2>
                <p class="muted section-intro">When you feel decision fatigue, filter by your current internal state, then click any item to send it to today's tracker.</p></div>
                <div class="chip-row">
                    <button type="button" class="chip-btn" data-action="filter-state" data-state="all" aria-pressed="${filter === 'all'}">Show all states</button>
                    ${D.DECISION.map((r, i) => `<button type="button" class="chip-btn" data-action="filter-state" data-state="${i}" aria-pressed="${String(filter) === String(i)}">${esc(r.chip)}</button>`).join('')}
                </div>
            </div>
            <div class="table-responsive">${decisionTable('screen', filter)}</div>
        </div>

        <div class="subpanel binder-section">
            <h2>Page B: Books, Practices, Crafts &amp; Projects Menu</h2>
            <p class="muted section-intro">Instead of jarring timers that interrupt flow and leave open loops, choose a <strong>natural closed-loop endpoint</strong> before you start, or stop whenever your stamina or motivation shifts.</p>
            <h3>Disciplined Retreat Practices <span class="muted text-sm">(therapy, yoga, meditation &amp; research reading)</span></h3>
            <div class="table-responsive"><table class="binder-table practice-table">
                <thead><tr><th>Type</th><th>Title</th><th>Link / page / bookmark</th><th>Closed-loop endpoint</th><th><span class="sr-only">Actions</span></th></tr></thead>
                <tbody>${m.practices.map((r, i) => `<tr>
                    <td><select aria-label="Practice type" data-bind="menus.practices.${i}.type">${D.PRACTICE_TYPES.concat(D.PRACTICE_TYPES.includes(r.type) ? [] : [r.type]).map((t) => `<option ${t === r.type ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></td>
                    <td><input type="text" aria-label="Practice title" data-bind="menus.practices.${i}.title" value="${esc(r.title)}" placeholder="e.g., a book or video title"></td>
                    <td><input type="text" aria-label="Bookmark" data-bind="menus.practices.${i}.bookmark" value="${esc(r.bookmark)}" placeholder="p. __ or link"></td>
                    <td><input type="text" aria-label="Endpoint" data-bind="menus.practices.${i}.endpoint" value="${esc(r.endpoint)}" placeholder="e.g., 1 chapter"></td>
                    <td><button type="button" class="icon-btn" data-action="practice-send" data-index="${i}" title="Send to today's Disciplined Practice">→ Today</button> <button type="button" class="icon-btn danger" data-action="practice-remove" data-index="${i}" aria-label="Remove practice">×</button></td>
                </tr>`).join('')}</tbody>
            </table></div>
            <button type="button" class="btn btn-sm mt-2" data-action="practice-add">+ Add a practice</button>

            <h3 class="mt-6">Fine Art &amp; Tactile Crafts <span class="muted text-sm">(bare table or ${esc(ctx(p).home)}; click one to send it to today's afternoon)</span></h3>
            ${chipList(m.crafts, 'crafts', 'craft')}
            ${addRow('crafts', true, 'Add a craft (e.g., embroidery)')}

            <h3 class="mt-6">Meaningful Gifting, Data &amp; Organization Projects <span class="muted text-sm">(contained flow; your rabbit holes)</span></h3>
            ${chipList(m.projects, 'projects', 'project')}
            ${addRow('projects', true, 'Add a project or rabbit hole')}
            <span class="field-label mt-2">Tiny organization drawer/bin pre-selection</span>
            <div class="bins-row">${[1, 2, 3].map((i) => `<input type="text" data-persist="bin_${i}" value="${esc(pi[`bin_${i}`])}" placeholder="Bin #${i} (e.g., desk top drawer)" aria-label="Bin ${i}">`).join('')}</div>
        </div>

        <div class="subpanel binder-section">
            <h2>Page C: Game &amp; Media Menu (Matched by Nervous System State)</h2>
            <p class="muted section-intro">Click any game to load it and its natural closed-loop endpoint into today's afternoon activity. Remove the examples with × and add your own.</p>
            <div class="table-responsive"><table class="binder-table">
                <thead><tr><th>Nervous System State</th><th>Best Matches from Your Library</th><th>Natural In-Game "Closed Loop"</th></tr></thead>
                <tbody>${D.GAME_TIERS.map((t) => {
                    const sug = suggestedFor(t, p);
                    return `<tr><td class="${sug ? 'is-suggested' : ''}"><strong>${esc(t.state)}</strong>${badges(t)}${sug ? '<br><span class="suggested-badge">Suggested for you</span>' : ''}</td>
                    <td>${chipList(m.games[t.key], `games.${t.key}`, `game:${t.key}`)}${addRow(`games.${t.key}`, false, '+ Add my game')}</td>
                    <td>${esc(t.endpoint)}</td></tr>`;
                }).join('')}</tbody>
            </table></div>
        </div>`;
    }

    function renderSensory() {
        const p = P();
        const c = ctx(p);
        const focusKey = p.setup.focus;
        const focus = D.FOCUS[focusKey] || D.FOCUS.auditory;
        const pi = p.persistInputs;
        let lastCat = null;
        const exps = experimentsSorted(p).map((e) => {
            const sug = suggestedFor(e, p);
            const head = e.cat !== lastCat ? `<h3 class="mt-2">${esc(D.EXP_CATS[e.cat])}${e.cat === focus.cat ? ' <span class="suggested-badge">Your focus</span>' : ''}</h3>` : '';
            lastCat = e.cat;
            return `${head}<div class="exp-card${sug ? ' is-suggested' : ''}">
                <div class="exp-card-header"><strong>Experiment ${esc(e.id)} (${esc(e.title)})</strong><button type="button" class="btn btn-sm" data-action="use-exp" data-exp="${esc(expValue(e))}">Use today →</button></div>
                <div>${html(e.desc, c)} ${badges(e)}</div></div>`;
        }).join('');
        const kitKey = (i) => (focusKey === 'auditory' ? `pl_link_${i + 1}` : `kit_${focusKey}_${i + 1}`);
        const prompts = visiblePrompts(p);
        $('#tab-sensory').innerHTML = `
        <div class="two-col">
            <div class="subpanel binder-section">
                <h2>Page A: Sensory Lab Experiment Menu</h2>
                <p class="muted section-intro">Pick <strong>one experiment per day</strong> to gather data on your nervous system. Rate it from <strong>-2 Draining/Agitating</strong> to <strong>+2 Deeply Soothing</strong>, with <strong>0 Felt Nothing / Numb</strong>. Click "Use today" to load one into today's tracker.</p>
                <div class="card-list">${exps}</div>
            </div>
            <div class="subpanel binder-section">
                <h2>Quick Reference: ${esc(focus.kitTitle)}</h2>
                <p class="muted section-intro">${html(focus.kitNote, c)}</p>
                <div class="card-list">${focus.kit.map((k, i) => `<div class="kit-item"><strong>${i + 1}. ${esc(k.name)}</strong><div>${html(k.desc, c)}</div>
                    <input type="text" data-persist="${kitKey(i)}" value="${esc(pi[kitKey(i)])}" placeholder="Optional: link, location, or note..." aria-label="${esc(k.name)} note"></div>`).join('')}</div>
            </div>
        </div>
        <div class="subpanel binder-section">
            <h2>Page B: Journal Prompt Menu &amp; Lined Pages</h2>
            <p class="muted section-intro">Click any prompt to copy it into your journal below, then write as much as you want.</p>
            <div class="card-list">${prompts.map((pr, i) => `<button type="button" class="prompt-card" data-action="prompt-insert" data-index="${D.PROMPTS.indexOf(pr)}"><strong>${i + 1}. ${esc(pr.title)}:</strong> <em>"${html(pr.text, c)}"</em> ${badges(pr)}<span class="prompt-insert">+ Insert into journal</span></button>`).join('')}</div>
            <div class="journal-editor-box">
                <div class="head-flex"><h3>Retreat Binder Lined Journal Pages</h3><span class="save-badge" id="journalSaveBadge"></span></div>
                <textarea id="masterJournal" rows="12" aria-label="Journal" placeholder="Free-write here. Click any prompt above to insert it, or use this space for brain dumps and reflections.">${esc(p.masterJournal)}</textarea>
            </div>
            ${p.setup.neurotypes.cptsd ? '<div class="crisis-note subpanel">If reflecting brings up more than you can hold right now, it\'s okay to stop and return to a grounding reset. If you\'re in crisis in the U.S., call or text <strong>988</strong>. If you or someone else is in immediate danger, call 911 or your local emergency number.</div>' : ''}
        </div>`;
        updateSaveBadge();
    }

    function renderShell() {
        const p = P();
        $('#identityLine').textContent = identityLine(p);
        $('#modeBanner').innerHTML = state.mode === 'creator'
            ? '<strong>Creator\'s Example:</strong> A real AuDHD + CPTSD retreat setup, so you can see how it all fits together. Use it as-is, or switch to <strong>Build My Own</strong> in the tool menu to start yours with generic placeholders.'
            : '<strong>Build My Own:</strong> Your own retreat. Start in <strong>Retreat Setup</strong>, then fill in your menus. The Creator\'s Example is still saved separately if you want to peek at it.';
        $$('[data-action="mode"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === state.mode)));
        $$('.tool-sidebar [data-bind]').forEach((inp) => { inp.checked = !!getPath(p, inp.dataset.bind); });
        $('#saveLocalToggle').checked = state.saveLocal;
        $('#sidebarDays').innerHTML = dayPills();
        $$('.binder-tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.activeTab)));
        $$('.binder-panel').forEach((panel) => panel.classList.toggle('active', panel.id === state.activeTab));
        $$('#sidebarToc [data-toc]').forEach((b) => b.classList.toggle('is-current', b.dataset.toc === state.activeTab));
        updatePrepProgress();
    }

    function refresh(opts = {}) {
        if (state.activeDay > retreatLength()) state.activeDay = 1;
        if (!opts.skipSetup) renderSetup();
        renderOverview();
        renderPrep();
        renderTracker();
        renderRhythm();
        renderMenus();
        renderSensory();
        renderShell();
    }

    // ---------- Toast & saving badge ----------
    let toastTimer;
    function toast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
    }
    function updateSaveBadge() {
        const b = $('#journalSaveBadge');
        if (b) b.textContent = state.saveLocal ? 'Saved in this browser' : 'Not saved in the browser; use Save .json';
    }

    // ---------- Events ----------
    function switchTab(tab) {
        if (!TAB_IDS.includes(tab)) return;
        state.activeTab = tab;
        save();
        renderShell();
    }

    function readValue(elt) {
        if (elt.type === 'checkbox') return elt.checked;
        if (elt.dataset.num !== undefined) return Number(elt.value);
        return elt.value;
    }

    function onField(e) {
        const elt = e.target;
        const p = P();
        if (elt.dataset.bind) {
            const isText = elt.tagName === 'TEXTAREA' || (elt.tagName === 'INPUT' && elt.type === 'text');
            if (isText && e.type === 'change') {
                // Typed text was already saved on input; refresh the other tabs once the field is left.
                if (elt.dataset.rerender) refresh({ skipSetup: true });
                return;
            }
            if (!isText && e.type === 'input') return;
            setPath(p, elt.dataset.bind, readValue(elt));
            save();
            if (!isText && elt.dataset.rerender) refresh({ skipSetup: elt.dataset.rerender !== 'all' });
            else if (elt.dataset.bind === 'setup.identity') $('#identityLine').textContent = identityLine(p);
            return;
        }
        if (elt.dataset.preset && e.type === 'change') {
            const s = p.setup;
            const k = elt.value;
            if (elt.dataset.preset === 'cue') {
                const pr = D.CUE_PRESETS[k];
                s.cue.type = k;
                if (k !== 'custom') { s.cue.text = pr.text; s.cue.short = pr.short; if (pr.pets) s.cue.pets = pr.pets; }
            } else if (elt.dataset.preset === 'sanctuary') {
                s.sanctuary.type = k;
                if (k !== 'custom') s.sanctuary.name = D.SANCTUARY_PRESETS[k].name;
            } else if (elt.dataset.preset === 'excursion') {
                s.excursion.type = k;
                if (k !== 'custom') s.excursion.spot = D.SPOT_PRESETS[k].spot;
            }
            save();
            refresh();
            return;
        }
        if (elt.dataset.exday !== undefined && e.type === 'change') {
            const i = Number(elt.dataset.exday);
            const days = p.setup.excursion.days.filter((x) => x !== i);
            if (elt.checked) days.push(i);
            p.setup.excursion.days = days.sort((a, b) => a - b);
            save();
            refresh({ skipSetup: true });
            return;
        }
        if (elt.dataset.day) {
            const isText = elt.tagName === 'TEXTAREA' || elt.type === 'text';
            if (isText ? e.type !== 'input' : e.type !== 'change') return;
            day()[elt.dataset.day] = readValue(elt);
            save();
            if (elt.dataset.day === 'dateStr') {
                const span = $('#tab-tracker h2 .muted');
                if (span) span.textContent = `(${elt.value || dayInfo()[state.activeDay - 1].label})`;
            }
            return;
        }
        if (elt.dataset.persist && e.type === 'input') {
            p.persistInputs[elt.dataset.persist] = elt.value;
            save();
            return;
        }
        if (elt.dataset.prep && e.type === 'change') {
            p.prepChecks[elt.dataset.prep] = elt.checked;
            elt.closest('.check-item').classList.toggle('done', elt.checked);
            save();
            updatePrepProgress();
            return;
        }
        if (elt.id === 'masterJournal' && e.type === 'input') {
            p.masterJournal = elt.value;
            save();
        }
    }

    function listAt(path) { return getPath(P().menus, path); }

    function addChip(path) {
        const id = path.replace(/\./g, '-');
        const nameEl = $(`#add-${id}-name`);
        const endEl = $(`#add-${id}-endpoint`);
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) { if (nameEl) nameEl.focus(); return; }
        const list = listAt(path);
        if (path.startsWith('games.')) list.push(name);
        else list.push({ name, endpoint: endEl ? endEl.value.trim() : '' });
        save();
        renderMenus();
        const again = $(`#add-${id}-name`);
        if (again) again.focus();
    }

    function sendToTracker(type, val, endpoint) {
        const d = day();
        const n = state.activeDay;
        const fields = { wakeup: ['wakeupChoice', 'Wake-Up Activity'], discipline: ['disciplineChoice', 'Disciplined Practice'], flow: ['morningFlowChoice', 'Morning Reset/Flow'], afternoon: ['afternoonActivity', 'Afternoon Activity'] };
        const [field, label] = fields[type] || fields.afternoon;
        d[field] = val;
        if (type === 'afternoon' && endpoint !== undefined) d.afternoonEndpoint = endpoint;
        save();
        renderTracker();
        toast(`Added to Day ${n} ${label}!`);
    }

    function scrollToTabs() {
        const bar = $('.binder-tabs');
        if (!bar) return;
        const top = bar.getBoundingClientRect().top + window.scrollY - 90;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' });
    }

    function onClick(e) {
        const a = e.target.closest('[data-action]');
        if (!a) return;
        const p = P();
        const act = a.dataset.action;
        switch (act) {
            case 'tab': switchTab(a.dataset.tab); scrollToTabs(); break;
            case 'mode':
                if (state.mode === a.dataset.mode) break;
                state.mode = a.dataset.mode;
                if (!state.profiles[state.mode]) {
                    state.profiles[state.mode] = normalizeProfile(null, state.mode);
                    state.activeTab = 'tab-setup';
                }
                state.activeDay = 1;
                save();
                refresh();
                toast(state.mode === 'creator' ? 'Showing the Creator\'s Example' : 'Building your own retreat');
                break;
            case 'goto-day':
                state.activeDay = Number(a.dataset.dayNum) || 1;
                state.activeTab = 'tab-tracker';
                save();
                renderTracker();
                renderShell();
                scrollToTabs();
                break;
            case 'weather': {
                const obj = a.dataset.which === 'midday' ? day().middayWeather : day().morningWeather;
                const arr = obj[a.dataset.wkey] || [];
                const i = arr.indexOf(a.dataset.opt);
                if (i >= 0) arr.splice(i, 1); else arr.push(a.dataset.opt);
                obj[a.dataset.wkey] = arr;
                a.setAttribute('aria-pressed', String(i < 0));
                save();
                break;
            }
            case 'rating':
                day().sensoryRating = day().sensoryRating === a.dataset.val ? '' : a.dataset.val;
                save();
                $$('[data-action="rating"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.val === day().sensoryRating)));
                break;
            case 'pick': sendToTracker(a.dataset.pickType, a.dataset.pickVal); break;
            case 'chip-pick': {
                const item = listAt(a.dataset.list)[Number(a.dataset.index)];
                if (a.dataset.kind.startsWith('game:')) {
                    const tier = D.GAME_TIERS.find((t) => t.key === a.dataset.kind.slice(5));
                    sendToTracker('afternoon', `Game: ${item}`, tier ? tier.endpoint : '');
                } else {
                    sendToTracker('afternoon', item.name, item.endpoint || '');
                }
                break;
            }
            case 'chip-remove':
                listAt(a.dataset.list).splice(Number(a.dataset.index), 1);
                save();
                refresh({ skipSetup: true });
                break;
            case 'chip-add': addChip(a.dataset.list); break;
            case 'practice-add':
                p.menus.practices.push({ type: 'Book / Workbook', title: '', endpoint: '', bookmark: '' });
                save();
                renderMenus();
                break;
            case 'practice-remove':
                p.menus.practices.splice(Number(a.dataset.index), 1);
                save();
                renderMenus();
                break;
            case 'practice-send': {
                const r = p.menus.practices[Number(a.dataset.index)];
                if (!r || !r.title) { toast('Give this practice a title first.'); break; }
                sendToTracker('discipline', `${r.title}${r.bookmark ? ` (${r.bookmark})` : ''}${r.endpoint ? ` — ${r.endpoint}` : ''}`);
                break;
            }
            case 'use-exp':
                day().sensoryExp = a.dataset.exp;
                save();
                renderTracker();
                toast(`Selected ${a.dataset.exp.split(':')[0]} for Day ${state.activeDay}!`);
                break;
            case 'prompt-insert': {
                const pr = D.PROMPTS[Number(a.dataset.index)];
                const area = $('#masterJournal');
                const num = visiblePrompts(p).indexOf(pr) + 1;
                const stamp = `\n\n--- Prompt #${num}: ${pr.title} (Day ${state.activeDay}) ---\n"${plain(pr.text)}"\n`;
                area.value = area.value ? area.value + stamp : stamp.trimStart();
                p.masterJournal = area.value;
                save();
                area.focus();
                toast(`Prompt #${num} inserted into your journal`);
                break;
            }
            case 'filter-state': state.decisionFilter = a.dataset.state; renderMenus(); break;
            case 'export': exportJson(); break;
            case 'import': $('#importJsonFile').click(); break;
            case 'reset-prep':
                if (confirm('Reset all Prep-Week checkboxes for this mode?')) { p.prepChecks = {}; save(); renderPrep(); }
                break;
            case 'reset-mode': {
                const label = state.mode === 'creator' ? 'the Creator\'s Example' : 'your own retreat';
                if (!confirm(`Reset ${label} to its starting point? This clears its setup, menus, trackers, and journal. Save a .json backup first if you want to keep anything.`)) break;
                state.profiles[state.mode] = normalizeProfile(null, state.mode);
                state.activeDay = 1;
                save();
                refresh();
                toast('Reset complete');
                break;
            }
            case 'open-print': {
                const dlg = $('#printDialog');
                setPdfStatus('');
                $('#printCopies').value = retreatLength();
                if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
                break;
            }
            case 'do-print': buildPrint(); break;
            case 'do-pdf': buildPdf(); break;
            default: break;
        }
    }

    function exportJson() {
        const { saveLocal, decisionFilter, ...rest } = state; // eslint-disable-line no-unused-vars
        const blob = new Blob([JSON.stringify({ version: 2, ...rest }, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nd-self-retreat-${localDate()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast('Binder backup downloaded');
    }

    function importJson(file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target.result);
                if (!isObj(parsed)) throw new Error('not an object');
                let incoming;
                if (isObj(parsed.profiles)) incoming = parsed;
                else if (parsed.days || parsed.prepChecks || parsed.persistInputs) incoming = migrateLegacy(parsed);
                else throw new Error('unrecognized file');
                const merged = normalizeState({ ...incoming, profiles: { ...state.profiles, ...incoming.profiles } });
                merged.saveLocal = state.saveLocal;
                state = merged;
                save();
                refresh();
                toast('Binder backup restored');
            } catch (err) {
                alert('That file doesn\'t look like an ND Self-Retreat Builder backup (.json).');
            }
        };
        reader.readAsText(file);
    }

    function onSaveToggle(e) {
        if (e.target.checked) {
            state.saveLocal = true;
            try { localStorage.setItem(SAVE_FLAG_KEY, 'true'); } catch (err) { /* storage unavailable */ }
            save();
            toast('Saving in this browser');
        } else {
            if (!confirm('Turn off browser saving? This erases the retreat entries stored on this device (including the original binder\'s saved data). Your entries stay on screen until you leave or refresh. Save a .json backup first if you want to keep them.')) {
                e.target.checked = true;
                return;
            }
            state.saveLocal = false;
            try {
                localStorage.setItem(SAVE_FLAG_KEY, 'false');
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(LEGACY_KEY);
            } catch (err) { /* storage unavailable */ }
            toast('Browser saving is off');
        }
        updateSaveBadge();
    }

    // ---------- Printable binder ----------
    const PRINT_CSS = `
        @page { margin: 0.55in; }
        * { box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; color: #000; background: #fff; font-size: 10pt; line-height: 1.4; margin: 0; }
        .page { page-break-after: always; break-after: page; }
        .page:last-child { page-break-after: auto; break-after: auto; }
        h1 { font-size: 20pt; text-align: center; margin: 0 0 12px 0; }
        h2 { font-size: 14pt; margin: 16px 0 6px 0; }
        h3 { font-size: 11.5pt; margin: 12px 0 4px 0; }
        p { margin: 4px 0 8px 0; }
        ul, ol { margin: 2px 0 8px 0; padding-left: 20px; }
        li { margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0 12px 0; page-break-inside: auto; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        th, td { border: 1px solid #333; padding: 5px 7px; text-align: left; vertical-align: top; }
        th { background: #eee; }
        td ul { margin: 0; padding-left: 14px; }
        .box { display: inline-block; width: 11px; height: 11px; border: 1px solid #000; margin-right: 6px; vertical-align: -1px; text-align: center; font-size: 9px; line-height: 10px; }
        .check { margin: 3px 0 3px 4px; }
        .circled { border: 1.5px solid #000; border-radius: 10px; padding: 0 5px; font-weight: bold; }
        .sep { color: #777; padding: 0 4px; }
        .line { border-bottom: 1px solid #555; height: 22px; }
        .fill { border-bottom: 1px solid #555; min-height: 22px; padding: 3px 2px; white-space: pre-wrap; }
        .note { color: #333; font-style: italic; }
        .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .hdr td { width: 50%; }
        .small { font-size: 9pt; }
        .muted { color: #444; }
        .sub-block { border: 1px solid #999; padding: 6px 9px; margin: 6px 0; break-inside: avoid; page-break-inside: avoid; }
        .sub-block h4 { margin: 0 0 4px 0; }
        .tracker h1 { font-size: 17pt; margin-bottom: 8px; }
        .tracker h2 { font-size: 12.5pt; margin: 10px 0 4px 0; }
        .tracker h3 { margin: 8px 0 3px 0; }
        .tracker p { margin: 3px 0 0 0; }
        .tracker table { margin: 4px 0 6px 0; }
        .tracker th, .tracker td { padding: 4px 7px; }
        .tracker .line { height: 20px; }
        .evening-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .rhythm-grid { display: block; }
        .rhythm-card { margin-bottom: 8px; }
        .rhythm-card h3 { margin-top: 10px; }
        .print-bar { position: sticky; top: 0; background: #f4f4f4; border-bottom: 1px solid #ccc; padding: 8px 12px; font-family: Arial, sans-serif; }
        @media print { .print-bar { display: none; } }
    `;

    const box = (on) => `<span class="box">${on ? '✓' : ''}</span>`;
    const lines = (n) => '<div class="line"></div>'.repeat(n);
    const fillOrLines = (val, n) => (val ? `<div class="fill">${esc(val)}</div>${lines(Math.max(0, n - Math.ceil(String(val).length / 95) - 1))}` : lines(n));
    const optRow = (opts, sel, filled) => opts.map((o) => (filled && sel.includes(o) ? `<span class="circled">${esc(o)}</span>` : esc(o))).join('<span class="sep">|</span>');

    function printToc(p, c) {
        const n = p.setup.length;
        const focus = D.FOCUS[p.setup.focus] || D.FOCUS.auditory;
        return `<section class="page"><h1>Table of Contents</h1>
        <p style="text-align:center"><strong>${esc(identityLine(p))}</strong></p>
        <table><thead><tr><th>Binder Section / Tab</th><th>Document / Section Title</th><th>When to Use It</th></tr></thead><tbody>
            <tr><td><strong>Front Inside Pocket</strong></td><td>Prep-Week Master Guide &amp; Checklists</td><td>Complete during prep week (before Day 1).</td></tr>
            <tr><td><strong>Page 1: Front Cover</strong></td><td>• Table of Contents<br>• Weekly Agenda Overview</td><td>Quick orientation for the retreat.</td></tr>
            <tr><td><strong>Tab 1: TODAY'S TRACKER</strong></td><td>• Daily Retreat Anchor Tracker (${n} copies)</td><td>Fill out 1 sheet daily at ${esc(c.a1)}, ${esc(c.a2)}, &amp; ${esc(c.a3)}.</td></tr>
            <tr><td><strong>Tab 2: DAILY RHYTHM &amp; MORNINGS</strong></td><td>• Page A: Daily Rhythm &amp; 3 Anchors<br>• Page B: Morning Wake-Up Activity Menu</td><td>Use during the ${esc(c.a1)} anchor with your ${esc(c.drink)}.</td></tr>
            <tr><td><strong>Tab 3: ACTIVITY MENUS</strong></td><td>• Page A: Activity Decision Table<br>• Page B: Books, Crafts &amp; Projects Menu<br>• Page C: Game &amp; Media Menu</td><td>Reference during open morning &amp; afternoon blocks.</td></tr>
            <tr><td><strong>Tab 4: SENSORY &amp; JOURNALING</strong></td><td>• Page A: Sensory Lab Menu &amp; ${esc(focus.kitTitle.replace(/^The /, ''))}<br>• Page B: Journal Prompts + Lined Paper</td><td>Use after ${esc(c.a3)} for evening wind-down.</td></tr>
        </tbody></table>
        <h2>Retreat Agenda Overview</h2>
        <p>Every full retreat day has <strong>3 Core Anchors (${esc(c.a1)}, ${esc(c.a2)}, &amp; ${esc(c.a3)})</strong>, with full permission to adjust based on your nervous system.</p>
        ${agendaTable('print')}</section>`;
    }

    function printChecks(items, p, c, filled) {
        return items.map((it) => {
            const label = html(it.t, it.vars ? { ...c, ...it.vars } : c);
            return `<div class="check">${box(filled && p.prepChecks[it.id])}${label}</div>`;
        }).join('');
    }

    function printPrep(p, c, filled) {
        const shop = shoppingGroups(p);
        const focus = D.FOCUS[p.setup.focus] || D.FOCUS.auditory;
        return `<section class="page"><h1>Prep-Week Master Guide &amp; Checklists</h1>
        <h2>Section 1: Master Prep-Week Setup Checklist</h2>
        ${prepGroups(p).map((g) => `<h3>${esc(g.title)}</h3>${g.note ? `<p class="note">${html(g.note, c)}</p>` : ''}${printChecks(g.items, p, c, filled)}`).join('')}
        <h2>Section 2: Master Shopping &amp; Household Gather Lists</h2>
        <div class="two">${shop.map((g) => `<div><h3>${esc(g.title)}</h3>${printChecks(g.items, p, c, filled)}</div>`).join('')}</div>
        <h2>Section 3: ${esc(focus.kitTitle)}</h2>
        <p>${html(focus.kitNote, c)}</p>
        <ol>${focus.kit.map((k) => `<li><strong>${esc(k.name)}:</strong> ${html(k.desc, c)}</li>`).join('')}</ol>
        <h2>Section 4: Phone "Retreat DND" Setup Checklist</h2>
        ${printChecks(phoneSteps(p), p, c, filled)}
        <h2>Section 5: Communication Boundary Review</h2>
        <p class="note">${flags(p).checkin ? `Review these points with ${esc(c.who)} before Day 1:` : 'Share these points with anyone who needs to know before Day 1:'}</p>
        <ul>${boundaryBullets(p).map((b) => `<li>${b.user ? esc(b.t) : html(b.t, c)}</li>`).join('')}</ul></section>`;
    }

    function printWakeup(p, c, filled) {
        const pi = p.persistInputs;
        const q = (k) => (filled && pi[k] ? `<div class="fill">${esc(pi[k])}</div>` : '<div class="line"></div>');
        return `<section class="page"><h1>Morning Wake-Up Activity Menu</h1>
        <p>During Anchor 1, match your current morning energy level to the left column and pick <strong>one Wake-Up Activity</strong> to help your brain transition into the day before you start your Disciplined Retreat Practice.</p>
        <h2>Guardrails So Wake-Up Activities Transition Smoothly</h2>
        <ul>${D.GUARDRAILS.filter((g) => shown(g, p)).map((g) => `<li>${html(g.t, c)}</li>`).join('')}</ul>
        <h3>Morning Wake-Up YouTube Queue (save to a private "Retreat Morning" playlist)</h3>
        <div class="two"><div><p>Cozy / low-stimulation videos (Level 1 exhausted mornings):</p>${q('yt_cozy_1')}${q('yt_cozy_2')}${q('yt_cozy_3')}</div>
        <div><p>Interesting topic / deep-dive videos (Level 4 wired mornings):</p>${q('yt_wired_1')}${q('yt_wired_2')}${q('yt_wired_3')}</div></div>
        <h2>Wake-Up Activity Decision Matrix (By Energy Level)</h2>${wakeupTable('print')}</section>`;
    }

    function printDecision(p, c) {
        let lastCat = null;
        const exps = experimentsSorted(p).map((e) => {
            const head = e.cat !== lastCat ? `</ul><h3>${esc(D.EXP_CATS[e.cat])}</h3><ul>` : '';
            lastCat = e.cat;
            return `${head}<li><strong>Experiment ${esc(e.id)} (${esc(e.title)}):</strong> ${html(e.desc, c)}</li>`;
        }).join('');
        const focus = D.FOCUS[p.setup.focus] || D.FOCUS.auditory;
        return `<section class="page"><h1>The Activity Decision Table</h1>
        <p>When you feel decision fatigue, find your current internal state (left column) and choose <strong>one</strong>.</p>
        ${decisionTable('print')}
        <h1 style="margin-top:22px">Sensory Lab Experiment Menu</h1>
        <p>Pick <strong>one experiment per day</strong> to gather data on your nervous system. Rate each from <strong>-2 Draining/Agitating</strong> to <strong>+2 Deeply Soothing</strong>, with <strong>0 Felt Nothing / Numb</strong>.</p>
        <ul>${exps}</ul>
        <h3>Quick Reference: ${esc(focus.kitTitle)}</h3>
        <ul>${focus.kit.map((k) => `<li><strong>${esc(k.name)}:</strong> ${html(k.desc, c)}</li>`).join('')}</ul></section>`;
    }

    function printRhythm(p) {
        return `<section class="page"><h1>Daily Rhythm &amp; The 3 Anchors</h1>
        <p>No rigid schedules on this retreat. There are three touchpoints a day, each linked to feeding your body. Everything in between is guided by how your nervous system feels.</p>
        ${rhythmHtml(p).replace(/<span class="nt-badge[^>]*>.*?<\/span>/g, '')}</section>`;
    }

    function printMenus(p, c, filled) {
        const m = p.menus;
        const pi = p.persistInputs;
        const prompts = visiblePrompts(p);
        const practiceRows = m.practices.map((r) => `<tr><td>${esc(r.type)}</td><td>${esc(r.title) || '&nbsp;'}</td><td>${filled && r.bookmark ? esc(r.bookmark) : '____________'}</td><td>${esc(r.endpoint)}</td></tr>`).join('');
        const blankRows = '<tr><td>&nbsp;</td><td></td><td></td><td></td></tr>'.repeat(2);
        const bin = (i) => (filled && pi[`bin_${i}`] ? esc(pi[`bin_${i}`]) : '________________________');
        return `<section class="page"><h1>Books, Crafts &amp; Projects Menu</h1>
        <p>Instead of jarring timers that interrupt flow and leave open mental loops, choose a <strong>natural closed-loop endpoint</strong> before you begin, or stop whenever your stamina, motivation, or dopamine shifts.</p>
        <h2>Disciplined Retreat Practices (Therapy, Yoga, Meditation &amp; Research Reading)</h2>
        <table><thead><tr><th>Type</th><th>Your Pre-Curated Option</th><th>Page / Bookmark</th><th>Natural Endpoint</th></tr></thead><tbody>${practiceRows}${blankRows}</tbody></table>
        <div class="two">
            <div><h2>Fine Art &amp; Tactile Crafts</h2><table><thead><tr><th>Craft</th><th>Natural Endpoint</th></tr></thead><tbody>${m.crafts.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.endpoint)}</td></tr>`).join('')}<tr><td>&nbsp;</td><td></td></tr></tbody></table></div>
            <div><h2>Meaningful Gifting, Data &amp; Organization Projects</h2><table><thead><tr><th>Project</th><th>Natural Endpoint</th></tr></thead><tbody>${m.projects.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.endpoint)}</td></tr>`).join('')}<tr><td>&nbsp;</td><td></td></tr></tbody></table>
            <p><em>Tiny organization drawer/bin pre-selection:</em><br>• Bin #1: ${bin(1)}<br>• Bin #2: ${bin(2)}<br>• Bin #3: ${bin(3)}</p></div>
        </div>
        <h1 style="margin-top:22px">Game &amp; Media Menu</h1>
        <p>Pick a game based on what your brain needs right now, and use a <strong>natural in-game closed loop</strong> to wrap up.</p>
        <table><thead><tr><th>Nervous System State</th><th>Best Matches from Your Library</th><th>Natural In-Game "Closed Loop"</th></tr></thead><tbody>
        ${D.GAME_TIERS.map((t) => `<tr><td><strong>${esc(t.state)}</strong></td><td>${(m.games[t.key] || []).length ? `<ul>${m.games[t.key].map((g) => `<li><em>${esc(g)}</em></li>`).join('')}</ul>` : '<div class="line"></div><div class="line"></div>'}</td><td>${esc(t.endpoint)}</td></tr>`).join('')}
        </tbody></table>
        <h1 style="margin-top:22px">Journal Prompts</h1>
        <p>When you journal during a Disciplined Retreat Block or Anchor 3, pick whichever prompt speaks to you:</p>
        <ol>${prompts.map((pr) => `<li><strong>${esc(pr.title)}:</strong> <em>"${html(pr.text, c)}"</em></li>`).join('')}</ol></section>`;
    }

    function printTracker(p, c, num, filled) {
        const f = flags(p);
        const n = p.setup.length;
        const d = filled ? day(num) : createEmptyDay();
        const info = num ? dayInfo(p)[num - 1] : null;
        const mv = movementSummary(p);
        const dayCircle = Array.from({ length: n }, (_, i) => (filled && num === i + 1 ? `<span class="circled">Day ${i + 1}</span>` : `Day ${i + 1}`)).join('<span class="sep">|</span>');
        const wTable = (rows, obj) => `<table>${rows.map((r) => `<tr><td style="width:30%"><strong>${esc(r.label)}</strong></td><td>${optRow(r.options, (obj[r.key] || []), filled)}</td></tr>`).join('')}</table>`;
        const ln = (v) => (v ? `<div class="fill">${esc(v)}</div>` : '<div class="line"></div>');
        const ratingRow = [['-2', 'Agitating'], ['-1', 'Draining'], ['0', 'Numb/Neutral'], ['+1', 'Helpful'], ['+2', 'Deeply Soothing']]
            .map(([v, l]) => (filled && d.sensoryRating === v ? `<span class="circled">${v} ${l}</span>` : `<strong>${v}</strong> ${l}`)).join('<span class="sep">|</span>');
        return `<section class="page tracker"><h1>Daily Retreat Anchor &amp; Body Weather Tracker</h1>
        <table class="hdr"><tr><td><strong>RETREAT DAY (Circle):</strong><br>${dayCircle}</td><td><strong>DAY OF WEEK:</strong><br>${filled ? esc(d.dateStr || (info && info.label)) : '<div class="line"></div>'}</td></tr></table>
        <h2>ANCHOR 1: ${esc(c.a1)} — ${esc(c.cueShort)}, ${esc(c.DrinkT)} + Food at ${esc(c.home)}</h2>
        <div class="check">${box(d.catOut)}${esc(c.cue)} &nbsp;&nbsp;&nbsp; ${box(d.coffeeFood)}${esc(c.Drink)} + Food</div>
        <h3>Morning Body Weather Check <span class="small">(Circle All That Apply)</span></h3>
        ${wTable(morningRows(p), d.morningWeather)}
        <h3>My Intentional Choices for This Morning <span class="small">(Pick from Tab 2 (Wake-Up Menu) &amp; Tab 3 (Activity Menus))</span></h3>
        <p><strong>1. Wake-Up Activity (from Wake-Up Menu):</strong></p>${ln(d.wakeupChoice)}
        <p><strong>2. 1 Disciplined Retreat Practice (Yoga, Meditation, Therapy Workbook, Self-Help):</strong></p>${ln(d.disciplineChoice)}
        <p><strong>3. Morning Sensory Reset${f.excursion ? `, Excursion (${esc(c.excursionDays)} ${esc(c.excursionTime)})` : ''}, or Contained Flow Activity:</strong></p>${ln(d.morningFlowChoice)}
        <h2>ANCHOR 2: ${esc(c.a2)} — Healthy Container Meal &amp; Body Support</h2>
        <div class="check">${box(d.lunchEaten)}Ate a healthy premade container meal${f.rescue ? ` (used ${esc(c.rescueShort)} rescue first if nauseous)` : ''}</div>
        <div class="check">${box(d.lunchDishwasher)}Placed the empty container straight into the dishwasher (zero visual clutter)</div>
        <div class="check">${box(d.ptDone)}${esc(mv.label)}</div>
        <h3>Midday Body Weather Check <span class="small">(Circle All That Apply)</span></h3>
        ${wTable(middayRows(p), d.middayWeather)}
        <h3>My Intentional Choice for This Afternoon</h3>
        <p>${box(filled && d.afternoonActivity)}Afternoon Activity:</p>${ln(d.afternoonActivity)}
        <p>${box(filled && d.afternoonEndpoint)}My natural closed-loop endpoint for this activity is:</p>${ln(d.afternoonEndpoint)}
        <h2 style="page-break-before:always; break-before:page">ANCHOR 3: ${esc(c.a3)} — Dinner${f.checkin ? ', Check-In Window' : ''} &amp; Evening Log</h2>
        <div class="check">${box(d.dinnerDishwasher)}Ate dinner from a container and placed the dish straight into the dishwasher</div>
        ${f.checkin ? `<div class="check">${box(d.spouseWindow)}<strong>${esc(c.window)}:</strong> Checked in with ${esc(c.who)} → Turned Retreat DND back ON → Returned phone to parking spot</div>` : ''}
        <div class="check">${box(d.coffeePrepped)}Prepped my ${esc(c.drink)} and set out morning fuel for ${esc(c.a1)} tomorrow</div>
        <h3>Today's Sensory Lab Experiment Log</h3>
        <table><tr><td style="width:24%"><strong>Experiment Tested</strong></td><td>${esc(d.sensoryExp) || '&nbsp;'}</td></tr>
        <tr><td><strong>Sensory Rating</strong></td><td>${ratingRow}</td></tr>
        <tr><td><strong>Data Observation</strong></td><td style="height:${d.sensoryObs ? 'auto' : '52px'}">${d.sensoryObs ? esc(d.sensoryObs) : '<span class="muted">What did my body / senses / breath do?</span>'}</td></tr></table>
        <h3>Evening Reflection Prompts <span class="small"><em>(Write below or on blank binder pages)</em></span></h3>
        <p><strong>Unmasking &amp; Nervous System Observations</strong> (or pick from the Journal Prompt page): <em>"What did my body, brain, or energy do today with zero external expectations?"</em></p>${fillOrLines(d.eveningUnmasking, 6)}
        <p><strong>Listening &amp; Self-Trust Win:</strong> <em>Where did I successfully listen to a body cue, honor a sensory need, or gently hold a boundary for myself today?</em></p>${fillOrLines(d.eveningWin, 6)}
        <p><strong>Other Notes:</strong></p>${fillOrLines(d.eveningOther, 6)}</section>`;
    }

    function printJournal(p, pages, filled) {
        const text = filled && p.masterJournal ? `<div class="fill" style="border:none">${esc(p.masterJournal)}</div>` : '';
        return Array.from({ length: pages }, (_, i) => `<section class="page"><h2>Retreat Journal ${pages > 1 ? `(page ${i + 1})` : ''}</h2>${i === 0 ? text : ''}${lines(text && i === 0 ? 18 : 30)}</section>`).join('');
    }

    function collectPrintParts() {
        const p = P();
        const c = ctx(p);
        const sections = $$('input[name="printSection"]:checked').map((x) => x.value);
        const filled = ($('input[name="printFill"]:checked') || {}).value === 'filled';
        const copies = Math.min(14, Math.max(1, Number($('#printCopies').value) || p.setup.length));
        const journalPages = Math.min(20, Math.max(1, Number($('#printJournalPages').value) || 1));
        if (!sections.length) { alert('Pick at least one page for your binder.'); return null; }
        const parts = [];
        if (sections.includes('toc')) parts.push(printToc(p, c));
        if (sections.includes('prep')) parts.push(printPrep(p, c, filled));
        if (sections.includes('rhythm')) parts.push(printRhythm(p));
        if (sections.includes('wakeup')) parts.push(printWakeup(p, c, filled));
        if (sections.includes('decision')) parts.push(printDecision(p, c));
        if (sections.includes('menus')) parts.push(printMenus(p, c, filled));
        if (sections.includes('trackers')) {
            if (filled) for (let i = 1; i <= p.setup.length; i++) parts.push(printTracker(p, c, i, true));
            else for (let i = 0; i < copies; i++) parts.push(printTracker(p, c, null, false));
        }
        if (sections.includes('journal')) parts.push(printJournal(p, journalPages, filled));
        return { p, parts };
    }

    // Secondary option: a plain print view for people who prefer the browser's own print dialog.
    function buildPrint() {
        const job = collectPrintParts();
        if (!job) return;
        const win = window.open('', '_blank');
        if (!win) { alert('Your browser blocked the print window. Allow pop-ups for this site, or use Download PDF instead.'); return; }
        win.document.write(`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${esc(identityLine(job.p))}: Retreat Binder</title><style>${PRINT_CSS}</style></head><body>
            <div class="print-bar">Your binder is ready to print. <button onclick="window.print()">Print</button></div>
            ${job.parts.join('')}</body></html>`);
        win.document.close();
        $('#printDialog').close();
        setTimeout(() => { win.focus(); win.print(); }, 350);
    }

    // ---------- Direct PDF download (html2pdf.js, loaded only when needed) ----------
    const HTML2PDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
    const HTML2PDF_SRI = 'sha384-Yv5O+t3uE3hunW8uyrbpPW3iw6/5/Y7HitWJBLgqfMoA36NogMmy+8wWZMpn3HWc';
    let html2pdfLoading = null;
    function loadHtml2pdf() {
        if (window.html2pdf) return Promise.resolve(window.html2pdf);
        if (!html2pdfLoading) {
            html2pdfLoading = new Promise((resolve, reject) => {
                const tag = document.createElement('script');
                tag.src = HTML2PDF_SRC;
                tag.integrity = HTML2PDF_SRI;
                tag.crossOrigin = 'anonymous';
                tag.referrerPolicy = 'no-referrer';
                tag.onload = () => (window.html2pdf ? resolve(window.html2pdf) : reject(new Error('html2pdf missing')));
                tag.onerror = () => {
                    html2pdfLoading = null;
                    tag.parentNode.removeChild(tag);
                    reject(new Error('Could not load the PDF maker'));
                };
                document.head.appendChild(tag);
            });
        }
        return html2pdfLoading;
    }

    // Reuse the print stylesheet, scoped to .pdf-root so it can't touch the page around it.
    function scopedPdfCss() {
        const css = PRINT_CSS
            .replace(/@page\s*\{[^}]*\}/g, '')
            .replace(/@media print\s*\{[^{}]*\{[^}]*\}\s*\}/g, '');
        const scoped = css.replace(/([^{}]+)\{([^}]*)\}/g, (m, sel, body) => {
            const list = sel.split(',').map((x) => x.trim()).filter(Boolean).map((x) => {
                if (x === 'body') return '.pdf-root';
                if (x === '*') return '.pdf-root *';
                return `.pdf-root ${x}`;
            });
            return `${list.join(', ')} {${body}}\n`;
        });
        return `${scoped}
            .pdf-root { width: 7.4in; background: #fff !important; color: #000 !important; font-family: Arial, Helvetica, sans-serif; }
            .pdf-root :is(h1, h2, h3, h4, p, li, td, th, strong, em, span, div, ol, ul) { color: #000 !important; }
            .pdf-root .muted, .pdf-root .note { color: #333 !important; }
            .pdf-root .page { page-break-after: auto; break-after: auto; padding-bottom: 4px; }
            .pdf-root .print-bar { display: none; }
            /* Undo on-screen binder card styles that share class names with the print layout */
            .pdf-root :is(.rhythm-grid, .rhythm-card, .subpanel) { display: block; padding: 0; margin: 0 0 8px 0; border: none; border-radius: 0; background: none !important; backdrop-filter: none; font-size: inherit; }
            .pdf-root .sub-block { border: 1px solid #999; border-radius: 0; background: none !important; padding: 6px 9px; }
            .pdf-root .evening-modes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .pdf-root .rhythm-card h3 { color: #000 !important; font-size: 11.5pt; }`;
    }

    function setPdfStatus(msg) {
        const elt = $('#pdfStatus');
        if (elt) elt.textContent = msg;
    }

    async function buildPdf() {
        const job = collectPrintParts();
        if (!job) return;
        const buttons = $$('#printDialog .dialog-actions button');
        buttons.forEach((b) => { b.disabled = true; });
        setPdfStatus('Loading the PDF maker…');
        let host = null;
        let style = null;
        try {
            const html2pdf = await loadHtml2pdf();
            style = document.createElement('style');
            style.textContent = scopedPdfCss();
            document.head.appendChild(style);
            host = document.createElement('div');
            host.setAttribute('aria-hidden', 'true');
            host.style.cssText = 'position:fixed; left:-10000px; top:0;';
            // Each section gets its own .pdf-root wrapper, because html2pdf copies the
            // element it renders and the scoped styles have to travel with it.
            host.innerHTML = job.parts.map((part) => `<div class="pdf-root">${part}</div>`).join('');
            document.body.appendChild(host);
            const sections = $$('.pdf-root', host);
            const opt = {
                margin: 0.55,
                image: { type: 'jpeg', quality: 0.88 },
                html2canvas: { scale: 1.6, backgroundColor: '#ffffff', logging: false },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait', compress: true },
                pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.check', '.sub-block', 'li', 'h2', 'h3', '.line', '.fill'] }
            };
            // One section at a time keeps each canvas well under browser size limits.
            let worker = html2pdf().set(opt).from(sections[0]).toPdf();
            sections.slice(1).forEach((sec, i) => {
                worker = worker
                    .then(() => setPdfStatus(`Building section ${i + 2} of ${sections.length}…`))
                    .get('pdf').then((pdf) => { pdf.addPage(); })
                    .from(sec).toContainer().toCanvas().toPdf();
            });
            setPdfStatus(`Building section 1 of ${sections.length}…`);
            await worker.save(`nd-self-retreat-binder-${localDate()}.pdf`);
            setPdfStatus('');
            $('#printDialog').close();
            toast('Your binder PDF downloaded');
        } catch (err) {
            console.warn('PDF build failed', err);
            setPdfStatus('The PDF couldn\'t be made. The PDF maker loads from the internet, so check your connection and try again, or use "Open print view" instead.');
        } finally {
            if (host) host.parentNode.removeChild(host);
            if (style) style.parentNode.removeChild(style);
            buttons.forEach((b) => { b.disabled = false; });
        }
    }

    // ---------- Boot ----------
    function init() {
        state = loadState();
        document.addEventListener('input', onField);
        document.addEventListener('change', (e) => {
            if (e.target.id === 'saveLocalToggle') { onSaveToggle(e); return; }
            if (e.target.id === 'importJsonFile') {
                if (e.target.files[0]) importJson(e.target.files[0]);
                e.target.value = '';
                return;
            }
            onField(e);
        });
        document.addEventListener('click', onClick);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enterAdd) { e.preventDefault(); addChip(e.target.dataset.enterAdd); }
            if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('clickable-row')) { e.preventDefault(); switchTab(e.target.dataset.tab); }
        });
        refresh();
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
