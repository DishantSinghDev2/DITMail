import express from "express"
import { createServer } from "http"
import { initializeWebSocket } from "./lib/websocket"

const app = express()
const server = createServer(app)

initializeWebSocket(server)

const PORT = process.env.WS_PORT || 4000
server.listen(PORT, () => {
  console.log(`✅ WebSocket server running at http://localhost:${PORT}`)
})
