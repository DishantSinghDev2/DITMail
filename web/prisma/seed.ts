import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Create plans
  const basicPlan = await prisma.plan.upsert({
    where: { name: "Basic" },
    update: {},
    create: {
      name: "Basic",
      description: "Perfect for small teams and startups",
      price: 3,
      yearlyPrice: 30, // 17% discount
      currency: "USD",
      trialDays: 7,
      features: {
        users: 5,
        domains: 1,
        storage: "5GB",
        emailAccounts: 5,
        support: "Email",
        features: ["Custom domain email", "IMAP/POP3 access", "Mobile apps", "Basic support"],
      },
      limits: {
        maxUsers: 5,
        maxDomains: 1,
        maxStorage: 5368709120, // 5GB in bytes
        maxEmailAccounts: 5,
        maxAttachmentSize: 25165824, // 25MB
      },
      sortOrder: 1,
    },
  })

  const professionalPlan = await prisma.plan.upsert({
    where: { name: "Professional" },
    update: {},
    create: {
      name: "Professional",
      description: "Ideal for growing businesses",
      price: 6,
      yearlyPrice: 60, // 17% discount
      currency: "USD",
      trialDays: 7,
      features: {
        users: 25,
        domains: 5,
        storage: "50GB",
        emailAccounts: 25,
        support: "Priority Email",
        features: [
          "Everything in Basic",
          "Multiple domains",
          "Advanced security",
          "Calendar integration",
          "Contact management",
          "Priority support",
        ],
      },
      limits: {
        maxUsers: 25,
        maxDomains: 5,
        maxStorage: 53687091200, // 50GB in bytes
        maxEmailAccounts: 25,
        maxAttachmentSize: 104857600, // 100MB
      },
      sortOrder: 2,
    },
  })

  const enterprisePlan = await prisma.plan.upsert({
    where: { name: "Enterprise" },
    update: {},
    create: {
      name: "Enterprise",
      description: "For large organizations with advanced needs",
      price: 12,
      yearlyPrice: 120, // 17% discount
      currency: "USD",
      trialDays: 7,
      features: {
        users: "Unlimited",
        domains: "Unlimited",
        storage: "1TB",
        emailAccounts: "Unlimited",
        support: "24/7 Phone & Email",
        features: [
          "Everything in Professional",
          "Unlimited users & domains",
          "Advanced admin controls",
          "API access",
          "SSO integration",
          "Dedicated support",
          "Custom integrations",
        ],
      },
      limits: {
        maxUsers: -1, // -1 means unlimited
        maxDomains: -1,
        maxStorage: 1099511627776, // 1TB in bytes
        maxEmailAccounts: -1,
        maxAttachmentSize: 1073741824, // 1GB
      },
      sortOrder: 3,
    },
  })

  // Create system settings
  await prisma.systemSetting.upsert({
    where: { key: "smtp_host" },
    update: {},
    create: {
      key: "smtp_host",
      value: "mail.freecustom.email",
      description: "SMTP server hostname",
      isPublic: true,
    },
  })

  await prisma.systemSetting.upsert({
    where: { key: "imap_host" },
    update: {},
    create: {
      key: "imap_host",
      value: "mail.freecustom.email",
      description: "IMAP server hostname",
      isPublic: true,
    },
  })

  await prisma.systemSetting.upsert({
    where: { key: "pop3_host" },
    update: {},
    create: {
      key: "pop3_host",
      value: "mail.freecustom.email",
      description: "POP3 server hostname",
      isPublic: true,
    },
  })

  // Create super admin user
  const hashedPassword = await bcrypt.hash("admin123", 12)

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@freecustom.email" },
    update: {},
    create: {
      email: "admin@freecustom.email",
      name: "System Administrator",
      password: hashedPassword,
      role: "SUPER_ADMIN",
      emailVerified: new Date(),
      isActive: true,
    },
  })

  console.log("✅ Database seeded successfully!")
  console.log("📊 Created plans:", {
    basicPlan: basicPlan.id,
    professionalPlan: professionalPlan.id,
    enterprisePlan: enterprisePlan.id,
  })
  console.log("👤 Admin user:", adminUser.email)
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
