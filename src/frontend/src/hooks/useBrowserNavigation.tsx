"use client";
import { useEffect, useCallback } from 'react';
import { StoredGraph } from '@/utils/constants';

interface UseBrowserNavigationProps {
  visibleGraphs: StoredGraph[];
  currentGraphIndex: number;
  onNavigateToGraph: (index: number) => void;
}

export function useBrowserNavigation({
  visibleGraphs,
  currentGraphIndex,
  onNavigateToGraph
}: UseBrowserNavigationProps) {

  // Update hash when current graph changes
  useEffect(() => {
    if (visibleGraphs.length === 0) return;
    
    const currentGraph = visibleGraphs[currentGraphIndex];
    if (!currentGraph) return;

    // Update hash without causing a page refresh
    const newHash = `#graph=${currentGraph.id}`;
    
    // Only update if the hash is different to avoid infinite loops
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }, [currentGraphIndex, visibleGraphs]);

  // Handle browser back/forward navigation and hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/^#graph=(.+)$/);
      const graphId = match ? match[1] : null;
      
      if (graphId && visibleGraphs.length > 0) {
        const graphIndex = visibleGraphs.findIndex(g => g.id === graphId);
        if (graphIndex !== -1 && graphIndex !== currentGraphIndex) {
          onNavigateToGraph(graphIndex);
        }
      } else if (!hash && visibleGraphs.length > 0) {
        // No hash, go to first graph
        if (currentGraphIndex !== 0) {
          onNavigateToGraph(0);
        }
      }
    };

    // Listen for hash change events (back/forward navigation)
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [visibleGraphs, currentGraphIndex, onNavigateToGraph]);

  // Initialize hash on mount if no hash exists or navigate to hash if it exists
  useEffect(() => {
    if (visibleGraphs.length === 0) return;
    
    const hash = window.location.hash;
    const match = hash.match(/^#graph=(.+)$/);
    const graphId = match ? match[1] : null;
    
    if (!graphId) {
      // No graph in hash, set it to current graph
      const currentGraph = visibleGraphs[currentGraphIndex];
      if (currentGraph) {
        window.history.replaceState(null, '', `#graph=${currentGraph.id}`);
      }
    } else {
      // Graph in hash, navigate to it if it exists and is different from current
      const graphIndex = visibleGraphs.findIndex(g => g.id === graphId);
      if (graphIndex !== -1 && graphIndex !== currentGraphIndex) {
        onNavigateToGraph(graphIndex);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - dependencies intentionally omitted to prevent loops

  // Function to programmatically navigate with browser history
  const navigateToGraph = useCallback((index: number) => {
    if (index < 0 || index >= visibleGraphs.length) return;
    
    const targetGraph = visibleGraphs[index];
    if (!targetGraph) return;

    const newHash = `#graph=${targetGraph.id}`;
    
    // Push to history (creates back/forward entry)
    window.history.pushState(null, '', newHash);
    
    // Manually trigger navigation since pushState doesn't fire hashchange
    if (index !== currentGraphIndex) {
      onNavigateToGraph(index);
    }
  }, [visibleGraphs, currentGraphIndex, onNavigateToGraph]);

  return {
    navigateToGraph
  };
}