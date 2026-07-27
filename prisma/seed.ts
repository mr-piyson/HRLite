import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const POLICY = {
  workdayStart: "09:00",
  lateGraceMinutes: 15,
  standardWorkMinutes: 480,
  halfDayMinutes: 240,
}

function toKey(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
function diffMin(a: Date, b: Date) {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000))
}
function scheduledStart(key: string) {
  const [h, m] = POLICY.workdayStart.split(":").map(Number)
  const d = new Date(`${key}T00:00:00`)
  d.setHours(h, m, 0, 0)
  return d
}
function compute(
  key: string,
  logs: { logTime: Date; logType: string }[],
) {
  const sorted = [...logs].sort(
    (a, b) => a.logTime.getTime() - b.logTime.getTime(),
  )
  const firstIn = sorted.find((l) => l.logType === "IN")?.logTime ?? null
  const lastOut =
    [...sorted].reverse().find((l) => l.logType === "OUT")?.logTime ?? null

  let breakMinutes = 0
  let openBreak: Date | null = null
  for (const l of sorted) {
    if (l.logType === "BREAK_IN") openBreak = l.logTime
    else if (l.logType === "BREAK_OUT" && openBreak) {
      breakMinutes += diffMin(openBreak, l.logTime)
      openBreak = null
    }
  }

  let workingMinutes = 0
  let overtimeMinutes = 0
  let lateMinutes = 0
  let status = "Absent"

  if (firstIn && lastOut && lastOut > firstIn) {
    workingMinutes = Math.max(0, diffMin(firstIn, lastOut) - breakMinutes)
    overtimeMinutes = Math.max(0, workingMinutes - POLICY.standardWorkMinutes)
    const start = scheduledStart(key)
    const grace = new Date(start.getTime() + POLICY.lateGraceMinutes * 60000)
    if (firstIn > grace) lateMinutes = diffMin(start, firstIn)
    if (workingMinutes < POLICY.halfDayMinutes) status = "HalfDay"
    else if (lateMinutes > 0) status = "Late"
    else status = "Present"
  } else if (firstIn && !lastOut) {
    status = "Incomplete"
    const start = scheduledStart(key)
    const grace = new Date(start.getTime() + POLICY.lateGraceMinutes * 60000)
    if (firstIn > grace) lateMinutes = diffMin(start, firstIn)
  }

  return {
    timeIn: firstIn,
    timeOut: lastOut,
    workingMinutes,
    overtimeMinutes,
    lateMinutes,
    breakMinutes,
    status,
  }
}

function at(base: Date, h: number, m: number) {
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

async function main() {
  console.log("Resetting data...")
  await prisma.attendance.deleteMany()
  await prisma.attendanceLog.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.supplier.deleteMany()
  await prisma.kioskConfig.deleteMany()

  await prisma.kioskConfig.create({
    data: {
      kioskName: "Main Gate Kiosk",
      slug: "main-gate-kiosk-a1b2",
      deviceName: "Gate-Terminal-01",
      location: "Site A - Main Entrance",
      qrCodeEnabled: true,
      pinEnabled: true,
      rfidEnabled: true,
    },
  })

  const supplierA = await prisma.supplier.create({
    data: {
      supplierCode: "SUP-A",
      supplierName: "Alpha Manpower Services",
      contactPerson: "Khalid Rahman",
      contactNum1: "+971-50-111-2222",
      email: "ops@alphamanpower.com",
      address: "Industrial Area 4, Sharjah",
    },
  })
  const supplierB = await prisma.supplier.create({
    data: {
      supplierCode: "SUP-B",
      supplierName: "BuildForce Contractors",
      contactPerson: "Maria Santos",
      contactNum1: "+971-50-333-4444",
      email: "hr@buildforce.com",
      address: "Al Quoz, Dubai",
    },
  })

  type Seed = {
    empCode: string
    fullName: string
    designation: string
    department: string
    hourRate: number
    supplierId: string | null
    rfid?: string
    pin?: string
  }

  const seeds: Seed[] = [
    { empCode: "EMP0001", fullName: "Ahmed Al Mansoori", designation: "Site Engineer", department: "Engineering", hourRate: 32, supplierId: null, rfid: "RF-1001", pin: "1234" },
    { empCode: "EMP0002", fullName: "Sara Ibrahim", designation: "HR Officer", department: "Human Resources", hourRate: 28, supplierId: null, rfid: "RF-1002" },
    { empCode: "EMP0003", fullName: "Daniel Okoro", designation: "Safety Officer", department: "HSE", hourRate: 26, supplierId: null },
    { empCode: "SUPA-01", fullName: "Ali Hassan", designation: "Mason", department: "Civil", hourRate: 14, supplierId: supplierA.id, rfid: "RF-2001" },
    { empCode: "SUPA-02", fullName: "Hassan Nawaz", designation: "Steel Fixer", department: "Civil", hourRate: 15, supplierId: supplierA.id },
    { empCode: "SUPA-03", fullName: "Ravi Kumar", designation: "Carpenter", department: "Civil", hourRate: 14, supplierId: supplierA.id },
    { empCode: "SUPA-04", fullName: "Imran Sheikh", designation: "Helper", department: "Civil", hourRate: 10, supplierId: supplierA.id },
    { empCode: "SUPB-01", fullName: "Jose Ramirez", designation: "Electrician", department: "MEP", hourRate: 18, supplierId: supplierB.id, rfid: "RF-3001" },
    { empCode: "SUPB-02", fullName: "Marcus Lee", designation: "Plumber", department: "MEP", hourRate: 17, supplierId: supplierB.id },
    { empCode: "SUPB-03", fullName: "Peter Mensah", designation: "HVAC Tech", department: "MEP", hourRate: 19, supplierId: supplierB.id },
    { empCode: "FRL-01", fullName: "Yusuf Demir", designation: "Surveyor (Freelance)", department: "Engineering", hourRate: 40, supplierId: null },
  ]

  const employees = []
  for (const s of seeds) {
    employees.push(
      await prisma.employee.create({ data: { ...s } }),
    )
  }

  console.log(`Created ${employees.length} employees. Generating 14 days of logs...`)

  const today = new Date()
  for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
    const base = new Date(today)
    base.setDate(base.getDate() - dayOffset)
    const isWeekend = base.getDay() === 5 || base.getDay() === 6
    const key = toKey(base)

    for (const emp of employees) {
      const rand = Math.random()
      if (isWeekend && rand < 0.7) continue
      if (rand < 0.08) continue

      const logs: { logTime: Date; logType: string }[] = []

      const late = rand > 0.82
      const inH = late ? 9 : 8
      const inM = late ? 25 + Math.floor(Math.random() * 30) : 45 + Math.floor(Math.random() * 20)
      const inTime = at(base, inH, Math.min(inM, 59))
      logs.push({ logTime: inTime, logType: "IN" })

      if (rand > 0.3) {
        logs.push({ logTime: at(base, 12, 30), logType: "BREAK_IN" })
        logs.push({ logTime: at(base, 13, 15), logType: "BREAK_OUT" })
      }

      const forgot = rand > 0.9 && !late
      if (!forgot) {
        const halfDay = rand < 0.12
        const overtime = rand > 0.6 && rand < 0.75
        const outH = halfDay ? 12 : overtime ? 19 : 17
        const outM = overtime ? 20 : 10 + Math.floor(Math.random() * 20)
        logs.push({ logTime: at(base, outH, outM), logType: "OUT" })
      }

      let lastLogId: string | null = null
      for (const l of logs) {
        const created = await prisma.attendanceLog.create({
          data: {
            employeeId: emp.id,
            logTime: l.logTime,
            logType: l.logType,
            deviceName: "Gate-Terminal-01",
            kioskId: "Main Gate Kiosk",
            ipAddress: "10.0.0.5",
          },
        })
        lastLogId = created.id
      }

      const c = compute(key, logs)
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          supplierId: emp.supplierId,
          date: key,
          timeIn: c.timeIn,
          timeOut: c.timeOut,
          workingMinutes: c.workingMinutes,
          overtimeMinutes: c.overtimeMinutes,
          lateMinutes: c.lateMinutes,
          breakMinutes: c.breakMinutes,
          status: c.status,
          createdFromLog: lastLogId,
        },
      })
    }
  }

  const totalLogs = await prisma.attendanceLog.count()
  const totalAtt = await prisma.attendance.count()
  console.log(`Done. ${totalLogs} logs, ${totalAtt} attendance rows.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
