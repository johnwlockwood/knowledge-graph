import { useState, useEffect, useRef } from 'react';
import { DataSet } from 'vis-data';
import { Network } from 'vis-network/standalone';
import Head from 'next/head';

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
              face: "Inter",
              color: "#1f2937",
              strokeWidth: 2,
              strokeColor: "#ffffff"
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
            },
            font: {
              size: 12,
              face: "Inter",
              color: "#374151",
              strokeWidth: 0,
              align: "middle"
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
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
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
              className="h-96 border-2 border-dashed border-gray-300 rounded-xl"
            />
          </div>
        </div>
      </div>
    </>
  );
}
