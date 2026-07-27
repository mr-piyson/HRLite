"use client"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatMinutes } from "@/server/services/attendance-calculator"
import { Building2 } from "lucide-react"

interface SupplierStat {
  supplierId: string | null
  supplierName: string
  present: number
  workingMinutes: number
}

interface SupplierBreakdownProps {
  data?: SupplierStat[]
  isLoading?: boolean
}

export function SupplierBreakdown({
  data,
  isLoading,
}: SupplierBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Supplier Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : data?.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No attendance data for today
          </p>
        ) : (
          <div className="space-y-3">
            {data?.map((s) => (
              <div
                key={s.supplierId ?? "__direct__"}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-muted-foreground" />
                  <span className="text-sm">{s.supplierName}</span>
                </div>
                <div className="text-right text-sm tabular-nums">
                  <span className="font-medium">{s.present}</span>
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-muted-foreground">
                    {formatMinutes(s.workingMinutes)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
