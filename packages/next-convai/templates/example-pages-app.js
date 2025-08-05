// Example: pages/_app.js with ConvAI integration
import { ConvaiProvider } from 'next-convai'

export default function App({ Component, pageProps }) {
  return (
    <ConvaiProvider 
      environment={process.env.NODE_ENV === 'development' ? 'dev' : 'prod'}
      enabled={process.env.NODE_ENV === 'production'}
      autoDetectAgent={true}
      onReady={() => console.log('ConvAI ready!')}
      onError={(error) => console.error('ConvAI error:', error)}
      onPageNavigation={(path) => {
        // Track page navigation
        console.log('User navigated to:', path)
        // You could send this to analytics
      }}
    >
      <Component {...pageProps} />
    </ConvaiProvider>
  )
}