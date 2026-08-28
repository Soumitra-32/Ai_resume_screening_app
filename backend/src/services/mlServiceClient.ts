import axios, { AxiosError } from "axios";
import { env } from "../config/env";

const mlClient = axios.create({
  baseURL: env.mlServiceUrl,
  timeout: 30_000,
});

export interface ScoreResumeRequest {
  resume_text: string;
  job_description: string;
  required_skills: string[];
  experience_required: number;
}

export interface ScoreResumeResponse {
  skills: string[];
  experience: number;
  match_score: number;
}

export interface ParseResumeResponse {
  parsed_text: string;
  extracted_skills: string[];
  extracted_experience: number;
}

export async function parseResume(fileUrl: string): Promise<ParseResumeResponse> {
  try {
    const { data } = await mlClient.post<ParseResumeResponse>("/parse-resume", {
      file_url: fileUrl,
    });
    return data;
  } catch (err) {
    throw wrapMlError("parseResume", err);
  }
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