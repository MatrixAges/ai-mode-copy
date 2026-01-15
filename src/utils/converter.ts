import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkStringify from 'remark-stringify';
import remarkGfm from 'remark-gfm';
import { AI_MODE_CONFIG } from '../../ai_mode.config';

function removeHtmlComments(html: string): string {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

function removeEmptyElements(html: string): string {
  let result = html;
  let prev = '';
  while (prev !== result) {
    prev = result;
    result = result.replace(/<(div|span|p)[^>]*>(\s|&nbsp;)*<\/\1>/gi, '');
  }
  return result;
}

function cleanMarkdown(markdown: string): string {
  let result = markdown.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/^\s+$/gm, '');
  result = result.replace(/\n\n\n+/g, '\n\n');
  return result.trim();
}

export async function htmlToMarkdown(element: HTMLElement): Promise<string> {
  const clone = element.cloneNode(true) as HTMLElement;

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

  let html = clone.innerHTML;
  html = removeHtmlComments(html);
  html = removeEmptyElements(html);
  
  try {
    const file = await unified()
      .use(rehypeParse, { fragment: true })
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
    return element.textContent?.trim() || '';
  }
}
