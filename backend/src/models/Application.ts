import { Schema, model, Document, Types } from "mongoose";

export interface IApplication extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  resumeId: Types.ObjectId;
  matchScore?: number;
  status: string;
  appliedAt: Date;
}

const applicationSchema = new Schema<IApplication>({
  jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
  resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
  matchScore: { type: Number },
  status: { type: String, default: "pending" },
  appliedAt: { type: Date, default: Date.now },
});

applicationSchema.index({ jobId: 1, resumeId: 1 }, { unique: true });

export const Application = model<IApplication>("Application", applicationSchema);