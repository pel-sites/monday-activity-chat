import { file, serve } from "bun";
import { join } from "path";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:3000";

const mcpTools = [
  {
    name: "get_schema",
    description: "Returns available tables, views, and their columns from the Monday.com activity database. Use this to understand what data is available before running queries.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "run_query",
    description: "Executes a read-only SQL SELECT query against the Monday.com activity database. Only SELECT statements are allowed.",
    input_schema: {
      type: "object",
      properties: {
        sql: {
          type: "string",
          description: "The SQL SELECT query to execute",
        },
      },
      required: ["sql"],
    },
  },
];

const systemPrompt = `You are an assistant that helps users query and analyze Monday.com activity data.

You have access to tools that let you:
1. get_schema - Discover what tables and views are available
2. run_query - Execute SQL queries to retrieve data

When answering questions:
1. First use get_schema to understand the available data if needed
2. Then use run_query to fetch relevant data
3. Analyze the results and provide a clear answer with supporting data

Always explain what data you found and how it supports your answer.`;

async function callMcpTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/tools/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      return { error: `MCP server error: ${response.status}` };
    }
    return response.json();
  } catch (error) {
    return { error: `Failed to call MCP tool: ${error}` };
  }
}

async function handleChat(req: Request): Promise<Response> {
  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: "API key not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    let messages = body.messages;

    while (true) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          tools: mcpTools,
          messages,
        }),
      });

      const data = await response.json();

      if (data.error) {
        return new Response(JSON.stringify(data), {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (data.stop_reason !== "tool_use") {
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json" },
        });
      }

      const assistantMessage = { role: "assistant", content: data.content };
      messages = [...messages, assistantMessage];

      const toolResults = [];
      for (const block of data.content) {
        if (block.type === "tool_use") {
          const result = await callMcpTool(block.name, block.input);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(result),
          });
        }
      }

      messages = [...messages, { role: "user", content: toolResults }];
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: `Server error: ${error}` }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

const contentTypes: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

function getContentType(path: string): string {
  const ext = path.substring(path.lastIndexOf("."));
  return contentTypes[ext] || "application/octet-stream";
}

async function serveStatic(pathname: string): Promise<Response> {
  const filePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const fullPath = join(import.meta.dir, filePath);

  const bunFile = file(fullPath);
  if (await bunFile.exists()) {
    return new Response(bunFile, {
      headers: { "Content-Type": getContentType(filePath) },
    });
  }

  return new Response("Not Found", { status: 404 });
}

const port = parseInt(process.env.PORT || "8000");
console.log(`Server running at http://localhost:${port}`);

serve({
  port,
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/api/chat" && req.method === "POST") {
      return handleChat(req);
    }

    return serveStatic(url.pathname);
  },
});
