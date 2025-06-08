"use client";
import { useState, useRef, useCallback } from 'react';
import { useGraphData } from '@/hooks/useGraphData';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { getGraphTitle } from '@/utils/graphUtils';
import { INITIAL_DATA } from '@/utils/constants';
import { StreamingGraphGenerator } from './StreamingGraphGenerator';
import { GraphNavigation } from './GraphNavigation';
import { GraphVisualization } from './GraphVisualization';
import { Toast } from './UI/Toast';
import { DeleteConfirmModal } from './UI/DeleteConfirmModal';
import { EmptyState } from './UI/EmptyState';
import { ShareModal } from './UI/ShareModal';

export default function KnowledgeGraph() {
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Ref to store the streaming reset function and input setter
  const streamingResetRef = useRef<(() => void) | null>(null);
  const setInputSubjectRef = useRef<((subject: string) => void) | null>(null);

  const {
    allGraphs,
    visibleGraphs,
    currentGraph,
    currentGraphIndex,
    goToPreviousGraph,
    goToNextGraph,
    goToGraphAtIndex,
    addGraph,
    importGraphs,
    removeGraph
  } = useGraphData();

  // Handle toast notifications
  const handleToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const handleCloseToast = () => {
    setToast(null);
  };

  // Handle graph deletion
  const handleDeleteRequest = (graphId: string) => {
    setShowDeleteConfirm(graphId);
  };

  const handleConfirmDelete = () => {
    if (showDeleteConfirm) {
      const removedTitle = removeGraph(showDeleteConfirm);
      handleToast(`Removed "${removedTitle}" from workspace`, 'success');
      setShowDeleteConfirm(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  // Handle streaming reset state callback
  const handleStreamingResetState = (resetFn: () => void) => {
    streamingResetRef.current = resetFn;
  };

  // Handle input subject setter callback
  const handleSetInputSubject = (setSubjectFn: (subject: string) => void) => {
    setInputSubjectRef.current = setSubjectFn;
  };


  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPrevious: goToPreviousGraph,
    onNext: goToNextGraph,
    onDelete: currentGraph && visibleGraphs.length > 0 ? () => handleDeleteRequest(currentGraph.id) : undefined
  });

  // Get current graph data and metadata
  const currentGraphData = currentGraph?.data || INITIAL_DATA;
  const graphMetadata = currentGraph ? {
    id: currentGraph.id,
    title: currentGraph.title,
    subject: currentGraph.subject,
    createdAt: currentGraph.createdAt,
    model: currentGraph.model
  } : {
    id: 'default',
    title: 'Knowledge Graph',
    subject: 'Empty Graph',
    createdAt: Date.now(),
    model: 'gpt-3.5-turbo'
  };

  // Handle node selection from graph
  const handleNodeSelect = useCallback((nodeLabel: string) => {
    if (setInputSubjectRef.current) {
      const newSubject = `${graphMetadata.subject} -> ${nodeLabel}`;
      setInputSubjectRef.current(newSubject);
    }
  }, [graphMetadata.subject]);

  // Get delete confirmation graph title
  const deleteConfirmGraph = showDeleteConfirm ? allGraphs.find(g => g.id === showDeleteConfirm) : null;
  const deleteConfirmTitle = deleteConfirmGraph ? getGraphTitle(deleteConfirmGraph) : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1"></div>
          <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            Knowledge Graph Generator
          </h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={() => setShowShareModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
              title="Share or import knowledge graphs"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
              <span>Share</span>
            </button>
          </div>
        </div>
        
        {/* Toast Notifications */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={handleCloseToast}
          />
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={!!showDeleteConfirm}
          graphTitle={deleteConfirmTitle}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />

        {/* Share Modal */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          currentGraph={currentGraph}
          allGraphs={allGraphs}
          onImportGraphs={importGraphs}
          onToast={handleToast}
        />
        
        {/* Graph Generator */}
        <StreamingGraphGenerator
          onGraphGenerated={addGraph}
          onToast={handleToast}
          onResetState={handleStreamingResetState}
          onSetInputSubject={handleSetInputSubject}
        />
        
        {/* Graph Display Container */}
        <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-xl p-6">
          {/* Navigation Controls and Timeline */}
          <GraphNavigation
            visibleGraphs={visibleGraphs}
            currentGraphIndex={currentGraphIndex}
            onPrevious={goToPreviousGraph}
            onNext={goToNextGraph}
            onGoToIndex={goToGraphAtIndex}
            onRequestDelete={handleDeleteRequest}
          />

          {/* Show title for single graph */}
          {visibleGraphs.length === 1 && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Knowledge Graph</h2>
            </div>
          )}

          {/* Empty State */}
          {visibleGraphs.length === 0 && <EmptyState />}

          {/* Graph Visualization */}
          {visibleGraphs.length > 0 && (
            <GraphVisualization 
              graphData={currentGraphData} 
              metadata={graphMetadata}
              graphId={currentGraph?.id}
              onNodeSelect={handleNodeSelect}
            />
          )}
        </div>
      </div>
    </div>
  );
}
