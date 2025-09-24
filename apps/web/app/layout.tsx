import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

import { GlobalUserSync } from "@/components/global-user-sync";
import { Providers } from "@/components/providers";
import "@workspace/ui/globals.css";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <ClerkProvider
          appearance={{
            elements: {
              formButtonPrimary: "bg-emerald-600 hover:bg-emerald-700 text-sm normal-case",
            },
          }}
        >
          <Providers>
            <GlobalUserSync>{children}</GlobalUserSync>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
