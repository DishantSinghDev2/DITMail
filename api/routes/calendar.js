// Calendar Management Routes
const express = require("express")
const redis = require("redis")
const { authenticateToken } = require("../middleware/auth")

const router = express.Router()

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  db: process.env.REDIS_DB || 0,
})

// Get calendars
router.get("/calendars", authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email
    const calendars = []

    // Get user's calendars
    const calendarIds = await redisClient.sMembers(`user:${userEmail}:calendars`)

    for (const calendarId of calendarIds) {
      const calendarData = await redisClient.hGetAll(`user:${userEmail}:calendar:${calendarId}`)
      if (calendarData) {
        calendars.push({
          id: calendarId,
          name: calendarData.name,
          description: calendarData.description,
          color: calendarData.color || "#3B82F6",
          timezone: calendarData.timezone || "UTC",
          isDefault: calendarData.is_default === "true",
          isPublic: calendarData.is_public === "true",
          created: new Date(Number.parseInt(calendarData.created || 0)),
        })
      }
    }

    // Add default calendar if none exist
    if (calendars.length === 0) {
      const defaultCalendarId = require("crypto").randomUUID()

      await redisClient.hSet(`user:${userEmail}:calendar:${defaultCalendarId}`, {
        id: defaultCalendarId,
        name: "My Calendar",
        description: "Default calendar",
        color: "#3B82F6",
        timezone: "UTC",
        is_default: "true",
        is_public: "false",
        created: Date.now(),
      })

      await redisClient.sAdd(`user:${userEmail}:calendars`, defaultCalendarId)

      calendars.push({
        id: defaultCalendarId,
        name: "My Calendar",
        description: "Default calendar",
        color: "#3B82F6",
        timezone: "UTC",
        isDefault: true,
        isPublic: false,
        created: new Date(),
      })
    }

    res.json(calendars)
  } catch (error) {
    console.error("Get calendars error:", error)
    res.status(500).json({ error: "Failed to fetch calendars" })
  }
})

// Create calendar
router.post("/calendars", authenticateToken, async (req, res) => {
  try {
    const { name, description = "", color = "#3B82F6", timezone = "UTC", isPublic = false } = req.body

    if (!name) {
      return res.status(400).json({ error: "Calendar name required" })
    }

    const userEmail = req.user.email
    const calendarId = require("crypto").randomUUID()

    await redisClient.hSet(`user:${userEmail}:calendar:${calendarId}`, {
      id: calendarId,
      name,
      description,
      color,
      timezone,
      is_default: "false",
      is_public: isPublic.toString(),
      created: Date.now(),
    })

    await redisClient.sAdd(`user:${userEmail}:calendars`, calendarId)

    res.status(201).json({
      message: "Calendar created successfully",
      calendar: {
        id: calendarId,
        name,
        description,
        color,
        timezone,
        isDefault: false,
        isPublic,
      },
    })
  } catch (error) {
    console.error("Create calendar error:", error)
    res.status(500).json({ error: "Failed to create calendar" })
  }
})

// Get events
router.get("/events", authenticateToken, async (req, res) => {
  try {
    const { calendarId, start, end, view = "month" } = req.query

    const userEmail = req.user.email
    let events = []

    if (calendarId) {
      // Get events for specific calendar
      const eventIds = await redisClient.sMembers(`user:${userEmail}:calendar:${calendarId}:events`)

      for (const eventId of eventIds) {
        const eventData = await redisClient.hGetAll(`user:${userEmail}:event:${eventId}`)
        if (eventData) {
          events.push(formatEvent(eventData))
        }
      }
    } else {
      // Get events from all calendars
      const calendarIds = await redisClient.sMembers(`user:${userEmail}:calendars`)

      for (const calId of calendarIds) {
        const eventIds = await redisClient.sMembers(`user:${userEmail}:calendar:${calId}:events`)

        for (const eventId of eventIds) {
          const eventData = await redisClient.hGetAll(`user:${userEmail}:event:${eventId}`)
          if (eventData) {
            events.push(formatEvent(eventData))
          }
        }
      }
    }

    // Filter by date range if provided
    if (start || end) {
      const startDate = start ? new Date(start) : null
      const endDate = end ? new Date(end) : null

      events = events.filter((event) => {
        const eventStart = new Date(event.start)
        const eventEnd = new Date(event.end)

        if (startDate && eventEnd < startDate) return false
        if (endDate && eventStart > endDate) return false
        return true
      })
    }

    // Sort by start time
    events.sort((a, b) => new Date(a.start) - new Date(b.start))

    res.json(events)
  } catch (error) {
    console.error("Get events error:", error)
    res.status(500).json({ error: "Failed to fetch events" })
  }
})

// Create event
router.post("/events", authenticateToken, async (req, res) => {
  try {
    const {
      calendarId,
      title,
      description = "",
      start,
      end,
      allDay = false,
      location = "",
      attendees = [],
      reminders = [],
      recurrence,
      visibility = "private",
    } = req.body

    if (!calendarId || !title || !start) {
      return res.status(400).json({ error: "Calendar ID, title, and start time required" })
    }

    const userEmail = req.user.email
    const eventId = require("crypto").randomUUID()

    // Validate calendar ownership
    const calendarExists = await redisClient.sIsMember(`user:${userEmail}:calendars`, calendarId)
    if (!calendarExists) {
      return res.status(404).json({ error: "Calendar not found" })
    }

    const eventData = {
      id: eventId,
      calendar_id: calendarId,
      title,
      description,
      start: new Date(start).toISOString(),
      end: end ? new Date(end).toISOString() : new Date(start).toISOString(),
      all_day: allDay.toString(),
      location,
      attendees: JSON.stringify(attendees),
      reminders: JSON.stringify(reminders),
      recurrence: recurrence ? JSON.stringify(recurrence) : "",
      visibility,
      status: "confirmed",
      created: Date.now(),
      updated: Date.now(),
    }

    await redisClient.hSet(`user:${userEmail}:event:${eventId}`, eventData)
    await redisClient.sAdd(`user:${userEmail}:calendar:${calendarId}:events`, eventId)

    // Send invitations if attendees specified
    if (attendees.length > 0) {
      // TODO: Implement email invitations
    }

    res.status(201).json({
      message: "Event created successfully",
      event: formatEvent(eventData),
    })
  } catch (error) {
    console.error("Create event error:", error)
    res.status(500).json({ error: "Failed to create event" })
  }
})

// Update event
router.put("/events/:eventId", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params
    const userEmail = req.user.email

    // Check if event exists
    const eventData = await redisClient.hGetAll(`user:${userEmail}:event:${eventId}`)
    if (!eventData || !eventData.id) {
      return res.status(404).json({ error: "Event not found" })
    }

    const { title, description, start, end, allDay, location, attendees, reminders, recurrence, visibility, status } =
      req.body

    const updateData = { updated: Date.now() }

    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (start !== undefined) updateData.start = new Date(start).toISOString()
    if (end !== undefined) updateData.end = new Date(end).toISOString()
    if (allDay !== undefined) updateData.all_day = allDay.toString()
    if (location !== undefined) updateData.location = location
    if (attendees !== undefined) updateData.attendees = JSON.stringify(attendees)
    if (reminders !== undefined) updateData.reminders = JSON.stringify(reminders)
    if (recurrence !== undefined) updateData.recurrence = JSON.stringify(recurrence)
    if (visibility !== undefined) updateData.visibility = visibility
    if (status !== undefined) updateData.status = status

    await redisClient.hSet(`user:${userEmail}:event:${eventId}`, updateData)

    res.json({ message: "Event updated successfully" })
  } catch (error) {
    console.error("Update event error:", error)
    res.status(500).json({ error: "Failed to update event" })
  }
})

// Delete event
router.delete("/events/:eventId", authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params
    const userEmail = req.user.email

    // Get event data before deletion
    const eventData = await redisClient.hGetAll(`user:${userEmail}:event:${eventId}`)
    if (!eventData || !eventData.id) {
      return res.status(404).json({ error: "Event not found" })
    }

    const calendarId = eventData.calendar_id

    // Remove event from calendar
    await redisClient.sRem(`user:${userEmail}:calendar:${calendarId}:events`, eventId)

    // Delete event
    await redisClient.del(`user:${userEmail}:event:${eventId}`)

    res.json({ message: "Event deleted successfully" })
  } catch (error) {
    console.error("Delete event error:", error)
    res.status(500).json({ error: "Failed to delete event" })
  }
})

// Get availability
router.get("/availability", authenticateToken, async (req, res) => {
  try {
    const { start, end, duration = 30 } = req.query

    if (!start || !end) {
      return res.status(400).json({ error: "Start and end time required" })
    }

    const userEmail = req.user.email
    const startDate = new Date(start)
    const endDate = new Date(end)
    const durationMs = Number.parseInt(duration) * 60 * 1000

    // Get all events in the time range
    const calendarIds = await redisClient.sMembers(`user:${userEmail}:calendars`)
    const busySlots = []

    for (const calendarId of calendarIds) {
      const eventIds = await redisClient.sMembers(`user:${userEmail}:calendar:${calendarId}:events`)

      for (const eventId of eventIds) {
        const eventData = await redisClient.hGetAll(`user:${userEmail}:event:${eventId}`)
        if (eventData) {
          const eventStart = new Date(eventData.start)
          const eventEnd = new Date(eventData.end)

          // Check if event overlaps with requested range
          if (eventStart < endDate && eventEnd > startDate) {
            busySlots.push({
              start: eventStart.toISOString(),
              end: eventEnd.toISOString(),
              title: eventData.title,
            })
          }
        }
      }
    }

    // Calculate free slots
    const freeSlots = []
    let currentTime = new Date(startDate)

    while (currentTime < endDate) {
      const slotEnd = new Date(currentTime.getTime() + durationMs)

      // Check if this slot conflicts with any busy slot
      const hasConflict = busySlots.some((busy) => {
        const busyStart = new Date(busy.start)
        const busyEnd = new Date(busy.end)
        return currentTime < busyEnd && slotEnd > busyStart
      })

      if (!hasConflict) {
        freeSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
        })
      }

      currentTime = new Date(currentTime.getTime() + durationMs)
    }

    res.json({
      period: { start, end },
      duration: Number.parseInt(duration),
      busySlots,
      freeSlots,
    })
  } catch (error) {
    console.error("Get availability error:", error)
    res.status(500).json({ error: "Failed to get availability" })
  }
})

// Helper function to format event data
function formatEvent(eventData) {
  return {
    id: eventData.id,
    calendarId: eventData.calendar_id,
    title: eventData.title,
    description: eventData.description,
    start: eventData.start,
    end: eventData.end,
    allDay: eventData.all_day === "true",
    location: eventData.location,
    attendees: eventData.attendees ? JSON.parse(eventData.attendees) : [],
    reminders: eventData.reminders ? JSON.parse(eventData.reminders) : [],
    recurrence: eventData.recurrence ? JSON.parse(eventData.recurrence) : null,
    visibility: eventData.visibility,
    status: eventData.status,
    created: new Date(Number.parseInt(eventData.created || 0)),
    updated: new Date(Number.parseInt(eventData.updated || 0)),
  }
}

module.exports = router
