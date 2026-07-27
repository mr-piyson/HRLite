"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { LogIn, LogOut } from "lucide-react"

interface ActivityItem {
  id: string
  employeeName: string
  logType: string
  logTime: Date
}

interface RecentActivityProps {
  items?: ActivityItem[]
  isLoading?: boolean
}

export function RecentActivity({
  items,
  isLoading,
}: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          <div className="space-y-0">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 border-b px-4 py-3 last:border-0"
                  >
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-2 w-20" />
                    </div>
                  </div>
                ))
              : items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 border-b px-4 py-3 last:border-0"
                  >
                    <div
                      className={`flex size-8 items-center justify-center rounded-full ${
                        item.logType === "IN"
                          ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                      }`}
                    >
                      {item.logType === "IN" ? (
                        <LogIn className="size-4" />
                      ) : (
                        <LogOut className="size-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {item.employeeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.logTime).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.logType === "IN" ? "default" : "secondary"
                      }
                    >
                      {item.logType}
                    </Badge>
                  </div>
                ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
