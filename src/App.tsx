import { useState } from 'react'
import './App.css'
import { copyToClipboard } from './utils/extractor'
import LogoSVG from './components/LogoSVG'

function App() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopyFull = async () => {
    setError(false);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      // 向内容脚本请求 Markdown 文本
      const response = await new Promise<any>((resolve) => {
        chrome.tabs.sendMessage(tab.id!, { action: 'copyFullConversation' }, (res) => {
          // 忽略通信层错误，由逻辑处理 res.content
          resolve(res);
        });
      });

      if (response && response.content) {
        // 调用 extractor.ts 中的 copyToClipboard
        // 它会先尝试 modern API，如果因为焦点报错，会立即执行 textarea fallback。
        // 由于 fallback 成功率极高，我们只需要关注它的返回值。
        const success = await copyToClipboard(response.content);
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          return;
        }
      }
      
      // 只有完全拿不到内容或复制在各层均失败才显示错误
      setError(true);
      setTimeout(() => setError(false), 2000);
    } catch (err) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="popup-container">
      <header className="main-header">
        <div className="logo-section">
          <LogoSVG className="app-icon" />
          <h1>AI Mode Copy</h1>
        </div>
      </header>

      <button 
        onClick={handleCopyFull} 
        className={`copy-full-btn ${copied ? 'success' : ''} ${error ? 'error' : ''}`}
        title="Copy Full Conversation"
      >
        {error ? 'Failed' : (copied ? 'Copied!' : 'Copy Full Conversation')}
      </button>
      
      <main>
        <div className="status-card">
          <p className="description">
            Your powerful companion for Google AI Mode. 
            Copy full conversations or single responses as clean Markdown.
          </p>
          <div className="feature-list">
            <div className="feature-item">
              <span className="dot"></span>
              <span>Right-click for Full Conversation</span>
            </div>
            <div className="feature-item">
              <span className="dot"></span>
              <span>In-page Markdown button</span>
            </div>
          </div>
        </div>
      </main>

      <footer>
        <p>Made with ❤️ for AI Enthusiasts</p>
      </footer>
    </div>
  )
}

export default App
