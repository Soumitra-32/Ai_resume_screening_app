import { Schema, model, Document, Types } from "mongoose";

export type JobStatus = "draft" | "open" | "closed" | "archived";

export interface IJob extends Document {
  _id: Types.ObjectId;
  recruiterId: Types.ObjectId;
  title: string;
  description: string;
  requiredSkills: string[];
  experienceRequired?: number;
  status: JobStatus;
  createdAt: Date;
}

const jobSchema = new Schema<IJob>(
  {
    recruiterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    requiredSkills: { type: [String], default: [] },
    experienceRequired: { type: Number, min: 0, max: 100 },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "archived"],
      default: "open",
    },
    createdAt: { type: Date, default: Date.now },
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

export const Job = model<IJob>("Job", jobSchema);