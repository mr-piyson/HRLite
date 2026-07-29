"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"

interface AttendanceApproveDialogProps {
  date: string
  count: number
  allPending: boolean
  employeeIds?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function AttendanceApproveDialog({
  date,
  count,
  allPending,
  employeeIds,
  open,
  onOpenChange,
  onSuccess,
}: AttendanceApproveDialogProps) {
  const utils = trpc.useUtils()
  const approveBatchMutation = trpc.attendance.approveBatch.useMutation({
    onSuccess: (result) => {
      utils.attendance.byDate.invalidate({ date })
      utils.dashboard.today.invalidate()
      toast.success(`${result.count} record${result.count === 1 ? "" : "s"} approved`)
      onOpenChange(false)
      onSuccess?.()
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Approve Attendance</AlertDialogTitle>
          <AlertDialogDescription>
            {allPending
              ? `Approve all ${count} pending attendance record${count === 1 ? "" : "s"} for ${date}?`
              : `Approve ${count} selected attendance record${count === 1 ? "" : "s"} for ${date}?`}
            Approved records will become read-only.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              approveBatchMutation.mutate({ date, employeeIds })
            }
            disabled={approveBatchMutation.isPending}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {approveBatchMutation.isPending ? "Approving..." : "Approve"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
