"use client";
import { useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { ApiNode, ApiEdge, INITIAL_DATA, FEATURE_FLAGS } from '@/utils/constants';
import { mapGraphData, getNetworkOptions, originalLabels, originalColors, truncateLabel } from '@/utils/graphUtils';
import { FullscreenModal } from './UI/FullscreenModal';

interface GraphMetadata {
  id: string;
  title: string;
  subject: string;
  createdAt: number;
  model: string;
}

interface GraphVisualizationProps {
  graphData: { nodes: ApiNode[]; edges: ApiEdge[] };
  metadata: GraphMetadata;
  isStreaming?: boolean;
  graphId?: string; // Optional graph ID to detect graph changes
  layoutSeed?: string; // Optional layout seed for consistent positioning
  onNodeSelect?: (nodeLabel: string) => void; // Callback for node selection
  onNodeDeselect?: () => void; // Callback for node deselection
  onGenerateFromNode?: (subject: string, sourceNodeId?: number, sourceNodeLabel?: string) => Promise<void>; // Callback to generate from selected node
  onNavigateToChild?: (nodeId: number) => void; // Callback to navigate to child graph
  onNavigateToParent?: (rootNode: ApiNode) => void; // Callback to navigate to parent graph
  onSeedCaptured?: (graphId: string, seed: string) => void; // Callback when network seed is captured
  hasParentGraph?: boolean; // Indicates if this graph has a parent (for nested subgraph control)
}

export function GraphVisualization({ graphData, metadata, isStreaming = false, graphId, layoutSeed, onNodeSelect, onNodeDeselect, onGenerateFromNode, onNavigateToChild, onNavigateToParent, onSeedCaptured, hasParentGraph = false }: GraphVisualizationProps) {
  const networkRef = useRef<Network | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const nodesDataSetRef = useRef<DataSet<object> | null>(null);
  const edgesDataSetRef = useRef<DataSet<object> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [isGeneratingFromNode, setIsGeneratingFromNode] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [pointerPosition, setPointerPosition] = useState<{x: number, y: number, hasNavigationTooltip?: boolean} | null>(null);
  const lastNodeCountRef = useRef<number>(0);
  const lastEdgeCountRef = useRef<number>(0);
  const currentGraphIdRef = useRef<string | undefined>(undefined);
  const selectionDelayRef = useRef<NodeJS.Timeout | null>(null);
  const capturedSeedsRef = useRef<Set<string>>(new Set()); // Track which graphs have had seeds captured

  const currentGraphData = graphData || INITIAL_DATA;
  const truncatedTitle = truncateLabel(metadata.title, 20);

  // Detect touch device on mount
  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    checkTouchDevice();
  }, []);

  // Handle generation from selected node
  const handleGenerateFromNode = async () => {
    if (!selectedNodeLabel || !onGenerateFromNode) return;
    
    // Find the selected node ID
    const selectedNode = currentGraphData.nodes.find(n => n.label === selectedNodeLabel);
    if (!selectedNode) return;
    
    const generationSubject = `${metadata.subject} → ${selectedNodeLabel}`;
    setIsGeneratingFromNode(true);
    
    try {
      await onGenerateFromNode(generationSubject, selectedNode.id, selectedNodeLabel);
    } finally {
      setIsGeneratingFromNode(false);
      setSelectedNodeLabel(null);
      setIsPreviewExpanded(false);
    }
  };

  // Handle text interaction based on device type
  const handleTextMouseEnter = () => {
    if (!isTouchDevice) {
      setIsPreviewExpanded(true);
    }
  };

  const handleTextMouseLeave = () => {
    if (!isTouchDevice) {
      setIsPreviewExpanded(false);
    }
  };

  const handleTextClick = () => {
    if (isTouchDevice) {
      setIsPreviewExpanded(prev => !prev);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Clear preview state when entering or exiting fullscreen mode
  useEffect(() => {
    setSelectedNodeLabel(null);
    setIsPreviewExpanded(false);
    setPointerPosition(null);
  }, [isFullscreen]);

  // Initialize network on mount and when fullscreen changes
  useEffect(() => {
    const initializeNetwork = async () => {
      const currentContainer = isFullscreen ? fullscreenContainerRef.current : containerRef.current;
      if (!currentContainer) return;

      // For fullscreen mode, we use the layoutSeed that was already captured
      // No need to get the seed again since it should already be stored

      // Destroy existing network if it exists
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }

      // Wait for Inter font to load before initializing the network
      try {
        if ('fonts' in document) {
          await document.fonts.load('400 20px Inter');
          await document.fonts.ready;
        }
      } catch (error) {
        console.warn('Font loading failed, proceeding with fallback:', error);
      }

      const mappedData = mapGraphData(currentGraphData, edgesDataSetRef);
      nodesDataSetRef.current = mappedData.nodes as DataSet<object>;
      edgesDataSetRef.current = mappedData.edges as DataSet<object>;

      // Get base network options and add seed if available
      const networkOptions = getNetworkOptions();
      if (layoutSeed) {
        (networkOptions.layout as Record<string, unknown>).randomSeed = layoutSeed;
      }

      networkRef.current = new Network(
        currentContainer, 
        { nodes: nodesDataSetRef.current, edges: edgesDataSetRef.current },
        networkOptions
      );

      // Store initial counts
      lastNodeCountRef.current = currentGraphData.nodes.length;
      lastEdgeCountRef.current = currentGraphData.edges.length;

      // Fit the view after initialization
      networkRef.current.once('afterDrawing', () => {
        networkRef.current?.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
      });

      // Capture and store the seed for graphs without a stored seed (new graphs or existing graphs needing migration)
      // Skip only when we already have a seed or when transitioning to fullscreen with existing seed
      // Allow capture in fullscreen mode when navigating to different graphs that need their seeds captured
      if (!layoutSeed && graphId && onSeedCaptured && !capturedSeedsRef.current.has(graphId)) {
        networkRef.current.once('stabilized', () => {
          // Add a small delay to ensure everything is fully ready after stabilization
          setTimeout(() => {
            try {
              if (networkRef.current && typeof networkRef.current.getSeed === 'function') {
                const currentSeed = networkRef.current.getSeed();
                const seedString = typeof currentSeed === 'string' ? currentSeed : String(currentSeed);
                capturedSeedsRef.current.add(graphId); // Mark this graph as having its seed captured
                onSeedCaptured(graphId, seedString);
              }
            } catch (error) {
              console.warn('Could not capture network seed:', error);
            }
          }, 100);
        });
      }

      // Add node selection event listeners
      if (onNodeSelect) {
        networkRef.current.on('selectNode', (params) => {
          if (params.nodes.length > 0) {
            const selectedNodeId = params.nodes[0];
            // Find the original node data to check if it's a root node
            const originalNode = currentGraphData.nodes.find(n => n.id === selectedNodeId);
            const nodeData = nodesDataSetRef.current?.get(selectedNodeId);
            
            if (nodeData && 'label' in nodeData && originalNode) {
              const nodeLabel = nodeData.label as string;
              
              // Clear any existing selection delay
              if (selectionDelayRef.current) {
                clearTimeout(selectionDelayRef.current);
              }
              
              // Don't show generate preview for root nodes, nodes that already have child graphs, if feature is disabled, or if nested subgraphs are disabled and this graph has a parent
              const canGenerateSubgraph = !originalNode.isRootNode && 
                                        !originalNode.hasChildGraph && 
                                        FEATURE_FLAGS.ENABLE_SUBGRAPH_GENERATION && 
                                        !(FEATURE_FLAGS.DISABLE_NESTED_SUBGRAPHS && hasParentGraph);
              
              if (canGenerateSubgraph) {
                // Capture pointer position for smart positioning
                const domPosition = params.pointer?.DOM;
                if (domPosition) {
                  // Check if this node has navigation instructions (affects tooltip height)
                  const hasNavigationTooltip = originalNode.hasChildGraph;
                  setPointerPosition({ 
                    x: domPosition.x, 
                    y: domPosition.y,
                    hasNavigationTooltip
                  });
                }
                
                // Delay showing the preview to avoid interfering with double-click
                selectionDelayRef.current = setTimeout(() => {
                  setSelectedNodeLabel(nodeLabel);
                  onNodeSelect(nodeLabel);
                }, 300); // 300ms delay - after potential double-click window
              } else {
                // For root nodes or nodes with existing child graphs, clear any existing selection but don't trigger generation preview
                setSelectedNodeLabel(null);
                setIsPreviewExpanded(false);
                setPointerPosition(null);
              }
            }
          }
        });
      }

      // Add node deselection event listener
      if (onNodeDeselect) {
        networkRef.current.on('deselectNode', () => {
          // Clear any pending selection delay
          if (selectionDelayRef.current) {
            clearTimeout(selectionDelayRef.current);
            selectionDelayRef.current = null;
          }
          
          setSelectedNodeLabel(null);
          setIsPreviewExpanded(false);
          setPointerPosition(null);
          onNodeDeselect();
        });
      }

      // Add click-outside handler to hide generate preview
      networkRef.current.on('click', (params) => {
        // If no node is clicked and we have a selected node, clear the selection
        if (params.nodes.length === 0 && selectedNodeLabel) {
          // Clear any pending selection delay
          if (selectionDelayRef.current) {
            clearTimeout(selectionDelayRef.current);
            selectionDelayRef.current = null;
          }
          
          setSelectedNodeLabel(null);
          setIsPreviewExpanded(false);
          setPointerPosition(null);
          if (onNodeDeselect) {
            onNodeDeselect();
          }
        }
      });

      // Add double-click navigation handler
      networkRef.current.on('doubleClick', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          
          // Clear any pending selection delay immediately on double-click
          if (selectionDelayRef.current) {
            clearTimeout(selectionDelayRef.current);
            selectionDelayRef.current = null;
          }
          
          // Find the node data to determine navigation action
          const nodeData = nodesDataSetRef.current?.get(nodeId);
          const originalNode = currentGraphData.nodes.find(n => n.id === nodeId);
          
          if (nodeData && originalNode) {
            if (originalNode.hasChildGraph && onNavigateToChild) {
              // Clear preview state before navigating to child graph
              setSelectedNodeLabel(null);
              setIsPreviewExpanded(false);
              setPointerPosition(null);
              onNavigateToChild(nodeId);
            } else if (originalNode.isRootNode && onNavigateToParent) {
              // Clear preview state before navigating to parent graph
              setSelectedNodeLabel(null);
              setIsPreviewExpanded(false);
              setPointerPosition(null);
              onNavigateToParent(originalNode);
            }
          }
        }
      });

      // Add hover tooltips for navigation nodes
      networkRef.current.on('hoverNode', (params) => {
        const nodeId = params.node;
        const originalNode = currentGraphData.nodes.find(n => n.id === nodeId);
        
        if (originalNode && nodesDataSetRef.current) {
          let tooltipText = originalNode.label;
          
          if (originalNode.hasChildGraph) {
            tooltipText += '\n\n🔗 Double-click to explore sub-graph';
          } else if (originalNode.isRootNode) {
            tooltipText += '\n\n↩️ Double-click to return to parent graph';
          } else if (FEATURE_FLAGS.ENABLE_SUBGRAPH_GENERATION && !(FEATURE_FLAGS.DISABLE_NESTED_SUBGRAPHS && hasParentGraph)) {
            tooltipText += '\n\n💡 Click to generate sub-graph';
          }
          
          // Update the node's title attribute for tooltip
          nodesDataSetRef.current.update({ id: nodeId, title: tooltipText });
        }
      });

      // Clear tooltips when not hovering
      networkRef.current.on('blurNode', (params) => {
        const nodeId = params.node;
        const originalNode = currentGraphData.nodes.find(n => n.id === nodeId);
        
        if (originalNode && nodesDataSetRef.current) {
          // Reset to just the label
          nodesDataSetRef.current.update({ id: nodeId, title: originalNode.label });
        }
      });

      // Add hover tooltips for edges
      networkRef.current.on('hoverEdge', (params) => {
        const edgeId = params.edge;
        const originalLabel = originalLabels.get(edgeId);
        
        if (originalLabel && edgesDataSetRef.current) {
          // Show the edge label as tooltip
          edgesDataSetRef.current.update({ id: edgeId, title: originalLabel });
        }
      });

      // Clear edge tooltips when not hovering
      networkRef.current.on('blurEdge', (params) => {
        const edgeId = params.edge;
        
        if (edgesDataSetRef.current) {
          // Clear the tooltip
          edgesDataSetRef.current.update({ id: edgeId, title: undefined });
        }
      });
    };

    initializeNetwork();

    // Clean up on unmount
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
      // Clear any pending selection delay
      if (selectionDelayRef.current) {
        clearTimeout(selectionDelayRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGraphData, isFullscreen, layoutSeed, graphId, onNodeSelect, onNodeDeselect, onGenerateFromNode, onNavigateToChild, onNavigateToParent, onSeedCaptured]); // Include isFullscreen and all callback functions in dependencies. hasParentGraph and selectedNodeLabel intentionally excluded to prevent unnecessary reinitializations

  // Handle graph changes and incremental updates
  useEffect(() => {
    if (!networkRef.current || !nodesDataSetRef.current || !edgesDataSetRef.current) return;

    const currentNodeCount = currentGraphData.nodes.length;
    const currentEdgeCount = currentGraphData.edges.length;

    // Check if this is a different graph (graph ID changed)
    const isNewGraph = graphId !== currentGraphIdRef.current;
    
    if (isNewGraph) {
      // Completely rebuild the graph data for a new graph
      currentGraphIdRef.current = graphId;
      
      // Clear selection state when navigating to different graph
      if (selectionDelayRef.current) {
        clearTimeout(selectionDelayRef.current);
        selectionDelayRef.current = null;
      }
      setSelectedNodeLabel(null);
      setIsPreviewExpanded(false);
      setPointerPosition(null);
      
      // Clear existing data
      nodesDataSetRef.current.clear();
      edgesDataSetRef.current.clear();
      originalLabels.clear();
      originalColors.clear();
      
      // Rebuild with all current data using the same approach as initialization
      const mappedNodes = currentGraphData.nodes.map(node => ({
        id: node.id,
        label: node.label,
        color: {
          background: node.color,
          border: node.color,
          highlight: {
            background: node.color,
            border: node.color
          }
        },
        font: {
          color: '#ffffff',
          size: 16,
          face: 'Inter, system-ui, sans-serif'
        },
        borderWidth: 2,
        shadow: true
      }));

      const mappedEdges = currentGraphData.edges.map((edge, index) => {
        const edgeId = `${edge.source}-${edge.target}-${index}`;
        
        // Store original label for hover functionality
        originalLabels.set(edgeId, edge.label);
        originalColors.set(edgeId, edge.color);

        return {
          id: edgeId,
          from: edge.source,
          to: edge.target,
          label: '', // Hide label by default
          color: {
            color: edge.color,
            highlight: edge.color,
            hover: edge.color
          },
          width: 2,
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.8
            }
          },
          font: {
            size: 12,
            face: 'Inter, system-ui, sans-serif',
            strokeWidth: 3,
            strokeColor: '#ffffff'
          },
          smooth: {
            type: 'continuous',
            roundness: 0.2
          }
        };
      });
      
      // Add the mapped data
      nodesDataSetRef.current.add(mappedNodes);
      edgesDataSetRef.current.add(mappedEdges);
      
      // Update counts
      lastNodeCountRef.current = currentNodeCount;
      lastEdgeCountRef.current = currentEdgeCount;
      
      // Fit the view to show the new graph
      networkRef.current.once('afterDrawing', () => {
        networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
      });
    } else {
      // Incremental updates for the same graph (streaming)
      
      // Add new nodes
      if (currentNodeCount > lastNodeCountRef.current) {
        const newNodes = currentGraphData.nodes.slice(lastNodeCountRef.current);
        const mappedNewNodes = newNodes.map(node => ({
          id: node.id,
          label: node.label,
          color: {
            background: node.color,
            border: node.color,
            highlight: {
              background: node.color,
              border: node.color
            }
          },
          font: {
            color: '#ffffff',
            size: 16,
            face: 'Inter, system-ui, sans-serif'
          },
          borderWidth: 2,
          shadow: true
        }));

        nodesDataSetRef.current.add(mappedNewNodes);
        lastNodeCountRef.current = currentNodeCount;

        // Animate new nodes if streaming
        if (isStreaming) {
          networkRef.current.once('afterDrawing', () => {
            networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
          });
        }
      }

      // Add new edges
      if (currentEdgeCount > lastEdgeCountRef.current) {
        const newEdges = currentGraphData.edges.slice(lastEdgeCountRef.current);
        const mappedNewEdges = newEdges.map((edge, relativeIndex) => {
          const absoluteIndex = lastEdgeCountRef.current + relativeIndex;
          const edgeId = `${edge.source}-${edge.target}-${absoluteIndex}`;
          
          // Store original label for hover functionality
          originalLabels.set(edgeId, edge.label);
          originalColors.set(edgeId, edge.color);

          return {
            id: edgeId,
            from: edge.source,
            to: edge.target,
            label: '', // Hide label by default
            color: {
              color: edge.color,
              highlight: edge.color,
              hover: edge.color
            },
            width: 2,
            arrows: {
              to: {
                enabled: true,
                scaleFactor: 0.8
              }
            },
            font: {
              size: 12,
              face: 'Inter, system-ui, sans-serif',
              strokeWidth: 3,
              strokeColor: '#ffffff'
            },
            smooth: {
              type: 'continuous',
              roundness: 0.2
            }
          };
        });

        edgesDataSetRef.current.add(mappedNewEdges);
        lastEdgeCountRef.current = currentEdgeCount;
      }
    }
  }, [currentGraphData, isStreaming, graphId]);

  // Render graph content
  const renderGraphContent = (isFullscreenMode: boolean = false) => (
    <div className="relative w-full h-full">
      {/* Subject badge with model attribution */}
      <div 
        className={`absolute top-4 left-4 bg-white/80 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg border border-gray-200 pointer-events-none z-10 max-w-xs`}
      >
        <div className="text-sm font-medium text-gray-800">{truncatedTitle}</div>
        <div className="text-xs text-gray-500 mt-0.5">{metadata.model}</div>
      </div>

      {/* Node Selection Preview Overlay */}
      {selectedNodeLabel && (
        <div 
          className={`absolute bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200 z-20 transition-all duration-300 ${
            selectedNodeLabel ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          } ${isPreviewExpanded ? 'max-w-2xl' : 'max-w-md'}`}
          style={{
            // Smart positioning based on pointer location
            ...(pointerPosition ? {
              // If click was in top half, position below the click
              // If click was in bottom half, position above the click
              // Add extra offset for nodes with navigation tooltips (they're taller)
              top: pointerPosition.y < 300 ? `${pointerPosition.y + (pointerPosition.hasNavigationTooltip ? 100 : 60)}px` : 'auto',
              bottom: pointerPosition.y >= 300 ? `${isFullscreenMode ? window.innerHeight - pointerPosition.y + (pointerPosition.hasNavigationTooltip ? 100 : 60) : 600 - pointerPosition.y + (pointerPosition.hasNavigationTooltip ? 100 : 60)}px` : 'auto',
              left: '50%',
              transform: 'translateX(-50%)'
            } : {
              // Fallback to center positioning
              top: '1rem',
              left: '50%',
              transform: 'translateX(-50%)'
            })
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1">
                Generate from selection:
                {isTouchDevice && (
                  <span className="ml-1 text-xs text-gray-400">(tap to expand)</span>
                )}
              </div>
              <div 
                className={`text-sm font-medium text-gray-800 transition-all duration-200 select-none ${
                  isPreviewExpanded ? 'whitespace-normal' : 'truncate'
                } ${isTouchDevice ? 'cursor-pointer hover:text-gray-600 active:text-gray-500' : 'cursor-default hover:text-gray-600'}`}
                onMouseEnter={handleTextMouseEnter}
                onMouseLeave={handleTextMouseLeave}
                onClick={handleTextClick}
                title={isPreviewExpanded ? '' : `${selectedNodeLabel} ← ${metadata.title}`}
              >
                {selectedNodeLabel} ← {metadata.title}
              </div>
            </div>
            <button
              onClick={handleGenerateFromNode}
              disabled={isGeneratingFromNode}
              className="flex-shrink-0 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-medium rounded-md hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isGeneratingFromNode ? (
                <div className="flex items-center gap-1.5">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Generating...</span>
                </div>
              ) : (
                'Generate'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Navigation Legend - REMOVED FOR SPACE 
          Future reference for visual indicators:
          
          Purple thick border (6px) + large shadow: 
          - Color: #7C3AED (violet-600)
          - Nodes with sub-graphs (double-click to navigate to child)
          - CSS: border-4 border-violet-600, boxShadow: '0 0 8px rgba(124, 58, 237, 0.6)'
          
          Green dashed border + shadow:
          - Color: #059669 (emerald-600) 
          - Root nodes (double-click to navigate to parent)
          - CSS: border: '2px dashed #059669', boxShadow: '0 0 6px rgba(5, 150, 105, 0.5)'
          
          Regular nodes: Default styling with no special navigation
          Hover state: Blue highlight (distinct from navigation indicators)
      */}

      {/* Fullscreen toggle button */}
      <button
        onClick={toggleFullscreen}
        className={`absolute top-4 right-4 z-10 rounded-full p-2 shadow-lg border transition-all duration-200 hover:scale-110 ${isFullscreenMode ? 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200' : 'bg-white/80 hover:bg-white/90 backdrop-blur-sm border-gray-200 text-gray-700'}`}
        title={isFullscreenMode ? "Exit fullscreen" : "Enter fullscreen"}
      >
        {isFullscreenMode ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.5 3.5M15 9h4.5M15 9V4.5M15 9l5.5-5.5M9 15v4.5M9 15H4.5M9 15l-5.5 5.5M15 15h4.5M15 15v4.5m0-4.5l5.5 5.5" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        )}
      </button>
      
      <div 
        ref={isFullscreenMode ? fullscreenContainerRef : containerRef} 
        className={`w-full ${isFullscreenMode ? 'h-full' : 'h-[600px]'} ${isFullscreenMode ? '' : 'border-2 border-dashed border-gray-300 rounded-xl'} relative`}
      >
      </div>
    </div>
  );

  return (
    <>
      {/* Normal view */}
      {renderGraphContent(false)}

      {/* Fullscreen modal */}
      <FullscreenModal isOpen={isFullscreen} onClose={() => setIsFullscreen(false)} includeCloseButton={false}>
        {renderGraphContent(true)}
      </FullscreenModal>
    </>
  );
}
