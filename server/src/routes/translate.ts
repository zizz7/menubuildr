import express from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireSubscription } from '../middleware/subscription';
import translate from 'translate';

const router = express.Router();

router.use(authenticateToken);
router.use(requireSubscription);

// Language code mapping for translate package
const languageCodeMap: Record<string, string> = {
  'ENG': 'en',
  'CHN': 'zh',
  'GER': 'de',
  'JAP': 'ja',
  'RUS': 'ru',
  'FRA': 'fr',
  'SPA': 'es',
  'ITA': 'it',
  'POR': 'pt',
  'KOR': 'ko',
  'ARA': 'ar',
  'HIN': 'hi',
  'TUR': 'tr',
  'POL': 'pl',
  'DUT': 'nl',
};

// Translate text (field-level)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!sourceLanguage || !targetLanguage) {
      return res.status(400).json({ error: 'Source and target languages are required' });
    }

    // If source and target are the same, return the text as-is
    if (sourceLanguage === targetLanguage) {
      return res.json({
        translatedText: text,
        sourceLanguage,
        targetLanguage,
      });
    }

    // Map language codes
    const sourceCode = languageCodeMap[sourceLanguage] || sourceLanguage.toLowerCase();
    const targetCode = languageCodeMap[targetLanguage] || targetLanguage.toLowerCase();

    try {
      // Use translate package (uses Google Translate free API)
      const translatedText = await translate(text, {
        from: sourceCode,
        to: targetCode,
      });

      res.json({
        translatedText: translatedText || text,
        sourceLanguage,
        targetLanguage,
      });
    } catch (translateError: any) {
      console.error('Translation API error:', translateError);
      // Fallback: return original text with a note
      res.json({
        translatedText: text,
        sourceLanguage,
        targetLanguage,
        warning: 'Translation service unavailable, returning original text',
      });
    }
  } catch (error) {
    console.error('Translate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Batch translate entire menu
router.post('/menu/:menuId', async (req: AuthRequest, res) => {
  try {
    const { targetLanguage } = req.body;

    // TODO: Implement batch translation
    res.json({
      message: 'Batch translation functionality to be implemented',
      targetLanguage,
    });
  } catch (error) {
    console.error('Batch translate error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

