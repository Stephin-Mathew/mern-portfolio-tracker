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

  return `You are an expert financial OCR assistant. Analyze the provided screenshot(s) of a stock / mutual fund brokerage "Holdings" screen and extract all holdings into a single valid JSON array.${contextSection}

STRICT RULES:
1. Return ONLY a raw JSON array. Do NOT wrap in markdown backticks, no \`\`\`json blocks, no prose.
2. Do NOT merge, combine, or sum holdings with the same symbol/name. If the same symbol appears multiple times (across multiple images or multiple rows in the same screenshot), extract EACH occurrence as a separate entry with its own individual quantity and prices.
3. Format each object exactly as follows:
[
  {
    "symbol": "CANBK",
    "quantity": 5,
    "extractedPrice": 119.51,
    "totalValue": 597.55,
    "avgBuyPrice": 63.10,
    "assetType": "stock"
  }
]
4. "assetType" must be one of: "stock", "mutual_fund", "cash". Use "stock" for exchange-traded tickers and ETFs (e.g. CANBK, INFY, NIFTYBEES). Use "mutual_fund" for mutual fund schemes (names containing "FUND", "PLAN", "DIRECT", "ELSS", "INDEX FUND", etc.).
5. "symbol":
   - For stocks/ETFs, use the exact uppercase ticker shown on screen (e.g. CANBK, CDSL, INFY, ITC, NIFTYBEES, TMCV, TMPV). Do NOT normalize or expand it.
   - For mutual funds there is no ticker, so use the full scheme name exactly as shown, in uppercase. Names often wrap across 2-3 lines; join those lines into a single string with single spaces (e.g. "MOTILAL OSWAL NIFTY 200 MOMENTUM 30 INDEX FUND - DIRECT PLAN").
6. "quantity" is the number after "Qty." as a clean number, with no text or commas. Keep all decimals exactly as shown (e.g. 17.960, 0.312, 504.215; whole numbers like 5 or 73 stay whole).
7. "extractedPrice" is the LTP (last traded price / current NAV) shown on the right side of the "Invested" row. Remove commas (e.g. "5,591.15" becomes 5591.15).
8. "totalValue" is the current market value of the holding. This screen does NOT show it directly, so calculate it as quantity * LTP, rounded to 2 decimals. Cross-check: it should be approximately equal to Invested + P&L amount. If they disagree noticeably, re-read the digits.
9. "avgBuyPrice" is the number after "Buy avg." (remove commas). If not visible, use 0.
10. Numbers may contain thousands separators (e.g. 1,261.90, 17,718.77). Strip commas and output plain numbers. Never output numbers as strings.
11. Ignore everything that is not a holding row: status bar (time, battery, network), the "Holdings" title, "Last updated" line, Search/Sort controls, the P&L percentage and P&L amount (green/red numbers), and any partially cut-off row at the very top or bottom of the screen where quantity or LTP is not fully visible.
12. Omit any rows that are clearly UI elements, totals-only rows, or have zero quantity.`;
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
