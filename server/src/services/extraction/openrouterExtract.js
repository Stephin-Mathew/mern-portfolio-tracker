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

  const systemPrompt = `You are an expert financial OCR assistant. You will receive raw OCR text extracted from a screenshot of a stock / mutual fund brokerage "Holdings" screen. Parse all holdings into a valid JSON array.${contextSection}

STRICT RULES:
1. Return ONLY a raw JSON array. No markdown, no backticks, no explanation text.
2. Do NOT merge, combine, or sum holdings with the same symbol/name. Extract EACH occurrence as a separate entry with its own individual quantity and prices.
3. Format each object exactly as:
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
4. "assetType" must be one of: "stock", "mutual_fund", "cash". Use "stock" for exchange-traded tickers and ETFs. Use "mutual_fund" for mutual fund schemes (names containing "FUND", "PLAN", "DIRECT", "ELSS", "INDEX FUND", etc.).
5. "symbol": For stocks/ETFs use the exact uppercase ticker. For mutual funds use the full scheme name in uppercase (join multi-line names with single spaces).
6. "quantity" is the number after "Qty." — a clean number, no text or commas.
7. "extractedPrice" is the LTP (last traded price / current NAV). Remove commas (e.g. "5,591.15" becomes 5591.15).
8. "totalValue" = quantity * LTP, rounded to 2 decimals. Calculate it — do not read it from the screen.
9. "avgBuyPrice" is the number after "Buy avg." (remove commas). If not visible, use 0.
10. Numbers may contain thousands separators — strip commas, output plain numbers, never strings.
11. Skip holding rows where quantity or LTP is not fully visible, and skip all UI elements, totals, and header rows.
12. If the OCR text is messy, do your best to extract meaningful holdings. Prefer partial correct data over returning nothing.`;

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
