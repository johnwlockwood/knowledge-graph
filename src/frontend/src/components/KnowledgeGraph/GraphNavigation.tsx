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
      {/* Navigation Controls */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Knowledge Graph</h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={onPrevious}
              disabled={currentGraphIndex === 0}
              className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous graph (←)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="text-sm text-gray-600 font-medium">
              {currentGraphIndex + 1} of {visibleGraphs.length}
            </span>
            
            <button
              onClick={onNext}
              disabled={currentGraphIndex === visibleGraphs.length - 1}
              className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next graph (→)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Graph History Timeline */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <div className="relative">
          {/* Scroll container with improved spacing and behavior */}
          <div 
            className="flex items-center gap-3 overflow-x-auto pb-2 scroll-smooth"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e1 #f1f5f9'
            }}
          >
            {visibleGraphs.map((graph, index) => (
              <div 
                key={graph.id} 
                className="flex items-center gap-2 flex-shrink-0"
                style={{ scrollSnapAlign: 'start' }}
              >
                <button
                  onClick={() => onGoToIndex(index)}
                  className={`min-w-[120px] max-w-[200px] px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 truncate ${
                    index === currentGraphIndex
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  title={`Go to ${getGraphTitle(graph)}`}
                >
                  {getGraphTitle(graph)}
                </button>
                <button
                  onClick={() => onRequestDelete(graph.id)}
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 group"
                  title="Remove graph"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          
          {/* Scroll indicators - left fade */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-50 to-transparent pointer-events-none z-10"></div>
          
          {/* Scroll indicators - right fade */}
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-50 to-transparent pointer-events-none z-10"></div>
        </div>
        <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
          <span>Use ← → arrow keys to navigate • Delete key to remove current graph • Click × to remove specific graphs</span>
          {visibleGraphs.length > 3 && (
            <span className="text-indigo-600 font-medium">← Scroll to see more →</span>
          )}
        </div>
      </div>
    </>
  );
}
