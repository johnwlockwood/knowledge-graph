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
