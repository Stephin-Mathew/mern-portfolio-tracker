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
