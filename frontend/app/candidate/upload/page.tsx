"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadResumeFile, addCandidateProject, getCandidateProjects, deleteCandidateProject, getCandidateResumeStatus } from "@/lib/api";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Plus, Trash2, ArrowRight } from "lucide-react";

export default function ResumeUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Existing active resume
  const [existingResume, setExistingResume] = useState<any>(null);

  // Optional project attachments
  const [projects, setProjects] = useState<any[]>([]);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newType, setNewType] = useState("github");
  const [newDesc, setNewDesc] = useState("");
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const res = await getCandidateResumeStatus();
      if (res.has_resume) {
        setExistingResume(res);
      }
      const pRes = await getCandidateProjects();
      setProjects(pRes.projects || []);
    } catch {
      // Ignored
    }
  };

  const handleFileSelect = (selectedFile?: File | null) => {
    if (!selectedFile) return;
    setError(null);
    const ext = selectedFile.name.toLowerCase();
    if (!ext.endsWith(".pdf") && !ext.endsWith(".docx") && !ext.endsWith(".txt")) {
      setError("Please select a PDF or DOCX resume.");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit.");
      return;
    }
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setUploadProgress("Validating and uploading file...");

    try {
      setTimeout(() => setUploadProgress("Extracting text and structure..."), 400);
      setTimeout(() => setUploadProgress("Mapping canonical skills and running matching..."), 800);

      const res = await uploadResumeFile(file);
      setUploadProgress("Resume parsed successfully!");
      setTimeout(() => {
        router.push("/candidate/jobs");
      }, 700);
    } catch (err: any) {
      setError(err?.message || "Failed to process resume. Please try a text-based PDF or DOCX.");
      setUploading(false);
      setUploadProgress("");
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;
    setSavingProject(true);
    try {
      await addCandidateProject({
        label: newLabel.trim(),
        url: newUrl.trim(),
        project_type: newType,
        description: newDesc.trim()
      });
      setNewLabel("");
      setNewUrl("");
      setNewDesc("");
      setShowAddProject(false);
      const pRes = await getCandidateProjects();
      setProjects(pRes.projects || []);
    } catch (err: any) {
      setError(err?.message || "Could not add project link.");
    } finally {
      setSavingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteCandidateProject(id);
      setProjects(projects.filter(p => p.id !== id));
    } catch {
      // Ignored
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      {/* Page Title & Intro */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Add your resume
        </h1>
        <p className="text-sm text-neutral-500">
          Your resume is the foundation of your matches. You can update it at any time.
        </p>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Resume Banner if one already exists */}
      {existingResume && (
        <div className="p-4 border border-neutral-200 bg-neutral-50 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-neutral-700" />
            <div>
              <div className="font-medium text-neutral-900">
                Current Resume: {existingResume.resume.filename} (Version {existingResume.resume.version})
              </div>
              <div className="text-neutral-500">
                Uploaded {new Date(existingResume.resume.created_at).toLocaleDateString()} · Parsed with verified skills
              </div>
            </div>
          </div>
          <a
            href={existingResume.resume.download_url}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 bg-white border border-neutral-200 hover:border-neutral-300 rounded font-medium text-neutral-700 transition-colors"
          >
            Download
          </a>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div className="space-y-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 sm:p-10 text-center transition-colors cursor-pointer ${
            dragActive
              ? "border-neutral-900 bg-neutral-100/50"
              : "border-neutral-300 hover:border-neutral-400 bg-white"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <div className="mx-auto w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-700 mb-3">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div className="font-medium text-sm text-neutral-900">
            {file ? file.name : "Drop your resume here"}
          </div>
          <div className="text-xs text-neutral-500 mt-1">
            {file ? "Click Upload Resume to complete" : "PDF or DOCX (max 10MB)"}
          </div>
        </div>

        {file && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-neutral-600">
              Selected: <span className="font-medium text-neutral-900">{file.name}</span> ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </div>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <span>{uploading ? "Processing..." : "Upload & match"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {uploadProgress && (
          <div className="p-3 bg-neutral-100 rounded-md text-xs text-neutral-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-neutral-900" />
            <span>{uploadProgress}</span>
          </div>
        )}
      </div>

      {/* Optional Work Samples & Projects */}
      <div className="pt-4 border-t border-neutral-200 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Work samples & project links</h2>
            <p className="text-xs text-neutral-500">
              Optional: attach a GitHub repository, project link, video, portfolio, or demo.
            </p>
          </div>
          {!showAddProject && (
            <button
              type="button"
              onClick={() => setShowAddProject(true)}
              className="flex items-center gap-1 text-xs font-medium text-neutral-800 hover:text-neutral-950 px-2.5 py-1.5 border border-neutral-200 rounded-md hover:bg-neutral-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add project</span>
            </button>
          )}
        </div>

        {/* List of existing projects */}
        {projects.length > 0 && (
          <div className="space-y-2">
            {projects.map((pr) => (
              <div key={pr.id} className="p-3 border border-neutral-200 rounded-md bg-white flex items-center justify-between text-xs">
                <div>
                  <div className="font-medium text-neutral-900 flex items-center gap-1.5">
                    <span>{pr.label}</span>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider font-mono">[{pr.project_type}]</span>
                  </div>
                  <a
                    href={pr.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-500 hover:text-neutral-900 underline mt-0.5 inline-block"
                  >
                    {pr.url}
                  </a>
                  {pr.description && <p className="text-neutral-600 mt-1">{pr.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(pr.id)}
                  className="text-neutral-400 hover:text-red-600 p-1 transition-colors"
                  title="Remove project"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add Project Form */}
        {showAddProject && (
          <form onSubmit={handleAddProject} className="p-4 border border-neutral-200 rounded-lg bg-neutral-50 space-y-3 text-xs">
            <div className="font-medium text-neutral-900">Add project attachment</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-neutral-600 font-medium">Project label</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Queue Engine"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  required
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-neutral-900"
                />
              </div>
              <div className="space-y-1">
                <label className="text-neutral-600 font-medium">Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-neutral-900"
                >
                  <option value="github">GitHub Repository</option>
                  <option value="demo">Live Demo</option>
                  <option value="portfolio">Portfolio</option>
                  <option value="video">Video Walkthrough</option>
                  <option value="other">Other Link</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-neutral-600 font-medium">URL</label>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-neutral-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-neutral-600 font-medium">Short description (optional)</label>
              <input
                type="text"
                placeholder="Brief summary of technologies and your contribution"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-neutral-300 rounded bg-white text-neutral-900"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddProject(false)}
                className="px-3 py-1.5 text-neutral-600 hover:text-neutral-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingProject}
                className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded font-medium disabled:opacity-50"
              >
                {savingProject ? "Saving..." : "Save project"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
