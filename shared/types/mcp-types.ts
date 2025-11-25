/**
 * MCP (Model Context Protocol) Type Definitions
 * Shared types for MCP server configurations and tool definitions
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  enabled: boolean;
  transport: 'stdio' | 'http';
  

  command?: string;
  args?: string[];
  env?: Record<string, string>;
  

  url?: string;
  

  description?: string;
  timeout?: number; // in milliseconds
}

export interface MCPToolDefinition {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolCall {
  serverConfigId: string;
  toolName: string;
  arguments: Record<string, any>;
}

export interface MCPToolResult {
  success: boolean;
  content?: any;
  error?: string;
  isError?: boolean;
}

export interface MCPServerConnection {
  id: string;
  config: MCPServerConfig;
  client: any; // MCP Client instance
  transport: any; // Transport instance
  tools: MCPToolDefinition[];
  connectedAt: Date;
  lastUsedAt: Date;
}

