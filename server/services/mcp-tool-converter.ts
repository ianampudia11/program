/**
 * MCP Tool Converter Utility
 * Converts between MCP tool schemas and OpenAI function definitions
 */

import { MCPToolDefinition } from '@shared/types/mcp-types';

export interface OpenAIFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Convert MCP tool schema to OpenAI function definition format
 */
export function convertMCPToolToOpenAIFunction(mcpTool: MCPToolDefinition): OpenAIFunctionDefinition {
  const schema = mcpTool.inputSchema || { type: 'object', properties: {}, required: [] };
  

  const properties: Record<string, any> = {};
  const required: string[] = [];
  
  if (schema.properties) {
    for (const [key, value] of Object.entries(schema.properties)) {
      properties[key] = {
        type: mapJsonSchemaTypeToOpenAI(value.type || 'string'),
        description: value.description || '',
        ...(value.enum && { enum: value.enum }),
        ...(value.default !== undefined && { default: value.default })
      };
      

      if (value.type === 'object' && value.properties) {
        properties[key].properties = value.properties;
      }
      

      if (value.type === 'array' && value.items) {
        properties[key].items = {
          type: mapJsonSchemaTypeToOpenAI(value.items.type || 'string')
        };
      }
    }
  }
  
  if (schema.required && Array.isArray(schema.required)) {
    required.push(...schema.required);
  }
  
  return {
    name: mcpTool.name,
    description: mcpTool.description || `Execute ${mcpTool.name} tool`,
    parameters: {
      type: 'object',
      properties,
      required
    }
  };
}

/**
 * Map JSON Schema types to OpenAI parameter types
 */
function mapJsonSchemaTypeToOpenAI(jsonSchemaType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'string',
    'number': 'number',
    'integer': 'number',
    'boolean': 'boolean',
    'array': 'array',
    'object': 'object',
    'null': 'string' // OpenAI doesn't support null, use string as fallback
  };
  
  return typeMap[jsonSchemaType.toLowerCase()] || 'string';
}

/**
 * Convert OpenAI function call arguments to MCP tool call format
 * This is typically a pass-through, but can handle type coercion if needed
 */
export function convertOpenAIArgsToMCPArgs(args: any): any {


  return args;
}

