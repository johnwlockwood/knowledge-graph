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
python apps/api/src/main.py            # Run FastAPI backend server on localhost:8000
uv pip install -e .               # Development install with dependencies
uv sync                           # Sync dependencies from uv.lock
ruff check src/                   # Lint Python code
ruff format src/                  # Format Python code
```

### Model Configuration
Configure available AI models per environment using the `AVAILABLE_MODELS` environment variable:

```bash
# Default: All models available (most powerful selected automatically)
# No environment variable set = all models enabled

# Production: Limit to cost-effective models
AVAILABLE_MODELS="gpt-4o-mini-2024-07-18,o4-mini-2025-04-16"

# Development: Enable experimental models  
AVAILABLE_MODELS="gpt-4.1-2025-04-14,o3-2025-04-16,gpt-4o-2024-08-06"

# Testing: Single model for consistency
AVAILABLE_MODELS="gpt-4o-mini-2024-07-18"
```

**Available Models (by priority - most powerful first):**
- `gpt-4.1-2025-04-14` - **Most Powerful**: Flagship GPT model for complex tasks
- `o3-2025-04-16` - **Advanced**: Advanced reasoning and problem-solving  
- `gpt-4o-2024-08-06` - **Fast & Intelligent**: Fast, intelligent, flexible
- `o4-mini-2025-04-16` - **Latest Mini**: Latest with improved accuracy
- `gpt-4.1-mini-2025-04-14` - **Enhanced Mini**: Enhanced reasoning capabilities
- `gpt-4o-mini-2024-07-18` - **Efficient**: Fast and efficient for most graphs
- `gpt-3.5-turbo-0125` - **Legacy**: Legacy model for basic tasks

**Model Management:**
- **Centralized Configuration**: All model logic in `apps/api/src/models.py`
- **Automatic Selection**: Always defaults to most powerful available model
- **Dynamic Validation**: Pydantic models validate against current environment
- **Graceful Fallback**: Invalid configurations fall back to all models
- **Environment Driven**: Different model sets per deployment environment

### Testing
```bash
python -m pytest                       # Run all tests
python -m pytest -v                    # Run with verbose output
python -m pytest tests/test_models.py  # Run specific test file
python -m pytest --cov=src/app         # Run with coverage report
```

**Test Coverage:**
- **Models Module**: 34 comprehensive tests covering environment configuration, model validation, priority selection, and edge cases
- **Environment Isolation**: Tests use mocking to isolate environment variables
- **Integration Testing**: Validates complete workflows and realistic deployment scenarios
- **Edge Case Coverage**: Tests malformed inputs, invalid models, and error conditions

**Test Structure:**
```
tests/
├── __init__.py
├── test_models.py          # Models module (34 tests)
├── pytest.ini             # Test configuration
└── [future test files]
```

**Key Test Categories:**
- Environment variable parsing and validation
- Model priority and default selection logic  
- Dynamic model validation with Pydantic
- Graceful error handling and fallbacks
- Production/development configuration scenarios

## Architecture Overview

This is a full-stack knowledge graph visualization application with three main components:

### Backend (Python FastAPI)
- **Location**: `apps/api/src/`
- **Entry Point**: `main.py` - FastAPI server with CORS enabled
- **Core Logic**: `graph.py` - OpenAI/Instructor integration for graph generation
- **Models**: Pydantic models for Node, Edge, KnowledgeGraph, and streaming entities
- **Streaming**: Server-sent events for real-time graph generation via `/api/stream-generate-graph`
- **Dependencies**: FastAPI, OpenAI, Instructor, Pydantic, python-dotenv

### Frontend (Next.js 15 + React 19)
- **Location**: `apps/frontend/`
- **Framework**: Next.js 15 with Turbopack, React 19, TypeScript
- **Visualization**: vis-network library for interactive graph rendering
- **Styling**: Tailwind CSS v4 with custom gradient designs
- **State Management**: Custom hooks with localStorage persistence

### Key Frontend Architecture
- **Main Component**: `apps/frontend/src/components/KnowledgeGraph/index.tsx`
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
- Brian Chesky UI philosophy (see `apps/frontend/CLAUDE.md`)

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
- `apps/api/src/models.py` - **Centralized AI model configuration and validation**
- `apps/api/src/main.py:298-384` - Streaming graph generation endpoints with dynamic model validation
- `apps/api/src/graph.py:97-127` - Core streaming logic with OpenAI integration
- `apps/frontend/src/components/KnowledgeGraph/StreamingGraphGenerator.tsx` - Frontend streaming with model selection
- `apps/frontend/src/components/KnowledgeGraph/UI/ModelSelector.tsx` - Dynamic model selector component
- `apps/frontend/src/hooks/useStreamingGraph.tsx` - Streaming state management
- `apps/frontend/src/hooks/useGraphData.tsx` - Graph data persistence
- `tests/test_models.py` - Comprehensive model configuration tests