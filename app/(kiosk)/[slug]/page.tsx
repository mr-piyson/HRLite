"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { ArrowUp, Maximize2, Sparkles, CheckCircle2, User, Shield, Monitor, KeyRound } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { AdminPinDialog } from "../_components/admin-pin-dialog"
import { KioskDrawer } from "../_components/kiosk-drawer"

const TOKEN_STORAGE_KEY = "kiosk_token"

type KioskState = "idle" | "lookup" | "confirming" | "processing" | "success"
type AuthState = "loading" | "token_entry" | "validating" | "valid" | "invalid"

interface EmployeeInfo {
  id: string
  fullName: string
  empCode: string
  photo: string | null
}

function getStoredToken(slug: string): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (!raw) return null
    const store = JSON.parse(raw)
    return store[slug] ?? null
  } catch {
    return null
  }
}

function storeToken(slug: string, token: string) {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY)
    const store = raw ? JSON.parse(raw) : {}
    store[slug] = token
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(store))
  } catch {}
}

export default function KioskSlugPage() {
  const { slug } = useParams<{ slug: string }>()
  const searchParams = useSearchParams()
  const urlToken = searchParams.get("token")

  const [authState, setAuthState] = useState<AuthState>("loading")
  const [kioskToken, setKioskToken] = useState<string>("")
  const [tokenInput, setTokenInput] = useState("")
  const [kioskName, setKioskName] = useState("")

  const [state, setState] = useState<KioskState>("idle")
  const [adminDialogOpen, setAdminDialogOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [code, setCode] = useState("")
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null)
  const [action, setAction] = useState<"IN" | "OUT">("IN")
  const [punchTime, setPunchTime] = useState("")
  const [time, setTime] = useState(new Date())
  const [config, setConfig] = useState<{
    autoResetAfterSuccess: boolean
    successScreenDuration: number
    autoFullscreen: boolean
  } | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validateMutation = trpc.kiosk.validateToken.useMutation({
    onSuccess: (result) => {
      if (result.valid) {
        setKioskName(result.kioskName ?? "")
        setAuthState("valid")
      } else {
        setAuthState("invalid")
      }
    },
    onError: () => {
      setAuthState("invalid")
    },
  })

  // On mount, check URL for token, then localStorage
  useEffect(() => {
    if (urlToken) {
      storeToken(slug, urlToken)
      setKioskToken(urlToken)
      setAuthState("validating")
      validateMutation.mutate({ token: urlToken })
      return
    }

    const stored = getStoredToken(slug)
    if (stored) {
      setKioskToken(stored)
      setAuthState("validating")
      validateMutation.mutate({ token: stored })
      return
    }

    setAuthState("token_entry")
  }, [slug, urlToken])

  const handleTokenSubmit = useCallback(() => {
    const token = tokenInput.trim()
    if (!token) return
    setKioskToken(token)
    storeToken(slug, token)
    setAuthState("validating")
    validateMutation.mutate({ token })
  }, [tokenInput, slug])

  const configQuery = trpc.kiosk.bySlug.useQuery(
    { slug },
    { enabled: authState === "valid" },
  )
  const { data: settings } = trpc.general.get.useQuery()

  const scheduleAutoReset = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current)
    const duration = (config?.successScreenDuration ?? 3) * 1000
    resetTimerRef.current = setTimeout(() => {
      setState("idle")
      setCode("")
      setEmployee(null)
      inputRef.current?.focus()
    }, duration)
  }, [config?.successScreenDuration])

  const scheduleAutoResetRef = useRef(scheduleAutoReset)
  scheduleAutoResetRef.current = scheduleAutoReset

  const punchMutation = trpc.kiosk.punch.useMutation({
    onSuccess: (result) => {
      setAction(result.action)
      setEmployee(result.employee)
      const d = new Date(result.time)
      setPunchTime(
        d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      )
      setState("success")
      scheduleAutoResetRef.current()
    },
    onError: (err) => {
      toast.error(err.message)
      setState("idle")
      setCode("")
    },
  })

  useEffect(() => {
    if (configQuery.data) {
      setConfig({
        autoResetAfterSuccess: configQuery.data.autoResetAfterSuccess,
        successScreenDuration: configQuery.data.successScreenDuration,
        autoFullscreen: configQuery.data.autoFullscreen,
      })
    }
  }, [configQuery.data])

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (config?.autoFullscreen && document.fullscreenEnabled) {
      document.documentElement.requestFullscreen().catch(() => {})
    }
  }, [config?.autoFullscreen])

  const handleSubmit = useCallback(async () => {
    if (!code.trim()) return
    setState("processing")
    punchMutation.mutate({
      method: "CODE",
      value: code.trim().toUpperCase(),
      kioskToken: kioskToken,
    })
  }, [code, punchMutation, kioskToken])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit()
    if (e.key === "Escape") {
      setState("idle")
      setCode("")
    }
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })

  const formatClock = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

  // Token entry screen
  if (authState === "token_entry" || authState === "invalid") {
    return (
      <div className="flex h-screen w-full flex-col bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden antialiased select-none">
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-full max-w-sm space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-[#1e1f20] border border-zinc-800 mb-2">
                <KeyRound className="size-6 text-[#74abfe]" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {slug ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Kiosk Access"}
              </h1>
              <p className="text-sm text-zinc-500">
                Enter the access token to use this kiosk terminal
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTokenSubmit()
                }}
                placeholder="Paste kiosk access token..."
                className="w-full bg-[#1e1f20] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:bg-[#282a2c] transition-all font-mono tracking-wide"
                autoFocus
              />

              <button
                onClick={handleTokenSubmit}
                disabled={!tokenInput.trim()}
                className={cn(
                  "w-full rounded-xl py-3 text-sm font-medium transition-all",
                  tokenInput.trim()
                    ? "bg-white text-black hover:bg-zinc-200"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed",
                )}
              >
                Access Kiosk
              </button>

              {authState === "invalid" && (
                <p className="text-center text-xs text-red-400">
                  Invalid token. Check the token and try again.
                </p>
              )}
            </div>

            <p className="text-center text-xs text-zinc-600">
              Contact an administrator to get the access token for this kiosk.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Loading/validating screen
  if (authState === "loading" || authState === "validating") {
    return (
      <div className="flex h-screen w-full flex-col bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden antialiased select-none">
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4">
            <div className="size-8 rounded-full border-2 border-zinc-700 border-t-[#74abfe] animate-spin" />
            <p className="text-sm text-zinc-500">
              {authState === "validating" ? "Verifying token..." : "Loading..."}
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Kiosk UI (authState === "valid")
  return (
    <div className="flex h-screen w-full flex-col justify-between bg-[#131314] text-[#e3e3e3] font-sans overflow-hidden antialiased select-none">
      <header className="flex items-center justify-between px-8 py-5">
        <div className="flex items-center gap-2.5">
          <Sparkles className="size-5 text-[#74abfe] fill-[#74abfe]/10 animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium tracking-tight bg-gradient-to-r from-[#74abfe] to-[#c689ff] bg-clip-text text-transparent">
              {kioskName || settings?.appName || "BFG - HRLite"}
            </span>
            <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded-md font-mono">
              {slug}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setAdminDialogOpen(true)}
            className="p-2 rounded-xl hover:bg-[#1e1f20] text-zinc-500 hover:text-[#74abfe] transition-all"
            title="Admin Panel"
          >
            <Shield className="size-4" />
          </button>

          <button
            onClick={() => document.documentElement.requestFullscreen()}
            className="p-2 rounded-xl hover:bg-[#1e1f20] text-zinc-400 hover:text-zinc-200 transition-all"
            title="Fullscreen Mode"
          >
            <Maximize2 className="size-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 max-w-2xl w-full mx-auto -translate-y-6">
        {state === "success" && employee ? (
          <div className="w-full text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="size-12 animate-scale" />
            </div>

            <div className="space-y-1">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
                  action === "IN" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400",
                )}
              >
                <span className={cn("size-1.5 rounded-full", action === "IN" ? "bg-emerald-400" : "bg-amber-400")} />
                Clocked {action}
              </span>
              <h1 className="text-4xl font-bold tracking-tight text-white pt-2">{employee.fullName}</h1>
              <p className="text-zinc-400 font-mono text-sm">ID: {employee.empCode}</p>
            </div>

            <div className="inline-block bg-[#1e1f20] border border-zinc-800 rounded-2xl px-8 py-4 shadow-xl">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Recorded Time</p>
              <p className="text-5xl font-black tracking-tight text-white mt-1 tabular-nums">{punchTime}</p>
            </div>

            <p className="text-xs text-zinc-500 animate-pulse pt-4">Ready for next employee entry...</p>
          </div>
        ) : (
          <div className="w-full space-y-12">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center text-7xl md:text-8xl font-light tracking-tighter text-white tabular-nums">
                {formatClock(time).split(" ")[0]}
                <span className="text-3xl md:text-4xl font-extralight text-zinc-500 ml-2 uppercase tracking-wide">
                  {formatClock(time).split(" ")[1]}
                </span>
              </div>
              <div className="text-zinc-400 text-sm md:text-base font-medium tracking-wide uppercase">
                {formatDate(time)}
              </div>
            </div>

            <div className="space-y-4">
              <div
                className={cn(
                  "w-full bg-[#1e1f20] border rounded-2xl p-4 transition-all duration-300 relative group shadow-2xl",
                  state === "processing"
                    ? "border-transparent ring-1 ring-[#74abfe]/30"
                    : "border-zinc-800 focus-within:border-zinc-700 focus-within:bg-[#282a2c]",
                )}
              >
                <div className="flex items-center gap-3">
                  <User className="size-5 text-zinc-500 shrink-0 ml-1" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="Scan QR or Enter Badge Code..."
                    className="w-full bg-transparent border-0 p-1 text-base text-white placeholder-[#8e918f] focus:outline-none focus:ring-0 font-mono tracking-wide"
                    autoFocus
                    disabled={state === "processing"}
                  />

                  <button
                    onClick={handleSubmit}
                    disabled={!code.trim() || state === "processing"}
                    className={cn(
                      "size-9 rounded-xl flex items-center justify-center transition-all shrink-0",
                      code.trim() && state !== "processing"
                        ? "bg-white text-black hover:bg-zinc-200"
                        : "bg-zinc-800 text-zinc-600",
                    )}
                  >
                    <ArrowUp className="size-4.5" strokeWidth={2.5} />
                  </button>
                </div>

                {state === "processing" && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl overflow-hidden">
                    <div
                      className="h-full w-full bg-gradient-to-r from-[#4285f4] via-[#9b72cb] to-[#d96570] animate-gemini-gradient"
                      style={{ backgroundSize: "200% 100%" }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {kioskName} — Terminal Ready
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-4 text-center text-xs text-zinc-600 border-t border-zinc-950 bg-[#131314]">
        Press Enter to submit • Press Esc to clear entry
      </footer>

      <AdminPinDialog
        open={adminDialogOpen}
        onOpenChange={setAdminDialogOpen}
        onVerified={() => setDrawerOpen(true)}
        kioskToken={kioskToken}
      />

      <KioskDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        kioskToken={kioskToken}
      />

      <style jsx global>{`
        @keyframes gemini-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gemini-gradient {
          animation: gemini-gradient 2s linear infinite;
        }
      `}</style>
    </div>
  )
}
