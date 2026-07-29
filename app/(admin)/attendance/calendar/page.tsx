"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { CalendarDay } from "@/server/services/attendance-calendar.service";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  setMonth,
  setYear,
  isSameMonth,
  isToday,
} from "date-fns";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

export default function AttendanceCalendarPage() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());

  const selectedMonth = currentDate.getMonth();
  const selectedYear = currentDate.getFullYear();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;
  const { data: monthData, isLoading } = trpc.attendance.calendarByMonth.useQuery({ year, month });

  const recordsByDate = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    if (!monthData) return map;
    for (const day of monthData) {
      map.set(day.date, day);
    }
    return map;
  }, [monthData]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const handleMonthChange = (value: string | null) => {
    if (value) setCurrentDate((d) => setMonth(d, parseInt(value)));
  };

  const handleYearChange = (value: string | null) => {
    if (value) setCurrentDate((d) => setYear(d, parseInt(value)));
  };

  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    router.push(`/attendance?date=${dateKey}`);
  };

  return (
    <div className="h-full space-y-4">
      {/* Month/Year Selects Bar */}
      <div className="flex items-center gap-3">
        <Select value={String(selectedMonth)} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-40">
            <SelectValue>{MONTHS[selectedMonth]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((name, i) => (
              <SelectItem key={i} value={String(i)}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(selectedYear)} onValueChange={handleYearChange}>
          <SelectTrigger className="w-24">
            <SelectValue>{selectedYear}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {YEAR_OPTIONS.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={goToday}>
          Today
        </Button>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        {/* Day names */}
        <div className="grid grid-cols-7 border-b">
          {DAYS.map((d) => (
            <div key={d} className="border-r px-3 py-2 text-center text-xs font-medium text-muted-foreground last:border-r-0">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        {isLoading ? (
          <div className="grid grid-cols-7">
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} className="aspect-square border-b border-r p-2 last:border-r-0">
                <Skeleton className="h-full w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {allDays.map((day, i) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayData = recordsByDate.get(dateKey);
              const inMonth = isSameMonth(day, currentDate);
              const today = isToday(day);

              return (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <div
                          onClick={() => inMonth && handleDayClick(day)}
                          className={`relative min-h-[90px] border-b border-r p-2 last:border-r-0 transition-colors ${
                            inMonth ? "cursor-pointer hover:bg-muted/50" : "bg-muted/20 cursor-default"
                          } ${dayData?.allApproved && inMonth ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""}
                            ${today && !dayData?.allApproved ? "bg-accent/30" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-medium ${
                                !inMonth ? "text-muted-foreground/40" : ""
                              } ${today && !dayData?.allApproved ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground" : ""}`}
                            >
                              {format(day, "d")}
                            </span>
                            {dayData?.allApproved && inMonth && (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓</span>
                            )}
                          </div>
                          {inMonth && dayData && dayData.records.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {dayData.approvedCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="inline-block size-2 rounded-full bg-emerald-500" />
                                  <span className="text-xs tabular-nums text-emerald-600 dark:text-emerald-400 font-medium">
                                    {dayData.approvedCount}
                                  </span>
                                </div>
                              )}
                              {dayData.pendingCount > 0 && (
                                <div className="flex items-center gap-1">
                                  <span className="inline-block size-2 rounded-full bg-orange-500" />
                                  <span className="text-xs tabular-nums text-orange-600 dark:text-orange-400 font-medium">
                                    {dayData.pendingCount}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      }
                    />
                    <TooltipContent side="top" align="center">
                      <p className="text-xs font-medium">{format(day, "EEEE, MMM d")}</p>
                      {dayData ? (
                        <div className="text-[11px] text-muted-foreground space-y-0.5">
                          <p>{dayData.records.length} record{dayData.records.length === 1 ? "" : "s"}</p>
                          <p>{dayData.approvedCount} approved, {dayData.pendingCount} pending</p>
                        </div>
                      ) : inMonth ? (
                        <p className="text-[11px] text-muted-foreground">No records</p>
                      ) : null}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
