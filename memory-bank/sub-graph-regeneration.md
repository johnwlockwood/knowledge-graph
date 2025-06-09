 Perfect! Now here's what will happen when you click on a node that already has a sub-graph:

  Current Behavior After Fix

  For nodes with existing sub-graphs (purple outline):
  1. Single-click: No generate preview appears
  2. Double-click: Navigates to the existing sub-graph
  3. Hover: Shows tooltip: "🔗 Double-click to explore sub-graph"

  For regular nodes (no sub-graph):
  1. Single-click: Shows generate preview after 300ms delay
  2. Hover: No special tooltip

  For root nodes (green dashed outline):
  1. Single-click: No generate preview appears
  2. Double-click: Navigates back to parent graph
  3. Hover: Shows tooltip: "↩️ Double-click to return to parent graph"

  Benefits of This Approach

  1. Prevents confusion: Can't accidentally create duplicate sub-graphs
  2. Clear visual feedback: Purple outline indicates "this already has content, double-click to explore"
  3. Consistent behavior: Nodes with child graphs are treated as navigation points, not generation sources
  4. Cleaner UI: No unnecessary generate previews cluttering the interface

  Alternative: If You Want to Replace Sub-graphs

  If you later decide you want to allow replacing existing sub-graphs, we could:
  1. Show a different UI for nodes with existing sub-graphs
  2. Ask "Replace existing sub-graph?" with options to "Replace" or "Navigate to Existing"
  3. Update the relationships when replacing

  But for now, the prevent-generation approach provides the cleanest user experience and avoids the complexity of managing multiple sub-graphs per node.
  