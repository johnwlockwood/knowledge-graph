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
