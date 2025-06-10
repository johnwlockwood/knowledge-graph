"use client";
import { useState, useRef } from 'react';
import { StoredGraph } from '../../../utils/constants';
import { 
  exportSingleGraph, 
  exportMultipleGraphs, 
  exportConnectedGraphs,
  downloadJSON, 
  generateExportFilename,
  parseImportedData,
  generateUniqueIds,
  ExportFormat,
  ValidationResult
} from '../../../utils/shareUtils';
import { getConnectedGraphs } from '../../../utils/graphUtils';
import { useModal } from '../../../hooks/useModal';
import { ModalCloseButton } from './ModalCloseButton';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGraph: StoredGraph | null;
  allGraphs: StoredGraph[];
  onImportGraphs: (graphs: StoredGraph[]) => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

type ModalMode = 'main' | 'export' | 'import' | 'import-preview';

export function ShareModal({ 
  isOpen, 
  onClose, 
  currentGraph, 
  allGraphs, 
  onImportGraphs, 
  onToast 
}: ShareModalProps) {
  const [mode, setMode] = useState<ModalMode>('main');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('standard');
  const [exportScope, setExportScope] = useState<'single' | 'connected' | 'all'>('single');
  const [importData, setImportData] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setMode('main');
    setImportData('');
    setValidationResult(null);
    onClose();
  };

  const { modalRef, handleBackdropClick } = useModal({
    isOpen,
    onClose: handleClose,
    enableEscKey: true,
    enableBackdropClick: true,
    preventBodyScroll: false
  });

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      let jsonData: string;
      let filename: string;

      if (exportScope === 'all') {
        jsonData = exportMultipleGraphs(allGraphs, { 
          format: exportFormat, 
          includeMetadata: true, 
          prettyPrint: true 
        });
        filename = generateExportFilename(null, exportFormat, true);
      } else if (exportScope === 'connected' && currentGraph) {
        jsonData = exportConnectedGraphs(currentGraph, allGraphs, { 
          format: exportFormat, 
          includeMetadata: true, 
          prettyPrint: true 
        });
        filename = generateExportFilename(currentGraph, exportFormat, false, true);
      } else if (exportScope === 'single' && currentGraph) {
        jsonData = exportSingleGraph(currentGraph, { 
          format: exportFormat, 
          includeMetadata: true, 
          prettyPrint: true 
        });
        filename = generateExportFilename(currentGraph, exportFormat, false);
      } else {
        onToast('No graph selected for export', 'error');
        return;
      }

      downloadJSON(jsonData, filename);
      onToast('Knowledge shared successfully!', 'success');
      handleClose();
    } catch {
      onToast('Failed to export graph', 'error');
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleImportData(content);
    };
    reader.readAsText(file);
  };

  const handleImportData = (data: string) => {
    const result = parseImportedData(data);
    setValidationResult(result);
    setImportData(data);
    setMode('import-preview');
  };

  const handleConfirmImport = () => {
    if (!validationResult?.graphs) return;

    try {
      // Generate unique IDs to avoid conflicts
      const existingIds = allGraphs.map(g => g.id);
      const uniqueGraphs = generateUniqueIds(validationResult.graphs, existingIds);
      
      onImportGraphs(uniqueGraphs);
      onToast(`Successfully imported ${uniqueGraphs.length} graph${uniqueGraphs.length > 1 ? 's' : ''}!`, 'success');
      handleClose();
    } catch {
      onToast('Failed to import graphs', 'error');
    }
  };

  const renderMainMode = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Knowledge Sharing</h3>
        <p className="text-sm text-gray-600">Share your insights or learn from others</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export/Share Section */}
        <button
          onClick={() => setMode('export')}
          className="p-6 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors group"
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Share Your Knowledge</h4>
            <p className="text-sm text-gray-600">Export graphs to share with others</p>
          </div>
        </button>

        {/* Import Section */}
        <button
          onClick={() => setMode('import')}
          className="p-6 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors group"
        >
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 mb-1">Learn from Others</h4>
            <p className="text-sm text-gray-600">Import shared knowledge graphs</p>
          </div>
        </button>
      </div>
    </div>
  );

  const renderExportMode = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Share Your Knowledge</h3>
        <button
          onClick={() => setMode('main')}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* Export Scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What to share</label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                checked={exportScope === 'single'}
                onChange={() => setExportScope('single')}
                className="mr-2"
                disabled={!currentGraph}
              />
              <span className={!currentGraph ? 'text-gray-400' : ''}>
                Current graph only {currentGraph ? `(${currentGraph.title})` : '(none selected)'}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={exportScope === 'connected'}
                onChange={() => setExportScope('connected')}
                className="mr-2"
                disabled={!currentGraph}
              />
              <span className={!currentGraph ? 'text-gray-400' : ''}>
                Connected graph network {currentGraph ? (() => {
                  const connectedCount = getConnectedGraphs(currentGraph, allGraphs).length;
                  return `(${connectedCount} graph${connectedCount > 1 ? 's' : ''})`;
                })() : '(none selected)'}
              </span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                checked={exportScope === 'all'}
                onChange={() => setExportScope('all')}
                className="mr-2"
              />
              <span>All graphs ({allGraphs.length} total)</span>
            </label>
          </div>
        </div>

        {/* Export Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="standard">Standard (with metadata)</option>
            <option value="shareable">Shareable (optimized for sharing)</option>
            <option value="minimal">Minimal (nodes and edges only)</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => setMode('main')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={(exportScope === 'single' || exportScope === 'connected') && !currentGraph}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );

  const renderImportMode = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Learn from Others</h3>
        <button
          onClick={() => setMode('main')}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        {/* File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Upload JSON File</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="text-center text-gray-500">or</div>

        {/* Paste JSON */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Paste JSON Data</label>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste your knowledge graph JSON here..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            onClick={() => setMode('main')}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => handleImportData(importData)}
            disabled={!importData.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Preview Import
          </button>
        </div>
      </div>
    </div>
  );

  const renderImportPreviewMode = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Import Preview</h3>
        <button
          onClick={() => setMode('import')}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {validationResult && (
        <div className="space-y-4">
          {/* Validation Status */}
          <div className={`p-4 rounded-md ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center">
              {validationResult.isValid ? (
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span className={`font-medium ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                {validationResult.isValid ? 'Valid knowledge graph data' : 'Invalid data format'}
              </span>
            </div>
          </div>

          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <h4 className="font-medium text-yellow-800 mb-2">Warnings:</h4>
              <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview */}
          {validationResult.graphs && validationResult.graphs.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="font-medium text-gray-800 mb-2">
                Will import {validationResult.graphs.length} graph{validationResult.graphs.length > 1 ? 's' : ''}:
              </h4>
              <ul className="space-y-2">
                {validationResult.graphs.map((graph, index) => (
                  <li key={index} className="text-sm text-gray-700">
                    <span className="font-medium">{graph.title}</span>
                    <span className="text-gray-500 ml-2">
                      ({graph.data.nodes.length} nodes, {graph.data.edges.length} edges)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => setMode('import')}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!validationResult.isValid || !validationResult.graphs}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Import Graphs
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div 
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        {/* Close button */}
        <ModalCloseButton onClick={handleClose} />
        
        <div className="p-6">
          {mode === 'main' && renderMainMode()}
          {mode === 'export' && renderExportMode()}
          {mode === 'import' && renderImportMode()}
          {mode === 'import-preview' && renderImportPreviewMode()}
        </div>
      </div>
    </div>
  );
}
