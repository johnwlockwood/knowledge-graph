Excellent! All the issues have been fixed. Here's a comprehensive summary of what I implemented:

  🔧 Problems Solved

  1. Single Graph Export with Broken Links

  Problem: Exporting single graphs included child graph references that didn't exist in the export
  Solution: Modified exportSingleGraph() to clean all relationship metadata:
  - Removes hasChildGraph, childGraphId from nodes
  - Removes isRootNode, parentGraphId, parentNodeId from nodes
  - Removes parentGraphId, parentNodeId, sourceNodeLabel, childGraphIds from graph

  2. Graph Removal Leaves Broken Links

  Problem: Removing graphs only hid them but didn't unlink relationships
  Solution: Enhanced removeGraph() to properly unlink relationships:
  - Parent graphs: Remove child references and hasChildGraph flags from nodes
  - Child graphs: Remove parent references and isRootNode flags from nodes
  - Graph-level: Clean up childGraphIds, parentGraphId, etc.

  3. Broken Links from Missing Graphs

  Problem: Imported or corrupted data could have references to non-existent graphs
  Solution: Added cleanupBrokenLinks() function that:
  - Automatically detects missing child/parent graphs
  - Removes broken relationship indicators
  - Runs on initialization and import
  - Makes previously non-regeneratable nodes regeneratable again

  🔄 How It Works Now

  Export Behavior

  - Single graph: Clean export with no relationship metadata
  - Connected graphs: Full relationship metadata preserved
  - Import: Automatically cleans up any broken links

  Graph Removal

  - Before: Graph hidden, relationships remain broken
  - After: Graph removed + all relationships properly unlinked
  - Result: Previously linked nodes become regeneratable

  Broken Link Recovery

  - Detection: Automatic on app load and data import
  - Repair: Removes broken indicators, restores generation capability
  - User Experience: Seamless - users don't see broken purple outlines

  🎯 Real-World Scenarios Fixed

  1. Export/Import: Single graph exports are now clean and won't show phantom sub-graph indicators
  2. Graph Management: Removing graphs properly cleans up all references
  3. Data Recovery: Corrupted or incomplete data automatically self-heals
  4. Regeneration: Nodes that lost their child graphs can be used to generate new sub-graphs

  🛡️ Benefits

  - No more phantom links: Purple outlines only appear for actual existing sub-graphs
  - Regeneration possible: Previously "stuck" nodes become usable again
  - Clean exports: Single graph exports don't carry relationship baggage
  - Self-healing: System automatically repairs broken data
  - Consistent UX: Navigation indicators are always accurate

  The system now properly handles the full lifecycle of graph relationships, from creation through export/import to removal and cleanup!
  