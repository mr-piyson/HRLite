"use client"

import { useState, useCallback } from "react"
import { trpc } from "@/lib/trpc/client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { XIcon, Search, CheckCircle2, Circle, LogIn, LogOut, User } from "lucide-react"

interface KioskDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kioskToken: string
}

export function KioskDrawer({ open, onOpenChange, kioskToken }: KioskDrawerProps) {
  const [search, setSearch] = useState("")

  const { data: employees = [], refetch } =
    trpc.kiosk.getActiveEmployees.useQuery({ kioskToken }, {
      enabled: open,
    })

  const punchMutation = trpc.kiosk.adminPunch.useMutation({
    onSuccess: (result) => {
      const name = (result as any)?.employee?.fullName ?? "Employee"
      const action = (result as any)?.action ?? "IN"
      toast.success(`${name} clocked ${action}`)
      refetch()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleEmployeeClick = useCallback(
    (employeeId: string) => {
      punchMutation.mutate({ employeeId, kioskToken })
    },
    [punchMutation, kioskToken],
  )

  const filtered = search.trim()
    ? employees.filter(
        (e) =>
          e.fullName.toLowerCase().includes(search.toLowerCase()) ||
          e.empCode.toLowerCase().includes(search.toLowerCase()),
      )
    : employees

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
      )}

      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-[#131314] border-l border-zinc-800 shadow-2xl transition-transform duration-300 ease-out will-change-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-2.5">
              <User className="size-4.5 text-[#74abfe]" />
              <span className="text-sm font-semibold text-white">
                Active Employees
              </span>
              <span className="flex size-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-medium text-zinc-400">
                {employees.length}
              </span>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="flex size-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div className="px-5 pt-3 pb-2">
            <div className="flex items-center gap-2.5 rounded-xl bg-[#1e1f20] border border-zinc-800 px-3 py-2.5 focus-within:border-zinc-700 transition-colors">
              <Search className="size-4 text-zinc-500 shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code..."
                className="w-full bg-transparent border-0 p-0 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center pt-12 text-zinc-500">
                <Search className="size-8 mb-2 opacity-40" />
                <p className="text-sm">
                  {search.trim()
                    ? "No employees match your search"
                    : "No active employees found"}
                </p>
              </div>
            ) : (
              filtered.map((emp) => {
                const isPending = punchMutation.isPending
                return (
                  <button
                    key={emp.id}
                    onClick={() => handleEmployeeClick(emp.id)}
                    disabled={isPending}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-150",
                      isPending
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-[#1e1f20] active:bg-[#282a2c] cursor-pointer",
                    )}
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1e1f20] border border-zinc-700/50 overflow-hidden">
                      {emp.photo ? (
                        <img
                          src={emp.photo}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="text-xs font-semibold text-zinc-400">
                          {emp.fullName
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {emp.fullName}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        {emp.designation ?? "—"} &middot; {emp.empCode}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {emp.attended ? (
                        <span className="text-emerald-400">
                          <CheckCircle2 className="size-5" />
                        </span>
                      ) : (
                        <span className="text-zinc-600">
                          <Circle className="size-5" />
                        </span>
                      )}

                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          emp.isClockedIn
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-zinc-800 text-zinc-500",
                        )}
                      >
                        {emp.isClockedIn ? (
                          <>
                            <LogIn className="size-3" />
                            IN
                          </>
                        ) : (
                          <>
                            <LogOut className="size-3" />
                            OUT
                          </>
                        )}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          <div className="px-5 py-3 border-t border-zinc-800">
            <p className="text-[10px] text-zinc-600 text-center">
              Click an employee to clock {`{IN}`} or {`{OUT}`}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
