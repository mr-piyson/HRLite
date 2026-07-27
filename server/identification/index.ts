import { employeeRepository } from "@/server/repositories"
import { IdentificationMethod } from "@/server/domain/attendance"
import type { Prisma } from "@prisma/client"

type EmployeeWithSupplier = Prisma.EmployeeGetPayload<{
  include: { supplier: true }
}>

export interface IdentificationRequest {
  method: IdentificationMethod
  value: string
  pin?: string
}

export interface IdentificationStrategy {
  readonly method: IdentificationMethod
  resolve(req: IdentificationRequest): Promise<EmployeeWithSupplier | null>
}

function extractCode(value: string): string {
  const trimmed = value.trim()
  const parts = trimmed.split(/[:|;,\s]/).filter(Boolean)
  return (parts[parts.length - 1] ?? trimmed).toUpperCase()
}

class CodeStrategy implements IdentificationStrategy {
  readonly method = IdentificationMethod.CODE
  resolve(req: IdentificationRequest) {
    return employeeRepository.getByCode(req.value.trim().toUpperCase())
  }
}

class QrStrategy implements IdentificationStrategy {
  readonly method = IdentificationMethod.QR
  resolve(req: IdentificationRequest) {
    return employeeRepository.getByCode(extractCode(req.value))
  }
}

class BarcodeStrategy implements IdentificationStrategy {
  readonly method = IdentificationMethod.BARCODE
  resolve(req: IdentificationRequest) {
    return employeeRepository.getByCode(extractCode(req.value))
  }
}

class RfidStrategy implements IdentificationStrategy {
  readonly method = IdentificationMethod.RFID
  resolve(req: IdentificationRequest) {
    return employeeRepository.getByRfid(req.value.trim())
  }
}

class PinStrategy implements IdentificationStrategy {
  readonly method = IdentificationMethod.PIN
  async resolve(req: IdentificationRequest) {
    const employee = await employeeRepository.getByCode(
      req.value.trim().toUpperCase(),
    )
    if (!employee) return null
    if (employee.pin && employee.pin !== req.pin) return null
    return employee
  }
}

const registry = new Map<IdentificationMethod, IdentificationStrategy>()
for (const s of [
  new CodeStrategy(),
  new QrStrategy(),
  new BarcodeStrategy(),
  new RfidStrategy(),
  new PinStrategy(),
]) {
  registry.set(s.method, s)
}

export function registerStrategy(strategy: IdentificationStrategy) {
  registry.set(strategy.method, strategy)
}

export function getStrategy(
  method: IdentificationMethod,
): IdentificationStrategy {
  const s = registry.get(method)
  if (!s) throw new Error(`No identification strategy registered for ${method}`)
  return s
}
