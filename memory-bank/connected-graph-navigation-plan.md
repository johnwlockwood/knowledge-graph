# Connected Graph Navigation System Plan

## Overview
Create a hierarchical graph navigation system where users can navigate between parent and child graphs by double-clicking/tapping nodes that have generated sub-graphs or parent relationships.

## 1. Enhanced Data Model Changes

### 1.1 Updated StoredGraph Interface
```typescript
interface StoredGraph {
  id: string;
  title: string;
  data: { nodes: ApiNode[]; edges: ApiEdge[] };
  createdAt: number;
  subject: string;
  model: string;
  isExample?: boolean;
  
  // Enhanced relationship tracking
  parentGraphId?: string;        // ID of parent graph
  parentNodeId?: number;         // ID of specific node in parent graph
  sourceNodeLabel?: string;      // Label of node that generated this graph
  childGraphIds?: string[];      // Array of child graph IDs
}
```

### 1.2 Enhanced Node Interface with Child Mapping
```typescript
interface ApiNode {
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
```

## 2. Backend Changes

### 2.1 Enhanced StreamingGraphRequest
```python
class StreamingGraphRequest(BaseModel):
    subject: str
    model: Literal[...]
    turnstile_token: str | None = None
    parent_graph_id: str | None = None    # Parent graph ID
    parent_node_id: int | None = None     # Parent node ID - NEW
    source_node_label: str | None = None  # Source node label
```

### 2.2 Enhanced Response Metadata
```python
# In generate_graph_stream_response function
metadata = {
    "status": "streaming",
    "result": {
        "id": str(uuid4()),
        "createdAt": int(time.time() * 1000),
        "subject": subject,
        "model": model,
        "message": "Streaming knowledge graph entities",
        "parentGraphId": parent_graph_id,      # Parent graph ID
        "parentNodeId": parent_node_id,        # Parent node ID - NEW
        "sourceNodeLabel": source_node_label,  # Source node label
    },
}
```

## 3. Enhanced Frontend Data Management

### 3.1 Updated Graph Relationship Tracking
```typescript
// Enhanced utility functions in graphUtils.ts
export function linkChildToParent(
  parentGraph: StoredGraph, 
  childGraph: StoredGraph, 
  parentNodeId: number,           // NEW: specific node ID
  sourceNodeLabel: string
): { updatedParent: StoredGraph; updatedChild: StoredGraph };

export function updateNodeWithChild(
  graph: StoredGraph, 
  nodeId: number, 
  childGraphId: string
): StoredGraph;

export function markRootNode(
  graph: StoredGraph, 
  nodeLabel: string, 
  parentGraphId: string, 
  parentNodeId: number             // NEW: parent node ID
): StoredGraph;

export function findParentNode(
  parentGraph: StoredGraph, 
  nodeId: number
): ApiNode | null;
```

### 3.2 Enhanced useGraphData Hook
```typescript
// Enhanced functions in useGraphData
const linkGraphs = useCallback((
  parentGraphId: string, 
  parentNodeId: number,           // NEW: specific node ID
  childGraphId: string, 
  sourceNodeLabel: string
) => {
  setAllGraphs(prevGraphs => {
    const parentGraph = prevGraphs.find(g => g.id === parentGraphId);
    const childGraph = prevGraphs.find(g => g.id === childGraphId);
    
    if (!parentGraph || !childGraph) return prevGraphs;
    
    // Update parent node to reference child
    const updatedParentNodes = parentGraph.data.nodes.map(node => 
      node.id === parentNodeId 
        ? { ...node, hasChildGraph: true, childGraphId }
        : node
    );
    
    // Update parent graph
    const updatedParent = {
      ...parentGraph,
      data: { ...parentGraph.data, nodes: updatedParentNodes },
      childGraphIds: [...(parentGraph.childGraphIds || []), childGraphId]
    };
    
    // Update child graph with parent reference
    const updatedChild = {
      ...childGraph,
      parentGraphId,
      parentNodeId,           // NEW: store parent node ID
      sourceNodeLabel
    };
    
    // Mark root node in child graph
    const rootNodeUpdated = updatedChild.data.nodes.map((node, index) => 
      index === 0 // Assuming first node is root
        ? { 
            ...node, 
            isRootNode: true, 
            parentGraphId, 
            parentNodeId      // NEW: store parent node ID
          }
        : node
    );
    
    const finalChild = {
      ...updatedChild,
      data: { ...updatedChild.data, nodes: rootNodeUpdated }
    };
    
    return prevGraphs.map(g => 
      g.id === parentGraphId ? updatedParent :
      g.id === childGraphId ? finalChild : g
    );
  });
}, []);

const navigateToChildGraph = useCallback((nodeId: number) => {
  const currentNode = currentGraph?.data.nodes.find(n => n.id === nodeId);
  if (currentNode?.childGraphId) {
    const childGraph = allGraphs.find(g => g.id === currentNode.childGraphId);
    if (childGraph) {
      goToGraphById(childGraph.id);
    }
  }
}, [currentGraph, allGraphs, goToGraphById]);

const navigateToParentGraph = useCallback((rootNode: ApiNode) => {
  if (rootNode.parentGraphId && rootNode.parentNodeId) {
    const parentGraph = allGraphs.find(g => g.id === rootNode.parentGraphId);
    if (parentGraph) {
      goToGraphById(rootNode.parentGraphId);
      // Optionally highlight the parent node
      onHighlightNode?.(rootNode.parentNodeId);
    }
  }
}, [allGraphs, goToGraphById]);
```

## 4. Visual Indicators

### 4.1 Node Styling Enhancement
```typescript
// In GraphVisualization component
const getNodeStyle = (node: ApiNode) => {
  const baseStyle = { /* ... */ };
  
  if (node.hasChildGraph) {
    return {
      ...baseStyle,
      borderWidth: 4,
      borderColor: '#4F46E5',
      shadow: { enabled: true, color: '#4F46E5', size: 8 },
      font: { ...baseStyle.font, size: 18 } // Slightly larger for child nodes
    };
  }
  
  if (node.isRootNode) {
    return {
      ...baseStyle,
      borderWidth: 4,
      borderColor: '#059669',
      borderDashes: [5, 5],
      shadow: { enabled: true, color: '#059669', size: 8 },
      font: { ...baseStyle.font, size: 18 } // Slightly larger for root nodes
    };
  }
  
  return baseStyle;
};
```

### 4.2 Visual Legend
```typescript
// Add to GraphVisualization component
const NavigationLegend = () => (
  <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
    <div className="text-xs text-gray-600 mb-2">Navigation:</div>
    <div className="flex flex-col gap-1 text-xs">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-indigo-500"></div>
        <span>Has sub-graph (double-click)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-gray-400 border-2 border-green-500 border-dashed"></div>
        <span>Root node (double-click for parent)</span>
      </div>
    </div>
  </div>
);
```

### 4.3 Enhanced Tooltips with Navigation Context
```typescript
// Enhanced tooltip information
const getNodeTooltip = (node: ApiNode) => {
  if (node.hasChildGraph) {
    return `${node.label}\n\nDouble-click to explore sub-graph\nGenerated from this node`;
  }
  
  if (node.isRootNode) {
    return `${node.label}\n\nRoot node - Double-click to return to parent\nOriginates from parent graph`;
  }
  
  return node.label;
};
```

## 5. Enhanced Navigation Implementation

### 5.1 Precise Double-Click Handler
```typescript
// In GraphVisualization component
const handleNodeDoubleClick = useCallback((params) => {
  if (params.nodes.length > 0) {
    const nodeId = params.nodes[0];
    const nodeData = nodesDataSetRef.current?.get(nodeId);
    
    if (nodeData?.hasChildGraph) {
      // Navigate to child graph generated from this specific node
      onNavigateToChild?.(nodeId, nodeData.childGraphId);
    } else if (nodeData?.isRootNode && nodeData.parentNodeId) {
      // Navigate to parent graph and highlight the parent node
      onNavigateToParent?.(nodeData.parentGraphId, nodeData.parentNodeId);
    }
  }
}, [onNavigateToChild, onNavigateToParent]);

// Add event listener
networkRef.current.on('doubleClick', handleNodeDoubleClick);
```

### 5.2 Enhanced Breadcrumb with Node Context
```typescript
const GraphBreadcrumb = ({ currentGraph, allGraphs, onNavigate }) => {
  const breadcrumbs = useMemo(() => {
    const path = [];
    let current = currentGraph;
    
    while (current?.parentGraphId) {
      const parent = allGraphs.find(g => g.id === current.parentGraphId);
      if (parent) {
        const parentNode = parent.data.nodes.find(n => n.id === current.parentNodeId);
        path.unshift({
          graphId: parent.id,
          nodeId: current.parentNodeId,
          graphTitle: parent.title,
          nodeLabel: parentNode?.label || current.sourceNodeLabel,
          canNavigate: true
        });
        current = parent;
      } else break;
    }
    
    return path;
  }, [currentGraph, allGraphs]);

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
      {breadcrumbs.map((crumb, index) => (
        <Fragment key={`${crumb.graphId}-${crumb.nodeId}`}>
          <button 
            onClick={() => onNavigate(crumb.graphId, crumb.nodeId)}
            className="hover:text-indigo-600 underline"
            title={`Navigate to "${crumb.nodeLabel}" in ${crumb.graphTitle}`}
          >
            {crumb.graphTitle}
          </button>
          <span className="text-gray-400">
            → <span className="font-mono text-xs">{crumb.nodeLabel}</span> →
          </span>
        </Fragment>
      ))}
      <span className="font-medium text-gray-800">{currentGraph.title}</span>
    </div>
  );
};
```

## 6. Enhanced Generation Flow

### 6.1 Node-Aware Generation
```typescript
// In GraphVisualization component
const handleGenerateFromNode = async () => {
  if (!selectedNodeLabel || !onGenerateFromNode) return;
  
  // Find the actual node ID for the selected node
  const selectedNode = currentGraphData.nodes.find(n => n.label === selectedNodeLabel);
  if (!selectedNode) return;
  
  const generationSubject = `${metadata.subject} -> ${selectedNodeLabel}`;
  setIsGeneratingFromNode(true);
  
  try {
    await onGenerateFromNode(generationSubject, selectedNode.id, selectedNodeLabel);
  } finally {
    setIsGeneratingFromNode(false);
    setSelectedNodeLabel(null);
    setIsPreviewExpanded(false);
  }
};
```

### 6.2 Enhanced Graph Generation Callback
```typescript
// In StreamingGraphGenerator
const generateFromNode = useCallback(async (
  nodeSubject: string, 
  parentNodeId?: number,        // NEW: parent node ID
  sourceNodeLabel?: string
) => {
  if (!turnstileToken) {
    onToast('Please complete the security verification first', 'error');
    return;
  }
  
  const parentGraphId = currentGraph?.id;
  resetState();
  
  try {
    await startStreaming(nodeSubject, selectedModel, (graph: StoredGraph) => {
      const enhancedGraph: StoredGraph = {
        ...graph,
        parentGraphId,
        parentNodeId,           // NEW: store parent node ID
        sourceNodeLabel
      };
      
      onGraphGenerated(enhancedGraph, parentGraphId, parentNodeId, sourceNodeLabel);
    }, turnstileToken, parentGraphId, parentNodeId, sourceNodeLabel);
  } catch (err) {
    onToast('Failed to start streaming. Please try again.', 'error');
    console.error(err);
  }
}, [turnstileToken, selectedModel, startStreaming, onGraphGenerated, onToast, resetState, currentGraph]);
```

### 6.3 Graph Linking on Generation
```typescript
// In index.tsx
const handleGraphGenerated = useCallback((
  newGraph: StoredGraph, 
  parentGraphId?: string, 
  parentNodeId?: number,        // NEW: parent node ID
  sourceNodeLabel?: string
) => {
  // Add the new graph
  addGraph(newGraph);
  
  // Link graphs if parent relationship exists
  if (parentGraphId && parentNodeId && sourceNodeLabel) {
    linkGraphs(parentGraphId, parentNodeId, newGraph.id, sourceNodeLabel);
  }
}, [addGraph, linkGraphs]);
```

## 7. Enhanced Export/Share

### 7.1 Complete Relationship Preservation
```typescript
interface ConnectedGraphExport {
  graphs: StoredGraph[];
  relationships: {
    parentGraphId: string;
    parentNodeId: number;        // NEW: preserve node relationships
    childGraphId: string;
    sourceNodeLabel: string;
  }[];
  rootGraphId: string;
  exportedAt: number;
  version: '2.0';               // Updated version for new format
}

const exportConnectedGraphs = useCallback(() => {
  const connectedGraphs = getConnectedGraphs(currentGraph, allGraphs);
  const relationships = extractRelationships(connectedGraphs);
  
  const exportData: ConnectedGraphExport = {
    graphs: connectedGraphs,
    relationships,              // NEW: explicit relationship mapping
    rootGraphId: currentGraph.id,
    exportedAt: Date.now(),
    version: '2.0'
  };
  
  downloadJSON(exportData, `connected-graphs-${currentGraph.title}`);
}, [currentGraph, allGraphs]);
```

### 7.2 Connected Graph Import with Relationship Restoration
```typescript
// Enhanced import functionality
const importConnectedGraphs = useCallback((data: ConnectedGraphExport) => {
  const { graphs, relationships, rootGraphId } = data;
  
  // Import all graphs first
  importGraphs(graphs);
  
  // Restore all relationships
  relationships.forEach(({ parentGraphId, parentNodeId, childGraphId, sourceNodeLabel }) => {
    linkGraphs(parentGraphId, parentNodeId, childGraphId, sourceNodeLabel);
  });
  
  // Navigate to root graph
  const rootGraph = graphs.find(g => g.id === rootGraphId);
  if (rootGraph) {
    goToGraph(rootGraph.id);
  }
}, [importGraphs, linkGraphs, goToGraph]);

// New option in share modal
<button onClick={exportConnectedGraphs}>
  Export Connected Graphs ({connectedCount} graphs)
</button>
```

## 8. Implementation Phases

### Phase 1: Data Model & Backend (Week 1)
1. Update `StoredGraph` and `ApiNode` interfaces
2. Enhance backend request/response models to include `parent_node_id`
3. Modify streaming endpoint to include parent node relationship data
4. Update database schema if using persistent storage

### Phase 2: Core Navigation (Week 2)
1. Implement double-click/tap navigation handlers with node ID tracking
2. Add visual indicators for connected nodes
3. Create basic parent/child navigation with precise node targeting
4. Implement graph linking with node ID preservation

### Phase 3: Visual Enhancements (Week 3)
1. Add navigation legend and tooltips
2. Implement breadcrumb navigation with node context
3. Enhanced node styling for relationship indicators
4. Add node highlighting for navigation feedback

### Phase 4: Advanced Features (Week 4)
1. Connected graph export/import with relationship preservation
2. Graph hierarchy visualization
3. Bulk operations on connected graphs
4. Performance optimizations for large graph networks

## 9. User Experience Flow

### Creating Sub-Graphs
1. User selects node → preview overlay appears
2. User generates sub-graph → new graph created with parent relationship
3. Parent node gets visual indicator (blue outline) and stores child graph reference
4. Child graph shows root node with green dashed outline and parent node reference

### Navigation
1. User double-clicks node with blue outline → navigates to specific child graph
2. User double-clicks root node with green outline → navigates back to exact parent node
3. Breadcrumb shows navigation path with specific node names
4. Current position always visible with full context

### Export/Share
1. User exports "connected graphs" → gets entire hierarchy with precise relationships
2. Import preserves all node-level relationships
3. Navigation works immediately after import with exact node targeting
4. Relationships maintain integrity across export/import cycles

## 10. Technical Considerations

### Performance
- Implement lazy loading for large graph networks
- Cache relationship lookups for faster navigation
- Optimize node ID lookups with indexing

### Data Integrity
- Validate parent-child relationships on import
- Handle orphaned graphs gracefully
- Implement relationship cleanup on graph deletion

### User Experience
- Provide clear visual feedback during navigation
- Handle missing relationships gracefully
- Maintain navigation history for back/forward functionality

This enhanced plan ensures precise navigation by tracking both the parent graph ID and the specific parent node ID, enabling users to navigate back to the exact node that generated a sub-graph and providing a much more intuitive and accurate navigation experience.