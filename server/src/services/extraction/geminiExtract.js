import { GoogleGenerativeAI } from '@google/generative-ai';

// ⚠️ DEPRECATION RISK: Google deprecates Gemini models periodically on a rolling basis.
// The model name below may stop working without warning when Google sunsets it.
// Check https://ai.google.dev/gemini-api/docs/models for current model names.
const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash';
const FALLBACK_GEMINI_MODEL = 'gemini-3.7-flash';

const VISION_TIMEOUT_MS = 45_000;
const TEXT_TIMEOUT_MS = 30_000;

/**
 * Returns the ordered list of Gemini models to try.
 * Uses the GEMINI_MODEL_NAME env var if set, otherwise the hardcoded defaults.
 */
const getCandidateModels = () => {
  const configured = process.env.GEMINI_MODEL_NAME;
  if (configured) {
    // User-configured model first, then the default as fallback
    return configured === DEFAULT_GEMINI_MODEL
      ? [DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL]
      : [configured, DEFAULT_GEMINI_MODEL];
  }
  return [DEFAULT_GEMINI_MODEL, FALLBACK_GEMINI_MODEL];
};

/**
 * Returns a configured GoogleGenerativeAI instance.
 * @throws If GEMINI_API_KEY is not set
 */
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Shared extraction prompt used by both vision and text-only tiers.
 * @param {string} contextText — Optional user-provided context
 * @returns {string}
 */
const buildExtractionPrompt = (contextText = '') => {
  const contextSection = contextText
    ? `\nUSER CONTEXT (trust this information to improve accuracy):\n${contextText}\n`
    : '';

  return `You are an expert financial OCR assistant. Analyze the provided exchange/wallet screenshot(s) and extract all asset holdings into a single valid JSON array.${contextSection}

STRICT RULES:
1. Return ONLY a raw JSON array. Do NOT wrap in markdown backticks, no \`\`\`json blocks, no prose.
2. Merge holdings across multiple images if the same symbol appears — sum the quantities.
3. Format each object exactly as follows:
[
  {
    "symbol": "BTC",
    "quantity": 0.045,
    "avgBuyPrice": 61234.50,
    "assetType": "crypto",
    "walletOrAccount": "Binance"
  }
]
4. "assetType" must be one of: "crypto", "stock", "cash".
5. "symbol" must be the uppercase ticker symbol (e.g. BTC, ETH, AAPL).
6. "quantity" must be a clean number (e.g. 0.045, not "0.045 BTC").
7. "avgBuyPrice" should only be included for stocks if visible (otherwise 0). For crypto/cash set to null.
8. Omit any rows that are clearly UI elements, totals-only rows, or have zero quantity.`;
};

/**
 * Strips accidental markdown fences from LLM JSON output.
 * @param {string} text
 * @returns {string}
 */
const cleanJsonResponse = (text) =>
  text
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

// ─────────────────────────────────────────────────────
// Tier 1 — Gemini Vision (image-based extraction)
// ─────────────────────────────────────────────────────

/**
 * Sends images directly to Gemini's vision-capable model for extraction.
 * All images are sent as multiple inlineData parts in a single API call.
 *
 * @param {Array<{buffer: Buffer, mimeType: string}>} imageInputs
 * @param {string} contextText — Optional user-provided context hint
 * @returns {Promise<Array>} Raw parsed JSON array (unvalidated — pipeline validates)
 * @throws On API error, bad JSON, timeout, or missing API key
 */
export const extractVisionWithGemini = async (imageInputs = [], contextText = '') => {
  const genAI = getGeminiClient();
  const candidateModels = getCandidateModels();
  const promptText = buildExtractionPrompt(contextText);

  // Build content parts: prompt text + all images as inlineData in a single request
  const imageParts = imageInputs.map(({ buffer, mimeType }) => ({
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  }));

  const contentParts = [promptText, ...imageParts];

  let lastError = null;

  for (const modelName of candidateModels) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const startTime = Date.now();
      try {
        console.log(`[extraction] Gemini Vision (${modelName}, attempt ${attempt}, ${imageInputs.length} image(s))...`);

        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature: 0.1 },
        });

        // Race the generation against a timeout
        const resultPromise = model.generateContent(contentParts);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini Vision ${modelName} timed out after ${VISION_TIMEOUT_MS}ms`)), VISION_TIMEOUT_MS)
        );

        const result = await Promise.race([resultPromise, timeoutPromise]);
        const elapsed = Date.now() - startTime;
        const responseText = result.response.text().trim();
        const cleanedJson = cleanJsonResponse(responseText);

        console.log(`[extraction] ⏱️ Gemini Vision (${modelName}, attempt ${attempt}) succeeded in ${elapsed}ms`);
        return JSON.parse(cleanedJson);
      } catch (err) {
        const elapsed = Date.now() - startTime;
        console.warn(`[extraction] ⚠️ Gemini Vision ${modelName} attempt ${attempt} failed after ${elapsed}ms: ${err.message}`);
        lastError = err;
        if (attempt === 1) await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }

  throw lastError || new Error('All Gemini Vision attempts failed');
};

// ─────────────────────────────────────────────────────
// Tier 2 — Gemini Text-Only (OCR text → Gemini)
// ─────────────────────────────────────────────────────

/**
 * Sends raw OCR text to Gemini's text model for structured extraction.
 * Used as Tier 2 fallback when Gemini Vision (Tier 1) fails but Gemini's
 * text endpoint may still be available (e.g. vision-specific outage, bad image payload).
 *
 * @param {string} ocrText — Raw OCR text from Tesseract
 * @param {string} contextText — Optional user-provided context hint
 * @returns {Promise<Array>} Raw parsed JSON array (unvalidated — pipeline validates)
 * @throws On API error, bad JSON, timeout, or missing API key
 */
export const extractTextWithGemini = async (ocrText, contextText = '') => {
  const genAI = getGeminiClient();
  const candidateModels = getCandidateModels();
  const promptText = buildExtractionPrompt(contextText);

  // For text-only: combine the system prompt with the OCR text as a single text input
  const contentParts = [
    `${promptText}\n\nHere is the raw OCR text extracted from the screenshot(s):\n\n${ocrText}`,
  ];

  let lastError = null;

  for (const modelName of candidateModels) {
    const startTime = Date.now();
    try {
      console.log(`[extraction] Gemini Text-Only (${modelName}, ${ocrText.length} chars of OCR text)...`);

      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.1 },
      });

      const resultPromise = model.generateContent(contentParts);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Gemini Text-Only ${modelName} timed out after ${TEXT_TIMEOUT_MS}ms`)), TEXT_TIMEOUT_MS)
      );

      const result = await Promise.race([resultPromise, timeoutPromise]);
      const elapsed = Date.now() - startTime;
      const responseText = result.response.text().trim();
      const cleanedJson = cleanJsonResponse(responseText);

      console.log(`[extraction] ⏱️ Gemini Text-Only (${modelName}) succeeded in ${elapsed}ms`);
      return JSON.parse(cleanedJson);
    } catch (err) {
      const elapsed = Date.now() - startTime;
      console.warn(`[extraction] ⚠️ Gemini Text-Only ${modelName} failed after ${elapsed}ms: ${err.message}`);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini Text-Only attempts failed');
};
