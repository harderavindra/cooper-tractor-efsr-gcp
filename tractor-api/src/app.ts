import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import mongoose from 'mongoose'
import { errorHandler, requestLogger } from './middleware/errorHandler'

import authRouter             from './routes/auth'
import meRouter                from './routes/me'
import usersRouter            from './routes/users'
import regionsRouter           from './routes/regions'
import areasRouter             from './routes/areas'
import locationMasterRouter    from './routes/locationMaster'
import partsRouter             from './routes/parts'
import laborChargesRouter      from './routes/laborCharges'
import customersRouter         from './routes/customers'
import tractorAssetsRouter     from './routes/tractorAssets'
import sapTractorAssetsRouter  from './routes/sapTractorAssets'
import pdiEntriesRouter        from './routes/pdiEntries'
import gcsRouter               from './routes/gcs'
import changelogRouter         from './routes/changelog'

const app = express()

const rawOrigins = process.env.CORS_ORIGIN ?? 'http://localhost:5175'
const allowedOrigins = rawOrigins.split(',').map(o => o.trim())

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true)
    else cb(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

app.use(express.json())
app.use(requestLogger)

app.use('/api/auth',          authRouter)
app.use('/api/me',            meRouter)
app.use('/api/users',         usersRouter)
app.use('/api/regions',            regionsRouter)
app.use('/api/areas',              areasRouter)
app.use('/api/location-master',    locationMasterRouter)
app.use('/api/parts',              partsRouter)
app.use('/api/labor-charges',      laborChargesRouter)
app.use('/api/customers',          customersRouter)
app.use('/api/tractor-assets',     tractorAssetsRouter)
app.use('/api/sap-tractor-assets', sapTractorAssetsRouter)
app.use('/api/pdi-entries',        pdiEntriesRouter)
app.use('/api/gcs',               gcsRouter)
app.use('/api/changelog',         changelogRouter)

// Local-dev only: serve uploaded photos from disk
if (process.env.NODE_ENV !== 'production') {
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
}

app.get('/api/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  res.json({ status: 'ok', db: states[mongoose.connection.readyState] ?? 'unknown' })
})

// Global error handler — must be last middleware
app.use(errorHandler)

export default app
