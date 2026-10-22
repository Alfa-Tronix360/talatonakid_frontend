import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/auth/AuthContext'
import { ToastProvider } from '@/components/Toast'
import { ConfirmProvider } from '@/components/Modal'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ApiError } from '@/lib/api'
import App from './App'
import './styles/app.css'

try {
  const t = localStorage.getItem('clacs.theme')
  if (t) document.documentElement.dataset.theme = t
} catch { /* sem storage */ }

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <ConfirmProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
