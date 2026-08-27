import { extractVisionWithGemini, extractTextWithGemini } from './geminiExtract.js';
import { runOcr } from './ocrExtract.js';
import { extractWithGroq } from './groqExtract.js';
import { extractWithOpenRouter } from './openrouterExtract.js';
import { validateExtractionResult } from './validateExtraction.js';

/**
 * Prioritized AI Extraction Pipeline:
 *
 *   Priority 1 — Gemini Vision (direct multimodal image analysis — highest accuracy)
 *   Priority 2 — Gemini Text-Only (OCR text → Gemini)
 *   Priority 3 — Third-Party OCR LLM Race (Groq & OpenRouter on OCR text if Gemini fails)
 *   Priority 4 — Manual fallback (returns raw OCR text for user entry)
 *
 * STRATEGY:
 * 1. Gemini Vision is the top priority for accuracy and reliability.
 * 2. In parallel, local OCR (Tesseract + Sharp) runs in the background so text is immediately
 *    ready if Gemini Vision fails.
 * 3. If Gemini Vision succeeds and passes validation, its output is returned immediately.
 * 4. If and only if Gemini Vision fails, Gemini Text-Only is tried on the OCR text.
 * 5. If Gemini completely fails, Groq and OpenRouter race on the OCR text as third-party fallbacks.
 * 6. If all automated providers fail, degrades gracefully to Manual entry.
 *
 * @param {Array<{buffer: Buffer, mimeType: string}>} imageInputs
 * @param {string} contextText — Optional user-provided context
 * @returns {Promise<{success: boolean, tier: string, holdings?: Array, rawText?: string, message?: string}>}
 */
export const runExtractionPipeline = async (imageInputs, contextText = '') => {
  console.log(`[extraction] 🚀 Starting extraction pipeline (Gemini Priority 1, ${imageInputs.length} image(s))...`);

  // ───────────────────────────────────────────────
  // 1. KICK OFF OCR IN BACKGROUND (Tesseract + Sharp)
  // Local and free — runs concurrently with Gemini Vision so OCR text is ready if Gemini fails.
  // ───────────────────────────────────────────────
  let capturedOcrText = '';
  const ocrPromise = (async () => {
    try {
      const text = await runOcr(imageInputs);
      capturedOcrText = text;
      return text;
    } catch (err) {
      console.warn(`[extraction] ⚠️ Background OCR failed: ${err.message}`);
      return '';
    }
  })();

  // ───────────────────────────────────────────────
  // 2. PRIORITY 1: Gemini Vision (Multimodal)
  // ───────────────────────────────────────────────
  try {
    console.log('[extraction] 🌟 [Priority 1] Attempting Gemini Vision...');
    const rawResult = await extractVisionWithGemini(imageInputs, contextText);
    const validation = validateExtractionResult(rawResult);

    if (validation.valid) {
      console.log(`[extraction] 🏆 [Tier 1] Gemini Vision succeeded — ${validation.data.length} holdings extracted`);
      return {
        success: true,
        tier: 'gemini_vision',
        holdings: validation.data,
      };
    }
    console.warn(`[extraction] ⚠️ Gemini Vision returned invalid data: ${validation.errors.join('; ')}`);
  } catch (err) {
    console.warn(`[extraction] ❌ Gemini Vision failed: ${err.message}`);
  }

  // ───────────────────────────────────────────────
  // 3. AWAIT OCR TEXT (Already pre-computing in background)
  // ───────────────────────────────────────────────
  console.log('[extraction] Gemini Vision failed. Checking OCR text for fallback tiers...');
  const ocrText = await ocrPromise;

  if (!ocrText || !ocrText.trim()) {
    console.warn('[extraction] ⚠️ OCR produced no readable text. Falling back to manual entry.');
    return {
      success: false,
      tier: 'manual',
      rawText: 'Could not extract readable text from the screenshot. Please enter holdings manually.',
      message: 'Automatic extraction failed (OCR could not read the screenshot). Please enter holdings manually.',
    };
  }

  console.log(`[extraction] 📄 OCR text ready (${ocrText.length} chars). Attempting Gemini Text-Only...`);

  // ───────────────────────────────────────────────
  // 4. PRIORITY 2: Gemini Text-Only (OCR text → Gemini)
  // ───────────────────────────────────────────────
  try {
    console.log('[extraction] 🌟 [Priority 2] Attempting Gemini Text-Only from OCR text...');
    const rawResult = await extractTextWithGemini(ocrText, contextText);
    const validation = validateExtractionResult(rawResult);

    if (validation.valid) {
      console.log(`[extraction] 🏆 [Tier 2] Gemini Text-Only succeeded — ${validation.data.length} holdings extracted`);
      return {
        success: true,
        tier: 'gemini_text',
        holdings: validation.data,
      };
    }
    console.warn(`[extraction] ⚠️ Gemini Text-Only returned invalid data: ${validation.errors.join('; ')}`);
  } catch (err) {
    console.warn(`[extraction] ❌ Gemini Text-Only failed: ${err.message}`);
  }

  // ───────────────────────────────────────────────
  // 5. PRIORITY 3: Third-Party OCR LLM Fallback (Groq & OpenRouter)
  // ───────────────────────────────────────────────
  console.log('[extraction] Gemini tiers failed. Racing Groq & OpenRouter on OCR text...');

  const groqPromise = (async () => {
    try {
      const rawResult = await extractWithGroq(ocrText, contextText);
      const validation = validateExtractionResult(rawResult);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }
      return { tier: 'groq_ocr', holdings: validation.data };
    } catch (err) {
      console.warn(`[extraction] ❌ Groq OCR failed: ${err.message}`);
      throw err;
    }
  })();

  const openrouterPromise = (async () => {
    try {
      const rawResult = await extractWithOpenRouter(ocrText, contextText);
      const validation = validateExtractionResult(rawResult);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
      }
      return { tier: 'openrouter_ocr', holdings: validation.data };
    } catch (err) {
      console.warn(`[extraction] ❌ OpenRouter failed: ${err.message}`);
      throw err;
    }
  })();

  try {
    const winner = await Promise.any([groqPromise, openrouterPromise]);
    console.log(`[extraction] 🏆 [Tier 3] Fallback "${winner.tier}" succeeded with ${winner.holdings.length} holdings`);
    return {
      success: true,
      tier: winner.tier,
      holdings: winner.holdings,
    };
  } catch (aggregateError) {
    console.warn('[extraction] ⚠️ All automatic extraction tiers failed.');
    if (aggregateError?.errors) {
      aggregateError.errors.forEach((err, idx) => {
        console.warn(`  - Fallback error ${idx + 1}: ${err.message || err}`);
      });
    }

    return {
      success: false,
      tier: 'manual',
      rawText: ocrText,
      message: 'Automatic extraction failed across all providers. Please review the raw text and enter holdings manually.',
    };
  }
};
