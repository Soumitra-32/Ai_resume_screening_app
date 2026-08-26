import { useCallback, useRef, useState, type DragEvent } from 'react';
import { resumeApi } from '@/services/resumeApi';
import type { Resume } from '@/types';

interface ResumeUploadProps {
  onUploaded: (resume: Resume) => void;
}

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export default function ResumeUpload({ onUploaded }: ResumeUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Upload a PDF or DOCX file.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File is larger than 10MB.');
        return;
      }

      setFileName(file.name);
      setProgress(0);
      try {
        const resume = await resumeApi.upload(file, setProgress);
        onUploaded(resume);
      } catch {
        setError('Upload failed. Try again.');
      } finally {
        setProgress(null);
      }
    },
    [onUploaded]
  );

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
        }}
        className={`card flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed p-10 text-center transition ${
          isDragging ? 'border-signal bg-ink-800' : ''
        }`}
      >
        <p className="font-display text-paper">Drop your resume here</p>
        <p className="text-xs text-ink-600">PDF or DOCX, up to 10MB · or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {fileName && progress !== null && (
        <div className="mt-3">
          <p className="mb-1 font-mono text-xs text-ink-600">{fileName}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-sm bg-ink-800">
            <div className="h-full bg-signal transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-flag">{error}</p>}
    </div>
  );
}