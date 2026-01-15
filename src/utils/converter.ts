import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import { AI_MODE_CONFIG } from '../../ai_mode.config';

/**
 * 移除HTML注释
 */
function removeHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * 移除只包含空白的标签
 */
function removeEmptyElements(html: string): string {
  let result = html;
  let prev = '';
  // 循环执行以处理嵌套
  while (prev !== result) {
    prev = result;
    // 移除所有只包含空白的标签（div/span/p等）
    result = result.replace(/<(div|span|p)[^>]*>(\s|&nbsp;)*<\/\1>/gi, '');
  }
  return result;
}

/**
 * 清理最终的 Markdown 文本
 */
function cleanMarkdown(markdown: string): string {
  // 移除多余的空行（3个及以上换行变成2个）
  let result = markdown.replace(/\n{3,}/g, '\n\n');
  // 移除行首的多余空格
  result = result.replace(/^\s+$/gm, '');
  // 移除连续的空行
  result = result.replace(/\n\n\n+/g, '\n\n');
  return result.trim();
}

/**
 * 将HTML元素转换为Markdown格式
 * 使用 remark 生态系统进行更可靠的转换
 */
export async function htmlToMarkdown(element: HTMLElement): Promise<string> {
  // 1. 克隆元素，避免在转换过程中意外修改原始页面 DOM
  const clone = element.cloneNode(true) as HTMLElement;

  // 2. 预处理 A：展平 display: contents 的容器
  // Google 经常使用 <div style="display: contents"> 来包装文本碎片，这会导致 Markdown 转换器认为是一个新块
  const contentsElements = clone.querySelectorAll('div[style*="display: contents"], span[style*="display: none"]');
  contentsElements.forEach(el => {
    if (el instanceof HTMLElement) {
      if (el.style.display === 'none') {
        el.remove();
      } else {
        while (el.firstChild) {
          el.parentNode?.insertBefore(el.firstChild, el);
        }
        el.remove();
      }
    }
  });

  clone.querySelectorAll(`.${AI_MODE_CONFIG.classes.codeWarning}`).forEach(el => el.remove());

  // 3. 预处理 B：识别并转换 Google AI Mode 特有的代码块结构 (pHpOfb)
  const codeBlocks = clone.querySelectorAll('.pHpOfb');
  codeBlocks.forEach(block => {
    const langLabel = block.querySelector('.vVRw1d')?.textContent?.trim() || '';
    const codeElement = block.querySelector('pre code');
    const codeContent = codeElement?.textContent || '';

    if (codeContent) {
      const newPre = document.createElement('pre');
      const newCode = document.createElement('code');
      if (langLabel) {
        newCode.className = `language-${langLabel.toLowerCase()}`;
      }
      newCode.textContent = codeContent;
      newPre.appendChild(newCode);
      block.replaceWith(newPre);
    }
  });

  // 4. 获取处理后的 HTML 并清理
  let html = clone.innerHTML;
  html = removeHtmlComments(html);
  html = removeEmptyElements(html);
  
  try {
    const file = await unified()
      .use(rehypeParse, { fragment: true }) // fragment模式解析HTML片段
      .use(rehypeRemark)
      .use(remarkGfm)
      .use(remarkStringify, {
        bullet: '-',
        listItemIndent: 'one',
        fences: true,
      })
      .process(html);

    let markdown = String(file);
    return cleanMarkdown(markdown);
  } catch (error) {
    console.error('Markdown conversion error:', error);
    // 回退到 textContent
    return element.textContent?.trim() || '';
  }
}
