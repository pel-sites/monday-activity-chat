import { h } from 'https://esm.sh/preact@10.19.3';
import { useState, useRef, useEffect } from 'https://esm.sh/preact@10.19.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { sendMessage } from './api.js';

const html = htm.bind(h);

function ChatInput({ onSubmit, disabled }) {
  const [input, setInput] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || disabled) return;
    onSubmit(input);
    setInput('');
  }

  return html`
    <div class="input-area">
      <form onSubmit=${handleSubmit}>
        <input
          type="text"
          value=${input}
          onInput=${(e) => setInput(e.target.value)}
          placeholder="Ask about Monday.com activity..."
          disabled=${disabled}
        />
        <button type="submit" disabled=${disabled || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  `;
}

function Message({ message }) {
  const { role, content } = message;

  if (role === 'user') {
    return html`
      <div class="message user">
        ${content}
      </div>
    `;
  }

  const parsed = parseAssistantContent(content);

  if (!parsed.hasStructure) {
    return html`
      <div class="message assistant">
        ${content}
      </div>
    `;
  }

  return html`
    <div class="message assistant">
      ${parsed.answer && html`
        <div class="answer-section">
          <div class="answer-label">Answer</div>
          <div class="answer-content">${parsed.answer}</div>
        </div>
      `}
      ${parsed.justification && html`
        <div class="justification-section">
          <div class="justification-label">Justification</div>
          <div class="justification-content">${parsed.justification}</div>
        </div>
      `}
      ${parsed.metrics && parsed.metrics.length > 0 && html`
        <div class="metrics-section">
          ${parsed.metrics.map((metric, i) => html`
            <div key=${i} class="metric-card">
              <div class="metric-name">${metric.name}</div>
              ${metric.explanation && html`<div class="metric-explanation">${metric.explanation}</div>`}
              ${metric.winner && html`<div class="metric-winner">Winner: ${metric.winner}</div>`}
              ${metric.data && html`<div class="metric-data"><pre>${metric.data}</pre></div>`}
              ${metric.source && html`<div class="metric-source">Source: ${metric.source}</div>`}
            </div>
          `)}
        </div>
      `}
    </div>
  `;
}

function parseAssistantContent(content) {
  if (typeof content !== 'string') {
    return { hasStructure: false };
  }

  const answerMatch = content.match(/\*\*Answer\*\*[:\s]*([\s\S]*?)(?=\*\*Justification\*\*|\*\*Metrics?\*\*|$)/i);
  const justificationMatch = content.match(/\*\*Justification\*\*[:\s]*([\s\S]*?)(?=\*\*Metrics?\*\*|$)/i);

  const answer = answerMatch ? answerMatch[1].trim() : null;
  const justification = justificationMatch ? justificationMatch[1].trim() : null;

  const metricsSection = content.match(/\*\*Metrics?\*\*[:\s]*([\s\S]*)/i);
  let metrics = [];

  if (metricsSection) {
    const metricBlocks = metricsSection[1].split(/(?=###\s|\*\*\d+\.)/);
    metrics = metricBlocks
      .filter(block => block.trim())
      .map(block => {
        const nameMatch = block.match(/(?:###\s*|\*\*\d+\.\s*)([^*\n]+)/);
        const explanationMatch = block.match(/Explanation[:\s]*([^\n]+)/i);
        const winnerMatch = block.match(/Winner[:\s]*([^\n]+)/i);
        const sourceMatch = block.match(/Source[:\s]*([^\n]+)/i);
        const dataMatch = block.match(/```[\s\S]*?```|Data[:\s]*([\s\S]*?)(?=Winner|Source|$)/i);

        return {
          name: nameMatch ? nameMatch[1].trim() : 'Metric',
          explanation: explanationMatch ? explanationMatch[1].trim() : null,
          winner: winnerMatch ? winnerMatch[1].trim() : null,
          source: sourceMatch ? sourceMatch[1].trim() : null,
          data: dataMatch ? dataMatch[0].replace(/```/g, '').trim() : null,
        };
      });
  }

  const hasStructure = answer || justification || metrics.length > 0;

  return { hasStructure, answer, justification, metrics };
}

function MessageList({ messages, loading }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return html`
    <div class="messages">
      ${messages.map((msg, i) => html`
        <${Message} key=${i} message=${msg} />
      `)}
      ${loading && html`<div class="message assistant loading">Thinking...</div>`}
      <div ref=${messagesEndRef} />
    </div>
  `;
}

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function handleSend(content) {
    const userMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
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
      <${MessageList} messages=${messages} loading=${loading} />
      <${ChatInput} onSubmit=${handleSend} disabled=${loading} />
    </div>
  `;
}
