"use client"

import { trpc } from "@/lib/trpc/client"
import { Sparkles, Monitor, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function KioskDirectoryPage() {
  const { data: kiosks, isLoading } = trpc.kiosk.listActive.useQuery()
  const { data: settings } = trpc.general.get.useQuery()

  return (
    <div className="flex h-screen w-full flex-col bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden antialiased select-none">
      <header className="flex items-center justify-center px-8 py-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-5 text-[#74abfe] fill-[#74abfe]/10 animate-pulse" />
          <span className="text-lg font-medium tracking-tight bg-gradient-to-r from-[#74abfe] to-[#c689ff] bg-clip-text text-transparent">
            {settings?.appName ?? "BFG - HRLite"}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 -translate-y-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Select Kiosk
            </h1>
            <p className="text-sm text-zinc-500">
              Choose a kiosk terminal to get started
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-xl bg-[#1e1f20] border border-zinc-800 animate-pulse"
                />
              ))}
            </div>
          ) : kiosks?.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="size-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm text-zinc-500">No active kiosks available</p>
              <p className="text-xs text-zinc-600 mt-1">
                Contact an administrator to set up a kiosk configuration
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {kiosks?.map((kiosk) => (
                <Link
                  key={kiosk.id}
                  href={`/kiosk/${kiosk.slug}`}
                  className="flex items-center gap-4 w-full rounded-xl bg-[#1e1f20] border border-zinc-800 px-5 py-4 transition-all duration-150 hover:bg-[#282a2c] hover:border-zinc-700 group"
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#74abfe]/10">
                    <Monitor className="size-5 text-[#74abfe]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {kiosk.kioskName}
                    </p>
                    <p className="text-xs text-zinc-500 truncate">
                      {kiosk.projectName
                        ? kiosk.projectName
                        : kiosk.location ?? "No location set"}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-zinc-600 border-t border-zinc-950">
        Select a kiosk to access the terminal
      </footer>
    </div>
  )
}
