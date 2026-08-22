import { Schema, model, Document, Types } from "mongoose";

export interface IResume extends Document {
  _id: Types.ObjectId;
  candidateId: Types.ObjectId;
  fileUrl: string;
  parsedText?: string;
  extractedSkills: string[];
  extractedExperience?: number;
  uploadedAt: Date;
}

const resumeSchema = new Schema<IResume>({
  candidateId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  fileUrl: { type: String, required: true },
  parsedText: { type: String },
  extractedSkills: { type: [String], default: [] },
  extractedExperience: { type: Number },
  uploadedAt: { type: Date, default: Date.now },
});

export const Resume = model<IResume>("Resume", resumeSchema);