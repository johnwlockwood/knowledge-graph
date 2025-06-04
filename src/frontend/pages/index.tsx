import { useState, useEffect, useRef } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';

interface ApiNode {
  id: number;
  label: string;
  color: string;
}

interface ApiEdge {
  source: number;
  target: number;
  label: string;
  color: string;
}

// Function to calculate color brightness and return appropriate text color
function getContrastColor(hexColor: string): string {
  // Remove # if present
  const color = hexColor.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(color.substr(0, 2), 16);
  const g = parseInt(color.substr(2, 2), 16);
  const b = parseInt(color.substr(4, 2), 16);
  
  // Calculate luminance using standard formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white for dark backgrounds, black for light backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Function to truncate edge labels for better readability
function truncateLabel(label: string, maxLength: number = 20): string {
  return label.length > maxLength ? label.substring(0, maxLength) + "..." : label;
}

// Store original labels for hover functionality
const originalLabels = new Map<string, string>();

const INITIAL_DATA = {
  nodes: [
    { id: 1, label: "Underpants Gnomes", color: "#2D3748" },
    { id: 2, label: "Phase 1: Collect Underpants", color: "#FFD700" },
    { id: 3, label: "Phase 2: ?", color: "#E53E3E" },
    { id: 4, label: "Phase 3: Profit", color: "#38A169" }
  ],
  edges: [
    { source: 1, target: 2, label: "Mysterious business plan execution", color: "black" },
    { source: 2, target: 3, label: "Unknown intermediate step", color: "black" },
    { source: 3, target: 4, label: "Magical profit generation", color: "black" }
  ]
};

function mapGraphData(data: { nodes: ApiNode[]; edges: ApiEdge[] }, edgesDataSetRef: React.MutableRefObject<DataSet<object> | null>) {
  // Clear previous original labels
  originalLabels.clear();
  
  const edgesDataSet = new DataSet(data.edges.map(edge => {
    const edgeId = `${edge.source}-${edge.target}-${edge.label}`;
    const truncatedLabel = truncateLabel(edge.label);
    
    // Store original label for hover functionality
    originalLabels.set(edgeId, edge.label);
    
    return {
      id: edgeId,
      from: edge.source,
      to: edge.target,
      label: truncatedLabel,
      color: edge.color
    };
  }));
  
  // Store reference to edges DataSet
  edgesDataSetRef.current = edgesDataSet;
  
  return {
    nodes: new DataSet(data.nodes.map(node => ({
      id: node.id,
      label: node.label,
      shape: "box",
      color: {
        background: node.color,
        border: node.color,
        highlight: {
          background: node.color,
          border: node.color
        }
      },
      font: {
        color: getContrastColor(node.color)
      }
    }))),
    edges: edgesDataSet
  };
}

export default function KnowledgeGraph() {
  const [subject, setSubject] = useState('Underpants Gnomes');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [graphData, setGraphData] = useState(INITIAL_DATA);
  const networkRef = useRef<Network | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const edgesDataSetRef = useRef<DataSet<object> | null>(null);

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
        mapGraphData(graphData, edgesDataSetRef), 
        {
          interaction: { hover: true },
          nodes: {
            shape: "box",
            size: 25,
            margin: { top: 10, right: 10, bottom: 10, left: 10 },
            widthConstraint: { minimum: 120 },
            font: {
              size: 18,
              face: "Arial",
              bold: "normal"
            },
            labelHighlightBold: true,
            shadow: true
          },
          edges: {
            width: 2,
            arrows: {
              to: { enabled: true, scaleFactor: 0.5 }
            },
            smooth: {
              enabled: true,
              type: "continuous",
              roundness: 0.5
            },
            font: {
              size: 20,  // Increased font size
              face: "Inter, Arial, sans-serif",
              color: "#374151",
              strokeWidth: 1,  // Added stroke for better contrast
              strokeColor: "#000000",
              align: "middle",
              background: "rgba(255,255,255,0.7)"  // Background for readability
            }
          },
  physics: {
    stabilization: true,
    barnesHut: {
      gravitationalConstant: -8000,
      springConstant: 0.04,
      springLength: 200
    }
  }
        }
      );

      // Add hover event listeners for enhanced edge label visibility
      networkRef.current.on("hoverEdge", (params) => {
        const edgeId = params.edge;
        const originalLabel = originalLabels.get(edgeId);
        
        if (originalLabel && edgesDataSetRef.current) {
          // Update the edge with enhanced styling and full label
          edgesDataSetRef.current.update({
            id: edgeId,
            label: originalLabel,
            font: {
              size: 28,
              face: "Inter, Arial, sans-serif",
              color: "#1F2937",
              strokeWidth: 4,
              strokeColor: "#FFFFFF",
              align: "middle",
              background: "rgba(255,255,255,0.98)",
              border: "4px solid #4F46E5",
              borderRadius: 10
            },
            // Make the edge itself more prominent
            width: 5,
            color: {
              color: "#4F46E5",
              highlight: "#4F46E5",
              hover: "#4F46E5"
            },
            // Add shadow for depth and prominence
            shadow: {
              enabled: true,
              color: 'rgba(79, 70, 229, 0.5)',
              size: 15,
              x: 2,
              y: 2
            }
          });
        }
      });

      networkRef.current.on("blurEdge", (params) => {
        const edgeId = params.edge;
        const originalLabel = originalLabels.get(edgeId);
        
        if (originalLabel && edgesDataSetRef.current) {
          // Restore the edge to its truncated state with original styling
          edgesDataSetRef.current.update({
            id: edgeId,
            label: truncateLabel(originalLabel),
            font: {
              size: 20,
              face: "Inter, Arial, sans-serif",
              color: "#374151",
              strokeWidth: 1,
              strokeColor: "#000000",
              align: "middle",
              background: "rgba(255,255,255,0.7)"
            },
            // Restore original edge styling
            width: 2,
            color: "black",
            shadow: {
              enabled: false
            }
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
  }, [graphData]);

  const generateGraph = async () => {
    if (!subject.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/generate-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subject }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Store the data in state
      setGraphData(data);
      
      // Network will update automatically due to the useEffect dependency
    } catch (err) {
      setError('Failed to generate knowledge graph. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      generateGraph();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-8">
          Knowledge Graph Generator
        </h1>
        
        <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-xl p-6 mb-8">
          <div className="flex space-x-4">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter a subject to explore..."
              className="flex-grow px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={generateGraph}
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </span>
              ) : 'Generate'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 animate-fade-in">
              {error}
            </div>
          )}
        </div>
        
        <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-xl p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Knowledge Graph</h2>
          <div 
            ref={containerRef} 
            className="h-[600px] w-full border-2 border-dashed border-gray-300 rounded-xl"
          ></div>
        </div>
      </div>
    </div>
  );
}
