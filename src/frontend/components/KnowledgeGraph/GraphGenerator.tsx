import { useState } from 'react';
import { StoredGraph } from '../../utils/constants';
import { generateGraphId } from '../../utils/graphUtils';

interface GraphGeneratorProps {
  onGraphGenerated: (graph: StoredGraph) => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function GraphGenerator({ onGraphGenerated, onToast }: GraphGeneratorProps) {
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      
      onGraphGenerated(newGraph);
      onToast(`Generated "${newGraph.title}" knowledge graph`, 'success');
      
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
  );
}
