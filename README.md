# Monday Activity Chat

Chat interface for querying Monday.com activity data via AI and MCP tools.

## Prerequisites

- [Bun](https://bun.sh/) runtime
- [monday-activity-mcp](https://github.com/pel-sites/monday-activity-mcp) server

## Setup

1. Clone and set up the MCP server:
```bash
git clone https://github.com/pel-sites/monday-activity-mcp
cd monday-activity-mcp
npm install
./scripts/fetch-db.sh
npm start  # Runs on port 3000
```

2. Configure this project:
```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

3. Start the chat frontend:
```bash
bun run server.ts  # Runs on port 8000
```

4. Open http://localhost:8000

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key (required) | - |
| `MCP_SERVER_URL` | MCP server endpoint | `http://localhost:3000` |
| `PORT` | Frontend server port | `8000` |

## MCP Tools

The chat uses these tools from the MCP server:

- **get_schema** - Returns available tables and views
- **run_query** - Executes read-only SQL queries
- **get_user_metrics** - Returns user metrics with rankings
