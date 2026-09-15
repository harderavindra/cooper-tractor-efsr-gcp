import { Schema, model, type Document } from 'mongoose'

export interface ICounter extends Document<string> {
  seq: number
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
})

export const Counter = model<ICounter>('Counter', CounterSchema)
