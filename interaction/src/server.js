import { dirname, join } from 'path'

import express from 'express'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const port = 3000

app.use(express.static(join(__dirname, '../public')))

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'))
})

const server = app.listen(port, () => {
  console.log(`servidor corriendo en http://localhost:${port}`)
})
