import { useState } from 'react';
import { useGraphData } from '../../hooks/useGraphData';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { getGraphTitle } from '../../utils/graphUtils';
import { INITIAL_DATA } from '../../utils/constants';
import { GraphGenerator } from './GraphGenerator';
import { GraphNavigation } from './GraphNavigation';
import { GraphVisualization } from './GraphVisualization';
import { Toast } from './UI/Toast';
import { DeleteConfirmModal } from './UI/DeleteConfirmModal';
import { EmptyState } from './UI/EmptyState';

export default function KnowledgeGraph() {
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const {
    allGraphs,
    visibleGraphs,
    currentGraph,
    currentGraphIndex,
    goToPreviousGraph,
    goToNextGraph,
    goToGraphAtIndex,
    addGraph,
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

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPrevious: goToPreviousGraph,
    onNext: goToNextGraph,
    onDelete: currentGraph && visibleGraphs.length > 0 ? () => handleDeleteRequest(currentGraph.id) : undefined
  });

  // Get current graph data
  const currentGraphData = currentGraph?.data || INITIAL_DATA;

  // Get delete confirmation graph title
  const deleteConfirmGraph = showDeleteConfirm ? allGraphs.find(g => g.id === showDeleteConfirm) : null;
  const deleteConfirmTitle = deleteConfirmGraph ? getGraphTitle(deleteConfirmGraph) : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-8">
          Knowledge Graph Generator
        </h1>
        
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
        
        {/* Graph Generator */}
        <GraphGenerator
          onGraphGenerated={addGraph}
          onToast={handleToast}
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
            <GraphVisualization graphData={currentGraphData} />
          )}
        </div>
      </div>
    </div>
  );
}
