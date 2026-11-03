// index.js
import { extension_settings, renderExtensionTemplateAsync } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';
import { getCurrentChatId } from '../../../../script.js';

const MODULE_NAME = 'temp_char_user_override';
const DEFAULT_SETTINGS = {
    currentChar: '',
    currentUser: '',
    presets: {} // { "프리셋이름": { char: "...", user: "..." } }
};

// 설정 로드
function loadSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = { ...DEFAULT_SETTINGS };
    }
}

// 매크로 가로채기 (SillyTavern 치환 이벤트 hook)
function registerMacroOverride() {
    if (window.SillyTavern && window.SillyTavern.getContext) {
        const context = window.SillyTavern.getContext();
        if (context.eventSource && context.event_types) {
            // 메시지 전송 및 프롬프트 빌드 시 치환 처리
            context.eventSource.on(context.event_types.CHAT_COMPLETION_PROMPT_READY, (data) => {
                const settings = extension_settings[MODULE_NAME];
                if (!data) return;

                // char 오버라이드
                if (settings.currentChar) {
                    data.char = settings.currentChar;
                }
                // user 오버라이드
                if (settings.currentUser) {
                    data.user = settings.currentUser;
                }
            });
        }
    }
}

// UI 렌더링 및 이벤트 바인딩
function buildUI() {
    const container = document.createElement('div');
    container.className = 'temp-override-container';

    container.innerHTML = `
        <h4>임시 {{char}} / {{user}} 변경</h4>
        <div class="temp-override-status" id="temp-override-status-text">
            현재 상태: 기본값 사용 중
        </div>
        
        <div class="temp-override-input-group">
            <label for="temp-override-char">{{char}}:</label>
            <input type="text" id="temp-override-char" class="text_box" placeholder="임시 char 이름">
        </div>
        
        <div class="temp-override-input-group">
            <label for="temp-override-user">{{user}}:</label>
            <input type="text" id="temp-override-user" class="text_box" placeholder="임시 user 이름">
        </div>

        <div style="display: flex; gap: 5px; margin-top: 5px;">
            <button id="temp-override-apply-btn" class="menu_button">적용</button>
            <button id="temp-override-reset-btn" class="menu_button">초기화</button>
        </div>

        <hr style="margin: 8px 0; border: 0; border-top: 1px solid #444;">

        <div class="temp-override-input-group">
            <select id="temp-override-preset-select" class="text_box">
                <option value="">-- 프리셋 선택 --</option>
            </select>
        </div>
        
        <div class="temp-override-input-group">
            <input type="text" id="temp-override-preset-name" class="text_box" placeholder="새 프리셋 이름">
            <button id="temp-override-save-preset-btn" class="menu_button">저장</button>
            <button id="temp-override-delete-preset-btn" class="menu_button danger">삭제</button>
        </div>
    `;

    // DOM 요소 참조
    const charInput = container.querySelector('#temp-override-char');
    const userInput = container.querySelector('#temp-override-user');
    const applyBtn = container.querySelector('#temp-override-apply-btn');
    const resetBtn = container.querySelector('#temp-override-reset-btn');
    const statusText = container.querySelector('#temp-override-status-text');
    const presetSelect = container.querySelector('#temp-override-preset-select');
    const presetNameInput = container.querySelector('#temp-override-preset-name');
    const savePresetBtn = container.querySelector('#temp-override-save-preset-btn');
    const deletePresetBtn = container.querySelector('#temp-override-delete-preset-btn');

    // 상태 업데이트 함수
    function updateStatusUI() {
        const settings = extension_settings[MODULE_NAME];
        charInput.value = settings.currentChar || '';
        userInput.value = settings.currentUser || '';

        const charDisplay = settings.currentChar ? `"${settings.currentChar}"` : '(기본값)';
        const userDisplay = settings.currentUser ? `"${settings.currentUser}"` : '(기본값)';
        statusText.innerText = `현재 상태 | char: ${charDisplay} / user: ${userDisplay}`;

        // 프리셋 목록 업데이트
        presetSelect.innerHTML = '<option value="">-- 프리셋 선택 --</option>';
        Object.keys(settings.presets || {}).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            presetSelect.appendChild(opt);
        });
    }

    // 이벤트 리스너 등록
    applyBtn.addEventListener('click', () => {
        extension_settings[MODULE_NAME].currentChar = charInput.value.trim();
        extension_settings[MODULE_NAME].currentUser = userInput.value.trim();
        saveSettingsDebounced();
        updateStatusUI();
    });

    resetBtn.addEventListener('click', () => {
        extension_settings[MODULE_NAME].currentChar = '';
        extension_settings[MODULE_NAME].currentUser = '';
        saveSettingsDebounced();
        updateStatusUI();
    });

    savePresetBtn.addEventListener('click', () => {
        const name = presetNameInput.value.trim();
        if (!name) return;
        
        if (!extension_settings[MODULE_NAME].presets) {
            extension_settings[MODULE_NAME].presets = {};
        }
        
        extension_settings[MODULE_NAME].presets[name] = {
            char: charInput.value.trim(),
            user: userInput.value.trim()
        };
        
        presetNameInput.value = '';
        saveSettingsDebounced();
        updateStatusUI();
    });

    presetSelect.addEventListener('change', (e) => {
        const selectedName = e.target.value;
        const preset = extension_settings[MODULE_NAME].presets?.[selectedName];
        if (preset) {
            charInput.value = preset.char || '';
            userInput.value = preset.user || '';
            extension_settings[MODULE_NAME].currentChar = preset.char || '';
            extension_settings[MODULE_NAME].currentUser = preset.user || '';
            saveSettingsDebounced();
            updateStatusUI();
        }
    });

    deletePresetBtn.addEventListener('click', () => {
        const selectedName = presetSelect.value;
        if (selectedName && extension_settings[MODULE_NAME].presets?.[selectedName]) {
            delete extension_settings[MODULE_NAME].presets[selectedName];
            saveSettingsDebounced();
            updateStatusUI();
        }
    });

    // 확장 설정 패널에 추가
    const extensionsContainer = document.getElementById('extensions_settings');
    if (extensionsContainer) {
        extensionsContainer.appendChild(container);
    }

    updateStatusUI();
}

jQuery(async () => {
    loadSettings();
    registerMacroOverride();
    buildUI();
});
