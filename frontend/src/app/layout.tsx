import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'POS App - Point of Sale',
  description: 'Aplikasi kasir modern dengan fitur offline-first dan real-time sync',
  applicationName: 'POS App',
  authors: [{ name: 'Your Company' }],
  keywords: ['pos', 'kasir', 'point of sale', 'retail', 'offline', 'pwa'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'POS App',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'POS App',
    title: 'POS App - Point of Sale',
    description: 'Aplikasi kasir modern dengan fitur offline-first',
  },
  twitter: {
    card: 'summary',
    title: 'POS App - Point of Sale',
    description: 'Aplikasi kasir modern dengan fitur offline-first',
  },
}

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
        
        {/* Service Worker Registration - Custom SW for Offline */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  const oldSWs = registrations.filter(function(reg) {
                    return reg.active && reg.active.scriptURL.includes('/sw.js');
                  });
                  if (oldSWs.length > 0) {
                    Promise.all(oldSWs.map(function(reg) { return reg.unregister(); }))
                      .then(function() {
                        setTimeout(function() { window.location.reload(); }, 1000);
                      });
                    return;
                  }
                  registerCustomSW();
                });
                function registerCustomSW() {
                  navigator.serviceWorker.register('/sw-custom.js', {
                    scope: '/',
                    updateViaCache: 'none'
                  }).then(
                    function(registration) {
                      if (!navigator.serviceWorker.controller) {
                        registration.addEventListener('updatefound', function() {
                          const newWorker = registration.installing;
                          newWorker.addEventListener('statechange', function() {
                            if (newWorker.state === 'activated' && !navigator.serviceWorker.controller) {
                              setTimeout(function() { window.location.reload(); }, 500);
                            }
                          });
                        });
                      }
                      registration.update();
                    },
                    function() {}
                  );
                }
              });
            }
          `}
        </Script>
      </body>
    </html>
  )
}
