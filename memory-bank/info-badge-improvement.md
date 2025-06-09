Now the GraphVisualization component uses the improved hierarchical titles instead of subjects. Here's what changed:

  Changes Made

  1. Subject badge (top-left): Now shows the hierarchical title instead of subject
    - Before: "Machine Learning"
    - After: "Neural Networks <- Machine Learning <- AI"
  2. Generate preview text: Now uses the title for context
    - Before: "Machine Learning → Deep Learning"
    - After: "Neural Networks <- Machine Learning <- AI → Deep Learning"
  3. Generation subject: The actual prompt sent for generation now uses the title
    - This ensures better context for the AI when generating sub-graphs

  Benefits

  1. Better Context: Users can see the full hierarchical path in the subject badge
  2. Clearer Navigation: The hierarchical titles make it obvious where you are in the graph tree
  3. Improved Generation: When generating from a node, the AI gets better context about the current graph's position in the hierarchy
  4. Consistent Branding: The <- pattern is now used consistently throughout the UI

  For example, if you have a hierarchy like:
  - Root: "Artificial Intelligence"
  - Level 1: "Machine Learning <- Artificial Intelligence"
  - Level 2: "Neural Networks <- Machine Learning"

  Now when you're viewing the "Neural Networks" graph:
  - The subject badge shows: "Neural Networks <- Machine Learning"
  - When generating from a node called "CNN", the preview shows: "Neural Networks <- Machine Learning → CNN"
  - The new graph will be titled: "CNN <- Neural Networks"

  This creates a much clearer visual hierarchy and makes navigation much more intuitive!