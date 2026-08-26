import { useState, type FormEvent } from 'react';
import type { JobInput } from '@/types';

interface JobPostFormProps {
  initial?: Partial<JobInput>;
  submitLabel?: string;
  onSubmit: (payload: JobInput) => Promise<void> | void;
}

export default function JobPostForm({ initial, submitLabel = 'Post job', onSubmit }: JobPostFormProps) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [skillsText, setSkillsText] = useState(initial?.requiredSkills?.join(', ') ?? '');
  const [experienceRequired, setExperienceRequired] = useState(initial?.experienceRequired ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !description.trim()) {
      setFormError('Title and description are required.');
      return;
    }

    const requiredSkills = skillsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), requiredSkills, experienceRequired });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save this job.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-5 p-6">
      {formError && (
        <p className="rounded-sm border border-flag/50 bg-flag/10 px-3 py-2 text-sm text-flag">{formError}</p>
      )}

      <div>
        <label className="field-label" htmlFor="title">
          Job title
        </label>
        <input
          id="title"
          className="field-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Senior Backend Engineer"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          className="field-input min-h-[140px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Responsibilities, expectations, team context…"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="skills">
          Required skills (comma separated)
        </label>
        <input
          id="skills"
          className="field-input"
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="TypeScript, PostgreSQL, System Design"
        />
      </div>

      <div className="max-w-[200px]">
        <label className="field-label" htmlFor="experience">
          Years of experience required
        </label>
        <input
          id="experience"
          type="number"
          min={0}
          className="field-input"
          value={experienceRequired}
          onChange={(e) => setExperienceRequired(Number(e.target.value))}
        />
      </div>

      <button type="submit" className="btn-primary" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}