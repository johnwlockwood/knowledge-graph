"use client";
import { useState, useEffect } from 'react';

interface StreamingProgressProps {
  isStreaming: boolean;
  status: string;
  progress: {
    nodesCount: number;
    edgesCount: number;
  };
  onCancel?: () => void;
}

export function StreamingProgress({ isStreaming, status, progress, onCancel }: StreamingProgressProps) {
  const [shouldFadeOut, setShouldFadeOut] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Show component when streaming starts or there's progress
  useEffect(() => {
    if (isStreaming) {
      setIsVisible(true);
      setShouldFadeOut(false);
    }
  }, [isStreaming, progress.nodesCount, progress.edgesCount]);

  // Handle fade-out when streaming completes
  useEffect(() => {
    if (!isStreaming) {
      // Show completion for a moment, then start fade-out
      const fadeTimer = setTimeout(() => {
        setShouldFadeOut(true);
        
        // Hide completely after fade animation
        const hideTimer = setTimeout(() => {
          setIsVisible(false);
        }, 500); // Match CSS transition duration
        
        return () => clearTimeout(hideTimer);
      }, 2000); // Show completion for 2 seconds
      
      return () => clearTimeout(fadeTimer);
    }
  }, [isStreaming, progress.nodesCount, progress.edgesCount]);

  if (!isVisible) {
    return null;
  }

  return (
    <div 
      className={`bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4 mb-4 transition-all duration-500 ease-in-out ${
        shouldFadeOut ? 'opacity-0 transform scale-95' : 'opacity-100 transform scale-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            {isStreaming && (
              <div className="flex-shrink-0">
                <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            
            <div className="flex-1">
              <div className="text-sm font-medium text-indigo-900">
                {isStreaming ? 'Building Knowledge Graph...' : 'Graph Complete'}
              </div>
              <div className="text-xs text-indigo-700 mt-1">
                {status}
              </div>
            </div>
          </div>
          
          {/* Progress indicators */}
          <div className="mt-3 flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{progress.nodesCount}</span> nodes
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-700">
                <span className="font-semibold">{progress.edgesCount}</span> connections
              </span>
            </div>
          </div>
        </div>
        
        {/* Cancel button */}
        {isStreaming && onCancel && (
          <button
            onClick={onCancel}
            className="ml-4 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-200 border border-red-200 hover:border-red-300"
          >
            Cancel
          </button>
        )}
      </div>
      
      {/* Animated progress bar */}
      {isStreaming && (
        <div className="mt-3">
          <div className="w-full bg-indigo-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full animate-pulse"></div>
          </div>
        </div>
      )}
    </div>
  );
}
