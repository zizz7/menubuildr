'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Languages, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import apiClient from '@/lib/api/client';
import { toast } from 'sonner';

interface MultiLanguageInputProps {
  label: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  languages: Array<{ code: string; name: string }>;
  defaultLanguage?: string;
  placeholder?: string;
  type?: 'input' | 'textarea';
  rows?: number;
  showTranslate?: boolean;
  sourceText?: string;
  autoTranslate?: boolean; // New prop for auto-translation
}

export function MultiLanguageInput({
  label,
  value,
  onChange,
  languages,
  defaultLanguage = 'ENG',
  placeholder,
  type = 'input',
  rows = 4,
  showTranslate = false,
  sourceText,
  autoTranslate = true, // Default to true for automatic translation
}: MultiLanguageInputProps) {
  const [translating, setTranslating] = useState<string | null>(null);
  const [translatingAll, setTranslatingAll] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const previousDefaultValue = useRef<string>('');

  const handleTranslate = async (targetLang: string) => {
    const textToTranslate = value[defaultLanguage] || sourceText || '';
    if (!textToTranslate) {
      toast.error('Please enter text in the default language first');
      return;
    }

    if (value[targetLang]) {
      if (!confirm('This will overwrite the existing translation. Continue?')) {
        return;
      }
    }

    setTranslating(targetLang);
    try {
      const response = await apiClient.post('/translate', {
        text: textToTranslate,
        sourceLanguage: defaultLanguage,
        targetLanguage: targetLang,
      });

      const translatedText = response.data.translatedText;
      
      if (translatedText && translatedText !== textToTranslate) {
        onChange({
          ...value,
          [targetLang]: translatedText,
        });
        toast.success(`Translated to ${languages.find((l) => l.code === targetLang)?.name}`);
      } else if (response.data.warning) {
        toast.warning('Translation service temporarily unavailable. Please translate manually.');
      } else {
        toast.error('Translation returned the same text. Please translate manually.');
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      const errorMsg = error.response?.data?.error || 'Translation failed';
      toast.error(`${errorMsg}. Please translate manually.`);
    } finally {
      setTranslating(null);
    }
  };

  const handleChange = (lang: string, newValue: string) => {
    const newValueObj = {
      ...value,
      [lang]: newValue,
    };
    onChange(newValueObj);

    // Auto-translate to all languages when default language changes
    if (autoTranslate && lang === defaultLanguage && newValue.trim().length > 0) {
      // Debounce translation to avoid too many API calls
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(async () => {
        // Only translate if the text actually changed
        if (newValue.trim() !== previousDefaultValue.current) {
          previousDefaultValue.current = newValue.trim();
          await translateToAllLanguages(newValue.trim(), newValueObj);
        }
      }, 1000); // Wait 1 second after user stops typing
    }
  };

  const translateToAllLanguages = async (textToTranslate: string, currentValue: Record<string, string>) => {
    const targetLanguages = languages.filter((l) => l.code !== defaultLanguage);
    
    if (targetLanguages.length === 0) return;

    setTranslatingAll(true);
    const translations: Record<string, string> = { ...currentValue };
    let successCount = 0;
    let failCount = 0;

    // Translate to all languages in parallel
    const translationPromises = targetLanguages.map(async (lang) => {
      try {
        const response = await apiClient.post('/translate', {
          text: textToTranslate,
          sourceLanguage: defaultLanguage,
          targetLanguage: lang.code,
        });

        const translatedText = response.data.translatedText;
        if (translatedText && translatedText !== textToTranslate) {
          translations[lang.code] = translatedText;
          successCount++;
        }
      } catch (error) {
        console.error(`Translation to ${lang.code} failed:`, error);
        failCount++;
      }
    });

    await Promise.all(translationPromises);

    // Update all translations at once
    onChange(translations);

    if (successCount > 0) {
      toast.success(`Auto-translated to ${successCount} language${successCount > 1 ? 's' : ''}`, {
        duration: 2000,
      });
    }
    if (failCount > 0) {
      toast.warning(`${failCount} translation${failCount > 1 ? 's' : ''} failed. You can translate manually.`, {
        duration: 3000,
      });
    }

    setTranslatingAll(false);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const defaultLang = languages.find((l) => l.code === defaultLanguage) || languages[0];
  const otherLanguages = languages.filter((l) => l.code !== defaultLanguage);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {autoTranslate && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            {translatingAll && (
              <>
                <Sparkles className="h-3 w-3 animate-pulse" />
                <span>Auto-translating...</span>
              </>
            )}
            {!translatingAll && value[defaultLanguage] && (
              <span className="text-green-600">✓ Auto-translation enabled</span>
            )}
          </div>
        )}
      </div>

      {/* Default Language Field - Prominent */}
      <div className="space-y-2">
        <Label htmlFor={`${label}-${defaultLanguage}`} className="text-sm font-medium flex items-center gap-2">
          <Languages className="h-4 w-4" />
          {defaultLang.code}
          <span className="text-xs text-gray-500">(Default - Type here, auto-translates to all languages)</span>
        </Label>
        {type === 'textarea' ? (
          <textarea
            id={`${label}-${defaultLanguage}`}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={value[defaultLanguage] || ''}
            onChange={(e) => handleChange(defaultLanguage, e.target.value)}
            placeholder={placeholder || `Enter ${defaultLang.name} text...`}
            rows={rows}
          />
        ) : (
          <Input
            id={`${label}-${defaultLanguage}`}
            value={value[defaultLanguage] || ''}
            onChange={(e) => handleChange(defaultLanguage, e.target.value)}
            placeholder={placeholder || `Enter ${defaultLang.name} text...`}
            className="text-base"
          />
        )}
      </div>

      {/* Other Languages - Collapsible */}
      {otherLanguages.length > 0 && (
        <div className="border rounded-lg">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAllLanguages(!showAllLanguages)}
            className="w-full justify-between"
          >
            <span className="text-sm text-gray-600">
              {showAllLanguages ? 'Hide' : 'Show'} other languages ({otherLanguages.length})
            </span>
            {showAllLanguages ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>

          {showAllLanguages && (
            <div className="p-4 space-y-3 border-t">
              {otherLanguages.map((lang) => (
                <div key={lang.code} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`${label}-${lang.code}`} className="text-sm font-medium flex items-center gap-2">
                      <Languages className="h-3 w-3" />
                      {lang.code}
                      {value[lang.code] && autoTranslate && (
                        <span className="text-xs text-green-600">(Auto-translated)</span>
                      )}
                    </Label>
                    {showTranslate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTranslate(lang.code)}
                        disabled={translating === lang.code || !value[defaultLanguage]}
                        className="h-7 text-xs"
                      >
                        <Sparkles className="h-3 w-3 mr-1" />
                        {translating === lang.code ? 'Translating...' : 'Re-translate'}
                      </Button>
                    )}
                  </div>
                  {type === 'textarea' ? (
                    <textarea
                      id={`${label}-${lang.code}`}
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={value[lang.code] || ''}
                      onChange={(e) => handleChange(lang.code, e.target.value)}
                      placeholder={placeholder || `Enter ${lang.name} translation...`}
                      rows={rows}
                    />
                  ) : (
                    <Input
                      id={`${label}-${lang.code}`}
                      value={value[lang.code] || ''}
                      onChange={(e) => handleChange(lang.code, e.target.value)}
                      placeholder={placeholder || `Enter ${lang.name} translation...`}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

