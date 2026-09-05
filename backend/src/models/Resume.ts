import { Schema, model, Document, Types } from "mongoose";

export interface IResume extends Document {
  _id: Types.ObjectId;
  candidateId: Types.ObjectId;
  fileUrl: string;
  parsedText?: string;
  extractedName?: string;
  extractedEmail?: string;
  extractedPhone?: string;
  extractedSkills: string[];
  extractedExperience?: number;
  uploadedAt: Date;
}

const resumeSchema = new Schema<IResume>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileUrl: { type: String, required: true },
    parsedText: { type: String },
    extractedName: { type: String },
    extractedEmail: { type: String },
    extractedPhone: { type: String },
    extractedSkills: { type: [String], default: [] },
    extractedExperience: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
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

export const Resume = model<IResume>("Resume", resumeSchema);