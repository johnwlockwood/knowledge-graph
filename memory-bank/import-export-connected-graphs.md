Problem

  When importing connected graphs exported using the "Share Your Knowledge" feature, the parent-child relationships were being lost during the import validation
  process. This happened because the validateGraphData function was only preserving basic graph properties and not the relationship metadata.

  Solution

  I updated two key functions in shareUtils.ts:

  1. Enhanced validateGraphData function

  - Preserved graph-level relationship properties: parentGraphId, parentNodeId, sourceNodeLabel, childGraphIds, layoutSeed
  - Preserved node-level relationship properties: hasChildGraph, childGraphId, isRootNode, parentGraphId, parentNodeId
  - Used conditional spreading to only include these properties when they exist and are the correct type

  2. Enhanced generateUniqueIds function

  - Added ID mapping system: Tracks old IDs to new IDs when conflicts are resolved
  - Updated relationship references: Ensures all parent/child graph ID references are updated to use the new IDs
  - Two-pass approach: First generates new IDs, then updates all relationships to maintain consistency

  Result

  Now when you export connected graphs and import them in a new browser session, the parent-child relationships will be preserved, including:
  - Visual indicators (purple outlines for sub-graph nodes, green dashed outlines for root nodes)
  - Double-click navigation between related graphs
  - Proper hierarchy maintenance in the graph network

  The fix handles all relationship properties while maintaining data integrity and avoiding ID conflicts during import.