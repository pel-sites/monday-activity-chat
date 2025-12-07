# Monday Activity Chat

Chat interface for querying Monday.com activity data via AI. Uses Claude API with MCP tools.

## Upstream Dependency

**MCP Server:** [pel-sites/monday-activity-mcp](https://github.com/pel-sites/monday-activity-mcp)

## Stack

- Preact + htm (ESM imports via esm.sh, no build)
- Bun server (serves static files + proxies Claude API)
- Claude API for conversation
- MCP tools from upstream server

## Local Development

### Prerequisites

- [Bun](https://bun.sh) installed
- Anthropic API key
- `monday-activity-mcp` server cloned and running

### Setup

1. Clone and set up the MCP server:
   ```bash
   git clone https://github.com/pel-sites/monday-activity-mcp.git
   cd monday-activity-mcp
   # follow its setup instructions
   ```

2. Clone this repo:
   ```bash
   git clone https://github.com/pel-sites/monday-activity-chat.git
   cd monday-activity-chat
   ```

3. Create `.env`:
   ```bash
   cp .env.example .env
   # edit .env and add your ANTHROPIC_API_KEY
   ```

### Running Locally

**Terminal 1 - MCP Server (port 3000):**
```bash
cd monday-activity-mcp
bun run server.ts
```

**Terminal 2 - Chat App (port 8000):**
```bash
cd monday-activity-chat
bun run server.ts
```

Open http://localhost:8000

## Project Structure

```
monday-activity-chat/
├── index.html          # Entry point
├── app.js              # Mounts Preact app
├── styles.css          # Styling
├── lib/
│   ├── chat.js         # Chat UI components
│   └── api.js          # Claude API client
├── server.ts           # Bun server (static + API proxy)
├── .env                # ANTHROPIC_API_KEY, MCP_SERVER_URL
├── Dockerfile          # Production build
└── fly.toml            # Fly.io deployment config
```

## How It Works

1. User types question in chat
2. Frontend sends to `/api/chat`
3. Server proxies to Claude API with MCP tool definitions
4. Claude calls MCP tools as needed (get_schema, run_query, get_user_metrics)
5. Server forwards tool calls to MCP server, returns results to Claude
6. Claude generates response with Answer + Justification
7. Frontend renders structured response

## Deployment

Deployed on Fly.io. Pushes to `main` trigger automatic deploy via GitHub Actions.

```bash
fly deploy
```
