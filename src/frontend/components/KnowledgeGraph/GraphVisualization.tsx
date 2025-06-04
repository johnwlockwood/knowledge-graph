import { useEffect, useRef, useState } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import { ApiNode, ApiEdge, INITIAL_DATA } from '../../utils/constants';
import { mapGraphData, getNetworkOptions, originalLabels, originalColors } from '../../utils/graphUtils';

interface GraphVisualizationProps {
  graphData: { nodes: ApiNode[]; edges: ApiEdge[] };
}

export function GraphVisualization({ graphData }: GraphVisualizationProps) {
  const networkRef = useRef<Network | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const edgesDataSetRef = useRef<DataSet<object> | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<{text: string, x: number, y: number} | null>(null);

  const currentGraphData = graphData || INITIAL_DATA;

  useEffect(() => {
    // Initialize network when component mounts
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

      networkRef.current = new Network(
        containerRef.current, 
        mapGraphData(currentGraphData, edgesDataSetRef), 
        getNetworkOptions()
      );

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
  }, [currentGraphData]);

  return (
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
  );
}
