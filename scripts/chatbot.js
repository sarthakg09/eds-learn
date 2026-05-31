const OUT_OF_CONTEXT = 'out of my context';

function crawlPageContext() {
  const main = document.querySelector('main');
  const title = document.title.trim();
  const metaDesc = document.querySelector('meta[name="description"]')?.content?.trim() || '';

  const headings = [...document.querySelectorAll('main h1, main h2, main h3, main h4')]
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  const paragraphs = [...(main?.querySelectorAll('p') || [])]
    .map((el) => el.textContent.trim())
    .filter((text) => text.length > 20);

  const navItems = [...document.querySelectorAll('header nav .nav-sections li > span, header nav .nav-sections a')]
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  const sections = [];
  main?.querySelectorAll('.section').forEach((section) => {
    const heading = section.querySelector('h1, h2, h3, h4')?.textContent?.trim();
    const text = [...section.querySelectorAll('p')]
      .map((p) => p.textContent.trim())
      .filter(Boolean)
      .join(' ');
    if (heading || text) sections.push({ heading: heading || '', content: text });
  });

  return {
    title,
    metaDesc,
    headings,
    paragraphs,
    navItems: [...new Set(navItems)],
    sections,
    fullText: [title, metaDesc, ...headings, ...paragraphs, ...navItems].join(' ').toLowerCase(),
  };
}

function normalize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function tokenize(text) {
  return normalize(text).split(' ').filter((word) => word.length > 2);
}

function scoreMatch(queryTokens, target) {
  const targetNorm = normalize(target);
  if (!targetNorm) return 0;
  return queryTokens.reduce((score, token) => (
    targetNorm.includes(token) ? score + 1 : score
  ), 0);
}

function findBestMatch(query, items, minScore = 1) {
  const tokens = tokenize(query);
  if (!tokens.length) return null;

  let best = null;
  let bestScore = 0;

  items.forEach((item) => {
    const score = scoreMatch(tokens, typeof item === 'string' ? item : item.text);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  });

  return bestScore >= minScore ? best : null;
}

function answerQuery(query, context) {
  const q = normalize(query);
  if (!q) return OUT_OF_CONTEXT;

  if (/^(hi|hello|hey|good morning|good afternoon)\b/.test(q)) {
    return `Hello! I can help with questions about ${context.title || 'this page'}. Ask about topics, sections, or navigation.`;
  }

  if (/help|what can you|how do you work/.test(q)) {
    return 'I answer questions using content from this page — headings, sections, and navigation. Try asking about a topic you see on the page.';
  }

  if (/page title|site name|website name|what is this (site|page)/.test(q)) {
    return context.title
      ? `This page is titled "${context.title}".`
      : OUT_OF_CONTEXT;
  }

  if (/about|describe|summary|overview|what is (this|the) page/.test(q)) {
    if (context.metaDesc) return context.metaDesc;
    if (context.paragraphs[0]) return context.paragraphs[0];
    if (context.headings.length) {
      return `This page covers: ${context.headings.slice(0, 5).join(', ')}.`;
    }
    return OUT_OF_CONTEXT;
  }

  if (/nav|menu|navigation|sections available/.test(q)) {
    if (context.navItems.length) {
      return `Navigation includes: ${context.navItems.join(', ')}.`;
    }
    if (context.headings.length) {
      return `Page sections include: ${context.headings.join(', ')}.`;
    }
    return OUT_OF_CONTEXT;
  }

  if (/heading|headings|topics|sections/.test(q)) {
    if (context.headings.length) {
      return `Headings on this page: ${context.headings.join(', ')}.`;
    }
    return OUT_OF_CONTEXT;
  }

  const sectionMatch = findBestMatch(query, context.sections.map((s) => ({
    text: `${s.heading} ${s.content}`,
    heading: s.heading,
    content: s.content,
  })), 2);

  if (sectionMatch) {
    const snippet = sectionMatch.content.slice(0, 280);
    return sectionMatch.heading
      ? `${sectionMatch.heading}: ${snippet}${sectionMatch.content.length > 280 ? '…' : ''}`
      : snippet;
  }

  const headingMatch = findBestMatch(query, context.headings, 1);
  if (headingMatch) {
    const relatedSection = context.sections.find((s) => s.heading === headingMatch);
    if (relatedSection?.content) {
      const snippet = relatedSection.content.slice(0, 280);
      return `About "${headingMatch}": ${snippet}${relatedSection.content.length > 280 ? '…' : ''}`;
    }
    return `This page includes a section on "${headingMatch}".`;
  }

  const paragraphMatch = findBestMatch(query, context.paragraphs, 2);
  if (paragraphMatch) {
    return paragraphMatch.slice(0, 320) + (paragraphMatch.length > 320 ? '…' : '');
  }

  const navMatch = findBestMatch(query, context.navItems, 1);
  if (navMatch) {
    return `"${navMatch}" is available in the site navigation.`;
  }

  const tokens = tokenize(query);
  const relevance = scoreMatch(tokens, context.fullText);
  if (relevance >= Math.min(3, tokens.length)) {
    const fallback = findBestMatch(query, context.paragraphs, 1);
    if (fallback) return fallback.slice(0, 320);
  }

  return OUT_OF_CONTEXT;
}

function createRobotIcon() {
  return `
    <svg class="chatbot-robot-icon" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="14" y="20" width="36" height="30" rx="8" fill="#fff"/>
      <circle cx="26" cy="34" r="4" fill="#2a5dff"/>
      <circle cx="38" cy="34" r="4" fill="#2a5dff"/>
      <rect x="28" y="42" width="8" height="3" rx="1.5" fill="#df2f5d"/>
      <line x1="32" y1="12" x2="32" y2="20" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <circle cx="32" cy="10" r="4" fill="#fff"/>
      <rect x="8" y="26" width="6" height="14" rx="3" fill="#fff"/>
      <rect x="50" y="26" width="6" height="14" rx="3" fill="#fff"/>
    </svg>
  `;
}

function appendMessage(container, text, type) {
  const msg = document.createElement('div');
  msg.className = `chatbot-message chatbot-message-${type}`;
  msg.textContent = text;
  container.append(msg);
  container.scrollTop = container.scrollHeight;
}

export default function initChatbot() {
  if (document.querySelector('.chatbot-widget')) return;

  const context = crawlPageContext();
  const widget = document.createElement('div');
  widget.className = 'chatbot-widget';
  widget.innerHTML = `
    <button type="button" class="chatbot-toggle" aria-label="Open chat assistant">
      ${createRobotIcon()}
    </button>
    <div class="chatbot-panel" hidden>
      <div class="chatbot-header">
        <div class="chatbot-header-info">
          ${createRobotIcon()}
          <div>
            <strong>Page Assistant</strong>
            <span>Ask about this page</span>
          </div>
        </div>
        <button type="button" class="chatbot-close" aria-label="Close chat">&times;</button>
      </div>
      <div class="chatbot-messages" role="log" aria-live="polite"></div>
      <form class="chatbot-form">
        <input type="text" class="chatbot-input" placeholder="Ask a question..." autocomplete="off" aria-label="Chat message"/>
        <button type="submit" class="chatbot-send" aria-label="Send message">Send</button>
      </form>
    </div>
  `;

  document.body.append(widget);

  const toggle = widget.querySelector('.chatbot-toggle');
  const panel = widget.querySelector('.chatbot-panel');
  const closeBtn = widget.querySelector('.chatbot-close');
  const form = widget.querySelector('.chatbot-form');
  const input = widget.querySelector('.chatbot-input');
  const messages = widget.querySelector('.chatbot-messages');
  let greeted = false;

  function openChat() {
    toggle.hidden = true;
    panel.hidden = false;
    if (!greeted) {
      appendMessage(
        messages,
        `Hi! I'm your page assistant for "${context.title || 'this site'}". Ask me about sections, navigation, or content on this page.`,
        'bot',
      );
      greeted = true;
    }
    input.focus();
  }

  function closeChat() {
    panel.hidden = true;
    toggle.hidden = false;
  }

  toggle.addEventListener('click', openChat);
  closeBtn.addEventListener('click', closeChat);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    appendMessage(messages, query, 'user');
    input.value = '';

    window.setTimeout(() => {
      const reply = answerQuery(query, context);
      appendMessage(messages, reply, 'bot');
    }, 350);
  });
}
