"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Monitor, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEffect, useState } from "react"
import { useSession, signOut } from "@/lib/auth-client"
import { trpc } from "@/lib/trpc/client"
import { useRouter } from "next/navigation"

export function Topbar() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { data: session } = useSession()
  const { data: settings } = trpc.general.get.useQuery()
  const router = useRouter()
  useEffect(() => setMounted(true), [])

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {settings?.companyName ?? settings?.appName ?? "Enterprise HRMS"}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        {mounted && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="size-8">
                  {theme === "dark" ? (
                    <Moon className="size-4" />
                  ) : theme === "light" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Monitor className="size-4" />
                  )}
                  <span className="sr-only">Toggle theme</span>
                </Button>
              }
            ></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 size-4" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 size-4" /> Dark
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 size-4" /> System
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" className="gap-2 text-sm">
                <User className="size-4" />
                <span className="hidden sm:inline max-w-[120px] truncate">
                  {session?.user.name ?? "Account"}
                </span>
              </Button>
            }
          ></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {session?.user.email}
              {session?.user.role && (
                <span className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px] uppercase">
                  {session.user.role}
                </span>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await signOut()
                router.push("/sign-in")
              }}
            >
              <LogOut className="mr-2 size-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
