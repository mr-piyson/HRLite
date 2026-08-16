import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const setting = await prisma.appSetting.upsert({
    where: { id: "default" },
    create: { id: "default", defaultCurrency: "BHD" },
    update: { defaultCurrency: "BHD" },
  })
  console.log(`defaultCurrency set to ${setting.defaultCurrency}`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
