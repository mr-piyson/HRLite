"use client"

import { useState, useRef, useCallback } from "react"
import { trpc } from "@/lib/trpc/client"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Shield, XIcon } from "lucide-react"

interface AdminPinDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerified: () => void
}

export function AdminPinDialog({
  open,
  onOpenChange,
  onVerified,
}: AdminPinDialogProps) {
  const [pin, setPin] = useState<string[]>(["", "", "", ""])
  const [error, setError] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const verifyMutation = trpc.kiosk.verifyAdminPin.useMutation({
    onSuccess: (result) => {
      if (result.valid) {
        setPin(["", "", "", ""])
        setError(false)
        onOpenChange(false)
        onVerified()
      } else {
        setError(true)
        setTimeout(() => {
          setPin(["", "", "", ""])
          setError(false)
          inputRefs.current[0]?.focus()
        }, 600)
      }
    },
    onError: () => {
      setError(true)
      setTimeout(() => {
        setPin(["", "", "", ""])
        setError(false)
        inputRefs.current[0]?.focus()
      }, 600)
    },
  })

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return
      const digit = value.slice(-1)
      const newPin = [...pin]
      newPin[index] = digit
      setPin(newPin)
      setError(false)

      if (digit && index < 3) {
        inputRefs.current[index + 1]?.focus()
      }

      const fullPin = newPin.join("")
      if (fullPin.length === 4) {
        verifyMutation.mutate({ pin: fullPin })
      }
    },
    [pin, verifyMutation],
  )

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !pin[index] && index > 0) {
        const newPin = [...pin]
        newPin[index - 1] = ""
        setPin(newPin)
        inputRefs.current[index - 1]?.focus()
      }
    },
    [pin],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const text = e.clipboardData.getData("text")
      const digits = text.replace(/\D/g, "").slice(0, 4).split("")
      const newPin = ["", "", "", ""]
      digits.forEach((d, i) => {
        newPin[i] = d
      })
      setPin(newPin)
      if (digits.length === 4) {
        verifyMutation.mutate({ pin: newPin.join("") })
      }
    },
    [verifyMutation],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[320px] rounded-2xl bg-[#1a1a1c] border-zinc-800 text-[#e3e3e3] p-0 gap-0 ring-1 ring-white/5 shadow-2xl"
      >
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#74abfe]/10">
                <Shield className="size-4.5 text-[#74abfe]" />
              </div>
              <DialogTitle className="text-sm font-semibold text-white">
                Admin Access
              </DialogTitle>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="flex size-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </DialogHeader>

        <div className="px-6 pb-2">
          <p className="text-xs text-zinc-500">
            Enter the 4-digit admin PIN to access the employee drawer.
          </p>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="flex justify-center gap-3">
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={cn(
                  "size-12 rounded-xl border bg-[#131314] text-center text-lg font-bold tracking-widest text-white outline-none transition-all duration-150",
                  error
                    ? "border-red-500/60 ring-1 ring-red-500/20 animate-shake"
                    : digit
                      ? "border-[#74abfe]/60 ring-1 ring-[#74abfe]/20"
                      : "border-zinc-700/60 hover:border-zinc-600 focus:border-[#74abfe]/40",
                )}
                autoFocus={index === 0}
                disabled={verifyMutation.isPending}
              />
            ))}
          </div>

          {error && (
            <p className="mt-3 text-center text-xs text-red-400">
              Invalid PIN. Try again.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
