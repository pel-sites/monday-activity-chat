import { h } from 'https://esm.sh/preact@10.19.3';
import { useState, useRef, useEffect } from 'https://esm.sh/preact@10.19.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { sendMessage } from './api.js';

const html = htm.bind(h);

function DataTable({ data }) {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const headers = Object.keys(data[0]);

  return html`
    <div class="data-table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            ${headers.map(h => html`<th key=${h}>${h}</th>`)}
          </tr>
        </thead>
        <tbody>
          ${data.map((row, i) => html`
            <tr key=${i}>
              ${headers.map(h => html`<td key=${h}>${row[h]}</td>`)}
            </tr>
          `)}
        </tbody>
      </table>
    </div>
  `;
}

function AnswerSection({ answer }) {
  if (!answer) return null;

  return html`
    <div class="answer-section">
      <div class="answer-label">Answer</div>
      <div class="answer-content">${answer}</div>
    </div>
  `;
}

function MetricCard({ metric }) {
  const { icon, name, explanation, winner, data, source } = metric;

  return html`
    <div class="metric-card">
      <div class="metric-header">
        ${icon && html`<span class="metric-icon">${icon}</span>`}
        <span class="metric-name">${name}</span>
      </div>
      ${explanation && html`<div class="metric-explanation">${explanation}</div>`}
      ${winner && html`<div class="metric-winner">Winner: ${winner}</div>`}
      ${data && (Array.isArray(data)
        ? html`<${DataTable} data=${data} />`
        : html`<div class="metric-data"><pre>${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}</pre></div>`
      )}
      ${source && html`<div class="metric-source">Source: ${source}</div>`}
    </div>
  `;
}

function JustificationSection({ justification, metrics }) {
  if (!justification && (!metrics || metrics.length === 0)) return null;

  return html`
    <div class="justification-section">
      <div class="justification-label">Justification</div>
      ${justification && html`<div class="justification-content">${justification}</div>`}
      ${metrics && metrics.length > 0 && html`
        <div class="metrics-section">
          ${metrics.map((metric, i) => html`
            <${MetricCard} key=${i} metric=${metric} />
          `)}
        </div>
      `}
    </div>
  `;
}

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
    <div class="message assistant structured">
      <${AnswerSection} answer=${parsed.answer} />
      <${JustificationSection} justification=${parsed.justification} metrics=${parsed.metrics} />
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
    const metricBlocks = metricsSection[1].split(/(?=###\s|\*\*\d+\.|(?:^|\n)[\u{1F4CA}\u{1F4C8}\u{1F4C9}\u{1F195}\u{2705}\u{26A1}])/u);
    metrics = metricBlocks
      .filter(block => block.trim())
      .map(block => {
        const iconMatch = block.match(/^[\u{1F4CA}\u{1F4C8}\u{1F4C9}\u{1F195}\u{2705}\u{26A1}\u{1F3C6}\u{1F4B0}\u{1F4DD}\u{2B50}]/u);
        const nameMatch = block.match(/(?:###\s*|\*\*\d+\.\s*|^[\u{1F4CA}\u{1F4C8}\u{1F4C9}\u{1F195}\u{2705}\u{26A1}\u{1F3C6}\u{1F4B0}\u{1F4DD}\u{2B50}]\s*)([^*\n]+)/u);
        const explanationMatch = block.match(/Explanation[:\s]*([^\n]+)/i);
        const winnerMatch = block.match(/Winner[:\s]*([^\n]+)/i);
        const sourceMatch = block.match(/Source[:\s]*([^\n]+)/i);

        let data = null;
        const jsonMatch = block.match(/```json\s*([\s\S]*?)```/);
        if (jsonMatch) {
          try {
            data = JSON.parse(jsonMatch[1].trim());
          } catch (e) {
            data = jsonMatch[1].trim();
          }
        } else {
          const dataMatch = block.match(/```[\s\S]*?```|Data[:\s]*([\s\S]*?)(?=Winner|Source|$)/i);
          if (dataMatch) {
            data = dataMatch[0].replace(/```/g, '').trim();
          }
        }

        return {
          icon: iconMatch ? iconMatch[0] : null,
          name: nameMatch ? nameMatch[1].trim().replace(/^\*\*|\*\*$/g, '') : 'Metric',
          explanation: explanationMatch ? explanationMatch[1].trim() : null,
          winner: winnerMatch ? winnerMatch[1].trim() : null,
          source: sourceMatch ? sourceMatch[1].trim() : null,
          data,
        };
      });
  }

  const hasStructure = answer || justification || metrics.length > 0;

  return { hasStructure, answer, justification, metrics };
}

function WelcomeScreen({ onExampleClick }) {
  const examples = [
    "Who has the most activity?",
    "What boards are most active?",
    "Show me activity by workspace",
    "What types of events are most common?",
    "Activity trends over time?"
  ];

  return html`
    <div class="welcome-screen">
      <div class="welcome-icon">🌿</div>
      <h2 class="welcome-title">Monday Activity Insights</h2>
      <p class="welcome-subtitle">
        Ask questions about your Monday.com activity data. I can help you understand
        user engagement, board activity, workspace metrics, and more.
      </p>
      <div class="example-questions">
        <p class="examples-label">Try asking:</p>
        ${examples.map(q => html`
          <button
            key=${q}
            class="example-btn"
            onClick=${() => onExampleClick(q)}
          >
            ${q}
          </button>
        `)}
      </div>
    </div>
  `;
}

function MessageList({ messages, loading, onExampleClick }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (messages.length === 0 && !loading) {
    return html`
      <div class="messages">
        <${WelcomeScreen} onExampleClick=${onExampleClick} />
      </div>
    `;
  }

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
      <${MessageList} messages=${messages} loading=${loading} onExampleClick=${handleSend} />
      <${ChatInput} onSubmit=${handleSend} disabled=${loading} />
    </div>
  `;
}
