"use client";
import { useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { ApiNode, ApiEdge, INITIAL_DATA } from '@/utils/constants';
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
  onNodeSelect?: (nodeLabel: string) => void; // Callback for node selection
  onNodeDeselect?: () => void; // Callback for node deselection
  onGenerateFromNode?: (subject: string) => Promise<void>; // Callback to generate from selected node
}

export function GraphVisualization({ graphData, metadata, isStreaming = false, graphId, onNodeSelect, onNodeDeselect, onGenerateFromNode }: GraphVisualizationProps) {
  const networkRef = useRef<Network | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const nodesDataSetRef = useRef<DataSet<object> | null>(null);
  const edgesDataSetRef = useRef<DataSet<object> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState<string | null>(null);
  const [isGeneratingFromNode, setIsGeneratingFromNode] = useState(false);
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const lastNodeCountRef = useRef<number>(0);
  const lastEdgeCountRef = useRef<number>(0);
  const currentGraphIdRef = useRef<string | undefined>(undefined);

  const currentGraphData = graphData || INITIAL_DATA;
  const truncatedSubject = truncateLabel(metadata.subject, 20);

  // Handle generation from selected node
  const handleGenerateFromNode = async () => {
    if (!selectedNodeLabel || !onGenerateFromNode) return;
    
    const generationSubject = `${metadata.subject} -> ${selectedNodeLabel}`;
    setIsGeneratingFromNode(true);
    
    try {
      await onGenerateFromNode(generationSubject);
    } finally {
      setIsGeneratingFromNode(false);
      setSelectedNodeLabel(null);
      setIsPreviewExpanded(false);
    }
  };

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  // Initialize network on mount and when fullscreen changes
  useEffect(() => {
    const initializeNetwork = async () => {
      const currentContainer = isFullscreen ? fullscreenContainerRef.current : containerRef.current;
      if (!currentContainer) return;

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

      networkRef.current = new Network(
        currentContainer, 
        { nodes: nodesDataSetRef.current, edges: edgesDataSetRef.current },
        getNetworkOptions()
      );

      // Store initial counts
      lastNodeCountRef.current = currentGraphData.nodes.length;
      lastEdgeCountRef.current = currentGraphData.edges.length;

      // Fit the view after initialization
      networkRef.current.once('afterDrawing', () => {
        networkRef.current?.fit({ animation: { duration: 300, easingFunction: 'easeInOutQuad' } });
      });

      // Add node selection event listeners
      if (onNodeSelect) {
        networkRef.current.on('selectNode', (params) => {
          if (params.nodes.length > 0) {
            const selectedNodeId = params.nodes[0];
            // Find the node data to get the label
            const nodeData = nodesDataSetRef.current?.get(selectedNodeId);
            if (nodeData && 'label' in nodeData) {
              const nodeLabel = nodeData.label as string;
              setSelectedNodeLabel(nodeLabel);
              onNodeSelect(nodeLabel);
            }
          }
        });
      }

      // Add node deselection event listener
      if (onNodeDeselect) {
        networkRef.current.on('deselectNode', () => {
          setSelectedNodeLabel(null);
          setIsPreviewExpanded(false);
          onNodeDeselect();
        });
      }
    };

    initializeNetwork();

    // Clean up on unmount
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [currentGraphData, isFullscreen, onNodeSelect, onNodeDeselect]); // Include isFullscreen and callback functions in dependencies

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
        <div className="text-sm font-medium text-gray-800">{truncatedSubject}</div>
        <div className="text-xs text-gray-500 mt-0.5">{metadata.model}</div>
      </div>

      {/* Node Selection Preview Overlay */}
      {selectedNodeLabel && (
        <div 
          className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-gray-200 z-20 transition-all duration-300 ${
            selectedNodeLabel ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
          } ${isPreviewExpanded ? 'max-w-2xl' : 'max-w-md'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1">Generate from selection:</div>
              <div 
                className={`text-sm font-medium text-gray-800 cursor-default transition-all duration-200 ${
                  isPreviewExpanded ? 'whitespace-normal' : 'truncate'
                }`}
                onMouseEnter={() => setIsPreviewExpanded(true)}
                onMouseLeave={() => setIsPreviewExpanded(false)}
                title={isPreviewExpanded ? '' : `${metadata.subject} → ${selectedNodeLabel}`}
              >
                {metadata.subject} → {selectedNodeLabel}
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
