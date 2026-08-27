import React, { useState, useRef } from 'react';
import { X, Upload, Sparkles, Image as ImageIcon, Loader2, AlertCircle, Plus, Trash2, FileText } from 'lucide-react';
import api from '../api/axiosInstance';

/**
 * Compresses and resizes an image client-side before upload using HTML Canvas.
 * Keeps longest side <= maxDimension and compresses to JPEG at specified quality.
 *
 * @param {File} file - Original user file
 * @param {number} maxDimension - Max width or height in pixels (default 1600)
 * @param {number} quality - JPEG compression quality 0.0 - 1.0 (default 0.8)
 * @returns {Promise<File>} Compressed File object
 */
const compressImage = async (file, maxDimension = 1600, quality = 0.8) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;

      // Calculate new dimensions if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return resolve(file);
      }

      // Draw with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return resolve(file);
          }
          const fileName = file.name.replace(/\.[^.]+$/, '.jpg');
          const compressedFile = new File([blob], fileName, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
};

export const ScreenshotUploadModal = ({ isOpen, onClose, onExtracted, onExtractionFailed }) => {
  const [selectedFiles, setSelectedFiles] = useState([]); // [{ file, previewUrl }]
  const [contextText, setContextText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const addFiles = (files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (valid.length === 0) {
      setError('Please select valid image files (PNG, JPG, WEBP)');
      return;
    }
    setError('');
    const newEntries = valid.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setSelectedFiles((prev) => {
      // Deduplicate by name+size
      const existing = new Set(prev.map((e) => `${e.file.name}-${e.file.size}`));
      return [...prev, ...newEntries.filter((e) => !existing.has(`${e.file.name}-${e.file.size}`))];
    });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    setSelectedFiles((prev) => {
      URL.revokeObjectURL(prev[idx].previewUrl);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleExtract = async () => {
    if (selectedFiles.length === 0) return;

    setExtracting(true);
    setError('');

    try {
      // Compress and resize images client-side before sending to server
      const compressedFiles = await Promise.all(
        selectedFiles.map(({ file }) => compressImage(file, 1600, 0.8))
      );

      const formData = new FormData();
      compressedFiles.forEach((file) => formData.append('screenshots', file));
      if (contextText.trim()) formData.append('contextText', contextText.trim());

      const res = await api.post('/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        // One of the automated race tiers succeeded — pass holdings + tier info
        const extractedItems = res.data.holdings || [];
        if (extractedItems.length === 0) {
          throw new Error('No asset holdings could be parsed from the uploaded images. Please try clearer screenshots.');
        }
        onExtracted(extractedItems, res.data.tier);
        handleClose();
      } else {
        // Manual fallback
        onExtractionFailed(res.data.rawText || '', res.data.message || 'Automatic extraction failed.');
        handleClose();
      }
    } catch (err) {
      console.error('Extraction Error:', err);
      setError(err.response?.data?.message || err.message || 'Something went wrong. Please try again.');
    } finally {
      setExtracting(false);
    }
  };

  const handleClose = () => {
    selectedFiles.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));
    setSelectedFiles([]);
    setContextText('');
    setError('');
    onClose();
  };

  const totalSize = selectedFiles.reduce((sum, { file }) => sum + file.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="glass-panel w-full max-w-xl rounded-2xl border dark:border-slate-800 border-slate-200 shadow-2xl p-6 relative flex flex-col gap-5">

        {/* Close */}
        <button
          onClick={handleClose}
          disabled={extracting}
          className="absolute top-4 right-4 p-2 text-slate-400 dark:hover:text-white hover:text-slate-900 rounded-xl dark:bg-slate-900/60 bg-slate-100 dark:hover:bg-slate-800 hover:bg-slate-200 border dark:border-slate-800 border-slate-300 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-bold dark:text-white text-slate-900 font-heading">AI Screenshot Extraction</h2>
            <p className="text-xs dark:text-slate-400 text-slate-500">Upload one or more exchange/wallet screenshots</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs flex items-center space-x-2 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !extracting && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer ${
            isDragOver
              ? 'border-cyan-500 bg-cyan-500/10'
              : 'dark:border-slate-700 border-slate-300 dark:hover:border-slate-600 hover:border-slate-400 dark:bg-slate-900/40 bg-slate-50 dark:hover:bg-slate-900/60 hover:bg-slate-100'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />

          {selectedFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <div className="w-12 h-12 rounded-xl dark:bg-slate-800 bg-white border dark:border-slate-700 border-slate-300 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold dark:text-white text-slate-900">Drop screenshots here or click to browse</p>
              <p className="text-xs dark:text-slate-500 text-slate-500">Multiple images supported · PNG, JPG, WEBP · up to 10 MB each</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 py-1">
              <Plus className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">Add more images</span>
              <span className="dark:text-slate-600 text-slate-500">· drag & drop or click</span>
            </div>
          )}
        </div>

        {/* Image Thumbnails Grid */}
        {selectedFiles.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {selectedFiles.map(({ file, previewUrl }, idx) => (
              <div key={idx} className="relative group rounded-xl overflow-hidden border dark:border-slate-800 border-slate-200 dark:bg-slate-900 bg-slate-100 aspect-video flex items-center justify-center shadow-xs">
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                    disabled={extracting}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-slate-300 truncate max-w-[90%] px-1 text-center font-medium">{file.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* File Count Summary */}
        {selectedFiles.length > 0 && (
          <div className="flex items-center space-x-2 text-xs dark:text-slate-400 text-slate-600 -mt-2">
            <ImageIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>
              <span className="dark:text-white text-slate-900 font-bold">{selectedFiles.length}</span> image{selectedFiles.length !== 1 ? 's' : ''} selected
              &nbsp;·&nbsp;
              {(totalSize / 1024).toFixed(0)} KB total
            </span>
          </div>
        )}

        {/* Context Text Input */}
        <div className="space-y-2">
          <label className="flex items-center space-x-1.5 text-xs font-semibold dark:text-slate-300 text-slate-700 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Additional Context <span className="dark:text-slate-500 text-slate-400 normal-case font-normal">(optional)</span></span>
          </label>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            disabled={extracting}
            placeholder="e.g. This is my Binance spot wallet. Ignore USDT dust. Treat all assets as crypto unless it looks like a stock ticker."
            rows={3}
            className="w-full px-3 py-2.5 rounded-xl dark:bg-slate-900 bg-white border dark:border-slate-700 border-slate-300 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 dark:text-slate-200 text-slate-800 text-xs placeholder-slate-400 resize-none outline-none transition shadow-xs"
          />
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t dark:border-slate-800 border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={extracting}
            className="px-4 py-2.5 rounded-xl border dark:border-slate-700 border-slate-300 dark:hover:bg-slate-800 hover:bg-slate-200 dark:text-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleExtract}
            disabled={selectedFiles.length === 0 || extracting}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                <span>Analyzing screenshot…</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Extract from {selectedFiles.length || 0} Image{selectedFiles.length !== 1 ? 's' : ''}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
