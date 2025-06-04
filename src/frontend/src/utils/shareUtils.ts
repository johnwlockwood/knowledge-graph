"use client";
import { StoredGraph } from './constants';
import { generateGraphId } from './graphUtils';

// Export formats
export type ExportFormat = 'standard' | 'minimal' | 'shareable';

// Import validation result
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  graphs?: StoredGraph[];
}

// Export options
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
  prettyPrint: boolean;
}

// Import options
export interface ImportOptions {
  resolveConflicts: boolean;
  generateNewIds: boolean;
  preserveTimestamps: boolean;
}

// Export single graph
export function exportSingleGraph(
  graph: StoredGraph, 
  options: ExportOptions = { format: 'standard', includeMetadata: true, prettyPrint: true }
): string {
  let exportData: Record<string, unknown>;

  switch (options.format) {
    case 'minimal':
      exportData = {
        nodes: graph.data.nodes,
        edges: graph.data.edges
      };
      break;
    
    case 'shareable':
      exportData = {
        sharedKnowledge: {
          title: graph.title,
          description: `Knowledge graph about ${graph.subject}`,
          exportedAt: new Date().toISOString(),
          exportedBy: "Knowledge Graph Generator",
          version: "1.0",
          graphs: [graph]
        }
      };
      break;
    
    case 'standard':
    default:
      exportData = {
        knowledgeGraph: {
          exportedAt: new Date().toISOString(),
          exportedBy: "Knowledge Graph Generator",
          version: "1.0",
          type: "single",
          graph: graph
        }
      };
      break;
  }

  return options.prettyPrint 
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
}

// Export multiple graphs
export function exportMultipleGraphs(
  graphs: StoredGraph[], 
  options: ExportOptions = { format: 'standard', includeMetadata: true, prettyPrint: true }
): string {
  let exportData: Record<string, unknown>;

  switch (options.format) {
    case 'minimal':
      exportData = {
        graphs: graphs.map(graph => ({
          nodes: graph.data.nodes,
          edges: graph.data.edges,
          title: graph.title
        }))
      };
      break;
    
    case 'shareable':
      exportData = {
        sharedKnowledge: {
          title: "Knowledge Graph Collection",
          description: `Collection of ${graphs.length} knowledge graphs`,
          exportedAt: new Date().toISOString(),
          exportedBy: "Knowledge Graph Generator",
          version: "1.0",
          graphs: graphs
        }
      };
      break;
    
    case 'standard':
    default:
      exportData = {
        knowledgeGraph: {
          exportedAt: new Date().toISOString(),
          exportedBy: "Knowledge Graph Generator",
          version: "1.0",
          type: "multiple",
          count: graphs.length,
          graphs: graphs
        }
      };
      break;
  }

  return options.prettyPrint 
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
}

// Generate filename for export
export function generateExportFilename(
  graph: StoredGraph | null, 
  format: ExportFormat,
  isMultiple: boolean = false
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const formatSuffix = format === 'minimal' ? '-minimal' : '';
  
  if (isMultiple) {
    return `knowledge-graphs-${timestamp}${formatSuffix}.json`;
  }
  
  if (graph) {
    const safeName = graph.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${safeName}-${timestamp}${formatSuffix}.json`;
  }
  
  return `knowledge-graph-${timestamp}${formatSuffix}.json`;
}

// Download JSON file
export function downloadJSON(data: string, filename: string): void {
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

// Validate imported graph data
export function validateGraphData(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const graphs: StoredGraph[] = [];

  try {
    if (!data || typeof data !== 'object') {
      errors.push('Invalid data format. Expected JSON object.');
      return { isValid: false, errors, warnings };
    }

    const dataObj = data as Record<string, unknown>;
    
    // Handle different import formats
    let graphsToValidate: unknown[] = [];
    
    if (dataObj.knowledgeGraph && typeof dataObj.knowledgeGraph === 'object' && dataObj.knowledgeGraph !== null) {
      const kg = dataObj.knowledgeGraph as Record<string, unknown>;
      if (kg.graph) {
        graphsToValidate = [kg.graph];
      } else if (Array.isArray(kg.graphs)) {
        graphsToValidate = kg.graphs;
      }
    } else if (dataObj.sharedKnowledge && typeof dataObj.sharedKnowledge === 'object' && dataObj.sharedKnowledge !== null) {
      const sk = dataObj.sharedKnowledge as Record<string, unknown>;
      if (Array.isArray(sk.graphs)) {
        graphsToValidate = sk.graphs;
      }
    } else if (Array.isArray(dataObj.graphs)) {
      graphsToValidate = dataObj.graphs;
    } else if (Array.isArray(dataObj.nodes) && Array.isArray(dataObj.edges)) {
      // Minimal format - single graph
      graphsToValidate = [{
        data: { nodes: dataObj.nodes, edges: dataObj.edges },
        title: (typeof dataObj.title === 'string' ? dataObj.title : 'Imported Graph'),
        subject: 'Imported'
      }];
    } else if (Array.isArray(dataObj)) {
      // Direct array of graphs
      graphsToValidate = dataObj;
    } else {
      errors.push('Unrecognized file format. Expected knowledge graph JSON.');
      return { isValid: false, errors, warnings };
    }

    // Validate each graph
    for (let i = 0; i < graphsToValidate.length; i++) {
      const graphData = graphsToValidate[i];
      const graphPrefix = `Graph ${i + 1}: `;

      if (!graphData || typeof graphData !== 'object') {
        errors.push(`${graphPrefix}Invalid graph data`);
        continue;
      }

      const graph = graphData as Record<string, unknown>;

      // Validate basic structure
      const hasDataProperty = graph.data && typeof graph.data === 'object' && graph.data !== null;
      const hasDirectNodes = Array.isArray(graph.nodes);
      
      if (!hasDataProperty && !hasDirectNodes) {
        errors.push(`${graphPrefix}Missing graph data`);
        continue;
      }

      // Handle different data structures
      let nodes: unknown[], edges: unknown[];
      if (hasDataProperty) {
        const graphDataObj = graph.data as Record<string, unknown>;
        nodes = Array.isArray(graphDataObj.nodes) ? graphDataObj.nodes : [];
        edges = Array.isArray(graphDataObj.edges) ? graphDataObj.edges : [];
      } else {
        nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
        edges = Array.isArray(graph.edges) ? graph.edges : [];
      }

      // Validate nodes
      if (nodes.length === 0) {
        warnings.push(`${graphPrefix}Graph has no nodes`);
      }

      // Validate node structure
      for (let j = 0; j < nodes.length; j++) {
        const nodeData = nodes[j];
        if (!nodeData || typeof nodeData !== 'object') {
          errors.push(`${graphPrefix}Node ${j + 1} invalid format`);
          continue;
        }
        const node = nodeData as Record<string, unknown>;
        if (typeof node.id === 'undefined') {
          errors.push(`${graphPrefix}Node ${j + 1} missing id`);
        }
        if (!node.label) {
          warnings.push(`${graphPrefix}Node ${j + 1} missing label`);
        }
        if (!node.color) {
          warnings.push(`${graphPrefix}Node ${j + 1} missing color, will use default`);
        }
      }

      // Validate edge structure
      for (let j = 0; j < edges.length; j++) {
        const edgeData = edges[j];
        if (!edgeData || typeof edgeData !== 'object') {
          errors.push(`${graphPrefix}Edge ${j + 1} invalid format`);
          continue;
        }
        const edge = edgeData as Record<string, unknown>;
        if (typeof edge.source === 'undefined' || typeof edge.target === 'undefined') {
          errors.push(`${graphPrefix}Edge ${j + 1} missing source or target`);
        }
        if (!edge.label) {
          warnings.push(`${graphPrefix}Edge ${j + 1} missing label`);
        }
      }

      // Create sanitized graph
      const sanitizedGraph: StoredGraph = {
        id: (typeof graph.id === 'string' ? graph.id : generateGraphId()),
        title: (typeof graph.title === 'string' ? graph.title : `Imported Graph ${i + 1}`),
        subject: (typeof graph.subject === 'string' ? graph.subject : 'Imported'),
        createdAt: (typeof graph.createdAt === 'number' ? graph.createdAt : Date.now()),
        data: {
          nodes: nodes.map((nodeData) => {
            const node = nodeData as Record<string, unknown>;
            return {
              id: node.id as number,
              label: (typeof node.label === 'string' ? node.label : `Node ${node.id}`),
              color: (typeof node.color === 'string' ? node.color : '#2D3748')
            };
          }),
          edges: edges.map((edgeData) => {
            const edge = edgeData as Record<string, unknown>;
            return {
              source: edge.source as number,
              target: edge.target as number,
              label: (typeof edge.label === 'string' ? edge.label : 'Connection'),
              color: (typeof edge.color === 'string' ? edge.color : 'black')
            };
          })
        }
      };

      graphs.push(sanitizedGraph);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      graphs
    };

  } catch {
    return {
      isValid: false,
      errors: ['Invalid JSON format or corrupted data'],
      warnings
    };
  }
}

// Parse imported JSON data
export function parseImportedData(jsonString: string): ValidationResult {
  try {
    const data = JSON.parse(jsonString);
    return validateGraphData(data);
  } catch {
    return {
      isValid: false,
      errors: ['Invalid JSON format'],
      warnings: []
    };
  }
}

// Generate unique IDs for imported graphs to avoid conflicts
export function generateUniqueIds(graphs: StoredGraph[], existingIds: string[]): StoredGraph[] {
  const allIds = new Set(existingIds);
  
  return graphs.map(graph => {
    let newId = graph.id;
    let counter = 1;
    
    // Generate unique ID if conflict exists
    while (allIds.has(newId)) {
      newId = `${graph.id}-${counter}`;
      counter++;
    }
    
    allIds.add(newId);
    
    return {
      ...graph,
      id: newId
    };
  });
}
