# Next ConvAI

Auto-generate voice agents for your Next.js app that can navigate between pages.

## Installation

```bash
npm install next-convai @elevenlabs/convai-cli
```

## Quick Start

```bash
# In your Next.js project
npx next-convai init
npx next-convai analyze
npx next-convai generate
```

Add to your app:

```jsx
// pages/_app.js or app/layout.js
import { ConvaiProvider } from 'next-convai'

export default function App({ Component, pageProps }) {
  return (
    <ConvaiProvider>
      <Component {...pageProps} />
    </ConvaiProvider>
  )
}
```

## What it does

- Analyzes your Next.js pages and routes
- Creates a voice agent that knows your site structure  
- Enables voice navigation between pages
- Extracts metadata from your components

## Adding page metadata

```jsx
/**
 * @title About Us
 * @description Learn about our company
 */
export default function About() {
  return <div>About page</div>
}
```

Or with Next.js 13+ metadata:

```jsx
export const metadata = {
  title: 'About Us',
  description: 'Learn about our company'
}
```

## CLI Commands

- `next-convai init` - Initialize ConvAI in your project
- `next-convai analyze` - Analyze your pages
- `next-convai generate` - Create the voice agent

## Requirements

- Next.js 11.1.0+
- React 16.8.0+
- Node.js 16.0.0+