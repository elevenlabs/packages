// Example: app/layout.tsx with ConvAI integration
import { ConvaiProvider } from 'next-convai'

export const metadata = {
  title: 'My Next.js App',
  description: 'A modern web application with AI assistance'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <ConvaiProvider 
          environment={process.env.NODE_ENV === 'development' ? 'dev' : 'prod'}
          enabled={process.env.NODE_ENV === 'production'}
          autoDetectAgent={true}
          onReady={() => console.log('ConvAI ready!')}
          onPageNavigation={(path) => console.log('Navigated to:', path)}
        >
          {children}
        </ConvaiProvider>
      </body>
    </html>
  )
}