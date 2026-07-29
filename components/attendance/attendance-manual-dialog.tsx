"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { AttendanceStatusLabel } from "@/server/domain/attendance";
import { WheelPicker, WheelPickerWrapper } from "@/components/wheel-picker";
import type { WheelPickerOption } from "@/components/wheel-picker";
import { Clock, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

const HOUR_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1).padStart(2, "0"),
  value: i + 1,
}));

const MINUTE_OPTIONS: WheelPickerOption<number>[] = Array.from({ length: 60 }, (_, i) => ({
  label: String(i).padStart(2, "0"),
  value: i,
}));

const MERIDIEM_OPTIONS: WheelPickerOption<string>[] = [
  { label: "AM", value: "AM" },
  { label: "PM", value: "PM" },
];

function parseTime(value: string) {
  if (!value) return { h12: 12, m: 0, ampm: "AM" as const };
  const [h, m] = value.split(":").map(Number);
  return { h12: h % 12 || 12, m, ampm: h >= 12 ? ("PM" as const) : ("AM" as const) };
}

function formatDisplayTime(value: string) {
  if (!value) return "Not set";
  const { h12, m, ampm } = parseTime(value);
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (val: string) => void }) {
  const parsed = useMemo(() => parseTime(value), [value]);
  const [open, setOpen] = useState(false);

  const handleChange = (h12: number, m: number, ampm: string) => {
    const h = ampm === "PM" ? (h12 % 12) + 12 : h12 % 12;
    onChange(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={cn(" w-full justify-start gap-2 font-normal", !value && "text-muted-foreground")}
            >
              <Clock className="size-4 shrink-0 opacity-60" />
              {formatDisplayTime(value)}
            </Button>
          }
        ></PopoverTrigger>
        <PopoverContent className="w-auto min-w-55 p-3" align="start">
          <WheelPickerWrapper className="w-55 gap-3">
            <WheelPicker
              options={HOUR_OPTIONS}
              value={parsed.h12}
              onValueChange={(v: number) => handleChange(v, parsed.m, parsed.ampm)}
              infinite
            />
            <span className="flex items-center text-sm font-medium text-muted-foreground">:</span>
            <WheelPicker
              options={MINUTE_OPTIONS}
              value={parsed.m}
              onValueChange={(v: number) => handleChange(parsed.h12, v, parsed.ampm)}
              infinite
            />
            <WheelPicker
              options={MERIDIEM_OPTIONS}
              value={parsed.ampm}
              onValueChange={(v: string) => handleChange(parsed.h12, parsed.m, v)}
            />
          </WheelPickerWrapper>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full text-muted-foreground"
              onClick={() => onChange("")}
            >
              Clear
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AttendanceManualDialog({ date: initialDate }: { date: string }) {
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [timeIn, setTimeIn] = useState("");
  const [timeOut, setTimeOut] = useState("");
  const [status, setStatus] = useState("Present");
  const [reason, setReason] = useState("");
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  // Sync the date field with the parent's nuqs state so the dialog always
  // reflects the currently selected calendar date.
  useEffect(() => {
    setDate(initialDate);
  }, [initialDate]);

  const isDirty =
    employeeId !== "" ||
    date !== initialDate ||
    timeIn !== "" ||
    timeOut !== "" ||
    status !== "Present" ||
    reason !== "";

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
    setDate(initialDate);
  };

  const requestClose = () => {
    if (isDirty && !createMutation.isPending) {
      setShowDiscardAlert(true);
    } else {
      handleClose();
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      requestClose();
    } else {
      setOpen(next);
    }
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
      timeIn: timeIn ? new Date(`${date}T${timeIn}`).toISOString() : null,
      timeOut: timeOut ? new Date(`${date}T${timeOut}`).toISOString() : null,
      status,
      reason: reason || undefined,
    });
  };

  const formContent = (
    <form id="attendance-manual-form" onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label>Employee *</Label>
        <Select value={employeeId} onValueChange={(v) => v != null && setEmployeeId(v)}>
          <SelectTrigger className="">
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

      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TimeField label="Time in" value={timeIn} onChange={setTimeIn} />
        <TimeField label="Time out" value={timeOut} onChange={setTimeOut} />
      </div>

      <Separator />

      <div className="space-y-1.5">
        <Label htmlFor="manualStatus">Status</Label>
        <Select value={status} onValueChange={(v) => v != null && setStatus(v)}>
          <SelectTrigger id="manualStatus" className="">
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

      <div className="space-y-1.5">
        <Label htmlFor="manualReason">Reason (optional)</Label>
        <Input
          id="manualReason"
          className=""
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Missed kiosk punch"
        />
      </div>
    </form>
  );

  const submitButton = (
    <Button type="submit" form="attendance-manual-form" disabled={createMutation.isPending} className="min-w-28">
      {createMutation.isPending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Creating…
        </>
      ) : (
        "Create Record"
      )}
    </Button>
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1 size-4" />
        Manual Entry
      </Button>

      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="max-h-[92vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>Manual Attendance Entry</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto px-4">{formContent}</div>
            <DrawerFooter className="flex-col-reverse gap-2 pt-4">
              <Button variant="outline" onClick={requestClose} disabled={createMutation.isPending}>
                Cancel
              </Button>
              {submitButton}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Manual Attendance Entry</DialogTitle>
            </DialogHeader>
            {formContent}
            <DialogFooter className="mt-2">
              <Button type="button" variant="outline" onClick={requestClose} disabled={createMutation.isPending}>
                Cancel
              </Button>
              {submitButton}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this attendance record. If you leave now, they&apos;ll be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardAlert(false);
                handleClose();
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
