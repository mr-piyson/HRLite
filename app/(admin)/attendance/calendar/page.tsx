"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AttendanceStatusLabel } from "@/server/domain/attendance";
import type { CalendarDay } from "@/server/services/attendance-calendar.service";
import { AttendanceCalendarDrawer } from "@/components/attendance/attendance-calendar-drawer";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";

const statusDotColors: Record<string, string> = {
  Present: "bg-emerald-500",
  Absent: "bg-red-500",
  Late: "bg-amber-500",
  HalfDay: "bg-orange-500",
  Incomplete: "bg-blue-500",
};

const statusDotOrder = ["Present", "Absent", "Late", "HalfDay", "Incomplete"] as const;

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<{ date: string; dayName: string } | null>(null);

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

  const prevMonth = () => setCurrentDate((d) => addMonths(d, -1));
  const nextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const goToday = () => setCurrentDate(new Date());

  const handleDayClick = (day: Date) => {
    const dateKey = format(day, "yyyy-MM-dd");
    setSelectedDay({ date: dateKey, dayName: format(day, "EEEE, MMMM d, yyyy") });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Attendance Calendar</h1>
          <p className="text-sm text-muted-foreground">Month overview of employee attendance</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="size-5" />
            </Button>
            <h2 className="text-lg font-semibold min-w-40 text-center">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="size-5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
        </div>

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
                          } ${today ? "bg-accent/30" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-sm font-medium ${
                                !inMonth ? "text-muted-foreground/40" : ""
                              } ${today ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground" : ""}`}
                            >
                              {format(day, "d")}
                            </span>
                            {dayData?.allApproved && inMonth && (
                              <span className="text-[10px] text-emerald-500 font-medium">✓</span>
                            )}
                          </div>
                          {inMonth && dayData && dayData.records.length > 0 && (
                            <div className="mt-1.5 space-y-0.5">
                              {statusDotOrder.map((s) => {
                                const count = dayData.summary[s];
                                if (!count) return null;
                                return (
                                  <div key={s} className="flex items-center gap-1">
                                    <span className={`inline-block size-2 rounded-full ${statusDotColors[s] ?? "bg-gray-400"}`} />
                                    <span className="text-[10px] tabular-nums text-muted-foreground">
                                      {count}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      }
                    />
                    <TooltipContent side="top" align="center">
                      <p className="text-xs font-medium">{format(day, "EEEE, MMM d")}</p>
                      {dayData ? (
                        <p className="text-[11px] text-muted-foreground">
                          {dayData.records.length} record{dayData.records.length === 1 ? "" : "s"}
                          {dayData.allApproved ? " — all approved" : ""}
                        </p>
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

      <AttendanceCalendarDrawer
        date={selectedDay?.date ?? null}
        dayName={selectedDay?.dayName ?? null}
        open={!!selectedDay}
        onOpenChange={(open) => { if (!open) setSelectedDay(null); }}
      />
    </div>
  );
}
