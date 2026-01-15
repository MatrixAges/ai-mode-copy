
export interface AIResponse {
  element: HTMLElement;
  content: string;
}

export function findAIResponseElement(footerElement: HTMLElement): HTMLElement | null {
  let container = footerElement.parentElement;
  
  while (container) {
    const contentContainer = container.querySelector('[data-container-id]');
    
    if (contentContainer && contentContainer instanceof HTMLElement) {
      console.log('Found content container:', contentContainer);
      
      const cleanContainer = document.createElement('div');
      
      function extractContent(element: Element) {
        Array.from(element.children).forEach((child) => {
          if (child instanceof HTMLElement) {
            const jsaction = child.getAttribute('jsaction');
            if (jsaction && jsaction.includes('aimRenderComplete')) {
              console.log('Skipping footer element:', child);
              return;
            }
            
            if (child.classList.contains('ai-markdown-button-container')) {
              return;
            }
            
            const textContent = child.textContent?.trim() || '';
            const computedHeight = window.getComputedStyle(child).height;
            const innerHtmlWithoutComments = child.innerHTML.replace(/<!--[\s\S]*?-->/g, '').trim();
            const isOnlyCommentsOrEmpty = innerHtmlWithoutComments === '' && child.children.length === 0;
            
            if (computedHeight === '0px' || (textContent === '' && child.children.length === 0) || isOnlyCommentsOrEmpty) {
              return;
            }
            
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

export interface ConversationItem {
  type: 'user' | 'ai';
  content: HTMLElement;
}

export function extractFullConversation(): ConversationItem[] {
  const items: ConversationItem[] = [];
  const scopeElements = document.querySelectorAll('[data-scope-id="turn"]');
  
  scopeElements.forEach((scopeEl) => {
    let questionText = "";
    const headingEl = scopeEl.querySelector('[role="heading"]');
    if (headingEl) {
      questionText = headingEl.textContent?.trim() || "";
    } else {
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
      const descendants = vedEl.getElementsByTagName('*');
      let aiContentContainer: HTMLElement | null = null;
      
      for (let i = 0; i < descendants.length; i++) {
        const el = descendants[i] as HTMLElement;
        if (el.hasAttribute('data-container-id')) {
          const cid = el.getAttribute('data-container-id');
          if (cid === 'main-col') {
            aiContentContainer = el;
            break;
          }
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

function extractAIContent(container: HTMLElement): HTMLElement | null {
  const cleanContainer = document.createElement('div');
  
  function extractContent(element: Element) {
    Array.from(element.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        const jsaction = child.getAttribute('jsaction');
        if (jsaction && jsaction.includes('aimRenderComplete')) {
          return;
        }
        
        if (child.classList.contains('ai-markdown-button-container')) {
          return;
        }
        
        const textContent = child.textContent?.trim() || '';
        const computedHeight = window.getComputedStyle(child).height;
        const innerHtmlWithoutComments = child.innerHTML.replace(/<!--[\s\S]*?-->/g, '').trim();
        const isOnlyCommentsOrEmpty = innerHtmlWithoutComments === '' && child.children.length === 0;
        
        if (computedHeight === '0px' || (textContent === '' && child.children.length === 0) || isOnlyCommentsOrEmpty) {
          return;
        }
        
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

export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  console.log('Attempting to copy text, length:', text.length);

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
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
