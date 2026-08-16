"use client"

import { useState } from "react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Plus, TrendingUp } from "lucide-react"
import { CurrencySymbol, CurrencyLabel, type Currency } from "@/server/domain/employee"
import { todayKey } from "@/lib/utils"

interface RateHistoryCardProps {
  employeeId: string
  currentRate: number
  employeeCurrency: string
  isAdmin: boolean
}

export function RateHistoryCard({
  employeeId,
  currentRate,
  employeeCurrency,
  isAdmin,
}: RateHistoryCardProps) {
  const utils = trpc.useUtils()
  const [open, setOpen] = useState(false)
  const [hourRate, setHourRate] = useState("")
  const [effectiveDate, setEffectiveDate] = useState(todayKey())
  const [currency, setCurrency] = useState(employeeCurrency ?? "BHD")
  const [reason, setReason] = useState("")

  const { data: history, isLoading } = trpc.employee.rateHistory.useQuery({
    employeeId,
  })

  const changeRate = trpc.employee.changeRate.useMutation({
    onSuccess: () => {
      utils.employee.list.invalidate()
      utils.employee.getById.invalidate()
      utils.employee.rateHistory.invalidate()
      utils.report.attendance.invalidate()
      utils.report.dailyBreakdown.invalidate()
      toast.success("Rate updated")
      setOpen(false)
      setHourRate("")
      setReason("")
      setEffectiveDate(todayKey())
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(hourRate)
    if (isNaN(value) || value < 0) {
      toast.error("Enter a valid rate")
      return
    }
    const sameRate = Math.abs(value - currentRate) < 1e-9
    const sameCurrency = (currency ?? "BHD") === (employeeCurrency ?? "BHD")
    if (sameRate && sameCurrency) {
      setOpen(false)
      toast.info("Rate unchanged")
      return
    }
    changeRate.mutate({
      employeeId,
      hourRate: value,
      effectiveDate,
      currency,
      reason: reason || undefined,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">Rate History</CardTitle>
          <Badge variant="secondary" className="tabular-nums">
            Current: {CurrencySymbol[(employeeCurrency as Currency) ?? "BHD"]}
            {currentRate.toFixed(2)}
          </Badge>
        </div>
        {isAdmin && (
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v)
              if (v) {
                setHourRate(String(currentRate))
                setReason("")
                setEffectiveDate(todayKey())
                setCurrency(employeeCurrency ?? "BHD")
              }
            }}
          >
            <DialogTrigger
              render={
                <Button size="sm" variant="outline">
                  <Plus className="mr-1 size-4" />
                  Change Rate
                </Button>
              }
            ></DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Change Rate</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="hourRate">
                      Hourly Rate ({CurrencySymbol[(currency as Currency) ?? "BHD"]})
                    </Label>
                    <Input
                      id="hourRate"
                      type="number"
                      step="0.001"
                      min={0}
                      value={hourRate}
                      onChange={(e) => setHourRate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Currency</Label>
                    <Select
                      value={currency}
                      onValueChange={(v) => v && setCurrency(v)}
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
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="effectiveDate">Effective From</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Attendance from this date onward is calculated at the new
                    rate. Earlier attendance keeps the previous rate.
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="reason">Reason</Label>
                  <Input
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={changeRate.isPending}>
                    {changeRate.isPending ? "Saving..." : "Save Rate Change"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : history && history.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Effective From</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Set By</TableHead>
                <TableHead className="text-right">Changed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((h:any) => (
                <TableRow key={h.id}>
                  <TableCell className="font-medium">
                    {new Date(`${h.effectiveDate}T00:00:00`).toLocaleDateString()}
                    {h.effectiveDate > todayKey() && (
                      <span className="ml-2">
                        <TrendingUp className="inline size-3.5 text-amber-500" />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {CurrencySymbol[(h.currency as Currency) ?? "BHD"]}
                    {h.hourRate.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {h.reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {h.createdBy?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {new Date(h.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No rate history yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
