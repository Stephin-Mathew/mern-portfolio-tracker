import Groq from 'groq-sdk';

/**
 * Tier 3 — Groq LLM text extraction (different-vendor fallback).
 * Sends raw OCR text to Groq to parse into structured holdings JSON.
 * Used when both Gemini Vision (Tier 1) and Gemini Text-Only (Tier 2) have failed,
 * protecting against a Gemini-wide outage or quota exhaustion.
 *
 * @param {string} rawText — Raw OCR text from Tesseract
 * @param {string} contextText — Optional user-provided context hint
 * @returns {Promise<Array>} Raw parsed JSON array (unvalidated — pipeline validates)
 * @throws On API error, bad JSON, timeout, or missing API key
 */
export const extractWithGroq = async (rawText, contextText = '') => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const TIMEOUT_MS = 10_000;

  const contextSection = contextText
    ? `\nUSER CONTEXT (trust this information to improve accuracy):\n${contextText}\n`
    : '';

  const systemPrompt = `You are an expert financial data parser. You will receive raw OCR text extracted from a screenshot. Parse all asset holdings into a valid JSON array.${contextSection}

STRICT RULES:
1. Return ONLY a raw JSON array. No markdown, no backticks, no explanation text.
2. Do NOT merge, combine, or sum holdings with the same ticker/symbol. If the same coin/symbol appears multiple times, extract EACH occurrence as a separate holding entry in the JSON array with its own individual quantity and price.
3. Format each object exactly as:
[
  {
    "symbol": "BTC",
    "quantity": 0.045,
    "extractedPrice": 61234.50,
    "totalValue": 2755.55,
    "avgBuyPrice": null,
    "assetType": "crypto"
  }
]
4. "assetType" must be one of: "crypto", "stock", "cash".
5. "symbol" must be the exact uppercase ticker symbol shown on screen (e.g. BTC, ETH, BITCOIN, PEPE, SUI, AAPL). Do NOT convert or normalize token symbols (for example, if the screen displays "BITCOIN", do NOT change it to "BTC" unless the ticker "BTC" is explicitly written on the screen).
6. "quantity" must be a number (e.g. 0.045), not a string.
7. "extractedPrice" is the unit price / rate shown on the screenshot for this asset (e.g. 61234.50). If not directly shown but total value and quantity are visible, ALWAYS calculate unit price as totalValue / quantity. Never leave null if totalValue and quantity are visible.
8. "totalValue" is the total fiat/USD valuation of this holding visible in the screenshot. If not shown but unit price and quantity are visible, calculate unit price * quantity.
9. "avgBuyPrice" is ONLY for stocks if visible (otherwise 0). For crypto/cash set to null.
10. Skip any rows that are clearly totals, UI elements, or have zero/unknown quantity.
11. If the OCR text is messy, do your best to extract meaningful holdings. Prefer partial correct data over returning nothing.`;

  const groq = new Groq({ apiKey });

  // ⚠️ Groq model availability changes over time. Update these if models are retired.
  const configured = process.env.GROQ_MODEL_NAME;
  const candidateModels = configured
    ? [configured, 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']
    : ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];

  const groqWork = async () => {
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        console.log(`[extraction] Groq LLM (${modelName})...`);
        const completion = await groq.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Here is the raw OCR text from the screenshot:\n\n${rawText}` },
          ],
          temperature: 0.1,
          max_tokens: 4096,
        });

        const responseText = completion.choices[0]?.message?.content?.trim();
        if (!responseText) {
          throw new Error('Groq returned an empty response');
        }

        // Strip any accidental markdown fences
        const cleanedJson = responseText
          .replace(/^```json\s*/i, '')
          .replace(/^```/, '')
          .replace(/```$/, '')
          .trim();

        return JSON.parse(cleanedJson);
      } catch (err) {
        console.warn(`[extraction] Groq ${modelName} failed: ${err.message}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Groq model attempts failed');
  };

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Groq API timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  );

  return Promise.race([groqWork(), timeoutPromise]);
};
