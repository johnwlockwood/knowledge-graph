# Knowledge Graph Development Guidelines

## Commands
```bash
# Frontend
cd src/frontend
npm run dev     # Start dev server with Turbopack
npm run build   # Build production version
npm run start   # Start production server
npm run lint    # Lint frontend code

# Backend
python src/app/main.py                # Run backend server
pip install -r requirements.txt        # Install dependencies
pip install -e .                       # Development install
pytest tests/                          # Run all tests
pytest tests/path/to/test_file.py      # Run specific test file
```

## Code Style Guidelines
- **Frontend**: TypeScript with strict type checking, Next.js 15+, React 19
- **Backend**: Python 3.13+, FastAPI, Pydantic models, strict type annotations
- **Formatting**: 
  - JavaScript/TypeScript: ESLint with Next.js configuration
  - Python: Ruff with 79 character line length
- **Imports**: Group imports (stdlib, third-party, local) with blank line separators
- **Naming**: camelCase for JS variables/functions, PascalCase for React components, snake_case for Python
- **Error Handling**: Use try/catch with specific error types in JS, try/except in Python with proper logging
- **UI Design**: Follow Brian Chesky principles - human stories, attention to detail, progressive disclosure
- **Testing**: Test business logic, components, and API endpoints

## Architecture
- Backend Python service for knowledge graph generation
- Frontend visualization with Next.js and vis-network
- RESTful API with streaming capabilities for large graphs