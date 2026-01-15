import React, { useState } from 'react';
import { htmlToMarkdown } from '../utils/converter';
import { findAIResponseElement, copyToClipboard } from '../utils/extractor';

interface MarkdownButtonProps {
  footerElement: HTMLElement;
}

export const MarkdownButton: React.FC<MarkdownButtonProps> = ({ footerElement }) => {
  const [copied, setCopied] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleCopy = async () => {
    try {
      setHasError(false);
      const responseElement = findAIResponseElement(footerElement);
      
      if (!responseElement) {
        throw new Error('Could not find AI response element');
      }

      const markdown = await htmlToMarkdown(responseElement);
      
      const success = await copyToClipboard(markdown);
      
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        throw new Error('Clipboard copy failed');
      }
    } catch (err) {
      console.error('Failed to copy markdown:', err);
      setHasError(true);
      setTimeout(() => setHasError(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Copy as Markdown"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        backgroundColor: hasError ? '#ef4444' : (copied ? '#10b981' : (isHovered ? '#3b82f6' : '#6366f1')),
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isHovered ? '0 4px 12px rgba(99, 102, 241, 0.4)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
        transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 16 16" 
        fill="currentColor"
        style={{ flexShrink: 0 }}
      >
        <path d="M14.85 3H1.15C.52 3 0 3.52 0 4.15v7.7C0 12.48.52 13 1.15 13h13.7c.63 0 1.15-.52 1.15-1.15v-7.7C16 3.52 15.48 3 14.85 3zM9 11H7V8L5.5 9.92 4 8v3H2V5h2l1.5 2L7 5h2v6zm2.99.5L9.5 8H11V5h2v3h1.5l-2.51 3.5z"/>
      </svg>
      
      <span>{hasError ? 'Error' : (copied ? 'Copied!' : 'Markdown')}</span>
    </button>
  );
};
