import 'dotenv/config'
import { connectDB } from './db'
import app from './app'

const PORT = process.env.PORT ?? 3002

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))

connectDB().catch(err => console.error('MongoDB connection failed:', err.message))

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason)
})
