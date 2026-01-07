// src/services/fastapiClient.ts
import type { Storyboard } from "../types/storyboard";

type ProcessArticleResponse = {
  job_id: string;
};

type JobStatusResponse = {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  progress?: number; // 0..100
  article_id?: string;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function safeJson(res: Response): Promise<any> {
  // Avoid "Unexpected end of JSON input" when server returns empty body
  const text = await res.text();
  if (!text) return null;

  // Sometimes you get HTML (Netlify 404 page, etc.)
  const first = text.trim().slice(0, 20).toLowerCase();
  if (first.startsWith("<!doctype") || first.startsWith("<html")) {
    throw new Error(`Expected JSON, got HTML (status ${res.status}). Check FASTAPI base URL.`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON (status ${res.status}): ${text.slice(0, 200)}`);
  }
}

class FastApiClient {
  private baseUrl: string;

  constructor() {
    // ✅ Prefer VITE_FASTAPI_URL, fallback to empty string
    this.baseUrl = (import.meta.env.VITE_FASTAPI_URL || "").toString().replace(/\/$/, "");
  }

  private ensureConfigured() {
    if (!this.baseUrl) {
      throw new Error(
        "FastAPI backend URL is not configured. Set VITE_FASTAPI_URL in your env (Netlify + local)."
      );
    }
  }

  private async post<T>(path: string, body: any): Promise<T> {
    this.ensureConfigured();
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await safeJson(res);

    if (!res.ok) {
      const msg = data?.error || data?.detail || res.statusText || "Request failed";
      throw new Error(`${msg} (POST ${path})`);
    }

    return data as T;
  }

  private async get<T>(path: string): Promise<T> {
    this.ensureConfigured();
    const url = `${this.baseUrl}${path}`;

    const res = await fetch(url, { method: "GET" });
    const data = await safeJson(res);

    if (!res.ok) {
      const msg = data?.error || data?.detail || res.statusText || "Request failed";
      throw new Error(`${msg} (GET ${path})`);
    }

    return data as T;
  }

  /**
   * Kicks off processing for an article.
   * Your FastAPI should accept { url, text } and return { job_id }.
   */
  async processArticle(url: string, text: string): Promise<ProcessArticleResponse> {
    return this.post<ProcessArticleResponse>("/articles/process", { url, text });
  }

  /**
   * Polls until job completes or fails.
   * Default: ~60s max, polling every 1.5s.
   */
  async pollJobCompletion(
    jobId: string,
    onProgress?: (job: JobStatusResponse) => void,
    opts?: { intervalMs?: number; timeoutMs?: number }
  ): Promise<JobStatusResponse> {
    const intervalMs = opts?.intervalMs ?? 1500;
    const timeoutMs = opts?.timeoutMs ?? 60_000;

    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const job = await this.get<JobStatusResponse>(`/jobs/${encodeURIComponent(jobId)}`);

      if (onProgress) onProgress(job);

      if (job.status === "completed") return job;
      if (job.status === "failed") {
        throw new Error(job.error || "Job failed");
      }

      await sleep(intervalMs);
    }

    throw new Error("Job polling timed out");
  }

  /**
   * Fetch storyboard by article_id
   */
  async getStoryboard(articleId: string): Promise<Storyboard> {
    return this.get<Storyboard>(`/articles/${encodeURIComponent(articleId)}/storyboard`);
  }
}

export const fastapiClient = new FastApiClient();