import { loadCSS } from './aem.js';

async function initChatbot() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/chatbot.css`);
  const { default: init } = await import('./chatbot.js');
  init();
}

initChatbot();
