import { dirname, join } from 'path'

import OSC from 'osc-js'
import { Server } from 'socket.io'
import express from 'express'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const port = 3000
const io = new Server()

// configurar osc
const osc = new OSC({
  plugin: new OSC.BridgePlugin({
    udpServer: {
      host: 'localhost',
      port: 12345, // puerto que usa pose_detector.py
      exclusive: false,
    },
    udpClient: {
      host: 'localhost',
      port: 12345,
    },
  }),
})

osc.on('*', (message) => {
  // enviar al cliente
  io.emit('osc', message)
})

osc.on('open', () => {
  console.log('osc abierto en puerto 12345 - esperando mensajes de pose_detector.py')
})

osc.open()

app.use(express.static(join(__dirname, '../public')))

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'))
})

const server = app.listen(port, () => {
  console.log(`servidor corriendo en http://localhost:${port}`)
})

io.attach(server)

// manejar conexiones de socket
io.on('connection', (socket) => {
  console.log('cliente conectado')

  socket.on('disconnect', () => {
    console.log('cliente desconectado')
  })
})
