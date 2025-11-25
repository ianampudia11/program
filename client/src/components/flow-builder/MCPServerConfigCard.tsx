import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, Eye, EyeOff, GripVertical, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MCPServerConfig } from '@shared/types/mcp-types';

interface MCPServerConfigCardProps {
  server: MCPServerConfig;
  index: number;
  onUpdate: (updates: Partial<MCPServerConfig>) => void;
  onRemove: () => void;
  t: (key: string, fallback?: string) => string;
}

export function MCPServerConfigCard({ server, index, onUpdate, onRemove, t }: MCPServerConfigCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>(() => {
    if (server.env) {
      return Object.entries(server.env).map(([key, value]) => ({ key, value }));
    }
    return [];
  });

  const updateEnvVar = (index: number, updates: Partial<{ key: string; value: string }>) => {
    const newEnvVars = [...envVars];
    newEnvVars[index] = { ...newEnvVars[index], ...updates };
    setEnvVars(newEnvVars);
    const envObj: Record<string, string> = {};
    newEnvVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envObj[key.trim()] = value;
      }
    });
    onUpdate({ env: envObj });
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const removeEnvVar = (index: number) => {
    const newEnvVars = envVars.filter((_, i) => i !== index);
    setEnvVars(newEnvVars);
    const envObj: Record<string, string> = {};
    newEnvVars.forEach(({ key, value }) => {
      if (key.trim()) {
        envObj[key.trim()] = value;
      }
    });
    onUpdate({ env: envObj });
  };

  const updateArgs = (newArgs: string[]) => {
    onUpdate({ args: newArgs });
  };

  const addArg = () => {
    const currentArgs = server.args || [];
    updateArgs([...currentArgs, '']);
  };

  const updateArg = (index: number, value: string) => {
    const currentArgs = server.args || [];
    const newArgs = [...currentArgs];
    newArgs[index] = value;
    updateArgs(newArgs);
  };

  const removeArg = (index: number) => {
    const currentArgs = server.args || [];
    updateArgs(currentArgs.filter((_, i) => i !== index));
  };

  const validateConfig = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!server.name?.trim()) {
      errors.push('Server name is required');
    }
    if (server.transport === 'stdio' && !server.command?.trim()) {
      errors.push('Command is required for stdio transport');
    }
    if (server.transport === 'http' && !server.url?.trim()) {
      errors.push('URL is required for HTTP transport');
    }
    if (server.transport === 'http' && server.url && !/^https?:\/\//.test(server.url)) {
      errors.push('URL must start with http:// or https://');
    }
    return { isValid: errors.length === 0, errors };
  };

  const validation = validateConfig();

  return (
    <div className={`group border rounded-lg p-3 transition-all duration-200 ${
      server.enabled
        ? 'border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50'
        : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="h-3 w-3 text-gray-400 cursor-grab" />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2">
              <span className="text-xs font-medium leading-tight break-words">
                {server.name || `MCP Server ${index + 1}`}
              </span>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                server.enabled
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {server.enabled ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                {server.enabled ? 'Active' : 'Inactive'}
              </div>
              <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                server.transport === 'stdio'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                {server.transport === 'stdio' ? 'Stdio' : 'HTTP'}
              </div>
            </div>
            {server.description && (
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight break-words">
                {server.description.split(' ').slice(0, 12).join(' ')}
                {server.description.split(' ').length > 12 ? '...' : ''}
              </p>
            )}
            {!validation.isValid && (
              <div className="flex items-center gap-1 mt-1 text-[9px] text-red-600">
                <AlertCircle className="h-2.5 w-2.5" />
                <span>{validation.errors[0]}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 ml-2">
          <Switch
            checked={server.enabled}
            onCheckedChange={(enabled) => onUpdate({ enabled })}
            className="scale-75"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-6 w-6 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 space-y-3 pl-4 border-l-2 border-emerald-200">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] font-medium text-gray-700">Server Name</Label>
              <Input
                value={server.name || ''}
                onChange={(e) => onUpdate({ name: e.target.value })}
                className="text-xs h-7 mt-1"
                placeholder="e.g., Cal.com Calendar"
              />
            </div>
            <div>
              <Label className="text-[10px] font-medium text-gray-700">Transport Type</Label>
              <Select
                value={server.transport}
                onValueChange={(value: 'stdio' | 'http') => {
                  onUpdate({ transport: value });
                  if (value === 'http') {
                    onUpdate({ command: undefined, args: undefined });
                  } else {
                    onUpdate({ url: undefined });
                  }
                }}
              >
                <SelectTrigger className="text-xs h-7 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stdio">Stdio (Process)</SelectItem>
                  <SelectItem value="http">HTTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {server.transport === 'stdio' ? (
            <>
              <div>
                <Label className="text-[10px] font-medium text-gray-700">Command</Label>
                <Input
                  value={server.command || ''}
                  onChange={(e) => onUpdate({ command: e.target.value })}
                  className="text-xs h-7 mt-1"
                  placeholder="e.g., npx"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[10px] font-medium text-gray-700">Arguments</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addArg}
                    className="h-5 text-[9px] px-2"
                  >
                    + Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {(server.args || []).map((arg, idx) => (
                    <div key={idx} className="flex gap-1">
                      <Input
                        value={arg}
                        onChange={(e) => updateArg(idx, e.target.value)}
                        className="text-xs h-6"
                        placeholder={`Argument ${idx + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArg(idx)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-[10px] font-medium text-gray-700">Environment Variables</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addEnvVar}
                    className="h-5 text-[9px] px-2"
                  >
                    + Add
                  </Button>
                </div>
                <div className="space-y-1">
                  {envVars.map((envVar, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-1">
                      <Input
                        value={envVar.key}
                        onChange={(e) => updateEnvVar(idx, { key: e.target.value })}
                        className="text-xs h-6"
                        placeholder="KEY"
                      />
                      <Input
                        value={envVar.value}
                        onChange={(e) => updateEnvVar(idx, { value: e.target.value })}
                        className="text-xs h-6"
                        placeholder="value"
                        type="password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEnvVar(idx)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div>
              <Label className="text-[10px] font-medium text-gray-700">URL</Label>
              <Input
                value={server.url || ''}
                onChange={(e) => onUpdate({ url: e.target.value })}
                className="text-xs h-7 mt-1"
                placeholder="https://mcp-server.example.com"
              />
            </div>
          )}

          <div>
            <Label className="text-[10px] font-medium text-gray-700">Description (Optional)</Label>
            <Input
              value={server.description || ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              className="text-xs h-7 mt-1"
              placeholder="Brief description of this MCP server"
            />
          </div>

          <div>
            <Label className="text-[10px] font-medium text-gray-700">Timeout (ms, Optional)</Label>
            <Input
              type="number"
              value={server.timeout || 30000}
              onChange={(e) => onUpdate({ timeout: parseInt(e.target.value) || 30000 })}
              className="text-xs h-7 mt-1"
              placeholder="30000"
            />
          </div>
        </div>
      )}
    </div>
  );
}

