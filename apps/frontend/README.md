# Knowledge Graph Frontend

This is a [Next.js](https://nextjs.org) frontend for the Knowledge Graph visualization application.

## Environment Setup

Before running the application, you need to configure environment variables:

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your configuration:
   ```env
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
   NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN=your_web_analytics_token_here
   ```

## Feature Flags

The application supports several feature flags to control functionality:

### Sub-graph Generation Control

**`NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION`**
- **Default**: `true` (enabled)
- **Purpose**: Global control for all sub-graph generation functionality
- **Usage**: Set to `false` to completely disable sub-graph generation

```env
# Disable all sub-graph generation
NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION=false
```

**`NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS`**
- **Default**: `false` (nested sub-graphs allowed)
- **Purpose**: Prevents creating sub-graphs from graphs that already have a parent
- **Usage**: Set to `true` to limit graph hierarchy to only one level of nesting

```env
# Allow only first-level sub-graphs (no nested sub-graphs)
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true
```

### Feature Flag Combinations

| ENABLE_SUBGRAPH_GENERATION | DISABLE_NESTED_SUBGRAPHS | Result |
|----------------------------|--------------------------|---------|
| `true` (default) | `false` (default) | ✅ Full sub-graph functionality with unlimited nesting |
| `true` | `true` | ✅ Sub-graphs allowed only from root-level graphs |
| `false` | `false` | ❌ No sub-graph generation allowed |
| `false` | `true` | ❌ No sub-graph generation allowed |

### What Gets Disabled

When sub-graph generation is disabled (either globally or for nested graphs):
- ❌ Generate preview no longer appears when clicking nodes
- ❌ Tooltip no longer shows "💡 Click to generate sub-graph"
- ✅ Navigation to existing child graphs still works (double-click)
- ✅ Navigation to parent graph still works (double-click root nodes)
- ✅ All other functionality remains unchanged

### Deployment Examples

**Vercel/Netlify**: Set environment variables in deployment settings
```env
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true
```

**Docker**: 
```dockerfile
ENV NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true
```

**Local Development**: Add to `.env.local`
```env
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true
```

### Backend Model Configuration Examples

**Docker Compose**:
```yaml
services:
  backend:
    environment:
      - AVAILABLE_MODELS=gpt-4o-mini-2024-07-18,o4-mini-2025-04-16
```

**Kubernetes**:
```yaml
env:
  - name: AVAILABLE_MODELS
    value: "gpt-4o-mini-2024-07-18,o3-2025-04-16"
```

**Heroku/Railway/etc**:
```bash
AVAILABLE_MODELS=gpt-4o-mini-2024-07-18,gpt-4.1-2025-04-14
```

### Usage Examples

**Full sub-graph functionality** (default behavior):
```bash
# No environment variables needed - this is the default
npm run dev
npm run build
```

**Disable all sub-graph generation** (read-only mode):
```bash
# For development
NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION=false npm run dev

# For production build
NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION=false npm run build
NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION=false npm start
```

**Allow only first-level sub-graphs** (prevent deep nesting):
```bash
# For development
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true npm run dev

# For production build
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true npm run build
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true npm start
```

**Combined flags** (both disabled - same as global disable):
```bash
# For development
NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION=false NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true npm run dev

# For production
NEXT_PUBLIC_ENABLE_SUBGRAPH_GENERATION=false NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true npm run build
```

**Using .env.local for persistent configuration**:
```env
# Add to .env.local file for development
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN=your_web_analytics_token_here
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true
```

### Getting Cloudflare Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to "Turnstile" in the sidebar
3. Create a new site or use an existing one
4. Copy the **Site Key** for the frontend environment variable
5. Copy the **Secret Key** for the backend configuration (see backend README)

For development/testing, you can use the test key: `1x00000000000000000000AA`

### Getting Cloudflare Web Analytics Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to "Analytics & Logs" → "Web Analytics" in the sidebar
3. Add your website or select an existing one
4. Copy the **Web Analytics Token** for the frontend environment variable
5. The analytics script will only be loaded if the token is provided

**Note**: Web Analytics is optional. If `NEXT_PUBLIC_CLOUDFLARE_WEB_ANALYTICS_TOKEN` is not set, no tracking script will be loaded.

## Backend Configuration

### AI Model Configuration

Configure which AI models are available in each environment using the `AVAILABLE_MODELS` environment variable on the backend:

```bash
# Default: All models available (no environment variable)

# Production: Limit to cost-effective models
AVAILABLE_MODELS="gpt-4o-mini-2024-07-18,o4-mini-2025-04-16"

# Development: Include experimental models
AVAILABLE_MODELS="gpt-4o-mini-2024-07-18,o3-2025-04-16,gpt-4.1-2025-04-14"

# Testing: Single model for consistency
AVAILABLE_MODELS="gpt-4o-mini-2024-07-18"
```

**Available Models (ordered by capability):**
- `gpt-4.1-2025-04-14` - **Most Powerful**: Flagship GPT model for complex tasks
- `o3-2025-04-16` - **Advanced**: Advanced reasoning and problem-solving model  
- `gpt-4o-2024-08-06` - **Fast & Intelligent**: Fast, intelligent, flexible GPT model
- `o4-mini-2025-04-16` - **Latest Mini**: Latest model with improved accuracy
- `gpt-4.1-mini-2025-04-14` - **Enhanced Mini**: Enhanced reasoning capabilities
- `gpt-4o-mini-2024-07-18` - **Efficient**: Fast and efficient for most knowledge graphs
- `gpt-3.5-turbo-0125` - **Legacy**: Legacy model for basic tasks

**Model Selection Behavior:**
- **Default Selection**: System automatically selects the most powerful available model
- **Dynamic Configuration**: Frontend fetches available models from `/api/available-models`
- **Graceful Fallback**: If selected model becomes unavailable, automatically switches to most powerful available
- **Environment Validation**: Invalid model configurations fall back to all models with warning logs
- **Centralized Management**: All model configuration handled in `apps/api/src/models.py`

## Getting Started

First, install dependencies and set up environment variables, then run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Interactive Knowledge Graph Visualization**: Powered by vis-network
- **Real-time Streaming**: Server-sent events for live graph generation
- **Multiple AI Models**: Support for various OpenAI models
- **Security**: Cloudflare Turnstile integration for spam protection
- **Responsive Design**: Built with Tailwind CSS v4
- **Multi-graph Workspace**: Create and manage multiple knowledge graphs
- **Browser Navigation**: Hash-based navigation with back/forward support and bookmarkable URLs

## Project Structure

- `apps/api/src/` - Next.js app directory with main layout and pages
- `src/components/KnowledgeGraph/` - Main graph components
- `src/hooks/` - Custom React hooks for data management
- `src/utils/` - Utility functions and constants
- `src/styles/` - Global CSS styles

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Lint code with ESLint

## Testing

The project includes comprehensive test coverage for critical backend components.

### Running Tests

From the project root directory:

```bash
# Run all tests
python -m pytest

# Run tests with verbose output
python -m pytest -v

# Run tests in quiet mode
python -m pytest -q

# Run specific test file
python -m pytest tests/test_models.py

# Run specific test class
python -m pytest tests/test_models.py::TestGetAvailableModels -v

# Run tests with coverage (if coverage is installed)
python -m pytest --cov=src/app

# Run tests and generate HTML coverage report
python -m pytest --cov=src/app --cov-report=html
```

### Test Structure

```
tests/
├── __init__.py
├── test_models.py          # Models module tests (34 tests)
└── pytest.ini             # Pytest configuration
```

### Test Categories

#### Models Module Tests (`test_models.py`)
Comprehensive testing of the centralized AI model configuration system:

- **Model Constants** (4 tests) - Validates model lists and priority ordering
- **Environment Parsing** (8 tests) - Tests environment variable parsing and validation
- **Default Selection** (4 tests) - Tests automatic selection of most powerful model
- **Model Validation** (5 tests) - Tests model availability checking
- **Best Model Selection** (5 tests) - Tests preference-based model selection
- **Type Creation** (2 tests) - Tests dynamic Literal type generation
- **Integration** (3 tests) - Tests complete workflows and realistic scenarios
- **Edge Cases** (3 tests) - Tests error handling and malformed inputs

#### Test Coverage Areas

**Environment Configuration Testing:**
```bash
# Test with limited models
AVAILABLE_MODELS="gpt-4.1-2025-04-14,o3-2025-04-16" python -m pytest tests/test_models.py::TestIntegration -v

# Test production configuration
AVAILABLE_MODELS="gpt-4o-mini-2024-07-18,o4-mini-2025-04-16" python -m pytest

# Test with invalid models (should fallback gracefully)
AVAILABLE_MODELS="invalid-model,another-invalid" python -m pytest tests/test_models.py::TestGetAvailableModels::test_only_invalid_models_returns_all_models -v
```

**Key Testing Features:**
- Environment isolation using `unittest.mock.patch`
- Comprehensive edge case coverage
- Integration testing across multiple functions
- Realistic production/development scenario testing
- Graceful error handling validation

### Test Configuration

Tests are configured via `pytest.ini`:

```ini
[tool:pytest]
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
```

### Adding New Tests

When adding new functionality:

1. **Create test file**: `tests/test_<module_name>.py`
2. **Follow naming conventions**: `TestClassName` and `test_method_name`
3. **Use environment isolation**: `@patch.dict(os.environ, {...})`
4. **Test edge cases**: Invalid inputs, empty values, error conditions
5. **Add integration tests**: Test interactions between components

Example test structure:
```python
class TestNewModule:
    """Test the new module functionality."""
    
    def test_normal_case(self):
        """Test normal operation."""
        # Test implementation
        
    def test_edge_case(self):
        """Test edge case handling."""
        # Edge case testing
        
    def test_error_condition(self):
        """Test error handling."""
        # Error condition testing
```

### Dependencies

Test dependencies are managed in `requirements.txt`:
- `pytest>=7.0.0` - Testing framework
- `pytest-mock>=3.10.0` - Mocking utilities

Install test dependencies:
```bash
# Using pip
pip install -r requirements.txt

# Using uv (recommended)
uv sync
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
