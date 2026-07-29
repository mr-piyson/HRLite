import type { Metadata, Viewport } from "next"
import { TRPCProvider } from "@/lib/trpc/provider"
import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import "./globals.css"

export const metadata: Metadata = {
  title: "Attendance Kiosk — Enterprise HRMS",
  description: "Enterprise Attendance Management System",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <TRPCProvider>
          <ThemeProvider>
            <NuqsAdapter>
              {children}
            </NuqsAdapter>
            <Toaster richColors closeButton />
          </ThemeProvider>
        </TRPCProvider>
      </body>
    </html>
  )
}
