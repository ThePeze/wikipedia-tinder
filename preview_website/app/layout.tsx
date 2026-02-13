import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Wikipedia Tinder',
  description: 'Swipe through Wikipedia articles',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

