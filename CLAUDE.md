# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend Development
```bash
cd src/frontend
npm run dev     # Start Next.js dev server with Turbopack
npm run build   # Build production version
npm run start   # Start production server
npm run lint    # Lint frontend code with ESLint
```

### Backend Development
```bash
# From project root
python src/app/main.py            # Run FastAPI backend server on localhost:8000
uv pip install -e .               # Development install with dependencies
uv sync                           # Sync dependencies from uv.lock
ruff check src/                   # Lint Python code
ruff format src/                  # Format Python code
```

### Testing
```bash
pytest tests/                          # Run all tests
pytest tests/path/to/test_file.py      # Run specific test file
```

## Architecture Overview

This is a full-stack knowledge graph visualization application with three main components:

### Backend (Python FastAPI)
- **Location**: `src/app/`
- **Entry Point**: `main.py` - FastAPI server with CORS enabled
- **Core Logic**: `graph.py` - OpenAI/Instructor integration for graph generation
- **Models**: Pydantic models for Node, Edge, KnowledgeGraph, and streaming entities
- **Streaming**: Server-sent events for real-time graph generation via `/api/stream-generate-graph`
- **Dependencies**: FastAPI, OpenAI, Instructor, Pydantic, python-dotenv

### Frontend (Next.js 15 + React 19)
- **Location**: `src/frontend/`
- **Framework**: Next.js 15 with Turbopack, React 19, TypeScript
- **Visualization**: vis-network library for interactive graph rendering
- **Styling**: Tailwind CSS v4 with custom gradient designs
- **State Management**: Custom hooks with localStorage persistence

### Key Frontend Architecture
- **Main Component**: `src/frontend/src/components/KnowledgeGraph/index.tsx`
- **Streaming**: `StreamingGraphGenerator.tsx` handles real-time graph generation
- **Visualization**: `GraphVisualization.tsx` manages vis-network integration
- **Navigation**: Multi-graph workspace with timeline navigation
- **Hooks**: Custom hooks in `src/hooks/` for graph data, streaming, and keyboard shortcuts

## Development Guidelines

### Python Code Style
- Line length: 79 characters (configured in pyproject.toml)
- Use Ruff for linting and formatting
- Type annotations required (Python 3.13+)
- Async/await patterns for OpenAI API calls
- Pydantic models for data validation

### Frontend Code Style  
- TypeScript with strict type checking
- Functional components with hooks
- Tailwind CSS for styling
- ESLint with Next.js configuration
- Brian Chesky UI philosophy (see `src/frontend/CLAUDE.md`)

### Environment Setup
- Backend requires OpenAI API key in environment variables
- Frontend runs on default Next.js ports (3000 dev, varies for production)
- Backend serves on localhost:8000
- CORS enabled for cross-origin requests

### Streaming Implementation
The application uses Server-Sent Events for real-time graph generation:
- Backend streams JSON entities (nodes/edges) via `/api/stream-generate-graph`
- Frontend handles streaming with custom hooks and real-time UI updates
- Error handling includes validation errors and network issues

## Key Files to Understand
- `src/app/main.py:93-161` - Streaming graph generation endpoints
- `src/app/graph.py:102-127` - Core streaming logic with OpenAI
- `src/frontend/src/components/KnowledgeGraph/StreamingGraphGenerator.tsx` - Frontend streaming
- `src/frontend/src/hooks/useStreamingGraph.tsx` - Streaming state management
- `src/frontend/src/hooks/useGraphData.tsx` - Graph data persistence