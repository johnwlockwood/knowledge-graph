"use client";
import { StoredGraph } from './constants';
import { generateGraphId, getConnectedGraphs, extractRelationships } from './graphUtils';

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
  // Create a clean copy of the graph without child graph references for single export
  const cleanGraph: StoredGraph = {
    ...graph,
    // Remove parent/child relationship properties for single graph export
    parentGraphId: undefined,
    parentNodeId: undefined,
    sourceNodeLabel: undefined,
    childGraphIds: undefined,
    data: {
      nodes: graph.data.nodes.map(node => ({
        ...node,
        // Remove child graph references from nodes
        hasChildGraph: undefined,
        childGraphId: undefined,
        // Remove parent graph references from nodes
        isRootNode: undefined,
        parentGraphId: undefined,
        parentNodeId: undefined
      })),
      edges: [...graph.data.edges] // Edges don't need cleaning
    }
  };

  let exportData: Record<string, unknown>;

  switch (options.format) {
    case 'minimal':
      exportData = {
        nodes: cleanGraph.data.nodes,
        edges: cleanGraph.data.edges
      };
      break;
    
    case 'shareable':
      exportData = {
        sharedKnowledge: {
          title: cleanGraph.title,
          description: `Knowledge graph about ${cleanGraph.subject}`,
          exportedAt: new Date().toISOString(),
          exportedBy: "Knowledge Graph Generator",
          version: "1.0",
          graphs: [cleanGraph]
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
          graph: cleanGraph
        }
      };
      break;
  }

  return options.prettyPrint 
    ? JSON.stringify(exportData, null, 2)
    : JSON.stringify(exportData);
}

// Export connected graphs (hierarchical structure)
export function exportConnectedGraphs(
  rootGraph: StoredGraph,
  allGraphs: StoredGraph[],
  options: ExportOptions = { format: 'standard', includeMetadata: true, prettyPrint: true }
): string {
  const connectedGraphs = getConnectedGraphs(rootGraph, allGraphs);
  const relationships = extractRelationships(connectedGraphs);
  
  let exportData: Record<string, unknown>;

  switch (options.format) {
    case 'minimal':
      exportData = {
        connectedGraphs: connectedGraphs.map(graph => ({
          id: graph.id,
          nodes: graph.data.nodes,
          edges: graph.data.edges,
          title: graph.title,
          parentGraphId: graph.parentGraphId,
          parentNodeId: graph.parentNodeId,
          sourceNodeLabel: graph.sourceNodeLabel
        })),
        relationships: relationships
      };
      break;
    
    case 'shareable':
      exportData = {
        sharedKnowledge: {
          title: `Connected Knowledge Network: ${rootGraph.title}`,
          description: `Hierarchical knowledge graph network starting from "${rootGraph.title}" with ${connectedGraphs.length} connected graphs`,
          exportedAt: new Date().toISOString(),
          exportedBy: "Knowledge Graph Generator",
          version: "1.0",
          type: "connected",
          rootGraphId: rootGraph.id,
          graphs: connectedGraphs,
          relationships: relationships
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
          type: "connected",
          rootGraphId: rootGraph.id,
          count: connectedGraphs.length,
          graphs: connectedGraphs,
          relationships: relationships
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
  isMultiple: boolean = false,
  isConnected: boolean = false
): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const formatSuffix = format === 'minimal' ? '-minimal' : '';
  
  if (isConnected && graph) {
    const safeName = graph.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `connected-${safeName}-${timestamp}${formatSuffix}.json`;
  }
  
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

      // Create sanitized graph - preserve relationship properties for connected graphs
      const sanitizedGraph: StoredGraph = {
        id: (typeof graph.id === 'string' ? graph.id : generateGraphId()),
        title: (typeof graph.title === 'string' ? graph.title : `Imported Graph ${i + 1}`),
        subject: (typeof graph.subject === 'string' ? graph.subject : 'Imported'),
        createdAt: (typeof graph.createdAt === 'number' ? graph.createdAt : Date.now()),
        model: (typeof graph.model === 'string' ? graph.model : 'unknown'),
        // Preserve connected graph relationship properties
        ...(typeof graph.parentGraphId === 'string' && { parentGraphId: graph.parentGraphId }),
        ...(typeof graph.parentNodeId === 'number' && { parentNodeId: graph.parentNodeId }),
        ...(typeof graph.sourceNodeLabel === 'string' && { sourceNodeLabel: graph.sourceNodeLabel }),
        ...(Array.isArray(graph.childGraphIds) && { childGraphIds: graph.childGraphIds }),
        ...(typeof graph.layoutSeed === 'string' && { layoutSeed: graph.layoutSeed }),
        data: {
          nodes: nodes.map((nodeData) => {
            const node = nodeData as Record<string, unknown>;
            return {
              id: node.id as number,
              label: (typeof node.label === 'string' ? node.label : `Node ${node.id}`),
              color: (typeof node.color === 'string' ? node.color : '#2D3748'),
              // Preserve node relationship properties for connected graphs
              ...(typeof node.hasChildGraph === 'boolean' && { hasChildGraph: node.hasChildGraph }),
              ...(typeof node.childGraphId === 'string' && { childGraphId: node.childGraphId }),
              ...(typeof node.isRootNode === 'boolean' && { isRootNode: node.isRootNode }),
              ...(typeof node.parentGraphId === 'string' && { parentGraphId: node.parentGraphId }),
              ...(typeof node.parentNodeId === 'number' && { parentNodeId: node.parentNodeId })
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
  const idMapping = new Map<string, string>(); // Track old ID -> new ID mappings
  
  // First pass: generate new IDs and build mapping
  const graphsWithNewIds = graphs.map(graph => {
    let newId = graph.id;
    let counter = 1;
    
    // Generate unique ID if conflict exists
    while (allIds.has(newId)) {
      newId = `${graph.id}-${counter}`;
      counter++;
    }
    
    allIds.add(newId);
    idMapping.set(graph.id, newId);
    
    return {
      ...graph,
      id: newId
    };
  });
  
  // Second pass: update relationship references to use new IDs
  return graphsWithNewIds.map(graph => {
    const updatedGraph = { ...graph };
    
    // Update parentGraphId reference if it maps to a new ID
    if (graph.parentGraphId && idMapping.has(graph.parentGraphId)) {
      updatedGraph.parentGraphId = idMapping.get(graph.parentGraphId);
    }
    
    // Update childGraphIds references if they map to new IDs
    if (graph.childGraphIds) {
      updatedGraph.childGraphIds = graph.childGraphIds.map(childId => 
        idMapping.get(childId) || childId
      );
    }
    
    // Update node references to child graph IDs
    updatedGraph.data = {
      ...graph.data,
      nodes: graph.data.nodes.map(node => {
        const updatedNode = { ...node };
        
        // Update childGraphId reference if it maps to a new ID
        if (node.childGraphId && idMapping.has(node.childGraphId)) {
          updatedNode.childGraphId = idMapping.get(node.childGraphId);
        }
        
        // Update parentGraphId reference if it maps to a new ID
        if (node.parentGraphId && idMapping.has(node.parentGraphId)) {
          updatedNode.parentGraphId = idMapping.get(node.parentGraphId);
        }
        
        return updatedNode;
      })
    };
    
    return updatedGraph;
  });
}
