import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  const email = args.find((a) => !a.startsWith("-"))
  const revoke = args.includes("--revoke")

  if (!email) {
    console.error("Usage: tsx scripts/make-admin.ts <email> [--revoke]")
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.error(`No user found with email: ${email}`)
    process.exit(1)
  }

  const role = revoke ? "user" : "admin"
  await prisma.user.update({
    where: { id: user.id },
    data: { role },
  })

  console.log(`Set role="${role}" for ${email} (${user.id})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
