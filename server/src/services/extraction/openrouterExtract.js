import axios from 'axios';

/**
 * OpenRouter LLM text extraction tier.
 * Sends raw OCR text to OpenRouter to parse into structured holdings JSON.
 *
 * NOTE: 'openrouter/free' intentionally avoids hardcoding a specific model because the
 * free catalog rotates — do not "fix" this later by pinning it to a specific model ID
 * unless the auto-router itself stops working.
 *
 * @param {string} rawText — Raw OCR text from Tesseract
 * @param {string} contextText — Optional user-provided context hint
 * @returns {Promise<Array>} Raw parsed JSON array (unvalidated — pipeline validates)
 * @throws On API error, bad JSON, timeout, or missing API key
 */
export const extractWithOpenRouter = async (rawText, contextText = '') => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const TIMEOUT_MS = 30_000;
  const startTime = Date.now();

  const contextSection = contextText
    ? `\nUSER CONTEXT (trust this information to improve accuracy):\n${contextText}\n`
    : '';

  const systemPrompt = `You are an expert financial data parser. You will receive raw OCR text extracted from a crypto exchange, stock brokerage, or wallet screenshot. Parse all asset holdings into a valid JSON array.${contextSection}

STRICT RULES:
1. Return ONLY a raw JSON array. No markdown, no backticks, no explanation text.
2. Format each object exactly as:
[
  {
    "symbol": "BTC",
    "quantity": 0.045,
    "avgBuyPrice": 61234.50,
    "assetType": "crypto",
    "walletOrAccount": "Binance"
  }
]
3. "assetType" must be one of: "crypto", "stock", "cash".
4. "symbol" must be the uppercase ticker symbol (e.g. BTC, ETH, AAPL).
5. "quantity" must be a number (e.g. 0.045), not a string.
6. "avgBuyPrice" is ONLY for stocks if visible (otherwise 0). For crypto/cash set to null.
7. "walletOrAccount" should be the exchange/wallet name if identifiable from the text, otherwise "Unknown".
8. Skip any rows that are clearly totals, UI elements, or have zero/unknown quantity.
9. If the OCR text is messy, do your best to extract meaningful holdings. Prefer partial correct data over returning nothing.`;

  console.log(`[extraction] OpenRouter (openrouter/free, ${rawText.length} chars of OCR text)...`);

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the raw OCR text from the screenshot:\n\n${rawText}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:5001',
          'X-Title': 'Portfolio Tracker',
          'Content-Type': 'application/json',
        },
        timeout: TIMEOUT_MS,
      }
    );

    const content = response.data?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('OpenRouter returned an empty response');
    }

    // Strip markdown code fences if present
    const cleanedJson = content
      .replace(/^```json\s*/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();

    let parsed = JSON.parse(cleanedJson);

    // If model returned an object containing an array (e.g. { holdings: [...] } or { assets: [...] })
    if (!Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
      const arrayKey = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
      if (arrayKey) {
        parsed = parsed[arrayKey];
      }
    }

    const elapsed = Date.now() - startTime;
    console.log(`[extraction] ⏱️ OpenRouter (openrouter/free) succeeded in ${elapsed}ms`);
    return parsed;
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const errorDetail = err.response?.data?.error?.message || err.message;
    console.warn(`[extraction] ⚠️ OpenRouter failed after ${elapsed}ms: ${errorDetail}`);
    throw new Error(`OpenRouter extraction failed: ${errorDetail}`);
  }
};
