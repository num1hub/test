import type { Metadata } from 'next'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ToastProvider } from '@/contexts/ToastContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'N1Hub Private Vault',
  description: 'Sovereign Capsule Storage for N1Hub.com',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans transition-colors duration-300 dark:bg-slate-950 dark:text-slate-200">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
