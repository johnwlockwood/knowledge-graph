"use client";
import { useState } from 'react';
import { STORAGE_KEYS, ApiNode, ApiEdge } from '@/utils/constants';

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return defaultValue;
    }
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to load from localStorage for key "${key}":`, error);
      return defaultValue;
    }
  });

  const setStoredValue = (newValue: T | ((val: T) => T)) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
      setValue(valueToStore);
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Failed to save to localStorage for key "${key}":`, error);
    }
  };

  return [value, setStoredValue] as const;
}

// Utility functions for direct localStorage operations
export function saveToLocalStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    
    const data = JSON.parse(item);
    
    // Migration for knowledge graphs: add model field if missing
    if (key === STORAGE_KEYS.GRAPHS && Array.isArray(data)) {
      type GraphMigration = {
        id: string;
        title: string;
        data: {
          nodes: ApiNode[];
          edges: ApiEdge[];
        };
        createdAt: number;
        subject: string;
        model?: string;
        isExample?: boolean;
      };
      
      return data.map((graph: GraphMigration) => ({
        ...graph,
        model: graph.model || 'unknown'
      })) as T;
    }
    
    return data;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return defaultValue;
  }
}
