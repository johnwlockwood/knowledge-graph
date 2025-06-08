"use client";
import { useState, useCallback, useRef } from 'react';
import { StoredGraph, ApiNode, ApiEdge } from '@/utils/constants';

interface StreamingEntity {
  type: 'node' | 'edge';
  entity: ApiNode | ApiEdge;
}

interface StreamingResult {
  id: string;
  createdAt: number;
  subject: string;
  model: string;
  status: string;
  message: string;
}

interface StreamingState {
  isStreaming: boolean;
  nodes: ApiNode[];
  edges: ApiEdge[];
  status: string;
  error: string | null;
  progress: {
    nodesCount: number;
    edgesCount: number;
  };
}

export function useStreamingGraph() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    nodes: [],
    edges: [],
    status: '',
    error: null,
    progress: {
      nodesCount: 0,
      edgesCount: 0,
    },
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const streamingResultRef = useRef<StreamingResult | null>(null);
  const currentNodesRef = useRef<ApiNode[]>([]);
  const currentEdgesRef = useRef<ApiEdge[]>([]);

  const startStreaming = useCallback(async (
    subject: string,
    model: string,
    onComplete: (graph: StoredGraph) => void
  ) => {
    // Cancel any existing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset state and refs completely
    currentNodesRef.current = [];
    currentEdgesRef.current = [];
    streamingResultRef.current = null;

    setState({
      isStreaming: true,
      nodes: [],
      edges: [],
      status: 'Connecting...',
      error: null,
      progress: { nodesCount: 0, edgesCount: 0 },
    });

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/stream-generate-graph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: subject,
          model: model
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);

              // Handle server errors
              if (data.status === 'error' && data.result === 'error') {
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: 'Failed to generate knowledge graph',
                  status: 'Error',
                }));
                return;
              }

              // Handle initial result metadata
              if (data.status && data.status === 'streaming') {
                streamingResultRef.current = data.result;
                setState(prev => ({
                  ...prev,
                  status: data.result.message || 'Streaming knowledge graph entities',
                }));
                continue;
              }

              // Handle completion
              if (data.status && data.status === 'complete') {
                const finalGraph = createStoredGraph(
                  currentNodesRef.current,
                  currentEdgesRef.current,
                  streamingResultRef.current,
                  subject,
                  model
                );

                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  status: 'Complete',
                }));

                onComplete(finalGraph);
                return;
              }

              // Handle streaming entities
              if (data.type && data.entity) {
                const entity: StreamingEntity = data;

                if (entity.type === 'node') {
                  const newNode = entity.entity as ApiNode;
                  currentNodesRef.current = [...currentNodesRef.current, newNode];
                  setState(prev => ({
                    ...prev,
                    nodes: currentNodesRef.current,
                    status: `Added node: ${newNode.label}`,
                    progress: {
                      ...prev.progress,
                      nodesCount: currentNodesRef.current.length,
                    },
                  }));
                } else if (entity.type === 'edge') {
                  const newEdge = entity.entity as ApiEdge;
                  currentEdgesRef.current = [...currentEdgesRef.current, newEdge];
                  setState(prev => ({
                    ...prev,
                    edges: currentEdgesRef.current,
                    status: `Added connection: ${newEdge.label}`,
                    progress: {
                      ...prev.progress,
                      edgesCount: currentEdgesRef.current.length,
                    },
                  }));
                }
              }
            } catch (parseError) {
              console.warn('Failed to parse streaming data:', line, parseError);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          status: 'Cancelled',
        }));
      } else {
        setState(prev => ({
          ...prev,
          isStreaming: false,
          error: error instanceof Error ? error.message : 'Failed to generate knowledge graph',
          status: 'Error',
        }));
      }
    }
  }, []);

  const cancelStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const resetState = useCallback(() => {
    // Cancel any existing streaming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset all state and refs
    currentNodesRef.current = [];
    currentEdgesRef.current = [];
    streamingResultRef.current = null;
    abortControllerRef.current = null;

    setState({
      isStreaming: false,
      nodes: [],
      edges: [],
      status: '',
      error: null,
      progress: { nodesCount: 0, edgesCount: 0 },
    });
  }, []);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
    resetState,
  };
}

function createStoredGraph(
  nodes: ApiNode[],
  edges: ApiEdge[],
  streamingResult: StreamingResult | null,
  subject: string,
  model: string
): StoredGraph {
  const id = streamingResult?.id || `graph-${Date.now()}`;
  const createdAt = streamingResult?.createdAt || Date.now();
  const title = nodes.length > 0 ? nodes[0].label : subject;

  return {
    id,
    title,
    data: { nodes, edges },
    createdAt,
    subject: streamingResult?.subject || subject,
    model: streamingResult?.model || model,
  };
}
