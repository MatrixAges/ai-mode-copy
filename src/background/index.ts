function isAIMode(url?: string): boolean {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get('udm') === '50';
  } catch {
    return false;
  }
}

function updatePluginState(tabId: number, url?: string) {
  const active = isAIMode(url);
  
  if (active) {
    chrome.action.enable(tabId);
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": "icons/icon16.png",
        "32": "icons/icon32.png",
        "48": "icons/icon48.png",
        "128": "icons/icon128.png"
      }
    });
    chrome.contextMenus.update('copyFullConversation', { visible: true });
  } else {
    chrome.action.disable(tabId);
    chrome.action.setIcon({
      tabId: tabId,
      path: {
        "16": "icons/icon16-gray.png",
        "32": "icons/icon32-gray.png",
        "48": "icons/icon48-gray.png",
        "128": "icons/icon128-gray.png"
      }
    });
    chrome.contextMenus.update('copyFullConversation', { visible: false });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'copyFullConversation',
    title: 'Copy Full Conversation',
    contexts: ['page'],
    documentUrlPatterns: ['https://www.google.com/*'],
    visible: false
  });
  
  chrome.action.disable();
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === 'complete') {
    updatePluginState(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updatePluginState(activeInfo.tabId, tab.url);
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'copyFullConversation') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'copyFullConversation',
    });
  }
});
