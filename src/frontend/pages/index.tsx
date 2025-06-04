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


export default function KnowledgeGraph() {
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const networkRef = useRef<Network | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize network when component mounts
    if (containerRef.current) {
      networkRef.current = new Network(
        containerRef.current, 
        { nodes: new DataSet([]), edges: new DataSet([]) }, 
        {
          interaction: { hover: true },
          nodes: {
            shape: "dot",
            size: 30,
            font: {
              size: 14,
              face: "Tahoma"
            }
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
    }

    // Clean up on unmount
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
      }
    };
  }, []);

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
      
      // Map nodes for Vis.js
      const nodes = new DataSet<{id: number, label: string, color: string}>(
        data.nodes.map((node: ApiNode) => ({
          id: node.id,
          label: node.label,
          color: node.color,
        }))
      );
      
      // Map edges for Vis.js
      const edges = new DataSet<{id: string, from: number, to: number, label: string, color: string}>(
        data.edges.map((edge: ApiEdge) => ({
          id: `${edge.source}-${edge.target}-${edge.label}`,
          from: edge.source,
          to: edge.target,
          label: edge.label,
          color: edge.color,
        }))
      );
      
      if (networkRef.current) {
        networkRef.current.setData({ nodes, edges });
      }
    } catch (err) {
      setError('Failed to generate knowledge graph. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-8">Knowledge Graph Generator</h1>
        
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex space-x-4">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter a subject to explore..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={generateGraph}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate'}
            </button>
          </div>
          
          {error && (
            <div className="mt-4 text-red-600">{error}</div>
          )}
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Knowledge Graph</h2>
          <div 
            ref={containerRef} 
            className="h-96 border border-gray-200 rounded-md"
          />
        </div>
      </div>
    </div>
  );
}
