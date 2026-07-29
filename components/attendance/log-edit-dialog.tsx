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

interface LogEditDialogProps {
  log: {
    id: string
    employeeId: string
    logTime: Date
    logType: string
    deviceName: string | null
    ipAddress: string | null
    notes: string | null
    employee: {
      fullName: string
      empCode: string
    }
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogEditDialog({
  log,
  open,
  onOpenChange,
}: LogEditDialogProps) {
  const [logTime, setLogTime] = useState(toDatetimeLocal(log.logTime))
  const [logType, setLogType] = useState(log.logType)
  const [deviceName, setDeviceName] = useState(log.deviceName ?? "")
  const [notes, setNotes] = useState(log.notes ?? "")
  const [reason, setReason] = useState("")
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  const utils = trpc.useUtils()

  const updateMutation = trpc.attendanceLog.update.useMutation({
    onSuccess: () => {
      utils.attendanceLog.list.invalidate()
      utils.attendance.byDate.invalidate()
      toast.success("Log entry updated")
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.attendanceLog.delete.useMutation({
    onSuccess: () => {
      utils.attendanceLog.list.invalidate()
      utils.attendance.byDate.invalidate()
      toast.success("Log entry deleted")
      setShowDeleteAlert(false)
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!logTime) {
      toast.error("Please select a date/time")
      return
    }
    updateMutation.mutate({
      id: log.id,
      data: {
        logTime: new Date(logTime).toISOString(),
        logType: logType as "IN" | "OUT" | "BREAK_IN" | "BREAK_OUT",
        deviceName: deviceName || undefined,
        notes: notes || undefined,
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
              Edit Log Entry — {log.employee.fullName}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee</span>
                <span className="font-medium">{log.employee.fullName} ({log.employee.empCode})</span>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="editLogTime">Date & Time *</Label>
              <Input
                id="editLogTime"
                type="datetime-local"
                value={logTime}
                onChange={(e) => setLogTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editLogType">Log Type</Label>
              <Select value={logType} onValueChange={(v) => v != null && setLogType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">IN</SelectItem>
                  <SelectItem value="OUT">OUT</SelectItem>
                  <SelectItem value="BREAK_IN">BREAK_IN</SelectItem>
                  <SelectItem value="BREAK_OUT">BREAK_OUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="editDeviceName">Device Name (optional)</Label>
              <Input id="editDeviceName" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editLogReason">Reason for edit (optional)</Label>
              <Input id="editLogReason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Admin correction" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editNotes">Notes (optional)</Label>
              <Input id="editNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
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
            <AlertTitle>Delete Log Entry</AlertTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this log entry for {log.employee.fullName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: log.id })}
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
