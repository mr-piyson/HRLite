"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as AlertTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toDatetimeLocal } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { AttendanceStatusLabel } from "@/server/domain/attendance"

interface AttendanceEditDialogProps {
  record: {
    id: string
    employee: { fullName: string; empCode: string }
    date: string
    timeIn: Date | null
    timeOut: Date | null
    workingMinutes: number
    status: string
    breakMinutes: number
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AttendanceEditDialog({
  record,
  open,
  onOpenChange,
}: AttendanceEditDialogProps) {
  const [timeIn, setTimeIn] = useState(toDatetimeLocal(record.timeIn))
  const [timeOut, setTimeOut] = useState(toDatetimeLocal(record.timeOut))
  const [status, setStatus] = useState(record.status)
  const [breakMinutes, setBreakMinutes] = useState(String(record.breakMinutes))
  const [reason, setReason] = useState("")
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  const utils = trpc.useUtils()

  const updateMutation = trpc.attendance.update.useMutation({
    onSuccess: () => {
      utils.attendance.byDate.invalidate({ date: record.date })
      utils.dashboard.today.invalidate()
      toast.success("Attendance updated")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.attendance.delete.useMutation({
    onSuccess: () => {
      utils.attendance.byDate.invalidate({ date: record.date })
      toast.success("Attendance record deleted")
      setShowDeleteAlert(false)
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      id: record.id,
      data: {
        timeIn: timeIn ? new Date(timeIn).toISOString() : null,
        timeOut: timeOut ? new Date(timeOut).toISOString() : null,
        status: status !== record.status ? status : undefined,
        breakMinutes: parseInt(breakMinutes) || 0,
        reason: reason || undefined,
      },
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              Edit Attendance — {record.employee.fullName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee</span>
                <span className="font-medium">{record.employee.fullName} ({record.employee.empCode})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{record.date}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="timeIn">Time In</Label>
                <Input
                  id="timeIn"
                  type="datetime-local"
                  value={timeIn}
                  onChange={(e) => setTimeIn(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="timeOut">Time Out</Label>
                <Input
                  id="timeOut"
                  type="datetime-local"
                  value={timeOut}
                  onChange={(e) => setTimeOut(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => v != null && setStatus(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(AttendanceStatusLabel).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="breakMinutes">Break (minutes)</Label>
                <Input
                  id="breakMinutes"
                  type="number"
                  min={0}
                  value={breakMinutes}
                  onChange={(e) => setBreakMinutes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="reason">Reason for edit (optional)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Admin correction"
              />
            </div>

            <div className="flex justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteAlert(true)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Delete"}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertTitle>Delete Attendance Record</AlertTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attendance record for {record.employee.fullName} on {record.date}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: record.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
