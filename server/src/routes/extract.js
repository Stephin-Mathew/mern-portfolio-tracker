import express from 'express';
import { upload } from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import { runExtractionPipeline } from '../services/extraction/extractionPipeline.js';

const router = express.Router();

router.use(authenticateToken);

/**
 * @route   POST /api/extract
 * @desc    Upload one or more wallet/exchange screenshots & extract holding data
 *          via a prioritized multi-tier extraction pipeline:
 *            Priority 1 — Gemini Vision (direct multimodal image analysis — highest accuracy)
 *            Priority 2 — OCR text → Gemini Text-Only
 *            Priority 3 — OCR text → Groq / OpenRouter race (third-party fallback)
 *            Priority 4 — Manual fallback (returns raw OCR text)
 * @access  Private
 *
 * IMPORTANT UX RULE:
 * This endpoint NEVER auto-saves to the database directly.
 * It returns the extracted JSON array to the frontend so the user can review, edit,
 * and confirm each holding before saving via /api/holdings/batch.
 *
 * Response shapes:
 *   Success (Tier 1-3): { success: true, tier: "gemini_vision" | "gemini_text" | "groq_ocr" | "openrouter_ocr", holdings: [...] }
 *   Manual  (Tier 4):   { success: false, tier: "manual", rawText: "...", message: "..." }
 */
router.post('/', upload.array('screenshots', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image file' });
    }

    const contextText = req.body.contextText || '';
    console.log(`[extraction] 📸 Processing ${files.length} screenshot(s) through extraction pipeline...`);

    // Build image inputs array
    const imageInputs = files.map((f) => ({ buffer: f.buffer, mimeType: f.mimetype }));

    const result = await runExtractionPipeline(imageInputs, contextText);

    // Both success and manual fallback are 200 — manual is a valid degraded response, not an error
    res.json(result);
  } catch (error) {
    console.error('[extraction] Pipeline Route Error:', error.message);
    res.status(500).json({
      message: error.message || 'Failed to process extraction pipeline',
    });
  }
});

export default router;
