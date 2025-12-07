import { h } from 'https://esm.sh/preact@10.19.3';
import { useState } from 'https://esm.sh/preact@10.19.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { sendMessage } from './api.js';

const html = htm.bind(h);

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await sendMessage(newMessages);
      const assistantContent = response.content?.[0]?.text || 'No response';
      setMessages([...newMessages, { role: 'assistant', content: assistantContent }]);
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return html`
    <div class="chat-container">
      <div class="messages">
        ${messages.map((msg, i) => html`
          <div key=${i} class="message ${msg.role}">
            ${msg.content}
          </div>
        `)}
        ${loading && html`<div class="message assistant">Thinking...</div>`}
      </div>
      <div class="input-area">
        <form onSubmit=${handleSubmit}>
          <input
            type="text"
            value=${input}
            onInput=${(e) => setInput(e.target.value)}
            placeholder="Ask about Monday.com activity..."
            disabled=${loading}
          />
          <button type="submit" disabled=${loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  `;
}
