"use client";
import { StoredGraph } from '../../utils/constants';
import { getGraphTitle } from '../../utils/graphUtils';

interface GraphNavigationProps {
  visibleGraphs: StoredGraph[];
  currentGraphIndex: number;
  onPrevious: () => void;
  onNext: () => void;
  onGoToIndex: (index: number) => void;
  onRequestDelete: (graphId: string) => void;
}

export function GraphNavigation({ 
  visibleGraphs, 
  currentGraphIndex, 
  onPrevious, 
  onNext, 
  onGoToIndex, 
  onRequestDelete 
}: GraphNavigationProps) {
  if (visibleGraphs.length <= 1) return null;

  return (
    <>
      {/* Compact Navigation Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-800">Knowledge Graph</h2>
        
        {/* Compact Navigation Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onPrevious}
            disabled={currentGraphIndex === 0}
            className="p-1.5 rounded-md bg-indigo-100 text-indigo-600 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous graph (←)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <span className="text-xs text-gray-600 font-medium px-2">
            {currentGraphIndex + 1}/{visibleGraphs.length}
          </span>
          
          <button
            onClick={onNext}
            disabled={currentGraphIndex === visibleGraphs.length - 1}
            className="p-1.5 rounded-md bg-indigo-100 text-indigo-600 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next graph (→)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Collapsible Graph Timeline */}
      <details className="mb-3 group">
        <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1">
          <span>Show graphs ({visibleGraphs.length})</span>
          <svg className="w-3 h-3 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="mt-2 p-3 bg-gray-50 rounded-lg">
          <div className="relative">
            <div 
              className="flex items-center gap-2 overflow-x-auto pb-1 scroll-smooth"
              style={{
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'thin',
                scrollbarColor: '#cbd5e1 #f1f5f9'
              }}
            >
              {visibleGraphs.map((graph, index) => (
                <div 
                  key={graph.id} 
                  className="flex items-center gap-1 flex-shrink-0"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <button
                    onClick={() => onGoToIndex(index)}
                    className={`min-w-[100px] max-w-[160px] px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 truncate ${
                      index === currentGraphIndex
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300'
                    }`}
                    title={`Go to ${getGraphTitle(graph)}`}
                  >
                    {getGraphTitle(graph)}
                  </button>
                  <button
                    onClick={() => onRequestDelete(graph.id)}
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                    title="Remove graph"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Use ← → keys to navigate • Delete key removes current graph
          </div>
        </div>
      </details>
    </>
  );
}
