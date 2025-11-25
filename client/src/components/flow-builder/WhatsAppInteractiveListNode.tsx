import React, { useState, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Plus,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  AlertCircle,
  List,
  ChevronDown
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { useTranslation } from '@/hooks/use-translation';
import { useFlowContext } from '../../pages/flow-builder';
import { standardHandleStyle } from '@/components/flow-builder/StyledHandle';
import { cn } from '@/lib/utils';

interface WhatsAppListRow {
  id: string;
  title: string;
  description?: string;
  payload: string;
}

interface WhatsAppListSection {
  id: string;
  title: string;
  rows: WhatsAppListRow[];
}

interface WhatsAppInteractiveListNodeData {
  label: string;
  headerText?: string;
  bodyText: string;
  footerText?: string;
  buttonText: string;
  sections: WhatsAppListSection[];
}

interface WhatsAppInteractiveListNodeProps {
  id: string;
  data: WhatsAppInteractiveListNodeData;
  isConnectable: boolean;
}

const WhatsAppInteractiveListNode: React.FC<WhatsAppInteractiveListNodeProps> = ({
  id,
  data,
  isConnectable
}) => {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const { onDeleteNode, onDuplicateNode } = useFlowContext();
  
  const [isEditing, setIsEditing] = useState(false);
  const [headerText, setHeaderText] = useState(data.headerText || '');
  const [bodyText, setBodyText] = useState(data.bodyText || t('whatsapp_list.default_body', 'Please select an option:'));
  const [footerText, setFooterText] = useState(data.footerText || '');
  const [buttonText, setButtonText] = useState(data.buttonText || t('whatsapp_list.default_button', 'View Options'));
  const [sections, setSections] = useState<WhatsAppListSection[]>(
    data.sections || [
      {
        id: '1',
        title: t('whatsapp_list.default_section', 'Options'),
        rows: [
          { id: '1', title: t('whatsapp_list.default_option1', 'Option 1'), description: '', payload: 'option_1' },
          { id: '2', title: t('whatsapp_list.default_option2', 'Option 2'), description: '', payload: 'option_2' }
        ]
      }
    ]
  );

  const updateNodeData = useCallback(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                headerText: headerText.trim() || undefined,
                bodyText: bodyText.trim(),
                footerText: footerText.trim() || undefined,
                buttonText: buttonText.trim(),
                sections: sections.filter(section => 
                  section.title.trim() && 
                  section.rows.some(row => row.title.trim() && row.payload.trim())
                ).map(section => ({
                  ...section,
                  rows: section.rows.filter(row => row.title.trim() && row.payload.trim())
                }))
              }
            }
          : node
      )
    );
  }, [id, setNodes, headerText, bodyText, footerText, buttonText, sections]);

  const handleDoneClick = useCallback(() => {
    updateNodeData();
    setIsEditing(false);
  }, [updateNodeData]);

  const addSection = useCallback(() => {
    if (sections.length < 10) {
      const newSection: WhatsAppListSection = {
        id: Date.now().toString(),
        title: `${t('whatsapp_list.section', 'Section')} ${sections.length + 1}`,
        rows: [
          { id: Date.now().toString() + '_1', title: t('whatsapp_list.option', 'Option'), description: '', payload: `section_${sections.length + 1}_option_1` }
        ]
      };
      setSections([...sections, newSection]);
    }
  }, [sections, t]);

  const removeSection = useCallback((sectionId: string) => {
    if (sections.length > 1) {
      setSections(sections.filter(section => section.id !== sectionId));
    }
  }, [sections]);

  const updateSection = useCallback((sectionId: string, field: 'title', value: string) => {
    setSections(sections.map(section => 
      section.id === sectionId ? { ...section, [field]: value } : section
    ));
  }, [sections]);

  const addRow = useCallback((sectionId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId && section.rows.length < 10) {
        const newRow: WhatsAppListRow = {
          id: Date.now().toString(),
          title: `${t('whatsapp_list.option', 'Option')} ${section.rows.length + 1}`,
          description: '',
          payload: `${section.title.toLowerCase().replace(/\s+/g, '_')}_option_${section.rows.length + 1}`
        };
        return { ...section, rows: [...section.rows, newRow] };
      }
      return section;
    }));
  }, [sections, t]);

  const removeRow = useCallback((sectionId: string, rowId: string) => {
    setSections(sections.map(section => {
      if (section.id === sectionId && section.rows.length > 1) {
        return { ...section, rows: section.rows.filter(row => row.id !== rowId) };
      }
      return section;
    }));
  }, [sections]);

  const updateRow = useCallback((sectionId: string, rowId: string, field: 'title' | 'description' | 'payload', value: string) => {
    setSections(sections.map(section => 
      section.id === sectionId 
        ? { 
            ...section, 
            rows: section.rows.map(row => 
              row.id === rowId ? { ...row, [field]: value } : row
            )
          }
        : section
    ));
  }, [sections]);


  const validateRow = (row: WhatsAppListRow) => {
    const titleLength = row.title.trim().length;
    const descriptionLength = (row.description || '').trim().length;
    const payloadLength = row.payload.trim().length;
    
    return {
      titleValid: titleLength >= 1 && titleLength <= 24,
      descriptionValid: descriptionLength <= 72,
      payloadValid: payloadLength >= 1 && payloadLength <= 200,
      titleError: titleLength === 0 ? 'Title required' : titleLength > 24 ? 'Max 24 characters' : null,
      descriptionError: descriptionLength > 72 ? 'Max 72 characters' : null,
      payloadError: payloadLength === 0 ? 'Payload required' : payloadLength > 200 ? 'Max 200 characters' : null
    };
  };

  const validateText = (text: string, maxLength: number, required: boolean = false) => {
    const length = text.trim().length;
    if (required && length === 0) return 'Required';
    if (length > maxLength) return `Max ${maxLength} characters`;
    return null;
  };

  const headerError = validateText(headerText, 60);
  const bodyError = validateText(bodyText, 1024, true);
  const footerError = validateText(footerText, 60);
  const buttonError = validateText(buttonText, 20, true);

  const totalRows = sections.reduce((total, section) => total + section.rows.length, 0);
  const hasErrors = headerError || bodyError || footerError || buttonError || 
    totalRows > 10 ||
    sections.some(section => 
      section.rows.some(row => {
        const validation = validateRow(row);
        return !validation.titleValid || !validation.descriptionValid || !validation.payloadValid;
      })
    );

  return (
    <div className="node-whatsapp-interactive-list p-3 rounded-lg bg-white border border-green-200 shadow-sm min-w-[400px] max-w-[500px] group">
      {/* Node Toolbar */}
      <div className="absolute -top-8 -right-2 bg-background border rounded-md shadow-sm flex z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDuplicateNode(id)}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t('flow_builder.duplicate_node', 'Duplicate node')}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDeleteNode(id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">{t('flow_builder.delete_node', 'Delete node')}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Node Header */}
      <div className="font-medium flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4 text-green-600" />
          <span className="text-sm">{t('whatsapp_list.node_title', 'WhatsApp Interactive List')}</span>
        </div>
        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
          {t('whatsapp_list.official_api', 'Official API')}
        </Badge>
        <button
          className="ml-auto text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          onClick={() => isEditing ? handleDoneClick() : setIsEditing(true)}
        >
          {isEditing ? (
            <>
              <EyeOff className="h-3 w-3" />
              {t('common.done', 'Done')}
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              {t('common.edit', 'Edit')}
            </>
          )}
        </button>
      </div>

      {/* Error Indicator */}
      {hasErrors && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <span className="text-xs text-red-600">
            {t('whatsapp_list.validation_errors', 'Please fix validation errors')}
          </span>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="space-y-4">
          {/* Header Text */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {t('whatsapp_list.header_text', 'Header Text')}
              <span className="text-gray-500 ml-1">({t('common.optional', 'Optional')})</span>
            </Label>
            <Input
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder={t('whatsapp_list.header_placeholder', 'Optional header text...')}
              className={cn("text-xs", headerError && "border-red-300")}
              maxLength={60}
            />
            {headerError && (
              <p className="text-xs text-red-500">{headerError}</p>
            )}
            <p className="text-xs text-gray-500">
              {headerText.length}/60 {t('common.characters', 'characters')}
            </p>
          </div>

          {/* Body Text */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {t('whatsapp_list.body_text', 'Body Text')}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Textarea
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder={t('whatsapp_list.body_placeholder', 'Enter your message text...')}
              className={cn("text-xs min-h-[60px]", bodyError && "border-red-300")}
              maxLength={1024}
            />
            {bodyError && (
              <p className="text-xs text-red-500">{bodyError}</p>
            )}
            <p className="text-xs text-gray-500">
              {bodyText.length}/1024 {t('common.characters', 'characters')}
            </p>
          </div>

          {/* Button Text */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {t('whatsapp_list.button_text', 'Button Text')}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              value={buttonText}
              onChange={(e) => setButtonText(e.target.value)}
              placeholder={t('whatsapp_list.button_placeholder', 'View Options')}
              className={cn("text-xs", buttonError && "border-red-300")}
              maxLength={20}
            />
            {buttonError && (
              <p className="text-xs text-red-500">{buttonError}</p>
            )}
            <p className="text-xs text-gray-500">
              {buttonText.length}/20 {t('common.characters', 'characters')}
            </p>
          </div>

          {/* Footer Text */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {t('whatsapp_list.footer_text', 'Footer Text')}
              <span className="text-gray-500 ml-1">({t('common.optional', 'Optional')})</span>
            </Label>
            <Input
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder={t('whatsapp_list.footer_placeholder', 'Optional footer text...')}
              className={cn("text-xs", footerError && "border-red-300")}
              maxLength={60}
            />
            {footerError && (
              <p className="text-xs text-red-500">{footerError}</p>
            )}
            <p className="text-xs text-gray-500">
              {footerText.length}/60 {t('common.characters', 'characters')}
            </p>
          </div>

          {/* Sections Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {t('whatsapp_list.sections', 'List Sections')}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSection}
                disabled={sections.length >= 10}
                className="h-6 px-2 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {t('whatsapp_list.add_section', 'Add Section')}
              </Button>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto">
              {sections.map((section, sectionIndex) => (
                <div key={section.id} className="border rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700">
                      {t('whatsapp_list.section', 'Section')} {sectionIndex + 1}
                    </span>
                    {sections.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSection(section.id)}
                        className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs">
                        {t('whatsapp_list.section_title', 'Section Title')}
                        <span className="text-red-500 ml-1">*</span>
                      </Label>
                      <Input
                        value={section.title}
                        onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                        placeholder={t('whatsapp_list.section_title_placeholder', 'Section name...')}
                        className="text-xs"
                        maxLength={24}
                      />
                    </div>

                    {/* Section Rows */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">
                          {t('whatsapp_list.rows', 'List Items')}
                        </Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addRow(section.id)}
                          disabled={section.rows.length >= 10 || totalRows >= 10}
                          className="h-5 px-2 text-xs"
                        >
                          <Plus className="h-2 w-2 mr-1" />
                          {t('whatsapp_list.add_row', 'Add Item')}
                        </Button>
                      </div>

                      {section.rows.map((row, rowIndex) => {
                        const validation = validateRow(row);
                        return (
                          <div key={row.id} className="border rounded p-2 bg-white space-y-2 relative">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600">
                                {t('whatsapp_list.item', 'Item')} {rowIndex + 1}
                              </span>
                              {section.rows.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeRow(section.id, row.id)}
                                  className="h-4 w-4 p-0 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-2 w-2" />
                                </Button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 gap-2">
                              <div>
                                <Label className="text-xs">
                                  {t('whatsapp_list.row_title', 'Title')}
                                  <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <Input
                                  value={row.title}
                                  onChange={(e) => updateRow(section.id, row.id, 'title', e.target.value)}
                                  placeholder={t('whatsapp_list.row_title_placeholder', 'Item title...')}
                                  className={cn("text-xs", !validation.titleValid && "border-red-300")}
                                  maxLength={24}
                                />
                                {validation.titleError && (
                                  <p className="text-xs text-red-500">{validation.titleError}</p>
                                )}
                              </div>

                              <div>
                                <Label className="text-xs">
                                  {t('whatsapp_list.row_description', 'Description')}
                                  <span className="text-gray-500 ml-1">({t('common.optional', 'Optional')})</span>
                                </Label>
                                <Input
                                  value={row.description || ''}
                                  onChange={(e) => updateRow(section.id, row.id, 'description', e.target.value)}
                                  placeholder={t('whatsapp_list.row_description_placeholder', 'Optional description...')}
                                  className={cn("text-xs", !validation.descriptionValid && "border-red-300")}
                                  maxLength={72}
                                />
                                {validation.descriptionError && (
                                  <p className="text-xs text-red-500">{validation.descriptionError}</p>
                                )}
                              </div>

                              <div>
                                <Label className="text-xs">
                                  {t('whatsapp_list.row_payload', 'Payload')}
                                  <span className="text-red-500 ml-1">*</span>
                                </Label>
                                <Input
                                  value={row.payload}
                                  onChange={(e) => updateRow(section.id, row.id, 'payload', e.target.value)}
                                  placeholder={t('whatsapp_list.row_payload_placeholder', 'item_value')}
                                  className={cn("text-xs", !validation.payloadValid && "border-red-300")}
                                  maxLength={200}
                                />
                                {validation.payloadError && (
                                  <p className="text-xs text-red-500">{validation.payloadError}</p>
                                )}
                              </div>
                            </div>

                            {/* Source handle for this row */}
                            <Handle
                              type="source"
                              position={Position.Right}
                              id={row.payload}
                              style={{
                                ...standardHandleStyle,
                                top: '50%',
                                right: '-12px'
                              }}
                              isConnectable={isConnectable}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-gray-500 space-y-1">
              <p>{t('whatsapp_list.section_limit', 'Maximum 10 sections allowed by WhatsApp API')}</p>
              <p>{t('whatsapp_list.row_limit', `Total items: ${totalRows}/10 (maximum 10 items across all sections)`)}</p>
            </div>
          </div>

          {/* API Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">
                  {t('whatsapp_list.api_info_title', 'WhatsApp Business API Requirements')}
                </p>
                <ul className="space-y-1 text-xs">
                  <li>• {t('whatsapp_list.api_info_1', 'Only works with Official WhatsApp Business API connections')}</li>
                  <li>• {t('whatsapp_list.api_info_2', 'Maximum 10 sections with up to 10 total rows')}</li>
                  <li>• {t('whatsapp_list.api_info_3', 'Row titles: 1-24 characters, descriptions: max 72 characters')}</li>
                  <li>• {t('whatsapp_list.api_info_4', 'Users can select items from the list to respond')}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Mode */}
      {!isEditing && (
        <div className="space-y-3">
          {/* WhatsApp Message Preview */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            {headerText && (
              <div className="font-medium text-sm text-gray-800 mb-2">
                {headerText}
              </div>
            )}
            <div className="text-sm text-gray-700 mb-3">
              {bodyText}
            </div>

            {/* List Button Preview */}
            <div className="border border-green-300 rounded-md p-2 text-center text-sm bg-white hover:bg-green-50 transition-colors flex items-center justify-center gap-2">
              <span>{buttonText}</span>
              <ChevronDown className="h-3 w-3" />
            </div>

            {/* List Items Preview */}
            <div className="mt-3 space-y-2">
              {sections.map((section) => (
                <div key={section.id} className="border-l-2 border-green-300 pl-2">
                  <div className="text-xs font-medium text-gray-600 mb-1">{section.title}</div>
                  {section.rows.map((row) => (
                    <div key={row.id} className="text-xs text-gray-500 mb-1 relative">
                      <div className="font-medium">{row.title}</div>
                      {row.description && (
                        <div className="text-gray-400">{row.description}</div>
                      )}
                      <Handle
                        type="source"
                        position={Position.Right}
                        id={row.payload}
                        style={{
                          ...standardHandleStyle,
                          top: '50%',
                          right: '-9%'
                        }}
                        isConnectable={isConnectable}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {footerText && (
              <div className="text-xs text-gray-500 mt-3">
                {footerText}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500">
            {t('whatsapp_list.item_count', `${totalRows} item(s) in ${sections.length} section(s)`)}
          </div>
        </div>
      )}

      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={standardHandleStyle}
        isConnectable={isConnectable}
      />
    </div>
  );
};

export default WhatsAppInteractiveListNode;
