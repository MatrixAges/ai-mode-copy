
import { createRoot } from 'react-dom/client';
import { MarkdownButton } from './MarkdownButton';

/**
 * Content Script入口
 * 监听DOM变化，在AI回复footer中注入Markdown按钮
 */

import { AI_MODE_CONFIG } from '../../ai_mode.config';

/**
 * 存储已经处理过的容器元素
 */
const processedContainers = new WeakSet<HTMLElement>();

/**
 * 在目标footer容器中注入按钮
 */
function injectMarkdownButton(rowContainer: HTMLElement) {
  if (processedContainers.has(rowContainer)) {
    return;
  }

  // 1. 强制干预该整行的布局
  rowContainer.style.setProperty('display', 'flex', 'important');
  rowContainer.style.setProperty('width', '100%', 'important');
  rowContainer.style.setProperty('align-items', 'center', 'important');
  rowContainer.style.setProperty('box-sizing', 'border-box', 'important');

  // 2. 创建包装层 (Wrapper)
  const wrapper = document.createElement('div');
  wrapper.className = 'ai-markdown-button-wrapper';
  // 按照用户建议：使用 flex: 1 占据剩余空间，并通过 justify-content: flex-end 将按钮推向最右侧
  wrapper.style.cssText = 'display: flex; flex: 1; justify-content: flex-end; align-items: center; pointer-events: none;';

  // 3. 创建按钮点击容器
  const container = document.createElement('div');
  container.className = 'ai-markdown-button-container';
  container.style.cssText = 'pointer-events: auto;';
  
  wrapper.appendChild(container);
  
  // 4. 插入到整行的末尾
  rowContainer.appendChild(wrapper);

  // 使用 React 渲染按钮
  const root = createRoot(container);
  root.render(<MarkdownButton footerElement={rowContainer} />);

  processedContainers.add(rowContainer);
}

/**
 * 扫描页面查找符合结构的 AI 回复工具栏
 * 策略：结合类名（来自配置）与按钮特征进行双重校验
 */
function scanForFooters() {
  // 1. 定位工具栏主区域
  const wrappers = document.querySelectorAll(`.${AI_MODE_CONFIG.classes.footerWrapper}`);
  
  wrappers.forEach(wrapper => {
    if (!(wrapper instanceof HTMLElement)) return;
    
    // 过滤：如果是右侧栏则不处理
    if (wrapper.closest(AI_MODE_CONFIG.selectors.rhsPanel)) return;

    // 2. 在包装容器内精准定位按钮行
    // 优先尝试已知的稳定类名，否则回退到最后一个子元素
    const possibleRow = wrapper.querySelector(`.${AI_MODE_CONFIG.classes.buttonRow}`) || wrapper.lastElementChild;
    
    if (possibleRow instanceof HTMLElement && !processedContainers.has(possibleRow)) {
      // 3. 特征二次验证：必须包含功能按钮
      if (possibleRow.querySelector('button, [role="button"]')) {
        injectMarkdownButton(possibleRow);
      }
    }
    
    // 备选路径：如果上述失败，尝试遍历直接子元素（增加冗余度）
    if (!processedContainers.has(wrapper)) {
       const children = Array.from(wrapper.children);
       for (const child of children) {
         if (child instanceof HTMLElement && !processedContainers.has(child)) {
           if (child.querySelectorAll('button').length >= 2) {
             injectMarkdownButton(child);
             break;
           }
         }
       }
    }
  });
}

/**
 * 监听DOM变化
 */
function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          // 检查新增的节点或其子节点是否包含AI回复
          if (node.hasAttribute('data-complete') || 
              node.querySelector('[data-complete="true"]')) {
            shouldScan = true;
          }
        }
      });
    });
    
    if (shouldScan) {
      // 延迟扫描以确保DOM完全加载
      setTimeout(scanForFooters, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // 初始扫描
  scanForFooters();
  
  // 定期重扫几次以确保所有元素都被处理（应对延迟渲染）
  setTimeout(scanForFooters, 500);
  setTimeout(scanForFooters, 1500);
  setTimeout(scanForFooters, 3000);
}

// 等待DOM加载完成后，根据 URL 判断是否启动扫描
function initialize() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAIMode = urlParams.get('udm') === '50';
  
  if (!isAIMode) {
    console.log('[AI Mode Copy] Not in AI Mode (udm=50 not found). Content script dormant.');
    return;
  }

  console.log('[AI Mode Copy] AI Mode detected. Activating content script...');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeDOM);
  } else {
    observeDOM();
  }
}

initialize();

// 导入需要的函数
import { extractFullConversation, copyToClipboard } from '../utils/extractor';
import { htmlToMarkdown } from '../utils/converter';

// 监听来自background script的消息
chrome.runtime.onMessage.addListener((request: { action: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: { success: boolean, content?: string }) => void) => {
  if (request.action === 'copyFullConversation') {
    // 异步处理
    (async () => {
      try {
        console.log('Copy full conversation requested');
        
        // 提取完整对话
        const conversationItems = extractFullConversation();
        
        if (conversationItems.length === 0) {
          console.error('No conversation items found');
          sendResponse({ success: false });
          return;
        }
        
        // 转换为 Markdown
        const markdownParts: string[] = [];
        
        for (const item of conversationItems) {
          const markdown = await htmlToMarkdown(item.content);
          if (markdown) {
            if (item.type === 'user') {
              markdownParts.push(`## ${item.content.textContent?.trim() || ''}`);
            } else {
              markdownParts.push(markdown);
            }
          }
        }
        
        const fullMarkdown = markdownParts.join('\n\n');
        
        // 尝试在本地（内容脚本）复制到剪贴板
        // 对于右键菜单，这通常会成功；对于 Popup 按钮，这可能会因为 User Activation 丢失而失败
        const localSuccess = await copyToClipboard(fullMarkdown);
        console.log('Local copy result:', localSuccess ? 'Success' : 'Failed (probably User Activation issue)');
        
        // 无论本地是否成功，都把内容回传回去，让 Popup 有机会作为备份再次执行复制
        sendResponse({ success: localSuccess, content: fullMarkdown });
      } catch (error) {
        console.error('Error copying conversation:', error);
        sendResponse({ success: false });
      }
    })();
    
    // 返回 true 表示异步响应
    return true;
  }
});
