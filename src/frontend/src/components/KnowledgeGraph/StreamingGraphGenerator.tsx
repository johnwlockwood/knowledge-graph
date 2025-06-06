"use client";
import { useState, useEffect, useRef } from 'react';
import { StoredGraph } from '@/utils/constants';
import { useStreamingGraph } from '@/hooks/useStreamingGraph';
import { ModelSelector, AvailableModel } from './UI/ModelSelector';
import { StreamingProgress } from './UI/StreamingProgress';
import { GraphVisualization } from './GraphVisualization';

interface StreamingGraphGeneratorProps {
  onGraphGenerated: (graph: StoredGraph) => void;
  onToast: (message: string, type: 'success' | 'error') => void;
  onResetState?: (resetFn: () => void) => void;
}

export function StreamingGraphGenerator({ onGraphGenerated, onToast, onResetState }: StreamingGraphGeneratorProps) {
  const [subject, setSubject] = useState('');
  const [selectedModel, setSelectedModel] = useState<AvailableModel>('gpt-4o-mini-2024-07-18');
  
  // Track handled errors to prevent infinite re-renders
  const handledErrorRef = useRef<string | null>(null);
  
  const {
    isStreaming,
    nodes,
    edges,
    status,
    error,
    progress,
    startStreaming,
    cancelStreaming,
    resetState,
  } = useStreamingGraph();

  // Expose resetState function to parent component
  useEffect(() => {
    if (onResetState) {
      onResetState(resetState);
    }
  }, [onResetState, resetState]);

  // Handle streaming errors - prevent infinite re-renders
  useEffect(() => {
    if (error && !isStreaming && error !== handledErrorRef.current) {
      handledErrorRef.current = error;
      onToast(error, 'error');
      setSubject(''); // Reset input on error
    }
    
    // Reset the handled error when there's no error
    if (!error) {
      handledErrorRef.current = null;
    }
  }, [error, isStreaming, onToast]);

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    
    // Clear any previous streaming state before starting new generation
    resetState();
    
    try {
      await startStreaming(subject, selectedModel, (graph: StoredGraph) => {
        onGraphGenerated(graph);
        onToast(`Generated "${graph.title}" knowledge graph with ${graph.data.nodes.length} nodes and ${graph.data.edges.length} connections`, 'success');
        setSubject(''); // Clear input on success
      });
    } catch (err) {
      onToast('Failed to start streaming. Please try again.', 'error');
      console.error(err);
    }
  };

  const handleCancel = () => {
    cancelStreaming();
    onToast('Graph generation cancelled', 'success');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isStreaming) {
      handleGenerate();
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-xl p-6 mb-8">
      {/* Input Section */}
      <div className="space-y-4">
        <div className="flex space-x-4">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a subject to explore..."
            disabled={isStreaming}
            className="flex-grow px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleGenerate}
            disabled={isStreaming || !subject.trim()}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isStreaming ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </span>
            ) : 'Generate'}
          </button>
        </div>

        {/* Model Selection */}
        <div className="w-full max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Model
          </label>
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={isStreaming}
          />
        </div>
      </div>

      {/* Streaming Progress */}
      <StreamingProgress
        isStreaming={isStreaming}
        status={status}
        progress={progress}
        onCancel={handleCancel}
      />

      {/* Real-time Graph Visualization */}
      {(nodes.length > 0 || edges.length > 0) && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Live Graph Preview</h3>
            <div className="text-sm text-gray-600">
              Building in real-time...
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <GraphVisualization 
              graphData={{ nodes, edges }} 
              model={selectedModel}
              isStreaming={isStreaming}
            />
          </div>
        </div>
      )}
    </div>
  );
}
