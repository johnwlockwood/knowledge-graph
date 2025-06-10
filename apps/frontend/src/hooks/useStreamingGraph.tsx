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
  parentGraphId?: string;
  parentNodeId?: number;
  sourceNodeLabel?: string;
  title?: string;
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
  const onTurnstileRemountRef = useRef<(() => void) | null>(null);
  const pendingRequestRef = useRef<{subject: string, model: string, onComplete: (graph: StoredGraph) => void} | null>(null);

  const startStreaming = useCallback(async (
    subject: string,
    model: string,
    onComplete: (graph: StoredGraph) => void,
    turnstileToken?: string,
    parentGraphId?: string,
    parentNodeId?: number,
    sourceNodeLabel?: string,
    title?: string
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
          model: model,
          turnstile_token: turnstileToken,
          parent_graph_id: parentGraphId,
          parent_node_id: parentNodeId,
          source_node_label: sourceNodeLabel,
          title: title
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        // Handle 400 errors as potential Turnstile token expiration
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.detail?.error === 'Invalid security verification' || 
              errorData.detail?.error === 'Security verification required') {
            
            // Store the request for retry after re-verification
            pendingRequestRef.current = { subject, model, onComplete };
            
            setState(prev => ({
              ...prev,
              isStreaming: false,
              status: 'Security verification expired - please verify again',
              error: 'Security verification expired',
            }));
            
            // Trigger Turnstile remount
            if (onTurnstileRemountRef.current) {
              onTurnstileRemountRef.current();
            }
            
            return;
          }
        }
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

  const setTurnstileRemountCallback = useCallback((callback: () => void) => {
    onTurnstileRemountRef.current = callback;
  }, []);

  const retryPendingRequest = useCallback(async (newToken: string) => {
    const pending = pendingRequestRef.current;
    if (!pending) return;
    
    // Clear the pending request
    pendingRequestRef.current = null;
    
    // Retry the original request with new token
    await startStreaming(pending.subject, pending.model, pending.onComplete, newToken);
  }, [startStreaming]);

  return {
    ...state,
    startStreaming,
    cancelStreaming,
    resetState,
    setTurnstileRemountCallback,
    retryPendingRequest,
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
  // Use title from streaming result if available, otherwise fallback to node label or subject
  const title = streamingResult?.title || (nodes.length > 0 ? nodes[0].label : subject);

  return {
    id,
    title,
    data: { nodes, edges },
    createdAt,
    subject: streamingResult?.subject || subject,
    model: streamingResult?.model || model,
    // Include parent relationship data from streaming response
    parentGraphId: streamingResult?.parentGraphId,
    parentNodeId: streamingResult?.parentNodeId,
    sourceNodeLabel: streamingResult?.sourceNodeLabel,
  };
}
