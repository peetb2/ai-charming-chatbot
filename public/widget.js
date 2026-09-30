(function () {
  function initWidget() {
    if (document.getElementById('matcha-chatbot-widget-root')) {
      return;
    }
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidget);
      } else {
        setTimeout(initWidget, 50);
      }
      return;
    }

    // 1. Identify script element and extract data-bot-key / data-key
    let script = document.currentScript;
    if (!script) {
      const candidates = document.querySelectorAll(
        'script[data-bot-key], script[data-key], script[data-api-key], script[src*="widget.js"], script[src*="embed.js"]'
      );
      if (candidates.length > 0) {
        script = candidates[candidates.length - 1];
      }
    }

    const publicKey = script
      ? (
          script.getAttribute('data-bot-key') ||
          script.getAttribute('data-key') ||
          script.getAttribute('data-api-key') ||
          script.getAttribute('data-token') ||
          ''
        ).trim()
      : '';

    // Determine host origin for backend chat API
    let apiBaseUrl = '';
    if (script) {
      const explicitHost =
        script.getAttribute('data-api-host') ||
        script.getAttribute('data-host') ||
        script.getAttribute('data-origin');
      if (explicitHost) {
        apiBaseUrl = explicitHost.replace(/\/+$/, '');
      } else if (script.src) {
        try {
          const parsed = new URL(script.src, window.location.href);
          apiBaseUrl = parsed.origin;
        } catch (e) {
          apiBaseUrl = window.location.origin;
        }
      }
    }
    if (!apiBaseUrl) {
      apiBaseUrl = window.location.origin;
    }

    // 2. Generate or retrieve persistent session ID for the user
    const sessionKey = `matcha_session_${publicKey.slice(0, 12) || 'default'}`;
    let sessionId = '';
    try {
      sessionId = localStorage.getItem(sessionKey);
      if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem(sessionKey, sessionId);
      }
    } catch (e) {
      sessionId = 'sess_' + Math.random().toString(36).substring(2, 15);
    }

    // 3. Create host element and attach Shadow DOM for total style isolation
    const host = document.createElement('div');
    host.id = 'matcha-chatbot-widget-root';
    host.style.position = 'fixed';
    host.style.bottom = '24px';
    host.style.right = '24px';
    host.style.zIndex = '2147483647';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });

  // 4. Shadow DOM internal styles & DOM HTML structure (Charming Sage Theme)
  const style = document.createElement('style');
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Prompt', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    
    .widget-launcher {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: #334539;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 8px 24px rgba(35, 56, 40, 0.35), 0 2px 8px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s ease, background-color 0.2s ease;
      outline: none;
      position: relative;
    }
    .widget-launcher:hover {
      transform: scale(1.08);
      background: #3d5244;
      box-shadow: 0 10px 28px rgba(35, 56, 40, 0.45);
    }
    .widget-launcher svg {
      width: 26px;
      height: 26px;
      fill: currentColor;
      transition: transform 0.2s ease;
    }

    .chat-window {
      position: absolute;
      bottom: 74px;
      right: 0;
      width: 380px;
      height: 560px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 110px);
      background: #F8F9F7;
      border: 1px solid #D5DFD8;
      border-radius: 24px;
      box-shadow: 0 20px 50px rgba(31, 47, 36, 0.2), 0 4px 12px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
    }

    .chat-window.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }

    .chat-header {
      background: #334539;
      padding: 16px 20px;
      border-bottom: 1px solid #2B3B30;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #ffffff;
    }
    .bot-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bot-avatar {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      background: #475C4E;
      border: 1px solid #5A7563;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #C2E5CD;
    }
    .bot-details h4 {
      font-size: 14.5px;
      font-weight: 600;
      color: #ffffff;
      line-height: 1.2;
    }
    .bot-status {
      font-size: 11px;
      color: #C2E5CD;
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 2px;
    }
    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #34D399;
      box-shadow: 0 0 8px #34D399;
      display: inline-block;
    }

    .close-btn {
      background: transparent;
      border: none;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      padding: 6px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, color 0.2s;
    }
    .close-btn:hover {
      background: #475C4E;
      color: #ffffff;
    }

    .chat-messages {
      flex: 1;
      padding: 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #F8F9F7;
      background-image: radial-gradient(#CBD5CD 0.75px, transparent 0.75px);
      background-size: 16px 16px;
      scrollbar-width: thin;
      scrollbar-color: #CBD5CD transparent;
    }
    .chat-messages::-webkit-scrollbar {
      width: 5px;
    }
    .chat-messages::-webkit-scrollbar-thumb {
      background: #CBD5CD;
      border-radius: 4px;
    }

    .msg {
      max-width: 84%;
      padding: 11px 15px;
      border-radius: 18px;
      font-size: 13.5px;
      line-height: 1.5;
      word-wrap: break-word;
      animation: fadeIn 0.2s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .msg.bot {
      align-self: flex-start;
      background: #FFFFFF;
      color: #1A231E;
      border-bottom-left-radius: 4px;
      border: 1px solid #E2E8E3;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    }

    .msg.user {
      align-self: flex-end;
      background: #3B6B50;
      color: #ffffff;
      border-bottom-right-radius: 4px;
      font-weight: 500;
      box-shadow: 0 2px 8px rgba(59, 107, 80, 0.25);
    }

    .msg.system-error {
      align-self: center;
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #991B1B;
      font-size: 12px;
      text-align: center;
      max-width: 92%;
    }

    .typing-indicator {
      align-self: flex-start;
      background: #FFFFFF;
      padding: 12px 18px;
      border-radius: 18px;
      border-bottom-left-radius: 4px;
      border: 1px solid #E2E8E3;
      display: none;
      align-items: center;
      gap: 5px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
    }
    .typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #6E9177;
      animation: typingBounce 1.4s infinite ease-in-out both;
    }
    .typing-dot:nth-child(1) { animation-delay: 0s; }
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }

    @keyframes typingBounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    .chat-input-area {
      padding: 12px 16px;
      background: #FFFFFF;
      border-top: 1px solid #E2E8E3;
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .chat-input {
      flex: 1;
      background: #F3F5F2;
      border: 1px solid #D5DFD8;
      color: #1A231E;
      padding: 11px 16px;
      border-radius: 14px;
      font-size: 13.5px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .chat-input::placeholder {
      color: #96A49B;
    }
    .chat-input:focus {
      border-color: #3B6B50;
      background: #FFFFFF;
      box-shadow: 0 0 0 2px rgba(59, 107, 80, 0.15);
    }
    .send-btn {
      background: #3B6B50;
      color: #FFFFFF;
      border: none;
      width: 42px;
      height: 42px;
      border-radius: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s, transform 0.1s;
    }
    .send-btn:hover {
      background: #325A43;
    }
    .send-btn:active {
      transform: scale(0.95);
    }
    .send-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    .brand-footer {
      text-align: center;
      padding: 6px 0;
      background: #FFFFFF;
      font-size: 10.5px;
      color: #96A49B;
      border-top: 1px solid #F3F5F2;
    }
    .brand-footer a {
      color: #3B6B50;
      font-weight: 600;
      text-decoration: none;
    }
  `;

  const container = document.createElement('div');
  container.innerHTML = `
    <div class="chat-window" id="chat-window">
      <div class="chat-header">
        <div class="bot-info">
          <div class="bot-avatar">
            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="4" y="8" width="16" height="12" rx="2" stroke-width="1.8"/>
              <circle cx="9" cy="13" r="1.2" fill="currentColor"/>
              <circle cx="15" cy="13" r="1.2" fill="currentColor"/>
              <path d="M12 4v4m-10 5h2m16 0h2" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="bot-details">
            <h4 id="bot-name">Support Agent</h4>
            <div class="bot-status">
              <span class="status-dot"></span> พร้อมให้บริการ
            </div>
          </div>
        </div>
        <button class="close-btn" id="close-btn" aria-label="Close chat">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="chat-messages" id="chat-messages">
        <div class="msg bot">สวัสดีครับ! มีอะไรให้ผมช่วยเหลือเกี่ยวกับสินค้าและบริการวันนี้ไหมครับ?</div>
        <div class="typing-indicator" id="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>

      <div class="chat-input-area">
        <input type="text" class="chat-input" id="chat-input" placeholder="พิมพ์คำถามของคุณที่นี่..." />
        <button class="send-btn" id="send-btn" aria-label="Send message">
          <svg viewBox="0 0 24 24">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>

      <div class="brand-footer">
        ขับเคลื่อนโดย <a href="#" target="_blank">AI Charming Bot</a>
      </div>
    </div>

    <button class="widget-launcher" id="launcher-btn" aria-label="Open chat">
      <svg id="icon-chat" viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
      </svg>
      <svg id="icon-close" viewBox="0 0 24 24" style="display:none;" stroke="currentColor" stroke-width="2.5" fill="none">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
  `;

  shadow.appendChild(style);
  shadow.appendChild(container);

  // 5. Interactivity & API communication
  const launcherBtn = shadow.getElementById('launcher-btn');
  const chatWindow = shadow.getElementById('chat-window');
  const closeBtn = shadow.getElementById('close-btn');
  const iconChat = shadow.getElementById('icon-chat');
  const iconClose = shadow.getElementById('icon-close');
  const chatMessages = shadow.getElementById('chat-messages');
  const typingIndicator = shadow.getElementById('typing-indicator');
  const chatInput = shadow.getElementById('chat-input');
  const sendBtn = shadow.getElementById('send-btn');
  const botNameEl = shadow.getElementById('bot-name');

  let isOpen = false;

  const toggleChat = () => {
    isOpen = !isOpen;
    if (isOpen) {
      chatWindow.classList.add('open');
      iconChat.style.display = 'none';
      iconClose.style.display = 'block';
      setTimeout(() => chatInput.focus(), 150);
    } else {
      chatWindow.classList.remove('open');
      iconChat.style.display = 'block';
      iconClose.style.display = 'none';
    }
  };

  launcherBtn.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  const scrollToBottom = () => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  const showTyping = (show) => {
    if (show) {
      chatMessages.appendChild(typingIndicator);
      typingIndicator.style.display = 'flex';
    } else {
      typingIndicator.style.display = 'none';
    }
    scrollToBottom();
  };

  const addMessage = (text, type = 'bot') => {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${type}`;
    msgDiv.textContent = text;
    chatMessages.insertBefore(msgDiv, typingIndicator);
    scrollToBottom();
  };

  const handleSendMessage = async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    // User message
    addMessage(text, 'user');
    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;
    showTyping(true);

    try {
      const apiEndpoint = `${apiBaseUrl}/api/v1/widget/chat`;

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey: publicKey,
          message: text,
          sessionId: sessionId,
        }),
      });

      const data = await response.json();
      showTyping(false);

      if (response.ok && data.reply) {
        if (data.botName) {
          botNameEl.textContent = data.botName;
        }
        addMessage(data.reply, 'bot');
      } else {
        const errorMsg = data.error || (response.status === 429 ? 'Chatbot credit limit exhausted.' : 'Failed to get response.');
        addMessage(errorMsg, 'system-error');
      }
    } catch (err) {
      showTyping(false);
      addMessage('เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง', 'system-error');
      console.error('[MatchaChatbot Widget Error]', err);
    } finally {
      chatInput.disabled = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  };

  sendBtn.addEventListener('click', handleSendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  });
}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
