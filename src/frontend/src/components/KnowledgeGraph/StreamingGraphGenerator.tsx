"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { StoredGraph, STORAGE_KEYS } from '@/utils/constants';
import { useStreamingGraph } from '@/hooks/useStreamingGraph';
import { ModelSelector, AvailableModel } from './UI/ModelSelector';
import { StreamingProgress } from './UI/StreamingProgress';
import { TurnstileWidget } from './UI/TurnstileWidget';
import { loadFromLocalStorage, saveToLocalStorage } from '@/hooks/useLocalStorage';

interface StreamingGraphGeneratorProps {
  onGraphGenerated: (graph: StoredGraph) => void;
  onToast: (message: string, type: 'success' | 'error') => void;
  onResetState?: (resetFn: () => void) => void;
  onSetInputSubject?: (setSubjectFn: (subject: string) => void) => void;
}

export function StreamingGraphGenerator({ onGraphGenerated, onToast, onResetState, onSetInputSubject }: StreamingGraphGeneratorProps) {
  const [subject, setSubject] = useState('');
  const [selectedModel, setSelectedModel] = useState<AvailableModel>('o4-mini-2025-04-16');
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileWidgetRef = useRef<{ resetWidget?: () => void }>(null);
  
  // Track handled errors to prevent infinite re-renders
  const handledErrorRef = useRef<string | null>(null);
  
  // Load saved model on component mount
  useEffect(() => {
    const savedModel = loadFromLocalStorage<AvailableModel>(STORAGE_KEYS.SELECTED_MODEL, 'o4-mini-2025-04-16');
    setSelectedModel(savedModel);
  }, []);
  
  // Save model selection to localStorage whenever it changes
  useEffect(() => {
    saveToLocalStorage(STORAGE_KEYS.SELECTED_MODEL, selectedModel);
  }, [selectedModel]);
  
  const {
    isStreaming,
    status,
    error,
    progress,
    startStreaming,
    cancelStreaming,
    resetState,
    setTurnstileRemountCallback,
    retryPendingRequest,
  } = useStreamingGraph();

  const resetStateRef = useRef(resetState);
  const onToastRef = useRef(onToast);
  
  // Update refs when functions change
  useEffect(() => {
    resetStateRef.current = resetState;
    onToastRef.current = onToast;
  }, [resetState, onToast]);

  // Expose resetState function to parent component
  useEffect(() => {
    if (onResetState) {
      onResetState(resetState);
    }
  }, [onResetState, resetState]);

  // Expose setSubject function to parent component
  useEffect(() => {
    if (onSetInputSubject) {
      onSetInputSubject(setSubject);
    }
  }, [onSetInputSubject]);

  // Set up Turnstile reset callback
  useEffect(() => {
    setTurnstileRemountCallback(() => {
      if (turnstileWidgetRef.current?.resetWidget) {
        turnstileWidgetRef.current.resetWidget();
      }
    });
  }, [setTurnstileRemountCallback]);

  // Handle streaming errors - prevent infinite re-renders
  useEffect(() => {
    if (error && !isStreaming && error !== handledErrorRef.current) {
      handledErrorRef.current = error;
      onToastRef.current(error, 'error');
      setSubject(''); // Reset input on error
      
      // Auto-cleanup partial data after showing error (similar to toast duration)
      const cleanupTimer = setTimeout(() => {
        resetStateRef.current();
      }, 3500); // Slightly longer than typical toast duration
      
      return () => clearTimeout(cleanupTimer);
    }
    
    // Reset the handled error when there's no error
    if (!error) {
      handledErrorRef.current = null;
    }
  }, [error, isStreaming]);


  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    
    // Check if there's a pending request to retry
    retryPendingRequest(token);
  }, [retryPendingRequest]);

  const handleGenerate = async () => {
    if (!subject.trim()) return;
    if (!turnstileToken) {
      onToast('Please complete the security verification', 'error');
      return;
    }
    
    // Clear any previous streaming state before starting new generation
    resetState();
    
    try {
      await startStreaming(subject, selectedModel, (graph: StoredGraph) => {
        onGraphGenerated(graph);
        onToast(`Generated "${graph.title}" knowledge graph with ${graph.data.nodes.length} nodes and ${graph.data.edges.length} connections`, 'success');
        setSubject(''); // Clear input on success
        setTurnstileToken(null); // Reset Turnstile token
        
        // Reset Turnstile widget to get a new token
        if (turnstileWidgetRef.current?.resetWidget) {
          turnstileWidgetRef.current.resetWidget();
        }
      }, turnstileToken);
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
            disabled={isStreaming || !subject.trim() || !turnstileToken}
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

        {/* Model Selection - Minimized */}
        <details className="w-full max-w-md">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-2">
            <span>Model: {selectedModel}</span>
            <svg className="w-4 h-4 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div className="mt-2">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              disabled={isStreaming}
            />
          </div>
        </details>

        {/* Turnstile Security Verification */}
          <TurnstileWidget
            ref={turnstileWidgetRef}
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onVerify={handleTurnstileVerify}
            onError={() => {
              setTurnstileToken(null);
              onToast('Security verification failed. Please try again.', 'error');
            }}
          />
      </div>

      {/* Streaming Progress */}
      <StreamingProgress
        isStreaming={isStreaming}
        status={status}
        progress={progress}
        onCancel={handleCancel}
      />
    </div>
  );
}
