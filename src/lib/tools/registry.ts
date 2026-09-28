/**
 * Tool registry — maps tool IDs to implementations.
 */

import type { Tool } from "./types";

const tools: Map<string, Tool> = new Map();

export const toolRegistry = {
  register(tool: Tool) {
    tools.set(tool.id, tool);
  },

  get(id: string): Tool | undefined {
    return tools.get(id);
  },

  getAll(): Tool[] {
    return Array.from(tools.values());
  },
};
