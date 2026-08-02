"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { CurrencyLabel } from "@/server/domain/employee"
import { ImagePlus, Trash2, Building2 } from "lucide-react"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

const MAX_LOGO_BYTES = 1_000_000

function LogoPreview({ logo, appName }: { logo: string | null; appName: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground text-sm font-bold">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="size-full object-contain" />
        ) : (
          appName.slice(0, 2).toUpperCase()
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{appName || "Attendance Kiosk"}</p>
        <p className="text-xs text-muted-foreground">Appearance in the sidebar</p>
      </div>
    </div>
  )
}

export function GeneralSettings() {
  const { data: settings, isLoading } = trpc.general.get.useQuery()
  const utils = trpc.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [appName, setAppName] = useState("Attendance Kiosk")
  const [appLogo, setAppLogo] = useState<string | null>(null)
  const [defaultCurrency, setDefaultCurrency] = useState("SAR")
  const [defaultWorkdayStart, setDefaultWorkdayStart] = useState("09:00")
  const [weekendDays, setWeekendDays] = useState<(typeof WEEKDAYS)[number][]>(["Fri", "Sat"])
  const [companyName, setCompanyName] = useState("")
  const [companyAddress, setCompanyAddress] = useState("")
  const [companyPhone, setCompanyPhone] = useState("")
  const [companyTaxId, setCompanyTaxId] = useState("")
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (settings) {
      setAppName(settings.appName)
      setAppLogo(settings.appLogo)
      setDefaultCurrency(settings.defaultCurrency)
      setDefaultWorkdayStart(settings.defaultWorkdayStart)
      setWeekendDays(settings.weekendDays as (typeof WEEKDAYS)[number][])
      setCompanyName(settings.companyName ?? "")
      setCompanyAddress(settings.companyAddress ?? "")
      setCompanyPhone(settings.companyPhone ?? "")
      setCompanyTaxId(settings.companyTaxId ?? "")
      setDirty(false)
    }
  }, [settings])

  const markDirty = (fn: () => void) => {
    fn()
    setDirty(true)
  }

  const toggleWeekendDay = (day: (typeof WEEKDAYS)[number]) => {
    markDirty(() =>
      setWeekendDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
      ),
    )
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Logo must be an image file")
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Logo must be smaller than 1MB")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      markDirty(() => setAppLogo(reader.result as string))
    }
    reader.readAsDataURL(file)
  }

  const updateMutation = trpc.general.update.useMutation({
    onSuccess: () => {
      utils.general.get.invalidate()
      toast.success("General settings saved")
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      appName,
      appLogo,
      defaultCurrency,
      defaultWorkdayStart,
      weekendDays,
      companyName: companyName || null,
      companyAddress: companyAddress || null,
      companyPhone: companyPhone || null,
      companyTaxId: companyTaxId || null,
    })
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Branding */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="appName">App Name *</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(e) => markDirty(() => setAppName(e.target.value))}
                required
              />
            </div>
            <div className="space-y-1">
              <Label>App Logo</Label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    handleFile(e.target.files?.[0])
                    e.target.value = ""
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <ImagePlus className="mr-1.5 size-3.5" />
                  Upload Logo
                </Button>
                {appLogo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => markDirty(() => setAppLogo(null))}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG or SVG recommended. Stored inline, max 1MB.</p>
            </div>
          </div>
          <LogoPreview logo={appLogo} appName={appName} />
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 text-muted-foreground" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => markDirty(() => setCompanyName(e.target.value))}
                placeholder="e.g. BFG Group"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="companyPhone">Phone</Label>
              <Input
                id="companyPhone"
                value={companyPhone}
                onChange={(e) => markDirty(() => setCompanyPhone(e.target.value))}
                placeholder="e.g. +966 5X XXX XXXX"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="companyAddress">Address</Label>
            <Textarea
              id="companyAddress"
              value={companyAddress}
              onChange={(e) => markDirty(() => setCompanyAddress(e.target.value))}
              placeholder="e.g. Riyadh, Saudi Arabia"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="companyTaxId">Tax / Registration Number</Label>
            <Input
              id="companyTaxId"
              value={companyTaxId}
              onChange={(e) => markDirty(() => setCompanyTaxId(e.target.value))}
              placeholder="e.g. VAT registration number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Defaults */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Default Currency</Label>
              <Select
                value={defaultCurrency}
                onValueChange={(v) => v && markDirty(() => setDefaultCurrency(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CurrencyLabel).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preselected when adding new employees
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="defaultWorkdayStart">Default Workday Start</Label>
              <Input
                id="defaultWorkdayStart"
                type="time"
                value={defaultWorkdayStart}
                onChange={(e) => markDirty(() => setDefaultWorkdayStart(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Preselected when creating new kiosks
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Weekend Days</Label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day) => {
                const active = weekendDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleWeekendDay(day)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Non-working days used to identify weekend attendance
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={!dirty || updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </form>
  )
}
