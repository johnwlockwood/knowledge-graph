"use client";
import { useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { ApiNode, ApiEdge, INITIAL_DATA } from '@/utils/constants';
import { mapGraphData, getNetworkOptions, originalLabels, originalColors } from '@/utils/graphUtils';

interface GraphVisualizationProps {
  graphData: { nodes: ApiNode[]; edges: ApiEdge[] };
  model?: string;
  isStreaming?: boolean;
  graphId?: string; // Optional graph ID to detect graph changes
}

export function GraphVisualization({ graphData, model, isStreaming = false, graphId }: GraphVisualizationProps) {
  const networkRef = useRef<Network | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesDataSetRef = useRef<DataSet<object> | null>(null);
  const edgesDataSetRef = useRef<DataSet<object> | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<{text: string, x: number, y: number} | null>(null);
  const lastNodeCountRef = useRef<number>(0);
  const lastEdgeCountRef = useRef<number>(0);
  const currentGraphIdRef = useRef<string | undefined>(undefined);

  const currentGraphData = graphData || INITIAL_DATA;
  const currentModel = model || 'gpt-3.5';

  // Initialize network on mount
  useEffect(() => {
    const initializeNetwork = async () => {
      if (!containerRef.current) return;

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
        containerRef.current, 
        { nodes: nodesDataSetRef.current, edges: edgesDataSetRef.current },
        getNetworkOptions()
      );

      // Store initial counts
      lastNodeCountRef.current = currentGraphData.nodes.length;
      lastEdgeCountRef.current = currentGraphData.edges.length;

      // Add hover event listeners for custom overlay label
      networkRef.current.on("hoverEdge", (params) => {
        const edgeId = params.edge;
        const originalLabel = originalLabels.get(edgeId);
        
        if (originalLabel && networkRef.current && containerRef.current && edgesDataSetRef.current) {
          // Get the edge data
          const edgeData = edgesDataSetRef.current.get(edgeId);
          
          if (edgeData && typeof edgeData === 'object' && 'from' in edgeData && 'to' in edgeData) {
            // Get node positions
            const fromNodeId = (edgeData as { from: number; to: number }).from;
            const toNodeId = (edgeData as { from: number; to: number }).to;
            const fromNode = networkRef.current.getPositions([fromNodeId]);
            const toNode = networkRef.current.getPositions([toNodeId]);
            
            if (fromNode && toNode) {
              const fromPos = Object.values(fromNode)[0] as {x: number, y: number};
              const toPos = Object.values(toNode)[0] as {x: number, y: number};
              
              const centerX = (fromPos.x + toPos.x) / 2;
              const centerY = (fromPos.y + toPos.y) / 2;
              
              // Convert network coordinates to DOM coordinates
              const domPosition = networkRef.current.canvasToDOM({x: centerX, y: centerY});
              
              // Set the floating label with position relative to the container
              setHoveredLabel({
                text: originalLabel,
                x: domPosition.x,
                y: domPosition.y - 20 // Offset slightly above the edge
              });
            }
          }
          
          // Enhance the edge styling
          edgesDataSetRef.current.update({
            id: edgeId,
            width: 4,
            color: {
              color: "#4F46E5",
              highlight: "#4F46E5",
              hover: "#4F46E5"
            }
          });
        }
      });

      networkRef.current.on("blurEdge", (params) => {
        const edgeId = params.edge;
        
        // Hide the floating label
        setHoveredLabel(null);
        
        // Restore original edge styling
        if (edgesDataSetRef.current && originalColors.has(edgeId)) {
          edgesDataSetRef.current.update({
            id: edgeId,
            width: 2,
            color: originalColors.get(edgeId)
          });
        }
      });
    };

    initializeNetwork();

    // Clean up on unmount
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, [currentGraphData]); // Include currentGraphData in dependencies

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

      const mappedEdges = currentGraphData.edges.map(edge => {
        const edgeId = `${edge.source}-${edge.target}`;
        
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
      setTimeout(() => {
        networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
      }, 100);
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
          setTimeout(() => {
            networkRef.current?.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
          }, 100);
        }
      }

      // Add new edges
      if (currentEdgeCount > lastEdgeCountRef.current) {
        const newEdges = currentGraphData.edges.slice(lastEdgeCountRef.current);
        const mappedNewEdges = newEdges.map(edge => {
          const edgeId = `${edge.source}-${edge.target}`;
          
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

  return (
    <div className="relative">
      {/* Model badge - positioned outside the vis-network container */}
      {currentModel && (
        <div 
          className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-gray-200 pointer-events-none"
          style={{ 
            zIndex: 1000,
            position: 'absolute',
            backgroundColor: 'rgba(255, 255, 255, 0.8)'
          }}
        >
          <span className="text-xs font-medium text-gray-700">Model: {currentModel}</span>
        </div>
      )}
      
      <div 
        ref={containerRef} 
        className="h-[600px] w-full border-2 border-dashed border-gray-300 rounded-xl relative"
      >
        {/* Floating label overlay */}
        {hoveredLabel && (
          <div
            className="absolute z-50 pointer-events-none"
            style={{
              left: hoveredLabel.x,
              top: hoveredLabel.y,
              transform: 'translate(-50%, -100%)'
            }}
          >
            <div className="bg-white border-4 border-indigo-500 rounded-lg px-4 py-2 shadow-lg max-w-xs">
              <div className="text-sm font-semibold text-gray-900 text-center">
                {hoveredLabel.text}
              </div>
              {/* Arrow pointing down */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2">
                <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-indigo-500"></div>
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2">
                  <div className="w-0 h-0 border-l-6 border-r-6 border-t-6 border-l-transparent border-r-transparent border-t-white"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
