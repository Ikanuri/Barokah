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
                // Check if already controlled
                if (navigator.serviceWorker.controller) {
                  console.log('✅ [SW] Already controlled by:', navigator.serviceWorker.controller.scriptURL);
                } else {
                  console.log('⚠️ [SW] Not controlled yet - registering...');
                }
                
                // Unregister old service workers first
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  const oldSWs = registrations.filter(function(reg) {
                    return reg.active && reg.active.scriptURL.includes('/sw.js');
                  });
                  
                  if (oldSWs.length > 0) {
                    console.log('🗑️ [SW] Unregistering', oldSWs.length, 'old SW(s)...');
                    Promise.all(oldSWs.map(function(reg) { return reg.unregister(); }))
                      .then(function() {
                        console.log('✅ [SW] Old SWs unregistered, will reload in 1s...');
                        setTimeout(function() { window.location.reload(); }, 1000);
                      });
                    return;
                  }
                  
                  // Register custom service worker
                  registerCustomSW();
                });
                
                function registerCustomSW() {
                  navigator.serviceWorker.register('/sw-custom.js', { 
                    scope: '/',
                    updateViaCache: 'none' 
                  }).then(
                    function(registration) {
                      console.log('✅ [SW] Custom Service Worker registered:', registration.scope);
                      
                      // If not controlled yet, wait for activation
                      if (!navigator.serviceWorker.controller) {
                        console.log('⏳ [SW] Waiting for activation...');
                        
                        registration.addEventListener('updatefound', function() {
                          const newWorker = registration.installing;
                          console.log('🔄 [SW] Installing new worker...');
                          
                          newWorker.addEventListener('statechange', function() {
                            console.log('📊 [SW] State:', newWorker.state);
                            
                            if (newWorker.state === 'activated') {
                              console.log('✅ [SW] Activated! Reloading to activate control...');
                              
                              // Reload to let SW take control
                              if (!navigator.serviceWorker.controller) {
                                setTimeout(function() {
                                  console.log('🔄 [SW] Reloading page for SW control...');
                                  window.location.reload();
                                }, 500);
                              }
                            }
                          });
                        });
                      }
                      
                      // Force update check
                      registration.update();
                    },
                    function(err) {
                      console.error('❌ [SW] Service Worker registration failed:', err);
                    }
                  );
                }
              });
              
              // Listen for controller change (SW taking control)
              navigator.serviceWorker.addEventListener('controllerchange', function() {
                console.log('🔄 [SW] Controller changed! SW now controlling page.');
              });
              
              // Ready event
              navigator.serviceWorker.ready.then(function(registration) {
                console.log('✅ [SW] Service Worker ready:', registration.active.scriptURL);
                console.log('📦 [SW] Controlled:', navigator.serviceWorker.controller ? 'YES' : 'NO');
              });
            } else {
              console.error('❌ [SW] Service Worker not supported!');
            }
          `}
        </Script>
      </body>
    </html>
  )
}
