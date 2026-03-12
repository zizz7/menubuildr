'use client';

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api/client';
import { TemplateCard } from './TemplateCard';

interface Template {
  id: string;
  slug: string;
  name: Record<string, string>;
  description: Record<string, string>;
  previewImageUrl: string | null;
}

interface TemplateSelectorProps {
  selectedTemplateId: string | null;
  onTemplateSelect: (template: Template) => void;
  onPreview: (template: Template) => void;
}

export function TemplateSelector({ selectedTemplateId, onTemplateSelect, onPreview }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await apiClient.get('/templates');
        setTemplates(response.data);
      } catch (error) {
        console.error('Failed to fetch templates:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-sm text-gray-500">Loading templates...</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No templates available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isSelected={selectedTemplateId === template.id}
          onSelect={onTemplateSelect}
          onPreview={onPreview}
        />
      ))}
    </div>
  );
}
