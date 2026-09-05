import { Schema, model, Document, Types } from "mongoose";

export interface IApplication extends Document {
  _id: Types.ObjectId;
  jobId: Types.ObjectId;
  candidateId: Types.ObjectId;
  resumeId: Types.ObjectId;
  matchScore?: number;
  status: string;
  appliedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    jobId: { type: Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    resumeId: { type: Schema.Types.ObjectId, ref: "Resume", required: true },
    matchScore: { type: Number, min: 0, max: 1 },
    status: {
      type: String,
      enum: ["pending", "scored", "shortlisted", "rejected", "hired", "failed"],
      default: "pending",
    },
    appliedAt: { type: Date, default: Date.now },
  },
  {
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// One application per candidate per job, regardless of which resume is used
applicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });

export const Application = model<IApplication>("Application", applicationSchema);