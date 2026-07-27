"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export function LogCreateDialog() {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [logTime, setLogTime] = useState("");
  const [logType, setLogType] = useState("IN");
  const [deviceName, setDeviceName] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  const utils = trpc.useUtils();
  const { data: employees } = trpc.employee.list.useQuery();

  const createMutation = trpc.attendanceLog.create.useMutation({
    onSuccess: () => {
      utils.attendance.byDate.invalidate();
      utils.attendanceLog.list.invalidate();
      toast.success("Log entry created");
      handleClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = () => {
    setOpen(false);
    setEmployeeId("");
    setLogTime(new Date().toISOString().slice(0, 16));
    setLogType("IN");
    setDeviceName("");
    setNotes("");
    setReason("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!logTime) {
      toast.error("Please select a date/time");
      return;
    }
    createMutation.mutate({
      employeeId,
      logTime: new Date(logTime).toISOString(),
      logType: logType as "IN" | "OUT" | "BREAK_IN" | "BREAK_OUT",
      deviceName: deviceName || undefined,
      notes: notes || undefined,
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
          <Button size="sm">
            <Plus className="mr-1 size-4" />
            Add Log Entry
          </Button>
        }
      ></DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New Attendance Log Entry</DialogTitle>
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
            <Label htmlFor="logTime">Date & Time *</Label>
            <Input
              id="logTime"
              type="datetime-local"
              value={logTime}
              onChange={(e) => setLogTime(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="logType">Log Type</Label>
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
            <Label htmlFor="deviceName">Device Name (optional)</Label>
            <Input
              id="deviceName"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Admin Panel"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="logReason">Reason (optional)</Label>
            <Input
              id="logReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Missed scan correction"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="logNotes">Notes (optional)</Label>
            <Input id="logNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Log Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
