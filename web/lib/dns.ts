import { exec } from "child_process"
import { promisify } from "util"
import dns from "dns"
import { logInfo, logError } from "./logger"

const execAsync = promisify(exec)

export async function generateDKIMKeys() {
  try {
    // Try modern OpenSSL first
    let { stdout: privateKey } = await execAsync(
      "openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 2>/dev/null",
    )

    // If that failed, fallback to legacy genrsa
    if (!privateKey.trim()) {
      const result = await execAsync("openssl genrsa 2048 2>/dev/null")
      privateKey = result.stdout
    }

    const { stdout: publicKeyRaw } = await execAsync(
      `echo "${privateKey}" | openssl rsa -pubout 2>/dev/null | grep -v "BEGIN\\|END" | tr -d "\\n"`,
    )

    return {
      privateKey: privateKey.trim(),
      publicKey: publicKeyRaw.trim(),
    }
  } catch (error) {
    logError(error as Error, { context: "DKIM key generation" })
    throw new Error("Failed to generate DKIM keys")
  }
}

export async function verifyDNSRecords(domain: string, verificationCode: string) {
  const results: {
    txt: boolean,
      mx: boolean,
      spf: boolean,
      dkim: boolean,
      dmarc: boolean,
      details: {
        txt?: string[], // Added TXT record for verification
        mx: string[],
        spf: string[],
        dkim: string[],
        dmarc: string[],
      },
    } = {
    txt: false,
      mx: false,
      spf: false,
      dkim: false,
      dmarc: false,
      details: {
        txt: [],
        mx: [],
        spf: [],
        dkim: [],
        dmarc: [],
      },
    }

  try {
    logInfo("Starting DNS verification", { domain })

    // Verify domain ownership with TXT record (ditmail-verification)
    try {
      const txtRecords = await dns.promises.resolveTxt(domain)
      const verificationRecord = txtRecords.find((record) =>
        record.join("").includes(`ditmail-verification=${verificationCode}`),
      )

      results.txt = !!verificationRecord
      results.details.txt = txtRecords.map((r) => r.join(""))

      if (results.txt) {
        logInfo("Domain ownership verified", { domain })
      } else {
        logInfo("Domain ownership not verified", { domain })
      }
    } catch (error) {
      logError(error as Error, { context: "TXT record lookup", domain })
    }

    // Check MX record
    try {
      const mxRecords = await dns.promises.resolveMx(domain)
      results.details.mx = mxRecords.map((r) => `${r.priority} ${r.exchange}`)
      results.mx = mxRecords.some(
        (record) => record.exchange.includes("mx.ditmail.online") || record.exchange.includes("ditmail.online"),
      )
      logInfo("MX records found", { domain, records: results.details.mx })
    } catch (error) {
      logError(error as Error, { context: "MX record lookup", domain })
    }

    // Check SPF record
    try {
      const txtRecords = await dns.promises.resolveTxt(domain)
      const spfRecords = txtRecords.filter((record) => record.join("").includes("v=spf1"))
      results.details.spf = spfRecords.map((r) => r.join(""))

      results.spf = spfRecords.some((record) => {
        const spfString = record.join("")
        return (
          spfString.includes("include:smtp.ditmail.online") ||
          spfString.includes("include:ditmail.online") ||
          spfString.includes("mx")
        )
      })
      logInfo("SPF records found", { domain, records: results.details.spf })
    } catch (error) {
      logError(error as Error, { context: "SPF record lookup", domain })
    }

    // Check DKIM record
    try {
      const dkimRecords = await dns.promises.resolveTxt(`default._domainkey.${domain}`)
      results.details.dkim = dkimRecords.map((r) => r.join(""))
      results.dkim = dkimRecords.some(
        (record) => record.join("").includes("v=DKIM1") && record.join("").includes("k=rsa"),
      )
      logInfo("DKIM records found", { domain, records: results.details.dkim })
    } catch (error) {
      logError(error as Error, { context: "DKIM record lookup", domain })
    }

    // Check DMARC record
    try {
      const dmarcRecords = await dns.promises.resolveTxt(`_dmarc.${domain}`)
      results.details.dmarc = dmarcRecords.map((r) => r.join(""))
      results.dmarc = dmarcRecords.some((record) => record.join("").includes("v=DMARC1"))
      logInfo("DMARC records found", { domain, records: results.details.dmarc })
    } catch (error) {
      logError(error as Error, { context: "DMARC record lookup", domain })
    }

    logInfo("DNS verification completed", { domain, results })
  } catch (error) {
    logError(error as Error, { context: "DNS verification", domain })
  }

  return results
}

export async function verifyDomainOwnership(domain: string, verificationCode: string) {
  try {
    const txtRecords = await dns.promises.resolveTxt(domain)
    const verificationRecord = txtRecords.find((record) =>
      record.join("").includes(`ditmail-verification=${verificationCode}`),
    )

    return !!verificationRecord
  } catch (error) {
    logError(error as Error, { context: "Domain ownership verification", domain })
    return false
  }
}
