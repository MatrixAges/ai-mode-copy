/**
 * 提取AI回复内容的DOM元素
 */

export interface AIResponse {
  element: HTMLElement;
  content: string;
}

/**
 * 查找AI回复的内容元素
 * 根据页面结构：
 * - 内容在 data-container-id 的 div 中
 * - footer 包含 jsaction="aimRenderComplete:..." 属性，需要排除
 */
export function findAIResponseElement(footerElement: HTMLElement): HTMLElement | null {
  // 向上查找包含完整AI回复的容器
  let container = footerElement.parentElement;
  
  while (container) {
    // 查找带有 data-container-id 的内容容器
    const contentContainer = container.querySelector('[data-container-id]');
    
    if (contentContainer && contentContainer instanceof HTMLElement) {
      console.log('Found content container:', contentContainer);
      
      // 创建一个临时容器来存储纯净的内容
      const cleanContainer = document.createElement('div');
      
      // 递归遍历内容容器
      function extractContent(element: Element) {
        Array.from(element.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            // 排除 footer（包含 aimRenderComplete 的 jsaction）
            const jsaction = child.getAttribute('jsaction');
            if (jsaction && jsaction.includes('aimRenderComplete')) {
              console.log('Skipping footer element:', child);
              return;
            }
            
            // 排除我们注入的按钮容器
            if (child.classList.contains('ai-markdown-button-container')) {
              return;
            }
            
            // 检查元素是否为空
            const textContent = child.textContent?.trim() || '';
            const computedHeight = window.getComputedStyle(child).height;
            // 检查innerHTML是否只包含注释或空白
            const innerHtmlWithoutComments = child.innerHTML.replace(/<!--[\s\S]*?-->/g, '').trim();
            const isOnlyCommentsOrEmpty = innerHtmlWithoutComments === '' && child.children.length === 0;
            
            if (computedHeight === '0px' || (textContent === '' && child.children.length === 0) || isOnlyCommentsOrEmpty) {
              // 跳过空元素
              return;
            }
            
            // 如果子元素有 display: contents，递归处理
            if (child.style.display === 'contents' || 
                window.getComputedStyle(child).display === 'contents') {
              extractContent(child);
            } else {
              cleanContainer.appendChild(child.cloneNode(true));
            }
          }
        });
      }
      
      extractContent(contentContainer);
      
      console.log('Extracted clean content:', cleanContainer.innerHTML.substring(0, 200));
      return cleanContainer;
    }
    
    container = container.parentElement;
  }
  
  console.error('Could not find content container from footer:', footerElement);
  return null;
}

/**
 * 对话项接口
 */
export interface ConversationItem {
  type: 'user' | 'ai';
  content: HTMLElement;
}

/**
 * 提取整个对话内容（包括所有问题和回答）
 */
export function extractFullConversation(): ConversationItem[] {
  const items: ConversationItem[] = [];
  // Google AI Mode 的每个回合通常都有 data-scope-id="turn"
  const scopeElements = document.querySelectorAll('[data-scope-id="turn"]');
  
  scopeElements.forEach((scopeEl) => {
    // 1. 提取用户问题
    let questionText = "";
    // 优先寻找带有 role="heading" 的元素，这是最稳定的问题容器
    const headingEl = scopeEl.querySelector('[role="heading"]');
    if (headingEl) {
      questionText = headingEl.textContent?.trim() || "";
    } else {
      // 备选方案：通过第一个子元素递归提取并过滤时间
      const userPart = scopeEl.firstElementChild;
      if (userPart) {
        const textParts: string[] = [];
        function walk(node: Node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const txt = node.textContent?.trim();
            if (txt && !/^\d+\s+(hour|minute|day|second|month|year)s?\s+ago$/i.test(txt)) {
              textParts.push(txt);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element;
            if (/^\d+\s+(hour|minute|day|second|month|year)s?\s+ago$/i.test(el.textContent?.trim() || "")) {
              return;
            }
            node.childNodes.forEach(walk);
          }
        }
        walk(userPart);
        questionText = textParts.join(" ").trim();
      }
    }
    
    if (questionText) {
      const div = document.createElement('div');
      div.textContent = questionText;
      items.push({ type: 'user', content: div });
    }
    
    // 2. 提取 AI 回复：定位 decode-data-ved 块
    let vedEl: HTMLElement | null = null;
    const allDescendants = scopeEl.getElementsByTagName('*');
    for (let i = 0; i < allDescendants.length; i++) {
      const el = allDescendants[i] as HTMLElement;
      if (el.hasAttribute('decode-data-ved')) {
        vedEl = el;
        break;
      }
    }

    if (vedEl) {
      // 在 VED 块下寻找最具实质内容的容器
      // 逻辑：优先寻找 data-container-id="main-col"，它是回复的主体
      const descendants = vedEl.getElementsByTagName('*');
      let aiContentContainer: HTMLElement | null = null;
      
      for (let i = 0; i < descendants.length; i++) {
        const el = descendants[i] as HTMLElement;
        if (el.hasAttribute('data-container-id')) {
          const cid = el.getAttribute('data-container-id');
          // 命中主容器
          if (cid === 'main-col') {
            aiContentContainer = el;
            break;
          }
          // 如果没有 main-col，寻找非空的 display: contents 块
          if (!aiContentContainer && el.textContent?.trim()) {
            const style = el.getAttribute('style') || "";
            const computedStyle = window.getComputedStyle(el).display;
            if (style.includes('display: contents') || computedStyle === 'contents') {
              aiContentContainer = el;
            }
          }
        }
      }
      
      if (aiContentContainer) {
        const cleanContent = extractAIContent(aiContentContainer);
        if (cleanContent) {
          items.push({ type: 'ai', content: cleanContent });
        }
      }
    }
  });
  
  return items;
}

/**
 * 提取 AI 回复的纯净内容
 */
function extractAIContent(container: HTMLElement): HTMLElement | null {
  const cleanContainer = document.createElement('div');
  
  function extractContent(element: Element) {
    Array.from(element.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        // 排除 footer
        const jsaction = child.getAttribute('jsaction');
        if (jsaction && jsaction.includes('aimRenderComplete')) {
          return;
        }
        
        // 排除按钮容器
        if (child.classList.contains('ai-markdown-button-container')) {
          return;
        }
        
        // 检查是否为空
        const textContent = child.textContent?.trim() || '';
        const computedHeight = window.getComputedStyle(child).height;
        const innerHtmlWithoutComments = child.innerHTML.replace(/<!--[\s\S]*?-->/g, '').trim();
        const isOnlyCommentsOrEmpty = innerHtmlWithoutComments === '' && child.children.length === 0;
        
        if (computedHeight === '0px' || (textContent === '' && child.children.length === 0) || isOnlyCommentsOrEmpty) {
          return;
        }
        
        // 递归处理 display: contents
        if (child.style.display === 'contents' || 
            window.getComputedStyle(child).display === 'contents') {
          extractContent(child);
        } else {
          cleanContainer.appendChild(child.cloneNode(true));
        }
      }
    });
  }
  
  extractContent(container);
  return cleanContainer.innerHTML ? cleanContainer : null;
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  console.log('Attempting to copy text, length:', text.length);

  try {
    // 优先尝试现代 API
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    // 静默失败，不作为错误打印，因为我们要执行补位逻辑
  }

  // 稳健的降级方案：经典 textarea 方式
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 设置样式确保其在视觉上无干扰但在 DOM 中合法
    Object.assign(textArea.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      opacity: '0.01'
    });

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (fallbackErr) {
    return false;
  }
}
