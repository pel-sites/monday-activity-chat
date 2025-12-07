import { h, render } from 'https://esm.sh/preact@10.19.3';
import { useState } from 'https://esm.sh/preact@10.19.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { Chat } from './lib/chat.js';

const html = htm.bind(h);

function App() {
  return html`
    <div class="app">
      <header>
        <h1>Monday Activity Chat</h1>
      </header>
      <main>
        <${Chat} />
      </main>
    </div>
  `;
}

render(html`<${App} />`, document.getElementById('app'));
