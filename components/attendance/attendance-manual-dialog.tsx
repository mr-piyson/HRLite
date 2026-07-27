"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { AttendanceStatusLabel } from "@/server/domain/attendance";
import { Plus } from "lucide-react";

export function AttendanceManualDialog({ date: initialDate }: { date: string }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [status, setStatus] = useState("Present");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();
  const { data: employees } = trpc.employee.list.useQuery();

  const createMutation = trpc.attendance.manualCreate.useMutation({
    onSuccess: () => {
      utils.attendance.byDate.invalidate({ date });
      utils.dashboard.today.invalidate();
      toast.success("Attendance record created");
      handleClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = () => {
    setOpen(false);
    setEmployeeId("");
    setTimeIn("");
    setTimeOut("");
    setStatus("Present");
    setReason("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    createMutation.mutate({
      employeeId,
      date,
      timeIn: timeIn ? new Date(timeIn).toISOString() : null,
      timeOut: timeOut ? new Date(timeOut).toISOString() : null,
      status,
      reason: reason || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) handleClose();
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="mr-1 size-4" />
            Manual Entry
          </Button>
        }
      ></DialogTrigger>
      <DialogContent className="sm:max-w-120">
        <DialogHeader>
          <DialogTitle>Manual Attendance Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label>Employee *</Label>
            <Select value={employeeId} onValueChange={(v) => v != null && setEmployeeId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.empCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="manualTimeIn">Time In</Label>
              <Input
                id="manualTimeIn"
                type="datetime-local"
                value={timeIn}
                onChange={(e) => setTimeIn(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="manualTimeOut">Time Out</Label>
              <Input
                id="manualTimeOut"
                type="datetime-local"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="manualStatus">Status</Label>
            <Select value={status} onValueChange={(v) => v != null && setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(AttendanceStatusLabel).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="manualReason">Reason (optional)</Label>
            <Input
              id="manualReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Missed kiosk punch"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
