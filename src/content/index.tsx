
import { createRoot } from 'react-dom/client';
import { MarkdownButton } from './MarkdownButton';


import { AI_MODE_CONFIG } from '../../ai_mode.config';

const processedContainers = new WeakSet<HTMLElement>();

function injectMarkdownButton(rowContainer: HTMLElement) {
  if (processedContainers.has(rowContainer)) {
    return;
  }

  rowContainer.style.setProperty('display', 'flex', 'important');
  rowContainer.style.setProperty('width', '100%', 'important');
  rowContainer.style.setProperty('align-items', 'center', 'important');
  rowContainer.style.setProperty('box-sizing', 'border-box', 'important');

  const wrapper = document.createElement('div');
  wrapper.className = 'ai-markdown-button-wrapper';
  wrapper.style.cssText = 'display: flex; flex: 1; justify-content: flex-end; align-items: center; pointer-events: none;';

  const container = document.createElement('div');
  container.className = 'ai-markdown-button-container';
  container.style.cssText = 'pointer-events: auto;';
  
  wrapper.appendChild(container);
  
  rowContainer.appendChild(wrapper);

  const root = createRoot(container);
  root.render(<MarkdownButton footerElement={rowContainer} />);

  processedContainers.add(rowContainer);
}

function scanForFooters() {
  const wrappers = document.querySelectorAll(`.${AI_MODE_CONFIG.classes.footerWrapper}`);
  
  wrappers.forEach(wrapper => {
    if (!(wrapper instanceof HTMLElement)) return;
    
    if (wrapper.closest(AI_MODE_CONFIG.selectors.rhsPanel)) return;

    const possibleRow = wrapper.querySelector(`.${AI_MODE_CONFIG.classes.buttonRow}`) || wrapper.lastElementChild;
    
    if (possibleRow instanceof HTMLElement && !processedContainers.has(possibleRow)) {
      if (possibleRow.querySelector('button, [role="button"]')) {
        injectMarkdownButton(possibleRow);
      }
    }
    
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

function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node instanceof HTMLElement) {
          if (node.hasAttribute('data-complete') || 
              node.querySelector('[data-complete="true"]')) {
            shouldScan = true;
          }
        }
      });
    });
    
    if (shouldScan) {
      setTimeout(scanForFooters, 100);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  scanForFooters();
  
  setTimeout(scanForFooters, 500);
  setTimeout(scanForFooters, 1500);
  setTimeout(scanForFooters, 3000);
}

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

import { extractFullConversation, copyToClipboard } from '../utils/extractor';
import { htmlToMarkdown } from '../utils/converter';

chrome.runtime.onMessage.addListener((request: { action: string }, _sender: chrome.runtime.MessageSender, sendResponse: (response: { success: boolean, content?: string }) => void) => {
  if (request.action === 'copyFullConversation') {
    (async () => {
      try {
        console.log('Copy full conversation requested');
        
        const conversationItems = extractFullConversation();
        
        if (conversationItems.length === 0) {
          console.error('No conversation items found');
          sendResponse({ success: false });
          return;
        }
        
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
        
        const localSuccess = await copyToClipboard(fullMarkdown);
        console.log('Local copy result:', localSuccess ? 'Success' : 'Failed (probably User Activation issue)');
        
        sendResponse({ success: localSuccess, content: fullMarkdown });
      } catch (error) {
        console.error('Error copying conversation:', error);
        sendResponse({ success: false });
      }
    })();
    
    return true;
  }
});
