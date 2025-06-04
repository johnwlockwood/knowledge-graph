import { useState, useEffect, useRef, useCallback } from 'react';
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

interface StoredGraph {
  id: string;
  title: string;
  data: {
    nodes: ApiNode[];
    edges: ApiEdge[];
  };
  createdAt: number;
  subject: string;
  isExample?: boolean;
}

interface UserPreferences {
  hiddenGraphIds: string[];
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

const QUANTUM_PHYSICS_GRAPH = {
  "nodes": [
      {
          "id": 1,
          "label": "Quantum Mechanics",
          "color": "#ff7f0e"
      },
      {
          "id": 2,
          "label": "Wave-Particle Duality",
          "color": "#2ca02c"
      },
      {
          "id": 3,
          "label": "Quantum Superposition",
          "color": "#1f77b4"
      },
      {
          "id": 4,
          "label": "Quantum Entanglement",
          "color": "#d62728"
      },
      {
          "id": 5,
          "label": "Heisenberg Uncertainty Principle",
          "color": "#9467bd"
      }
  ],
  "edges": [
      {
          "source": 1,
          "target": 2,
          "label": "Describes",
          "color": "black"
      },
      {
          "source": 1,
          "target": 3,
          "label": "Fundamental Concept",
          "color": "black"
      },
      {
          "source": 1,
          "target": 4,
          "label": "Phenomenon",
          "color": "black"
      },
      {
          "source": 1,
          "target": 5,
          "label": "Fundamental Principle",
          "color": "black"
      }
  ]
};

// Example graphs with unique IDs
const EXAMPLE_GRAPHS: StoredGraph[] = [
  {
    id: 'example-underpants',
    title: 'Underpants Gnomes',
    data: INITIAL_DATA,
    createdAt: Date.now() - 86400000, // 1 day ago
    subject: 'Underpants Gnomes',
    isExample: true
  },
  {
    id: 'example-quantum',
    title: 'Quantum Mechanics',
    data: QUANTUM_PHYSICS_GRAPH,
    createdAt: Date.now() - 43200000, // 12 hours ago
    subject: 'Quantum Physics',
    isExample: true
  }
];

// Local storage utilities
const STORAGE_KEYS = {
  GRAPHS: 'knowledge-graphs',
  PREFERENCES: 'user-preferences'
};

function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
}

function generateGraphId(): string {
  return `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getGraphTitle(graph: StoredGraph): string {
  return graph.title || (graph.data.nodes.length > 0 ? graph.data.nodes[0].label : 'Untitled Graph');
}

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
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [allGraphs, setAllGraphs] = useState<StoredGraph[]>([]);
  const [visibleGraphs, setVisibleGraphs] = useState<StoredGraph[]>([]);
  const [currentGraphIndex, setCurrentGraphIndex] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const networkRef = useRef<Network | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const edgesDataSetRef = useRef<DataSet<object> | null>(null);
  const [hoveredLabel, setHoveredLabel] = useState<{text: string, x: number, y: number} | null>(null);

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

  // Show toast notifications
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Get current graph data
  const currentGraph = visibleGraphs[currentGraphIndex];
  const currentGraphData = currentGraph?.data || INITIAL_DATA;

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

  const goToGraphAtIndex = (index: number) => {
    if (index >= 0 && index < visibleGraphs.length) {
      setCurrentGraphIndex(index);
    }
  };

  // Remove graph function
  const removeGraph = (graphId: string) => {
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
    setToast({
      message: `Removed "${getGraphTitle(removedGraph!)}" from workspace`,
      type: 'success'
    });
    
    setShowDeleteConfirm(null);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPreviousGraph();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNextGraph();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && currentGraph && visibleGraphs.length > 0) {
        e.preventDefault();
        setShowDeleteConfirm(currentGraph.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGraph, visibleGraphs, goToPreviousGraph, goToNextGraph]);

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
        if (edgesDataSetRef.current) {
          edgesDataSetRef.current.update({
            id: edgeId,
            width: 2,
            color: "black"
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
      
      // Create new graph with unique ID
      const newGraph: StoredGraph = {
        id: generateGraphId(),
        title: data.nodes.length > 0 ? data.nodes[0].label : subject,
        data: data,
        createdAt: Date.now(),
        subject: subject
      };
      
      // Add to all graphs and visible graphs
      const updatedAllGraphs = [...allGraphs, newGraph];
      const updatedVisibleGraphs = [...visibleGraphs, newGraph];
      
      setAllGraphs(updatedAllGraphs);
      setVisibleGraphs(updatedVisibleGraphs);
      setCurrentGraphIndex(updatedVisibleGraphs.length - 1);
      
      setToast({
        message: `Generated "${newGraph.title}" knowledge graph`,
        type: 'success'
      });
      
      // Clear the subject input
      setSubject('');
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
        
        {/* Toast Notifications */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            toast.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              {toast.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {toast.message}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Remove Graph</h3>
              <p className="text-gray-600 mb-4">
                Are you sure you want to remove &ldquo;{getGraphTitle(allGraphs.find(g => g.id === showDeleteConfirm)!)}&rdquo; from your workspace?
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => removeGraph(showDeleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
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
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Knowledge Graph</h2>
            
            {/* Navigation Controls */}
            {visibleGraphs.length > 1 && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousGraph}
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
                    onClick={goToNextGraph}
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
            )}
          </div>

          {/* Graph History Timeline */}
          {visibleGraphs.length > 1 && (
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
                        onClick={() => goToGraphAtIndex(index)}
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
                        onClick={() => setShowDeleteConfirm(graph.id)}
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
          )}

          {/* Empty State */}
          {visibleGraphs.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No knowledge graphs</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by generating your first knowledge graph above.</p>
            </div>
          )}

          {/* Graph Container */}
          {visibleGraphs.length > 0 && (
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
          )}
        </div>
      </div>
    </div>
  );
}
