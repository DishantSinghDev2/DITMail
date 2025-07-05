const next = require("next");
const express = require("express");
const { createServer } = require("http");
const { initializeWebSocket } = require("../lib/websocket");


const dev = process.env.NODE_ENV !== "production"
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const expressApp = express()
  const httpServer = createServer(expressApp)

  // Initialize WebSocket with your HTTP server
  initializeWebSocket(httpServer)

  const PORT = process.env.PORT || 3000
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready on http://localhost:${PORT}`)
  })
})
