# Knowledge Graph Frontend

This is a [Next.js](https://nextjs.org) frontend for the Knowledge Graph visualization application.

## Environment Setup

Before running the application, you need to configure environment variables:

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Cloudflare Turnstile site key:
   ```env
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_turnstile_site_key_here
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
NEXT_PUBLIC_DISABLE_NESTED_SUBGRAPHS=true
```

### Getting Cloudflare Turnstile Keys

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to "Turnstile" in the sidebar
3. Create a new site or use an existing one
4. Copy the **Site Key** for the frontend environment variable
5. Copy the **Secret Key** for the backend configuration (see backend README)

For development/testing, you can use the test key: `1x00000000000000000000AA`

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

## Project Structure

- `src/app/` - Next.js app directory with main layout and pages
- `src/components/KnowledgeGraph/` - Main graph components
- `src/hooks/` - Custom React hooks for data management
- `src/utils/` - Utility functions and constants
- `src/styles/` - Global CSS styles

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Lint code with ESLint

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
