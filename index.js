const MODULE = 'quick_placeholder_switcher';
const defaults = { savedCombos: [] };

function ctx() { return SillyTavern.getContext(); }
function settings() {
    const s = ctx().extensionSettings;
    if (!s[MODULE]) s[MODULE] = structuredClone(defaults);
    if (!Array.isArray(s[MODULE].savedCombos)) s[MODULE].savedCombos = [];
    return s[MODULE];
}
function state() {
    const meta = ctx().chatMetadata;
    if (!meta[MODULE]) meta[MODULE] = {};
    return meta[MODULE];
}
function currentCharacterName() {
    const c = ctx();
    const st = state();
    if (st.charName) return st.charName;
    return c.name1 || '';
}
function currentUserName() {
    const c = ctx();
    const st = state();
    if (st.userName) return st.userName;
    return c.name2 || '';
}

function registerMacros() {
    const macros = ctx().macros;
    if (!macros?.register) return;
    // Replace the built-in placeholder handlers for this extension session.
    macros.register('char', {
        description: 'Current character placeholder, optionally overridden by Quick Placeholder Switcher',
        handler: () => currentCharacterName(),
    });
    macros.register('user', {
        description: 'Current user placeholder, optionally overridden by Quick Placeholder Switcher',
        handler: () => currentUserName(),
    });
}

function personaOptions() {
    const select = document.querySelector('#persona_name');
    if (select && select.options?.length) {
        return [...select.options].map(o => ({ value: o.value, label: o.textContent.trim() })).filter(o => o.value && o.label);
    }
    const name = ctx().name2 || '';
    return name ? [{ value: name, label: name }] : [];
}
function characterOptions() {
    const c = ctx();
    const list = [];
    (c.characters || []).forEach((ch, i) => {
        const name = ch?.name || ch?.data?.name;
        if (name) list.push({ value: name, label: name });
    });
    // Group chats may contain members not represented by the main character list.
    (c.groups || []).forEach?.(g => (g.members || []).forEach(m => {
        const name = typeof m === 'string' ? m : (m?.name || m?.char_name);
        if (name && !list.some(x => x.value === name)) list.push({ value: name, label: name });
    }));
    return [...new Map(list.map(x => [x.value, x])).values()];
}
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}
function selectHtml(id, options, selected, emptyLabel) {
    const rows = options.map(o => `<option value="${escapeHtml(o.value)}" ${o.value === selected ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('');
    return `<select id="${id}" class="text_pole"><option value="">${emptyLabel}</option>${rows}</select>`;
}
function render() {
    const host = document.getElementById('extensions_settings2');
    if (!host || document.getElementById(`${MODULE}_panel`)) return;
    host.insertAdjacentHTML('beforeend', `
      <div id="${MODULE}_panel" class="extension_settings">
        <div class="inline-drawer">
          <div class="inline-drawer-toggle inline-drawer-header"><b>Quick Placeholder Switcher</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
          <div class="inline-drawer-content">
            <div class="qps-current">
              <div><small>{{char}}</small><strong id="${MODULE}_current_char"></strong></div>
              <div><small>{{user}}</small><strong id="${MODULE}_current_user"></strong></div>
            </div>
            <label>캐릭터 선택</label>
            ${selectHtml(`${MODULE}_char`, characterOptions(), currentCharacterName(), '기본 캐릭터 사용')}
            <label>사용자 선택</label>
            ${selectHtml(`${MODULE}_user`, personaOptions(), currentUserName(), '기본 사용자 사용')}
            <div class="qps-actions"><button id="${MODULE}_apply" class="menu_button">적용</button><button id="${MODULE}_reset" class="menu_button">기본값으로</button></div>
            <hr>
            <label>저장된 조합</label>
            <div class="qps-save-row"><input id="${MODULE}_combo_name" class="text_pole" type="text" placeholder="조합 이름"><button id="${MODULE}_save" class="menu_button">저장</button></div>
            <div id="${MODULE}_combos"></div>
          </div>
        </div>
      </div>`);
    document.getElementById(`${MODULE}_apply`).addEventListener('click', applySelection);
    document.getElementById(`${MODULE}_reset`).addEventListener('click', resetSelection);
    document.getElementById(`${MODULE}_save`).addEventListener('click', saveCombo);
    refresh();
}
function refresh() {
    const char = document.getElementById(`${MODULE}_current_char`);
    if (!char) return;
    const csel = document.getElementById(`${MODULE}_char`);
    const usel = document.getElementById(`${MODULE}_user`);
    if (csel) csel.value = state().charName || '';
    if (usel) usel.value = state().userName || '';
    char.textContent = currentCharacterName() || '(기본값)';
    document.getElementById(`${MODULE}_current_user`).textContent = currentUserName() || '(기본값)';
    const list = document.getElementById(`${MODULE}_combos`);
    list.innerHTML = '';
    settings().savedCombos.forEach((combo, index) => {
        const row = document.createElement('div');
        row.className = 'qps-combo';
        const label = document.createElement('span');
        label.textContent = `${combo.name} — ${combo.charName || '기본 캐릭터'} / ${combo.userName || '기본 사용자'}`;
        const load = document.createElement('button');
        load.className = 'menu_button'; load.textContent = '불러오기';
        load.addEventListener('click', () => { state().charName = combo.charName || ''; state().userName = combo.userName || ''; persistChat(); refresh(); });
        const del = document.createElement('button');
        del.className = 'menu_button'; del.textContent = '삭제';
        del.addEventListener('click', () => { settings().savedCombos.splice(index, 1); ctx().saveSettingsDebounced(); refresh(); });
        row.append(label, load, del); list.append(row);
    });
}
function persistChat() {
    const save = ctx().saveMetadata;
    if (typeof save === 'function') save();
}
function applySelection() {
    const char = document.getElementById(`${MODULE}_char`).value;
    const user = document.getElementById(`${MODULE}_user`).value;
    state().charName = char;
    state().userName = user;
    persistChat(); refresh();
}
function resetSelection() {
    delete state().charName; delete state().userName;
    persistChat(); refresh();
}
function saveCombo() {
    const name = document.getElementById(`${MODULE}_combo_name`).value.trim();
    if (!name) return;
    const charName = document.getElementById(`${MODULE}_char`).value;
    const userName = document.getElementById(`${MODULE}_user`).value;
    const saved = settings().savedCombos;
    const existing = saved.findIndex(x => x.name === name);
    const item = { name, charName, userName };
    if (existing >= 0) saved[existing] = item; else saved.push(item);
    ctx().saveSettingsDebounced();
    document.getElementById(`${MODULE}_combo_name`).value = '';
    refresh();
}

function init() {
    settings();
    registerMacros();
    render();
    const { eventSource, event_types } = ctx();
    if (eventSource && event_types) {
        eventSource.on(event_types.APP_READY, render);
        eventSource.on(event_types.CHAT_CHANGED, () => { registerMacros(); refresh(); });
        eventSource.on(event_types.GROUP_UPDATED, refresh);
    }
    console.log('[Quick Placeholder Switcher] Loaded');
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
