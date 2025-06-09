"use client";
import { DataSet } from 'vis-data';
import { ApiNode, ApiEdge, StoredGraph } from './constants';

// Function to convert RGB component to hex
function rgbToHex(value: number): string {
  const hex = value.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

// Cache for contrast color calculations
const colorCache = new Map<string, string>();

// Function to calculate color brightness and return appropriate text color
export function getContrastColor(colorInput: string): string {
  // Return early for server-side rendering
  if (typeof window === 'undefined') {
    return '#000000';
  }

  // Return cached result if available
  if (colorCache.has(colorInput)) {
    return colorCache.get(colorInput)!;
  }

  // Convert any CSS color to hex
  try {
    const tempElement = document.createElement('span');
    tempElement.style.color = colorInput;
    tempElement.style.display = 'none';
    document.body.appendChild(tempElement);

    const computedColor = getComputedStyle(tempElement).color;
    document.body.removeChild(tempElement);

    const rgbValues = computedColor.match(/\d+/g)?.map(Number).slice(0, 3);

    if (rgbValues && rgbValues.length === 3) {
      const hexColor = `#${rgbToHex(rgbValues[0])}${rgbToHex(rgbValues[1])}${rgbToHex(rgbValues[2])}`;
      const cleanHex = hexColor.replace('#', '');

      // Parse RGB values
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

      // Calculate relative luminance (WCAG 2.0 formula)
      const rSRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
      const gSRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
      const bSRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

      const luminance = 0.2126 * rSRGB + 0.7152 * gSRGB + 0.0722 * bSRGB;

      // Determine contrast color
      const contrastColor = luminance > 0.179 ? '#000000' : '#FFFFFF';

      // Cache result
      colorCache.set(colorInput, contrastColor);
      return contrastColor;
    }
  } catch (e) {
    console.error('Error converting color:', e);
  }

  // Fallback to black text if conversion fails
  return '#000000';
}

// Function to truncate edge labels for better readability
export function truncateLabel(label: string, maxLength: number = 20): string {
  return label.length > maxLength ? label.substring(0, maxLength) + "..." : label;
}

// Generate unique graph ID
export function generateGraphId(): string {
  return `graph-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Get graph title from graph data
export function getGraphTitle(graph: StoredGraph): string {
  return graph.title || (graph.data.nodes.length > 0 ? graph.data.nodes[0].label : 'Untitled Graph');
}

// Store original labels for hover functionality
export const originalLabels = new Map<string, string>();

// Store original colors for hover functionality
export const originalColors = new Map<string, string>();

// Map graph data for vis-network
export function mapGraphData(
  data: { nodes: ApiNode[]; edges: ApiEdge[] },
  edgesDataSetRef: React.RefObject<DataSet<object> | null>
) {
  // Clear previous original labels and colors
  originalLabels.clear();
  originalColors.clear();

  const edgesDataSet = new DataSet(data.edges.map(edge => {
    const edgeId = `${edge.source}-${edge.target}-${edge.label}`;

    // Store original label and color for hover functionality
    originalLabels.set(edgeId, edge.label);
    originalColors.set(edgeId, edge.color);

    return {
      id: edgeId,
      from: edge.source,
      to: edge.target,
      label: edge.label,
      color: edge.color
    };
  }));

  // Store reference to edges DataSet
  edgesDataSetRef.current = edgesDataSet;

  return {
    nodes: new DataSet(data.nodes.map(node => {
      // Determine border styling based on node type
      let borderColor = node.color;
      let borderWidth = 2;
      let borderDashes: number[] | undefined = undefined;
      let shadowColor = 'rgba(0,0,0,0.3)';
      let shadowSize = 5;
      
      if (node.hasChildGraph) {
        // Purple outline with double border effect for nodes with child graphs
        borderColor = '#7C3AED';
        borderWidth = 6;
        shadowColor = '#7C3AED';
        shadowSize = 10;
      } else if (node.isRootNode) {
        // Green dashed outline for root nodes
        borderColor = '#059669';
        borderWidth = 4;
        borderDashes = [5, 5];
        shadowColor = '#059669';
        shadowSize = 8;
      }
      
      return {
        id: node.id,
        label: node.label,
        shape: "box",
        color: {
          background: node.color,
          border: borderColor,
          highlight: {
            background: node.color,
            border: borderColor
          }
        },
        borderWidth: borderWidth,
        borderDashes: borderDashes,
        shadow: {
          enabled: true,
          color: shadowColor,
          size: shadowSize,
          x: 0,
          y: 0
        },
        font: {
          color: getContrastColor(node.color),
          size: (node.hasChildGraph || node.isRootNode) ? 18 : 16 // Slightly larger for connected nodes
        }
      };
    })),
    edges: edgesDataSet
  };
}

// Network configuration options
export const getNetworkOptions = () => ({
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
      size: 20,
      face: "Inter, Arial, sans-serif",
      color: "#374151",
      strokeWidth: 1,
      strokeColor: "rgba(255,255,255,0.7)",
      align: "horizontal"
    }
  },
  physics: {
    stabilization: true,
    barnesHut: {
      gravitationalConstant: -8000,
      springConstant: 0.04,
      springLength: 200
    }
  },
  layout: {
    hierarchical: false,
  },
});

// === Graph Relationship Utility Functions ===

/**
 * Links a child graph to its parent graph with specific node relationship
 */
export function linkChildToParent(
  parentGraph: StoredGraph, 
  childGraph: StoredGraph, 
  parentNodeId: number,
  sourceNodeLabel: string
): { updatedParent: StoredGraph; updatedChild: StoredGraph } {
  // Update parent node to reference child
  const updatedParentNodes = parentGraph.data.nodes.map(node => 
    node.id === parentNodeId 
      ? { ...node, hasChildGraph: true, childGraphId: childGraph.id }
      : node
  );
  
  // Update parent graph
  const updatedParent: StoredGraph = {
    ...parentGraph,
    data: { ...parentGraph.data, nodes: updatedParentNodes },
    childGraphIds: [...(parentGraph.childGraphIds || []), childGraph.id]
  };
  
  // Mark root node in child graph (assume first node is root)
  const rootNodeUpdated = childGraph.data.nodes.map((node, index) => 
    index === 0 
      ? { 
          ...node, 
          isRootNode: true, 
          parentGraphId: parentGraph.id, 
          parentNodeId: parentNodeId
        }
      : node
  );
  
  // Update child graph with parent reference
  const updatedChild: StoredGraph = {
    ...childGraph,
    parentGraphId: parentGraph.id,
    parentNodeId: parentNodeId,
    sourceNodeLabel: sourceNodeLabel,
    data: { ...childGraph.data, nodes: rootNodeUpdated }
  };
  
  return { updatedParent, updatedChild };
}

/**
 * Updates a specific node in a graph to mark it as having a child graph
 */
export function updateNodeWithChild(
  graph: StoredGraph, 
  nodeId: number, 
  childGraphId: string
): StoredGraph {
  const updatedNodes = graph.data.nodes.map(node => 
    node.id === nodeId 
      ? { ...node, hasChildGraph: true, childGraphId }
      : node
  );
  
  return {
    ...graph,
    data: { ...graph.data, nodes: updatedNodes },
    childGraphIds: [...(graph.childGraphIds || []), childGraphId]
  };
}

/**
 * Marks the root node in a child graph with parent relationship data
 */
export function markRootNode(
  graph: StoredGraph, 
  nodeLabel: string, 
  parentGraphId: string, 
  parentNodeId: number
): StoredGraph {
  const updatedNodes = graph.data.nodes.map((node, index) => 
    index === 0 // Assume first node is root
      ? { 
          ...node, 
          isRootNode: true, 
          parentGraphId, 
          parentNodeId
        }
      : node
  );
  
  return {
    ...graph,
    data: { ...graph.data, nodes: updatedNodes }
  };
}

/**
 * Finds a parent node by ID in a graph
 */
export function findParentNode(
  parentGraph: StoredGraph, 
  nodeId: number
): ApiNode | null {
  return parentGraph.data.nodes.find(node => node.id === nodeId) || null;
}

/**
 * Gets all graphs connected to a given graph (both ancestors and descendants)
 */
export function getConnectedGraphs(
  rootGraph: StoredGraph, 
  allGraphs: StoredGraph[]
): StoredGraph[] {
  const visited = new Set<string>();
  const connected: StoredGraph[] = [];
  
  function traverse(graph: StoredGraph) {
    if (visited.has(graph.id)) return;
    visited.add(graph.id);
    connected.push(graph);
    
    // Add child graphs
    graph.childGraphIds?.forEach(childId => {
      const childGraph = allGraphs.find(g => g.id === childId);
      if (childGraph) traverse(childGraph);
    });
    
    // Add parent graph
    if (graph.parentGraphId) {
      const parentGraph = allGraphs.find(g => g.id === graph.parentGraphId);
      if (parentGraph) traverse(parentGraph);
    }
  }
  
  traverse(rootGraph);
  return connected;
}

/**
 * Extracts relationship mappings from connected graphs
 */
export function extractRelationships(graphs: StoredGraph[]): Array<{
  parentGraphId: string;
  parentNodeId: number;
  childGraphId: string;
  sourceNodeLabel: string;
}> {
  const relationships: Array<{
    parentGraphId: string;
    parentNodeId: number;
    childGraphId: string;
    sourceNodeLabel: string;
  }> = [];
  
  graphs.forEach(graph => {
    if (graph.parentGraphId && graph.parentNodeId && graph.sourceNodeLabel) {
      relationships.push({
        parentGraphId: graph.parentGraphId,
        parentNodeId: graph.parentNodeId,
        childGraphId: graph.id,
        sourceNodeLabel: graph.sourceNodeLabel
      });
    }
  });
  
  return relationships;
}
