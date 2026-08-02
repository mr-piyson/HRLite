import { router } from "@/server/trpc/trpc"
import { kioskRouter } from "@/server/trpc/routers/kiosk"
import { attendanceRouter, attendanceLogRouter, dashboardRouter, reportRouter } from "@/server/trpc/routers/analytics"
import {
  employeeRouter,
  supplierRouter,
} from "@/server/trpc/routers/directory"
import { settingsRouter } from "@/server/trpc/routers/settings"
import { generalRouter } from "@/server/trpc/routers/general"
import { userRouter } from "@/server/trpc/routers/users"

export const appRouter = router({
  kiosk: kioskRouter,
  attendance: attendanceRouter,
  attendanceLog: attendanceLogRouter,
  dashboard: dashboardRouter,
  report: reportRouter,
  supplier: supplierRouter,
  employee: employeeRouter,
  settings: settingsRouter,
  general: generalRouter,
  users: userRouter,
})

export type AppRouter = typeof appRouter
