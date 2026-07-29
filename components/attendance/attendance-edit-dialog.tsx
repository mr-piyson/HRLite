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
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { AttendanceStatusLabel } from "@/server/domain/attendance";
import { WheelPicker, WheelPickerWrapper } from "@/components/wheel-picker";
import type { WheelPickerOption } from "@/components/wheel-picker";
import { Clock, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Responsive helper — dialog on desktop, bottom drawer on mobile. This is the
// standard shadcn pattern for touch-friendly modals (drawer content is easier
// to reach one-handed and avoids the viewport-resize/keyboard issues dialogs
// have on iOS Safari).
// ---------------------------------------------------------------------------
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

/**
 * Time picker rendered inside a popover so it doesn't eat vertical space in
 * the form — this is what makes the dialog fit comfortably on small screens.
 * The trigger is a large tap target (44px) showing the current value.
 */
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

interface AttendanceEditDialogProps {
  record: {
    id: string;
    employee: { fullName: string; empCode: string };
    date: string;
    timeIn: Date | null;
    timeOut: Date | null;
    workingMinutes: number;
    status: string;
    breakMinutes: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceEditDialog({ record, open, onOpenChange }: AttendanceEditDialogProps) {
  const isMobile = useIsMobile();

  const initialTimeIn = record.timeIn
    ? `${String(new Date(record.timeIn).getHours()).padStart(2, "0")}:${String(
        new Date(record.timeIn).getMinutes(),
      ).padStart(2, "0")}`
    : "";
  const initialTimeOut = record.timeOut
    ? `${String(new Date(record.timeOut).getHours()).padStart(2, "0")}:${String(
        new Date(record.timeOut).getMinutes(),
      ).padStart(2, "0")}`
    : "";

  const [timeIn, setTimeIn] = useState(initialTimeIn);
  const [timeOut, setTimeOut] = useState(initialTimeOut);
  const [status, setStatus] = useState(record.status);
  const [breakMinutes, setBreakMinutes] = useState(String(record.breakMinutes));
  const [reason, setReason] = useState("");
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  const isDirty =
    timeIn !== initialTimeIn ||
    timeOut !== initialTimeOut ||
    status !== record.status ||
    breakMinutes !== String(record.breakMinutes) ||
    reason !== "";

  // Out-before-in is a common data-entry mistake — catch it before submit.
  const hasTimeOrderError = Boolean(timeIn && timeOut && timeOut <= timeIn);

  const utils = trpc.useUtils();

  const updateMutation = trpc.attendance.update.useMutation({
    onSuccess: () => {
      utils.attendance.byDate.invalidate({ date: record.date });
      utils.dashboard.today.invalidate();
      toast.success("Attendance updated");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.attendance.delete.useMutation({
    onSuccess: () => {
      utils.attendance.byDate.invalidate({ date: record.date });
      toast.success("Attendance record deleted");
      setShowDeleteAlert(false);
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const isSaving = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasTimeOrderError) return;
    updateMutation.mutate({
      id: record.id,
      data: {
        timeIn: timeIn ? new Date(`${record.date}T${timeIn}`).toISOString() : null,
        timeOut: timeOut ? new Date(`${record.date}T${timeOut}`).toISOString() : null,
        status: status !== record.status ? status : undefined,
        breakMinutes: parseInt(breakMinutes) || 0,
        reason: reason || undefined,
      },
    });
  };

  // Guard against losing unsaved edits — whether the user hits Escape,
  // clicks outside, or taps Cancel.
  const requestClose = () => {
    if (isDirty && !isSaving) {
      setShowDiscardAlert(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      requestClose();
    } else {
      onOpenChange(next);
    }
  };

  const title = `Edit attendance — ${record.employee.fullName}`;
  const description = `${record.employee.empCode} · ${record.date}`;

  const formContent = (
    <form id="attendance-edit-form" onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <TimeField label="Time in" value={timeIn} onChange={setTimeIn} />
        <TimeField label="Time out" value={timeOut} onChange={setTimeOut} />
      </div>

      {hasTimeOrderError && <p className="-mt-2 text-sm text-destructive">Time out must be after time in.</p>}

      <Separator />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(v) => v != null && setStatus(v)}>
            <SelectTrigger id="status" className="">
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
          <Label htmlFor="breakMinutes">Break (minutes)</Label>
          <Input
            id="breakMinutes"
            type="number"
            inputMode="numeric"
            min={0}
            className=""
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="reason">Reason for edit</Label>
        <Input
          id="reason"
          className=""
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Admin correction"
        />
        <p className="text-xs text-muted-foreground">
          Optional, but recommended — shown in this employee&apos;s audit history.
        </p>
      </div>
    </form>
  );

  const deleteButton = (
    <Button
      type="button"
      variant="ghost"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={() => setShowDeleteAlert(true)}
      disabled={isDeleting || isSaving}
    >
      <Trash2 className="size-4" />
      Delete record
    </Button>
  );

  const saveButton = (
    <Button type="submit" form="attendance-edit-form" disabled={isSaving || hasTimeOrderError} className="min-w-28">
      {isSaving ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Saving…
        </>
      ) : (
        "Save changes"
      )}
    </Button>
  );

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={handleOpenChange}>
          <DrawerContent className="max-h-[92vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription className="flex items-center gap-2">
                <Badge variant="secondary" className="font-normal">
                  {record.employee.empCode}
                </Badge>
                {record.date}
              </DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4">{formContent}</div>
            <DrawerFooter className="flex-col-reverse gap-2 pt-4">
              <Button variant="outline" onClick={requestClose} disabled={isSaving}>
                Cancel
              </Button>
              {saveButton}
              <div className="pt-2">{deleteButton}</div>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            {formContent}
            <DialogFooter className="mt-2 flex items-center !justify-between">
              {deleteButton}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={requestClose} disabled={isSaving}>
                  Cancel
                </Button>
                {saveButton}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete attendance record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the record for{" "}
              <span className="font-medium text-foreground">{record.employee.fullName}</span> on {record.date}. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: record.id })}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unsaved changes guard */}
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
                onOpenChange(false);
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
