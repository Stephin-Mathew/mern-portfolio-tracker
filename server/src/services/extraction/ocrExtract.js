import Tesseract from 'tesseract.js';
import sharp from 'sharp';

/**
 * Preprocesses an image buffer using Sharp to significantly improve Tesseract OCR accuracy.
 * Operations:
 * 1. Grayscale conversion
 * 2. Upscaling if longest dimension is < 1500px (Tesseract performs much better on higher resolution)
 * 3. Contrast normalization
 * 4. Sharpening filter
 *
 * @param {Buffer} buffer - Original image buffer
 * @param {number} index - Index for logging
 * @returns {Promise<Buffer>} Preprocessed PNG buffer
 */
const preprocessImageForOcr = async (buffer, index = 0) => {
  const startTime = Date.now();
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let pipeline = sharp(buffer).grayscale();

    const maxDim = Math.max(metadata.width || 0, metadata.height || 0);
    if (maxDim > 0 && maxDim < 1500) {
      const scale = 1500 / maxDim;
      const targetWidth = Math.round((metadata.width || 0) * scale);
      const targetHeight = Math.round((metadata.height || 0) * scale);
      pipeline = pipeline.resize({
        width: targetWidth,
        height: targetHeight,
        kernel: sharp.kernel.lanczos3,
      });
    }

    pipeline = pipeline.normalize().sharpen();
    const processedBuffer = await pipeline.png().toBuffer();
    const elapsed = Date.now() - startTime;
    console.log(`[extraction] 🖼️ Image ${index + 1} preprocessed with Sharp in ${elapsed}ms (${metadata.width}x${metadata.height} -> ${maxDim < 1500 ? 'upscaled' : 'original resolution'})`);
    return processedBuffer;
  } catch (err) {
    console.warn(`[extraction] ⚠️ Sharp preprocessing failed for image ${index + 1}, falling back to raw buffer: ${err.message}`);
    return buffer;
  }
};

/**
 * Runs Tesseract.js OCR on one or more image buffers concurrently
 * and returns concatenated raw text with numbered image separators.
 *
 * Images are processed in parallel via Promise.all for speed — this is
 * designed to run concurrently alongside Tier 1 (Gemini Vision) so OCR
 * text is ready immediately for other tiers.
 *
 * @param {Array<{buffer: Buffer, mimeType: string}>} imageInputs — Array of image inputs
 * @returns {Promise<string>} Concatenated raw OCR text from all images
 * @throws On OCR failure, empty result, or timeout
 */
export const runOcr = async (imageInputs = []) => {
  // Longer timeout to accommodate concurrent multi-image OCR and preprocessing
  const TIMEOUT_MS = 35_000;
  const startTime = Date.now();

  const ocrWork = async () => {
    // Preprocess all images with Sharp and run Tesseract concurrently
    const results = await Promise.all(
      imageInputs.map(async ({ buffer }, index) => {
        const processedBuffer = await preprocessImageForOcr(buffer, index);
        const { data: { text } } = await Tesseract.recognize(processedBuffer, 'eng', {
          logger: () => {}, // Suppress verbose Tesseract logging
        });
        return { index, text: text?.trim() || '' };
      })
    );

    // Build combined text with numbered separators for multi-image context
    const textParts = [];
    for (const { index, text } of results) {
      if (text) {
        if (imageInputs.length > 1) {
          textParts.push(`--- Image ${index + 1} ---\n${text}`);
        } else {
          textParts.push(text);
        }
      }
    }

    const combined = textParts.join('\n\n');
    const elapsed = Date.now() - startTime;

    if (!combined.trim()) {
      throw new Error('OCR produced no readable text from the provided images');
    }

    console.log(`[extraction] ⏱️ Preprocessed OCR completed in ${elapsed}ms (${combined.length} chars)`);
    return combined;
  };

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`OCR timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  );

  return Promise.race([ocrWork(), timeoutPromise]);
};
