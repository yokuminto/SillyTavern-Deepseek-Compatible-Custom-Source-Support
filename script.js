import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

const extensionName = "custom-processing";
const extensionSettings = extension_settings[extensionName] || {};

async function loadSettings() {
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    Object.assign(extension_settings[extensionName], {
        enablePrefix: false,
        showThoughts: false,
    });
    
    // 初始化UI状态
    $("#enable_prefix").prop("checked", extensionSettings.enablePrefix);
    $("#show_thoughts").prop("checked", extensionSettings.showThoughts);
}

function postCustomProcessPrompt(messages, type, names) {
    const addAssistantPrefix = x => x.length && (x[x.length - 1].role !== 'assistant' || (x[x.length - 1].prefix = true)) ? x : x;
    const prefix = extensionSettings.enablePrefix;

    switch (type) {
        case 'merge':
        case 'semi':
            return prefix ? addAssistantPrefix(mergeMessages(messages, names, true, false)) : mergeMessages(messages, names, true, false);
        case 'strict':
            return prefix ? addAssistantPrefix(mergeMessages(messages, names, true, true)) : mergeMessages(messages, names, true, true);
        default:
            return prefix ? addAssistantPrefix(messages) : messages;
    }
}

// 修改原版postProcessPrompt
const originalPostProcess = postProcessPrompt;
function modifiedPostProcess(messages, type, names) {
    if (extensionSettings.enablePrefix) {
        return postCustomProcessPrompt(messages, type, names);
    }
    return originalPostProcess(messages, type, names);
}

// 注入逻辑
function injectProcessing() {
    postProcessPrompt = modifiedPostProcess;
    
    // 修改getStreamingReply逻辑
    const originalGetStreaming = getStreamingReply;
    getStreamingReply = function(data, state) {
        if (extensionSettings.showThoughts) {
            state.reasoning += (data.choices?.filter(x => x?.delta?.reasoning_content)?.[0]?.delta?.reasoning_content || '');
        }
        return originalGetStreaming(data, state);
    }
}

jQuery(async () => {
    // 加载设置界面
    const settingsHtml = await $.get(`/extensions/${extensionName}/settings.html`);
    $("#extensions_settings").append(settingsHtml);
    
    // 设置事件监听
    $("#enable_prefix").on("change", function() {
        extensionSettings.enablePrefix = $(this).prop("checked");
        saveSettingsDebounced();
    });
    
    $("#show_thoughts").on("change", function() {
        extensionSettings.showThoughts = $(this).prop("checked");
        saveSettingsDebounced();
    });

    // 初始化
    await loadSettings();
    injectProcessing();
});
