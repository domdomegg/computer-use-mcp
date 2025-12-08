import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerComputer} from './computer.js';

export function registerAll(server: McpServer): void {
	registerComputer(server);
}
