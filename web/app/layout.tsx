import type { Metadata } from 'next'
import { DM_Sans, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

const description =
  'An open-source Model Context Protocol server that turns structured input or raw Highcharts options into validated chart configs and rendered SVG/PNG/PDF — all 70 Highcharts series types, over STDIO or HTTP.'

export const metadata: Metadata = {
  metadataBase: new URL('https://highchart-mcp.vercel.app'),
  title: {
    default: 'Highchart MCP Server',
    template: '%s · Highchart MCP Server',
  },
  description,
  keywords: [
    'Highcharts',
    'MCP',
    'Model Context Protocol',
    'Claude',
    'Cursor',
    'ChatGPT',
    'chart generation',
    'data visualization',
  ],
  authors: [{ name: 'Hasnain', url: 'https://github.com/hasnaintypes' }],
  openGraph: {
    title: 'Highchart MCP Server',
    description,
    type: 'website',
    siteName: 'Highchart MCP Server',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Highchart MCP Server',
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
