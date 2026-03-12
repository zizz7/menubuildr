'use client';

import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface MenuTemplate {
  id: string;
  slug: string;
  name: Record<string, string>;
  description: Record<string, string>;
  previewImageUrl: string;
  version: string;
  isActive: boolean;
}

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateChange: (templateId: string) => void;
  disabled?: boolean;
}

export function TemplateSelector({ selectedTemplateId, onTemplateChange, disabled }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/templates');
      setTemplates(response.data);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to load templates';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Template</Label>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading templates...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>Template</Label>
        <div className="flex items-center gap-2">
          <p className="text-sm text-red-500">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchTemplates}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="template-selector">Template</Label>
      <Select
        value={selectedTemplateId || ''}
        onValueChange={onTemplateChange}
        disabled={disabled || templates.length === 0}
      >
        <SelectTrigger id="template-selector" className="w-full">
          <SelectValue placeholder="Select a template" />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => {
            const templateName = template.name.ENG || Object.values(template.name)[0] || template.slug;
            return (
              <SelectItem key={template.id} value={template.id}>
                <div className="flex items-center gap-2">
                  {template.previewImageUrl && (
                    <img
                      src={template.previewImageUrl}
                      alt={templateName}
                      className="w-8 h-8 object-cover rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <span>{templateName}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {templates.length === 0 && !loading && (
        <p className="text-xs text-gray-500">No templates available</p>
      )}
    </div>
  );
}
