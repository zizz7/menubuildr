'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, Check } from 'lucide-react';

interface Template {
  id: string;
  slug: string;
  name: Record<string, string>;
  description: Record<string, string>;
  previewImageUrl: string | null;
}

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: (template: Template) => void;
  onPreview: (template: Template) => void;
}

export function TemplateCard({ template, isSelected, onSelect, onPreview }: TemplateCardProps) {
  return (
    <Card
      className={`relative cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:ring-1 hover:ring-gray-300'
      }`}
      onClick={() => onSelect(template)}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white rounded-full p-1">
          <Check className="h-4 w-4" />
        </div>
      )}
      <div className="aspect-video bg-gray-100 rounded-t-lg overflow-hidden flex items-center justify-center">
        {template.previewImageUrl ? (
          <img
            src={template.previewImageUrl}
            alt={template.name['ENG'] || template.slug}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-gray-400 text-sm">
            {template.slug === 'classic' ? '📄' : '🃏'} Preview
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="font-semibold text-sm mb-1">
          {template.name['ENG'] || template.slug}
        </h3>
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">
          {template.description['ENG'] || ''}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(template);
          }}
        >
          <Eye className="h-3 w-3 mr-1" />
          Preview
        </Button>
      </CardContent>
    </Card>
  );
}
