import connectDB from "../lib/db.js"
import Domain from "../models/Domain.js"
import { verifyDNSRecords } from "../lib/dns.js"

async function verifyAllDomains() {
  try {
    await connectDB()

    const pendingDomains = await Domain.find({ status: { $ne: "verified" } })

    console.log(`Checking ${pendingDomains.length} domains...`)

    for (const domain of pendingDomains) {
      try {
        const verification = await verifyDNSRecords(domain.domain)

        const updates = {
          mx_verified: verification.mx,
          spf_verified: verification.spf,
          dkim_verified: verification.dkim,
          dmarc_verified: verification.dmarc,
          status:
            verification.mx && verification.spf && verification.dkim && verification.dmarc ? "verified" : "pending",
        }

        await Domain.findByIdAndUpdate(domain._id, updates)

        console.log(`Updated ${domain.domain}: ${updates.status}`)
      } catch (error) {
        console.error(`Error verifying ${domain.domain}:`, error)
      }
    }

    console.log("Domain verification complete")
  } catch (error) {
    console.error("Domain verification script error:", error)
  }
}

// Run verification
verifyAllDomains()
