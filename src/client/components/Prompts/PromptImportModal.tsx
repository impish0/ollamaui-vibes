import { useState, useRef } from 'react';
import { X, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { toastUtils } from '../../utils/toast';
import { useCreatePrompt } from '../../hooks/usePromptsQuery';

interface PromptImportModalProps {
  onClose: () => void;
}

interface ImportData {
  version: string;
  exported: string;
  prompts: Array<{
    name: string;
    description?: string;
    content: string;
    collectionId?: string;
    tags?: string[];
    isFavorite?: boolean;
  }>;
  collections?: any[];
}

export function PromptImportModal({ onClose }: PromptImportModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createPromptMutation = useCreatePrompt();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      toastUtils.error('Please select a JSON file');
      return;
    }

    try {
      const text = await file.text();
      const data: ImportData = JSON.parse(text);

      if (!data.prompts || !Array.isArray(data.prompts)) {
        toastUtils.error('Invalid import file format');
        return;
      }

      await importPrompts(data);
    } catch (error) {
      console.error('Import error:', error);
      toastUtils.error('Failed to read file');
    }
  };

  const importPrompts = async (data: ImportData) => {
    setImporting(true);
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const prompt of data.prompts) {
      try {
        await createPromptMutation.mutateAsync({
          name: prompt.name,
          description: prompt.description || '',
          content: prompt.content,
          collectionId: prompt.collectionId,
          tags: prompt.tags || [],
          isFavorite: prompt.isFavorite || false,
        });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(
          `${prompt.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    setImporting(false);
    setImportResults(results);

    if (results.success > 0) {
      toastUtils.success(`Imported ${results.success} prompts`);
    }
    if (results.failed > 0) {
      toastUtils.error(`Failed to import ${results.failed} prompts`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Upload className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Import Prompts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!importResults ? (
            <>
              {/* File Upload Area */}
              <div
                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {dragActive ? 'Drop file here' : 'Upload Prompts File'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Drag and drop your JSON file here, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                >
                  {importing ? 'Importing...' : 'Choose File'}
                </button>
              </div>

              {/* Instructions */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                  Import Format
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• JSON file exported from Ollama UI Vibes</li>
                  <li>• Contains prompt templates with version history</li>
                  <li>• May include collections and metadata</li>
                  <li>• Duplicate names will be skipped</li>
                </ul>
              </div>
            </>
          ) : (
            /* Results */
            <div className="space-y-4">
              {/* Success */}
              {importResults.success > 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-200">
                      Successfully imported {importResults.success} prompt
                      {importResults.success !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              )}

              {/* Errors */}
              {importResults.failed > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-red-900 dark:text-red-200 mb-2">
                      Failed to import {importResults.failed} prompt
                      {importResults.failed !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-red-800 dark:text-red-300 space-y-1 max-h-32 overflow-y-auto">
                      {importResults.errors.map((error, i) => (
                        <div key={i}>• {error}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
