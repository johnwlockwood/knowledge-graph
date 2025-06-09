 ✅ Smart Positioning for Navigation Tooltip Conflicts

  Problem Solved:

  When nodes with navigation instructions (sub-graph nodes) are in the bottom half of the visualization, their tooltips are taller due to the extra "🔗
  Double-click to explore sub-graph" text. This created overlap with the generate preview positioning.

  Solution Implemented:

  1. Navigation Detection: When capturing pointer position, the system now detects if the selected node has navigation instructions (hasChildGraph)
  2. Enhanced Positioning Data: The pointerPosition state now includes a hasNavigationTooltip flag to track nodes with taller tooltips
  3. Dynamic Offset Adjustment: The preview positioning logic now uses different offsets:
    - Regular nodes: 60px offset (unchanged)
    - Navigation nodes: 100px offset (additional 40px to account for taller tooltip)

  Technical Details:

  Offset Calculations:
  - Top positioning: pointerPosition.y + (hasNavigationTooltip ? 100 : 60)px
  - Bottom positioning: Distance from bottom + (hasNavigationTooltip ? 100 : 60)px

  Detection Logic:
  - Checks originalNode.hasChildGraph when capturing pointer position
  - Stores this information with the position data for later use in positioning

  User Experience Benefits:

  - No Overlap: Generate preview never overlaps with navigation tooltips
  - Clean Interface: Both tooltip and preview remain fully visible and readable
  - Consistent Behavior: Works correctly in both regular and fullscreen modes
  - Smart Adaptation: Automatically adjusts based on the specific node type clicked

  This ensures that users can see both the navigation instructions (on hover) and the generate preview (on selection) without any visual conflicts, regardless of
  where the node is positioned in the visualization.
  