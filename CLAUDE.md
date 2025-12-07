# Monday Activity Chat

Chat interface for humans to interact with AI that queries Monday.com activity data via MCP tools.

## Other Considerations

Do only as I say and make no assumptions and be precise.

gh cli is set up for user ldraney or organization intelligent-staffing-systems or pel-sites.

Always when making or working from a new branch make sure there is an issue for the branch then make a git worktree in ~/worktrees.

Check your cwd. Git pull to make sure we are up to date with the latest default branch.

## Upstream Dependency

**MCP Server:** pel-sites/monday-activity-mcp

## Stack

- Preact + htm (ESM imports via esm.sh, no build)
- Deno/Bun server (single file, serves static + proxies Claude API)
- Claude API for conversation
- MCP tools from upstream server

## Project Structure

```
monday-activity-chat/
├── index.html
├── app.js                 # Preact UI entry
├── styles.css
├── lib/
│   ├── chat.js            # Message history, input, rendering
│   └── api.js             # Claude API calls
├── server.ts              # Deno/Bun server (static + API proxy)
├── .env                   # ANTHROPIC_API_KEY
├── .gitignore
└── README.md
```

## Flow

```
1. User types question
   ↓
2. Frontend sends to /api/chat
   ↓
3. Server proxies to Claude API with MCP tool definitions
   ↓
4. Claude calls MCP tools as needed (get_schema, run_query, etc.)
   ↓
5. Claude interprets results, generates response
   ↓
6. Frontend renders answer + justification
```

## Response UX

Each response shows:
- **Answer** - direct response to the question
- **Justification** - metrics/data that support the answer

For multi-metric questions (e.g., "who is most valuable"):
- Multiple metric cards
- Each card: metric name, explanation, winner, supporting data table
- Source attribution (which view/query)

## Principles

- No build step. ESM imports from CDN.
- Server only proxies Claude API (hides ANTHROPIC_API_KEY).
- MCP server handles all data access.
- Frontend is stateless - just renders conversation.
