export interface IResume {
  id: string;
  candidateId: string;
  fileUrl: string;
  parsedText: string | null;
  extractedName: string | null;
  extractedEmail: string | null;
  extractedPhone: string | null;
  extractedSkills: string[];
  extractedExperience: number | null;
  uploadedAt: Date;
}
