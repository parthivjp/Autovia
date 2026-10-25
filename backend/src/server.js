import 'dotenv/config'
import { createApp } from './app.js'
import { connectDatabase } from './config/database.js'

const port = Number(process.env.PORT) || 4000

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in backend/.env.')
}

await connectDatabase()

const app = createApp()
app.listen(port, () => {
  console.log(`Autovia API listening at http://localhost:${port}`)
})
