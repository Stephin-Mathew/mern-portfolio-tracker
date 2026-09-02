import React, { useState } from 'react';
import { X, Copy, Check, ClipboardPaste, AlertCircle, Braces, ArrowRight, Lightbulb } from 'lucide-react';

/**
 * The extraction prompt — mirrors the server-side prompt in geminiExtract.js.
 * Kept in sync manually; any changes to the server prompt should be reflected here.
 */
const EXTRACTION_PROMPT = `You are an expert financial OCR assistant. Analyze the provided exchange/wallet screenshot(s) and extract all asset holdings into a single valid JSON array.

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

const VALID_ASSET_TYPES = ['crypto', 'stock', 'cash'];
const KNOWN_STOCKS = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'AMZN', 'META', 'SPY', 'QQQ', 'AMD', 'NFLX', 'DIS', 'BA', 'V', 'JPM', 'WMT'];
const KNOWN_CASH = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'CASH', 'USDT', 'USDC'];

/**
 * Client-side validation that mirrors server-side validateExtraction.js.
 * Parses, validates and normalizes pasted JSON into the holdings format.
 *
 * @param {string} jsonText - Raw JSON text from user
 * @returns {{ valid: boolean, data?: Array, errors?: string[] }}
 */
const validatePastedJson = (jsonText) => {
  const errors = [];

  // 1. Parse JSON
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e.message}`] };
  }

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['The JSON must be an array of holding objects (e.g. [ { "symbol": "BTC", ... } ])'] };
  }

  if (data.length === 0) {
    return { valid: false, errors: ['The JSON array is empty — no holdings found'] };
  }

  const normalizedItems = [];

  data.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Item ${index + 1}: not a valid object`);
      return;
    }

    const symbol = item.symbol ? String(item.symbol).trim().toUpperCase() : '';
    if (!symbol) {
      errors.push(`Item ${index + 1}: missing or empty "symbol"`);
      return;
    }

    const quantity = Number(item.quantity);
    if (isNaN(quantity) || quantity <= 0) {
      errors.push(`Item ${index + 1} (${symbol}): "quantity" must be a number > 0, got ${item.quantity}`);
      return;
    }

    let assetType = String(item.assetType || '').toLowerCase();
    if (!VALID_ASSET_TYPES.includes(assetType)) {
      if (KNOWN_CASH.includes(symbol)) assetType = 'cash';
      else if (KNOWN_STOCKS.includes(symbol)) assetType = 'stock';
      else assetType = 'crypto';
    }

    let avgBuyPrice = null;
    if (assetType === 'stock') {
      const rawPrice = item.avgBuyPrice !== undefined && item.avgBuyPrice !== null ? Number(item.avgBuyPrice) : 0;
      avgBuyPrice = isNaN(rawPrice) || rawPrice < 0 ? 0 : rawPrice;
    }

    normalizedItems.push({
      symbol,
      quantity,
      avgBuyPrice,
      assetType,
      walletOrAccount: item.walletOrAccount ? String(item.walletOrAccount).trim() : 'JSON Paste',
      notes: item.notes ? String(item.notes).trim() : 'Pasted from external LLM',
    });
  });

  if (normalizedItems.length === 0) {
    return {
      valid: false,
      errors: errors.length > 0 ? errors : ['No valid holding entries could be parsed from the JSON'],
    };
  }

  // Return both valid items and any non-fatal warnings
  return { valid: true, data: normalizedItems, warnings: errors.length > 0 ? errors : undefined };
};


export const JsonExtractModal = ({ isOpen, onClose, onExtracted }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [promptCopied, setPromptCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(EXTRACTION_PROMPT);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = EXTRACTION_PROMPT;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2500);
    }
  };

  const handleExtract = () => {
    if (!jsonText.trim()) {
      setError('Please paste the JSON output from your LLM');
      return;
    }

    setError('');
    setWarnings([]);

    // Strip markdown code fences if the user accidentally copies them
    let cleanedText = jsonText.trim();
    cleanedText = cleanedText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    const result = validatePastedJson(cleanedText);

    if (!result.valid) {
      setError(result.errors.join('\n'));
      return;
    }

    if (result.warnings) {
      setWarnings(result.warnings);
    }

    // Pass validated holdings to the review modal
    onExtracted(result.data, 'json_paste');
    handleClose();
  };

  const handleClose = () => {
    setJsonText('');
    setError('');
    setWarnings([]);
    setPromptCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto">

        {/* Close */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 text-slate-400 dark:hover:text-white hover:text-slate-900 rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-300 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <Braces className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading">JSON Extract</h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">Use your own LLM to extract holdings from screenshots</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-violet-500/5 border border-violet-500/15 dark:bg-violet-500/10 dark:border-violet-500/20">
          <Lightbulb className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0 mt-0.5" />
          <div className="text-xs dark:text-slate-300 text-slate-600 space-y-1">
            <p className="font-semibold dark:text-violet-300 text-violet-700">How it works:</p>
            <ol className="list-decimal list-inside space-y-0.5 dark:text-slate-400 text-slate-500">
              <li>Copy the prompt below</li>
              <li>Open your LLM of choice (Claude, ChatGPT, Gemini, etc.)</li>
              <li>Paste the prompt and upload your screenshot</li>
              <li>Copy the JSON response and paste it below</li>
            </ol>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-start space-x-2 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <pre className="whitespace-pre-wrap font-sans">{error}</pre>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <p className="mb-1">⚠️ Some items were skipped:</p>
            <ul className="list-disc list-inside space-y-0.5 font-normal">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Section 1: Copyable Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-1.5 text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
              <ClipboardPaste className="w-3.5 h-3.5 text-violet-500 dark:text-violet-400" />
              <span>Extraction Prompt</span>
            </label>
            <button
              onClick={handleCopyPrompt}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                promptCopied
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 dark:text-emerald-400'
                  : 'bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 hover:bg-violet-500/20 hover:border-violet-500/30'
              }`}
            >
              {promptCopied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto p-3 rounded-xl dark:bg-slate-950 bg-slate-50 border dark:border-slate-800 border-slate-200 shadow-inner">
            <pre className="text-[11px] font-mono dark:text-slate-400 text-slate-600 whitespace-pre-wrap break-words leading-relaxed select-all">
              {EXTRACTION_PROMPT}
            </pre>
          </div>
        </div>

        {/* Section 2: JSON Paste Area */}
        <div className="space-y-2">
          <label className="flex items-center space-x-1.5 text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
            <Braces className="w-3.5 h-3.5 text-fuchsia-500 dark:text-fuchsia-400" />
            <span>Paste JSON Response</span>
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              if (error) setError('');
            }}
            placeholder={'[\n  {\n    "symbol": "BTC",\n    "quantity": 0.045,\n    "assetType": "crypto",\n    "walletOrAccount": "Binance"\n  }\n]'}
            rows={8}
            className="w-full px-3 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 dark:text-slate-200 text-slate-800 text-xs font-mono placeholder-slate-400 resize-none outline-none transition shadow-xs"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t dark:border-slate-800 border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-300 dark:hover:bg-slate-800 hover:bg-slate-200 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExtract}
            disabled={!jsonText.trim()}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold text-xs shadow-lg shadow-violet-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Extract Holdings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
