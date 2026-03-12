'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import apiClient from '@/lib/api/client';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuId: string;
  templateSlug: string;
}

export function PreviewModal({ isOpen, onClose, menuId, templateSlug }: PreviewModalProps) {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHtml(null);
      setError(null);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.post(`/menus/${menuId}/preview`, {
          templateSlug,
        }, {
          responseType: 'text',
          headers: { Accept: 'text/html' },
        });
        setHtml(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to generate preview');
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [isOpen, menuId, templateSlug]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-full h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Template Preview</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-gray-500">Generating preview...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          {html && !loading && (
            <iframe
              srcDoc={html}
              className="w-full h-full border-0"
              title="Menu Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
