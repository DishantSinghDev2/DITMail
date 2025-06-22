// Contact Management Routes
const express = require("express")
const redis = require("redis")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

// Get contacts
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, group, sortBy = "name", sortOrder = "asc" } = req.query

    const userEmail = req.user.email
    const offset = (page - 1) * limit
    const contacts = []

    // Get user's contacts
    const contactIds = await redisClient.sMembers(`user:${userEmail}:contacts`)

    for (const contactId of contactIds) {
      const contactData = await redisClient.hGetAll(`user:${userEmail}:contact:${contactId}`)
      if (contactData) {
        const contact = {
          id: contactId,
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          company: contactData.company,
          title: contactData.title,
          groups: contactData.groups ? JSON.parse(contactData.groups) : [],
          avatar: contactData.avatar,
          notes: contactData.notes,
          created: new Date(Number.parseInt(contactData.created || 0)),
          updated: contactData.updated ? new Date(Number.parseInt(contactData.updated)) : null,
        }

        // Apply filters
        if (search) {
          const searchLower = search.toLowerCase()
          if (
            !contact.name?.toLowerCase().includes(searchLower) &&
            !contact.email?.toLowerCase().includes(searchLower) &&
            !contact.company?.toLowerCase().includes(searchLower)
          ) {
            continue
          }
        }

        if (group && !contact.groups.includes(group)) {
          continue
        }

        contacts.push(contact)
      }
    }

    // Sort contacts
    contacts.sort((a, b) => {
      const aVal = a[sortBy] || ""
      const bVal = b[sortBy] || ""

      if (sortOrder === "desc") {
        return bVal.localeCompare(aVal)
      }
      return aVal.localeCompare(bVal)
    })

    // Paginate
    const paginatedContacts = contacts.slice(offset, offset + Number.parseInt(limit))

    res.json({
      contacts: paginatedContacts,
      pagination: {
        page: Number.parseInt(page),
        limit: Number.parseInt(limit),
        total: contacts.length,
        pages: Math.ceil(contacts.length / limit),
      },
    })
  } catch (error) {
    console.error("Get contacts error:", error)
    res.status(500).json({ error: "Failed to fetch contacts" })
  }
})

// Get specific contact
router.get("/:contactId", authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params
    const userEmail = req.user.email

    const contactData = await redisClient.hGetAll(`user:${userEmail}:contact:${contactId}`)

    if (!contactData || !contactData.name) {
      return res.status(404).json({ error: "Contact not found" })
    }

    const contact = {
      id: contactId,
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone,
      company: contactData.company,
      title: contactData.title,
      address: contactData.address ? JSON.parse(contactData.address) : null,
      groups: contactData.groups ? JSON.parse(contactData.groups) : [],
      avatar: contactData.avatar,
      notes: contactData.notes,
      customFields: contactData.custom_fields ? JSON.parse(contactData.custom_fields) : {},
      created: new Date(Number.parseInt(contactData.created || 0)),
      updated: contactData.updated ? new Date(Number.parseInt(contactData.updated)) : null,
    }

    res.json(contact)
  } catch (error) {
    console.error("Get contact error:", error)
    res.status(500).json({ error: "Failed to fetch contact" })
  }
})

// Create contact
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, company, title, address, groups = [], avatar, notes, customFields = {} } = req.body

    if (!name && !email) {
      return res.status(400).json({ error: "Name or email required" })
    }

    const userEmail = req.user.email
    const contactId = require("crypto").randomUUID()

    // Check if contact with same email already exists
    if (email) {
      const existingContacts = await redisClient.sMembers(`user:${userEmail}:contacts`)
      for (const existingId of existingContacts) {
        const existingData = await redisClient.hGet(`user:${userEmail}:contact:${existingId}`, "email")
        if (existingData === email) {
          return res.status(409).json({ error: "Contact with this email already exists" })
        }
      }
    }

    // Create contact
    const contactData = {
      id: contactId,
      name: name || "",
      email: email || "",
      phone: phone || "",
      company: company || "",
      title: title || "",
      address: address ? JSON.stringify(address) : "",
      groups: JSON.stringify(groups),
      avatar: avatar || "",
      notes: notes || "",
      custom_fields: JSON.stringify(customFields),
      created: Date.now(),
    }

    await redisClient.hSet(`user:${userEmail}:contact:${contactId}`, contactData)
    await redisClient.sAdd(`user:${userEmail}:contacts`, contactId)

    // Add to groups
    for (const group of groups) {
      await redisClient.sAdd(`user:${userEmail}:group:${group}:contacts`, contactId)
    }

    res.status(201).json({
      message: "Contact created successfully",
      contactId,
      contact: {
        id: contactId,
        name: name || "",
        email: email || "",
        phone: phone || "",
        company: company || "",
      },
    })
  } catch (error) {
    console.error("Create contact error:", error)
    res.status(500).json({ error: "Failed to create contact" })
  }
})

// Update contact
router.put("/:contactId", authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params
    const userEmail = req.user.email

    // Check if contact exists
    const exists = await redisClient.sIsMember(`user:${userEmail}:contacts`, contactId)
    if (!exists) {
      return res.status(404).json({ error: "Contact not found" })
    }

    const { name, email, phone, company, title, address, groups, avatar, notes, customFields } = req.body

    const updateData = { updated: Date.now() }

    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email
    if (phone !== undefined) updateData.phone = phone
    if (company !== undefined) updateData.company = company
    if (title !== undefined) updateData.title = title
    if (address !== undefined) updateData.address = JSON.stringify(address)
    if (groups !== undefined) updateData.groups = JSON.stringify(groups)
    if (avatar !== undefined) updateData.avatar = avatar
    if (notes !== undefined) updateData.notes = notes
    if (customFields !== undefined) updateData.custom_fields = JSON.stringify(customFields)

    await redisClient.hSet(`user:${userEmail}:contact:${contactId}`, updateData)

    // Update group memberships if groups changed
    if (groups !== undefined) {
      // Remove from all groups first
      const allGroups = await redisClient.sMembers(`user:${userEmail}:groups`)
      for (const group of allGroups) {
        await redisClient.sRem(`user:${userEmail}:group:${group}:contacts`, contactId)
      }

      // Add to new groups
      for (const group of groups) {
        await redisClient.sAdd(`user:${userEmail}:group:${group}:contacts`, contactId)
      }
    }

    res.json({ message: "Contact updated successfully" })
  } catch (error) {
    console.error("Update contact error:", error)
    res.status(500).json({ error: "Failed to update contact" })
  }
})

// Delete contact
router.delete("/:contactId", authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params
    const userEmail = req.user.email

    // Check if contact exists
    const exists = await redisClient.sIsMember(`user:${userEmail}:contacts`, contactId)
    if (!exists) {
      return res.status(404).json({ error: "Contact not found" })
    }

    // Get contact groups before deletion
    const contactData = await redisClient.hGet(`user:${userEmail}:contact:${contactId}`, "groups")
    const groups = contactData ? JSON.parse(contactData) : []

    // Remove from groups
    for (const group of groups) {
      await redisClient.sRem(`user:${userEmail}:group:${group}:contacts`, contactId)
    }

    // Delete contact
    await redisClient.del(`user:${userEmail}:contact:${contactId}`)
    await redisClient.sRem(`user:${userEmail}:contacts`, contactId)

    res.json({ message: "Contact deleted successfully" })
  } catch (error) {
    console.error("Delete contact error:", error)
    res.status(500).json({ error: "Failed to delete contact" })
  }
})

// Get contact groups
router.get("/groups/list", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email
    const groups = []

    const groupNames = await redisClient.sMembers(`user:${userEmail}:groups`)

    for (const groupName of groupNames) {
      const contactCount = await redisClient.sCard(`user:${userEmail}:group:${groupName}:contacts`)
      const groupData = await redisClient.hGetAll(`user:${userEmail}:group:${groupName}`)

      groups.push({
        name: groupName,
        displayName: groupData.display_name || groupName,
        description: groupData.description || "",
        contactCount,
        color: groupData.color || "#3B82F6",
        created: new Date(Number.parseInt(groupData.created || 0)),
      })
    }

    res.json(groups)
  } catch (error) {
    console.error("Get groups error:", error)
    res.status(500).json({ error: "Failed to fetch groups" })
  }
})

// Create contact group
router.post("/groups", authenticateToken, async (req, res) => {
  try {
    const { name, displayName, description, color = "#3B82F6" } = req.body
    const userEmail = req.user.email

    if (!name) {
      return res.status(400).json({ error: "Group name required" })
    }

    // Check if group already exists
    const exists = await redisClient.sIsMember(`user:${userEmail}:groups`, name)
    if (exists) {
      return res.status(409).json({ error: "Group already exists" })
    }

    // Create group
    await redisClient.sAdd(`user:${userEmail}:groups`, name)
    await redisClient.hSet(`user:${userEmail}:group:${name}`, {
      name,
      display_name: displayName || name,
      description: description || "",
      color,
      created: Date.now(),
    })

    res.status(201).json({
      message: "Group created successfully",
      group: {
        name,
        displayName: displayName || name,
        description: description || "",
        color,
      },
    })
  } catch (error) {
    console.error("Create group error:", error)
    res.status(500).json({ error: "Failed to create group" })
  }
})

// Import contacts
router.post("/import", authenticateToken, async (req, res) => {
  try {
    const { contacts, format = "json", overwrite = false } = req.body

    if (!contacts || !Array.isArray(contacts)) {
      return res.status(400).json({ error: "Contacts array required" })
    }

    const userEmail = req.user.email
    const results = {
      imported: 0,
      skipped: 0,
      errors: [],
    }

    for (const contactData of contacts) {
      try {
        const { name, email, phone, company, title } = contactData

        if (!name && !email) {
          results.errors.push({ contact: contactData, error: "Name or email required" })
          continue
        }

        // Check for duplicates
        if (email && !overwrite) {
          const existingContacts = await redisClient.sMembers(`user:${userEmail}:contacts`)
          let duplicate = false

          for (const existingId of existingContacts) {
            const existingEmail = await redisClient.hGet(`user:${userEmail}:contact:${existingId}`, "email")
            if (existingEmail === email) {
              duplicate = true
              break
            }
          }

          if (duplicate) {
            results.skipped++
            continue
          }
        }

        // Create contact
        const contactId = require("crypto").randomUUID()

        await redisClient.hSet(`user:${userEmail}:contact:${contactId}`, {
          id: contactId,
          name: name || "",
          email: email || "",
          phone: phone || "",
          company: company || "",
          title: title || "",
          created: Date.now(),
          imported: "true",
        })

        await redisClient.sAdd(`user:${userEmail}:contacts`, contactId)
        results.imported++
      } catch (error) {
        results.errors.push({ contact: contactData, error: error.message })
      }
    }

    res.json({
      message: "Import completed",
      results,
    })
  } catch (error) {
    console.error("Import contacts error:", error)
    res.status(500).json({ error: "Failed to import contacts" })
  }
})

// Export contacts
router.get("/export", authenticateToken, async (req, res) => {
  try {
    const { format = "json", group } = req.query
    const userEmail = req.user.email

    let contactIds
    if (group) {
      contactIds = await redisClient.sMembers(`user:${userEmail}:group:${group}:contacts`)
    } else {
      contactIds = await redisClient.sMembers(`user:${userEmail}:contacts`)
    }

    const contacts = []
    for (const contactId of contactIds) {
      const contactData = await redisClient.hGetAll(`user:${userEmail}:contact:${contactId}`)
      if (contactData) {
        contacts.push({
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone,
          company: contactData.company,
          title: contactData.title,
          notes: contactData.notes,
        })
      }
    }

    if (format === "csv") {
      // Convert to CSV
      const csv = [
        "Name,Email,Phone,Company,Title,Notes",
        ...contacts.map((c) => `"${c.name}","${c.email}","${c.phone}","${c.company}","${c.title}","${c.notes}"`),
      ].join("\n")

      res.setHeader("Content-Type", "text/csv")
      res.setHeader("Content-Disposition", "attachment; filename=contacts.csv")
      res.send(csv)
    } else {
      res.json(contacts)
    }
  } catch (error) {
    console.error("Export contacts error:", error)
    res.status(500).json({ error: "Failed to export contacts" })
  }
})

module.exports = router
