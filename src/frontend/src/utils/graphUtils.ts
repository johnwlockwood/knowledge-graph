"use client";
import { DataSet } from 'vis-data';
import { ApiNode, ApiEdge, StoredGraph } from './constants';

// Function to calculate color brightness and return appropriate text color
export function getContrastColor(colorInput: string): string {
  // Remove console.log as it's no longer needed
  // Map named colors to their hex equivalents
  const namedColors: Record<string, string> = {
    yellow: '#FFFF00',
    lightblue: '#ADD8E6',
    lightgreen: '#90EE90',
    orange: '#FFA500',
    lightpink: '#FFB6C1',
    red: '#FF0000',
    green: '#008000',
    blue: '#0000FF',
    purple: '#800080',
    black: '#000000',
    white: '#FFFFFF',
    gray: '#808080',
    lightgray: '#D3D3D3',
    darkgray: '#A9A9A9',
    cyan: '#00FFFF',
    magenta: '#FF00FF',
    lime: '#00FF00',
    maroon: '#800000',
    navy: '#000080',
    olive: '#808000',
    teal: '#008080',
    silver: '#C0C0C0'
  };

  // Convert named color to hex if needed
  let hexColor = colorInput.toLowerCase();
  if (namedColors[hexColor]) {
    hexColor = namedColors[hexColor];
  }

  // Remove # if present
  const cleanHex = hexColor.replace('#', '');
  
  // Handle both 3-digit and 6-digit hex formats
  let fullHex = cleanHex;
  if (cleanHex.length === 3) {
    fullHex = cleanHex.split('').map(char => char + char).join('');
  }
  
  // Parse RGB values
  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;

  // Calculate relative luminance (WCAG 2.0 formula)
  const rSRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gSRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bSRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  const luminance = 0.2126 * rSRGB + 0.7152 * gSRGB + 0.0722 * bSRGB;

  // Return black text for light backgrounds, white for dark backgrounds
  return luminance > 0.179 ? '#000000' : '#FFFFFF';
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
