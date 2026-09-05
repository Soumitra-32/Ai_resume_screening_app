import axios, { AxiosError } from "axios";
import fs from "fs";
import FormData from "form-data";
import { env } from "../config/env";

const mlClient = axios.create({
  baseURL: `${env.mlServiceUrl}/api`,
  timeout: 30_000,
});

// ---- Parse ----

export interface ParsedResumeData {
  name: string | null;
  email: string | null;
  phone: string | null;
  experience_years: number | null;
  raw_text: string;
  text_length: number;
  detected_entities: string[] | null;
}

export interface ParseResumeResponse {
  success: boolean;
  filename: string;
  file_type: string;
  data: ParsedResumeData;
  warnings: string[] | null;
}

export async function parseResume(filePath: string, originalName: string): Promise<ParseResumeResponse> {
  try {
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), originalName);

    const { data } = await mlClient.post<ParseResumeResponse>("/parse-resume", form, {
      headers: form.getHeaders(),
    });
    return data;
  } catch (err) {
    throw wrapMlError("parseResume", err);
  }
}

// ---- Score ----

export interface ScoreResumeRequest {
  resume_text: string;
  job_description: string;
  required_skills: string[];
  resume_experience_years?: number;
  required_experience_years?: number;
}

export interface ScoreResumeResponse {
  match_score: number;
  skill_overlap: number;
  semantic_similarity: number;
  experience_match: number;
  resume_skills_found: string[];
  matched_required_skills: string[];
  missing_required_skills: string[];
  resume_experience_years: number | null;
  required_experience_years: number | null;
}

export async function scoreResume(
  payload: ScoreResumeRequest
): Promise<ScoreResumeResponse> {
  try {
    const { data } = await mlClient.post<ScoreResumeResponse>("/score-resume", payload);
    return data;
  } catch (err) {
    throw wrapMlError("scoreResume", err);
  }
}

function wrapMlError(fn: string, err: unknown): Error {
  const axiosErr = err as AxiosError;
  const detail = axiosErr.response?.data ?? axiosErr.message;
  return new Error(`[mlServiceClient.${fn}] ML service call failed: ${JSON.stringify(detail)}`);
}