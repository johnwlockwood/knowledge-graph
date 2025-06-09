"use client";
import { useState, useEffect, useCallback } from 'react';
import { StoredGraph, UserPreferences, EXAMPLE_GRAPHS, STORAGE_KEYS, ApiNode } from '../utils/constants';
import { getGraphTitle, linkChildToParent } from '../utils/graphUtils';
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
    
    // Set initial graph from localStorage or default to latest
    if (visibleGraphsData.length > 0) {
      const savedIndex = loadFromLocalStorage<number>(STORAGE_KEYS.CURRENT_GRAPH_INDEX, -1);
      
      if (savedIndex >= 0 && savedIndex < visibleGraphsData.length) {
        // Use saved index if valid
        setCurrentGraphIndex(savedIndex);
      } else {
        // Fallback to latest graph by createdAt timestamp
        const latestGraphIndex = visibleGraphsData.reduce((latestIndex, graph, index) => {
          return graph.createdAt > visibleGraphsData[latestIndex].createdAt ? index : latestIndex;
        }, 0);
        setCurrentGraphIndex(latestGraphIndex);
      }
    }
  }, []);

  // Save graphs to localStorage whenever allGraphs changes
  useEffect(() => {
    if (allGraphs.length > 0) {
      saveToLocalStorage(STORAGE_KEYS.GRAPHS, allGraphs);
    }
  }, [allGraphs]);

  // Save current graph index to localStorage whenever it changes
  useEffect(() => {
    if (visibleGraphs.length > 0) {
      saveToLocalStorage(STORAGE_KEYS.CURRENT_GRAPH_INDEX, currentGraphIndex);
    }
  }, [currentGraphIndex, visibleGraphs.length]);

  // Navigation functions
  const goToPreviousGraph = useCallback(() => {
    setCurrentGraphIndex(prev => prev > 0 ? prev - 1 : prev);
  }, []);

  const goToNextGraph = useCallback(() => {
    setCurrentGraphIndex(prev => prev < visibleGraphs.length - 1 ? prev + 1 : prev);
  }, [visibleGraphs.length]);

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
    const newVisibleGraphsLength = updatedVisibleGraphs.length;
    setCurrentGraphIndex(newVisibleGraphsLength - newGraphs.length);
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
    setCurrentGraphIndex(prev => prev >= newVisibleGraphs.length ? Math.max(0, newVisibleGraphs.length - 1) : prev);
    
    const removedGraph = allGraphs.find(g => g.id === graphId);
    return removedGraph ? getGraphTitle(removedGraph) : 'Unknown Graph';
  }, [allGraphs, visibleGraphs]);

  // === New Navigation Functions ===

  // Link graphs with parent-child relationship
  const linkGraphs = useCallback((
    parentGraphId: string, 
    parentNodeId: number,
    childGraphId: string, 
    sourceNodeLabel: string
  ) => {
    setAllGraphs(prevGraphs => {
      const parentGraph = prevGraphs.find(g => g.id === parentGraphId);
      const childGraph = prevGraphs.find(g => g.id === childGraphId);
      
      if (!parentGraph || !childGraph) return prevGraphs;
      
      const { updatedParent, updatedChild } = linkChildToParent(
        parentGraph, 
        childGraph, 
        parentNodeId, 
        sourceNodeLabel
      );
      
      return prevGraphs.map(g => 
        g.id === parentGraphId ? updatedParent :
        g.id === childGraphId ? updatedChild : g
      );
    });

    // Also update visibleGraphs
    setVisibleGraphs(prevVisibleGraphs => {
      const parentGraph = prevVisibleGraphs.find(g => g.id === parentGraphId);
      const childGraph = prevVisibleGraphs.find(g => g.id === childGraphId);
      
      if (!parentGraph || !childGraph) return prevVisibleGraphs;
      
      const { updatedParent, updatedChild } = linkChildToParent(
        parentGraph, 
        childGraph, 
        parentNodeId, 
        sourceNodeLabel
      );
      
      return prevVisibleGraphs.map(g => 
        g.id === parentGraphId ? updatedParent :
        g.id === childGraphId ? updatedChild : g
      );
    });
  }, []);

  // Navigate to child graph from a specific node
  const navigateToChildGraph = useCallback((nodeId: number) => {
    const currentGraph = visibleGraphs[currentGraphIndex];
    const currentNode = currentGraph?.data.nodes.find(n => n.id === nodeId);
    if (currentNode?.childGraphId) {
      const childGraphIndex = visibleGraphs.findIndex(g => g.id === currentNode.childGraphId);
      if (childGraphIndex !== -1) {
        setCurrentGraphIndex(childGraphIndex);
      }
    }
  }, [currentGraphIndex, visibleGraphs]);

  // Navigate to parent graph from root node
  const navigateToParentGraph = useCallback((rootNode: ApiNode) => {
    if (rootNode.parentGraphId) {
      const parentGraphIndex = visibleGraphs.findIndex(g => g.id === rootNode.parentGraphId);
      if (parentGraphIndex !== -1) {
        setCurrentGraphIndex(parentGraphIndex);
      }
    }
  }, [visibleGraphs]);

  // Navigate to graph by ID
  const goToGraphById = useCallback((graphId: string) => {
    const graphIndex = visibleGraphs.findIndex(g => g.id === graphId);
    if (graphIndex !== -1) {
      setCurrentGraphIndex(graphIndex);
    }
  }, [visibleGraphs]);

  // Update a graph's layout seed
  const updateGraphSeed = useCallback((graphId: string, seed: string) => {
    setAllGraphs(prev => {
      const updated = prev.map(graph => 
        graph.id === graphId 
          ? { ...graph, layoutSeed: seed }
          : graph
      );
      
      // Update localStorage immediately
      saveToLocalStorage(STORAGE_KEYS.GRAPHS, updated);
      return updated;
    });
  }, []);

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
    removeGraph,
    // New navigation functions
    linkGraphs,
    navigateToChildGraph,
    navigateToParentGraph,
    goToGraphById,
    // Layout persistence
    updateGraphSeed
  };
}
