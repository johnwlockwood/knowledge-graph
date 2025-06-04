import { useState, useEffect, useCallback } from 'react';
import { StoredGraph, UserPreferences, EXAMPLE_GRAPHS, STORAGE_KEYS } from '../utils/constants';
import { getGraphTitle } from '../utils/graphUtils';
import { loadFromLocalStorage, saveToLocalStorage } from './useLocalStorage';

export function useGraphData() {
  const [allGraphs, setAllGraphs] = useState<StoredGraph[]>([]);
  const [visibleGraphs, setVisibleGraphs] = useState<StoredGraph[]>([]);
  const [currentGraphIndex, setCurrentGraphIndex] = useState(0);

  // Initialize graphs from localStorage
  useEffect(() => {
    const savedGraphs = loadFromLocalStorage<StoredGraph[]>(STORAGE_KEYS.GRAPHS, []);
    const preferences = loadFromLocalStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES, { hiddenGraphIds: [] });
    
    // Merge saved graphs with examples, avoiding duplicates
    const existingIds = new Set(savedGraphs.map(g => g.id));
    const exampleGraphsToAdd = EXAMPLE_GRAPHS.filter(g => !existingIds.has(g.id));
    const allGraphsData = [...savedGraphs, ...exampleGraphsToAdd];
    
    // Filter out hidden graphs
    const visibleGraphsData = allGraphsData.filter(g => !preferences.hiddenGraphIds.includes(g.id));
    
    setAllGraphs(allGraphsData);
    setVisibleGraphs(visibleGraphsData);
    
    // Set initial graph
    if (visibleGraphsData.length > 0) {
      setCurrentGraphIndex(0);
    }
  }, []);

  // Save graphs to localStorage whenever allGraphs changes
  useEffect(() => {
    if (allGraphs.length > 0) {
      saveToLocalStorage(STORAGE_KEYS.GRAPHS, allGraphs);
    }
  }, [allGraphs]);

  // Navigation functions
  const goToPreviousGraph = useCallback(() => {
    if (currentGraphIndex > 0) {
      setCurrentGraphIndex(currentGraphIndex - 1);
    }
  }, [currentGraphIndex]);

  const goToNextGraph = useCallback(() => {
    if (currentGraphIndex < visibleGraphs.length - 1) {
      setCurrentGraphIndex(currentGraphIndex + 1);
    }
  }, [currentGraphIndex, visibleGraphs.length]);

  const goToGraphAtIndex = useCallback((index: number) => {
    if (index >= 0 && index < visibleGraphs.length) {
      setCurrentGraphIndex(index);
    }
  }, [visibleGraphs.length]);

  // Add new graph
  const addGraph = useCallback((newGraph: StoredGraph) => {
    const updatedAllGraphs = [...allGraphs, newGraph];
    const updatedVisibleGraphs = [...visibleGraphs, newGraph];
    
    setAllGraphs(updatedAllGraphs);
    setVisibleGraphs(updatedVisibleGraphs);
    setCurrentGraphIndex(updatedVisibleGraphs.length - 1);
  }, [allGraphs, visibleGraphs]);

  // Import multiple graphs
  const importGraphs = useCallback((newGraphs: StoredGraph[]) => {
    const updatedAllGraphs = [...allGraphs, ...newGraphs];
    const updatedVisibleGraphs = [...visibleGraphs, ...newGraphs];
    
    setAllGraphs(updatedAllGraphs);
    setVisibleGraphs(updatedVisibleGraphs);
    // Set current index to the first imported graph
    setCurrentGraphIndex(visibleGraphs.length);
  }, [allGraphs, visibleGraphs]);

  // Remove graph function
  const removeGraph = useCallback((graphId: string) => {
    const preferences = loadFromLocalStorage<UserPreferences>(STORAGE_KEYS.PREFERENCES, { hiddenGraphIds: [] });
    const updatedPreferences = {
      ...preferences,
      hiddenGraphIds: [...preferences.hiddenGraphIds, graphId]
    };
    
    saveToLocalStorage(STORAGE_KEYS.PREFERENCES, updatedPreferences);
    
    // Update visible graphs
    const newVisibleGraphs = visibleGraphs.filter(g => g.id !== graphId);
    setVisibleGraphs(newVisibleGraphs);
    
    // Adjust current index if necessary
    if (currentGraphIndex >= newVisibleGraphs.length) {
      setCurrentGraphIndex(Math.max(0, newVisibleGraphs.length - 1));
    }
    
    const removedGraph = allGraphs.find(g => g.id === graphId);
    return removedGraph ? getGraphTitle(removedGraph) : 'Unknown Graph';
  }, [allGraphs, visibleGraphs, currentGraphIndex]);

  // Get current graph
  const currentGraph = visibleGraphs[currentGraphIndex];

  return {
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
  };
}
