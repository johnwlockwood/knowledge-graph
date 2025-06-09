✅ Smart Generate Preview Positioning & Double-Click Protection

  Key Improvements:

  1. 300ms Selection Delay: The generate preview now appears with a 300ms delay after node selection, which is after the typical double-click window, preventing
  interference with navigation gestures.
  2. Smart Positioning: The preview now uses the actual click position to intelligently position itself:
    - Top half clicks: Preview appears below the click point
    - Bottom half clicks: Preview appears above the click point
    - Fallback: Centers at top if no position data available
  3. Double-Click Priority: When a double-click occurs, it immediately cancels any pending preview display, ensuring navigation takes precedence.
  4. Complete State Management: All timers and position state are properly cleaned up on:
    - Graph navigation
    - Component unmount
    - Node deselection
    - Double-click events

  User Experience Benefits:

  - No more blocking: Generate preview won't appear over nodes when trying to double-click
  - Context-aware positioning: Preview appears in the best location relative to the selected node
  - Smooth interactions: Double-click navigation works instantly without preview interference
  - Visual feedback: Users can still see the preview, but it appears in a non-obstructive location

  This solves the exact problem where clicking nodes near the top of the visualization would show the preview in a way that blocked double-click navigation,
  providing a much better user experience for graph exploration and navigation.
  