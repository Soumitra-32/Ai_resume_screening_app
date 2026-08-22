import { Schema, model, Document, Types } from "mongoose";

export interface IJob extends Document {
  _id: Types.ObjectId;
  recruiterId: Types.ObjectId;
  title: string;
  description: string;
  requiredSkills: string[];
  experienceRequired?: number;
  createdAt: Date;
}

const jobSchema = new Schema<IJob>({
  recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  requiredSkills: { type: [String], default: [] },
  experienceRequired: { type: Number },
  createdAt: { type: Date, default: Date.now },
});

export const Job = model<IJob>("Job", jobSchema);