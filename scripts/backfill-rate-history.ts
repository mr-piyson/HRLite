import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

async function main() {
  const employees = await prisma.employee.findMany({
    where: { rateHistory: { none: {} } },
    select: { id: true, hourRate: true, currency: true, createdAt: true },
  })

  let created = 0
  for (const e of employees) {
    await prisma.employeeRateHistory.create({
      data: {
        employeeId: e.id,
        hourRate: e.hourRate ?? 0,
        currency: e.currency ?? "SAR",
        effectiveDate: toDateKey(e.createdAt),
      },
    })
    created++
  }
  console.log(`Backfilled ${created} employees with an initial rate history row`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
