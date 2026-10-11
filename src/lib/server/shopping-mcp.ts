import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport, getDefaultEnvironment } from "@modelcontextprotocol/client/stdio";

export class ShoppingUnavailable extends Error {}

const holder = globalThis as typeof globalThis & { shoppingMcp?: Promise<Client> };

async function connect() {
  const directory = process.env.SHOPPING_MCP_DIR;
  if (!directory) throw new ShoppingUnavailable("Set SHOPPING_MCP_DIR in .env to your shopping-mcp checkout, then restart the server.");

  const client = new Client({ name: "subq-lab", version: "0.1.0" });
  client.onclose = () => {
    holder.shoppingMcp = undefined;
  };
  try {
    await client.connect(
      new StdioClientTransport({
        command: "uv",
        args: ["run", "--directory", directory, "shopping-mcp"],
        env: getDefaultEnvironment(),
        stderr: "ignore",
      }),
    );
  } catch {
    throw new ShoppingUnavailable("Unable to start the shopping MCP. Check SHOPPING_MCP_DIR and that uv is installed.");
  }
  return client;
}

export function shoppingClient() {
  holder.shoppingMcp ??= connect().catch((error) => {
    holder.shoppingMcp = undefined;
    throw error;
  });
  return holder.shoppingMcp;
}

export async function callShopping<T>(name: string, args: Record<string, unknown>, timeout = 25_000): Promise<T> {
  const client = await shoppingClient();
  const result = await client.callTool({ name, arguments: args }, { timeout });
  const content = Array.isArray(result.content) ? result.content : [];
  const text = content.find((block) => block.type === "text")?.text ?? "";
  if (result.isError) throw new Error(text || `${name} failed`);
  return JSON.parse(text) as T;
}
