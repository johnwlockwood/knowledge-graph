"use client";
export interface ApiNode {
  id: number;
  label: string;
  color: string;
  
  // Enhanced navigation tracking
  hasChildGraph?: boolean;       // Indicates node has generated sub-graph
  childGraphId?: string;         // ID of child graph generated from this node
  isRootNode?: boolean;          // Indicates this is the root node (for parent navigation)
  parentGraphId?: string;        // ID of parent graph (for root nodes)
  parentNodeId?: number;         // ID of parent node (for root nodes)
}

export interface ApiEdge {
  source: number;
  target: number;
  label: string;
  color: string;
}

export interface StoredGraph {
  id: string;
  title: string;
  data: {
    nodes: ApiNode[];
    edges: ApiEdge[];
  };
  createdAt: number;
  subject: string;
  model: string;
  isExample?: boolean;
  
  // Enhanced relationship tracking
  parentGraphId?: string;        // ID of parent graph
  parentNodeId?: number;         // ID of specific node in parent graph
  sourceNodeLabel?: string;      // Label of node that generated this graph
  childGraphIds?: string[];      // Array of child graph IDs
  
  // Layout persistence
  layoutSeed?: string;           // Network layout seed for consistent positioning
}

export interface UserPreferences {
  hiddenGraphIds: string[];
}

export const INITIAL_DATA = {
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

export const QUANTUM_PHYSICS_GRAPH = {
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
export const EXAMPLE_GRAPHS: StoredGraph[] = [
  {
    id: 'example-underpants',
    title: 'Underpants Gnomes',
    data: INITIAL_DATA,
    createdAt: Date.now() - 86400000, // 1 day ago
    subject: 'Underpants Gnomes',
    model: 'gpt-3.5-turbo-16k',
    isExample: true
  },
  {
    id: 'example-quantum',
    title: 'Quantum Mechanics',
    data: QUANTUM_PHYSICS_GRAPH,
    createdAt: Date.now() - 43200000, // 12 hours ago
    subject: 'Quantum Physics',
    model: 'gpt-3.5-turbo-16k',
    isExample: true
  }
];

// Feature flags with debug logging
const debugEnvVars = () => {
  console.log('=== Feature Flag Environment Variables ===');
  console.log('NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION:', process.env.NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION);
  console.log('NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS:', process.env.NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS);
  console.log('Raw values type check:');
  console.log('  typeof ENABLE_SUBGRAPH_GENERATION:', typeof process.env.NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION);
  console.log('  typeof DISABLE_NESTED_SUBGRAPHS:', typeof process.env.NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS);
};

debugEnvVars();

export const FEATURE_FLAGS = {
  ENABLE_SUBGRAPH_GENERATION: process.env.NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION !== 'false', // Default to true, set NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION=false to disable
  DISABLE_NESTED_SUBGRAPHS: process.env.NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS === 'true' // Default to false, set NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true to disable sub-graphs from sub-graphs
} as const;

console.log('=== Computed Feature Flags ===');
console.log('ENABLE_SUBGRAPH_GENERATION:', FEATURE_FLAGS.ENABLE_SUBGRAPH_GENERATION);
console.log('DISABLE_NESTED_SUBGRAPHS:', FEATURE_FLAGS.DISABLE_NESTED_SUBGRAPHS);
console.log('==========================================');

// Local storage keys
export const STORAGE_KEYS = {
  GRAPHS: 'knowledge-graphs',
  PREFERENCES: 'user-preferences',
  SELECTED_MODEL: 'selected-model',
  CURRENT_GRAPH_INDEX: 'current-graph-index'
} as const;
