import next from "next"
import express from "express"
import { createServer } from "http"
import { initializeWebSocket } from "@/lib/websocket" // Your file

const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const expressApp = express()
  const httpServer = createServer(expressApp)

  // Initialize WebSocket with your HTTP server
  initializeWebSocket(httpServer)

  // Handle all other Next.js routes
  expressApp.all("*", (req, res) => handle(req, res))

  const PORT = process.env.PORT || 3000
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready on http://localhost:${PORT}`)
  })
})
