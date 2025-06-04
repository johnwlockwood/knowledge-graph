import { DataSet } from 'vis-data';
import { ApiNode, ApiEdge, StoredGraph } from './constants';

// Function to calculate color brightness and return appropriate text color
export function getContrastColor(hexColor: string): string {
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
export function truncateLabel(label: string, maxLength: number = 20): string {
  return label.length > maxLength ? label.substring(0, maxLength) + "..." : label;
}

// Generate unique graph ID
export function generateGraphId(): string {
  return `graph-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
  edgesDataSetRef: React.MutableRefObject<DataSet<object> | null>
) {
  // Clear previous original labels and colors
  originalLabels.clear();
  originalColors.clear();
  
  const edgesDataSet = new DataSet(data.edges.map(edge => {
    const edgeId = `${edge.source}-${edge.target}-${edge.label}`;
    const truncatedLabel = truncateLabel(edge.label);
    
    // Store original label and color for hover functionality
    originalLabels.set(edgeId, edge.label);
    originalColors.set(edgeId, edge.color);
    
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
      strokeColor: "#000000",
      align: "middle",
      background: "rgba(255,255,255,0.7)"
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
});
