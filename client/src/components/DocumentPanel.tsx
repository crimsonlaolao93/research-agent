import { useState, useEffect, useRef } from "react";

interface DocumentMeta {
  id: string;
  name: string;
  chunkCount: number;
  uploadedAt: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DocumentPanel() {
  const [open, setOpen] = useState(false);
  const [docs, setDocs] = useState<DocumentMeta[]>([]);
  const [available, setAvailable] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => {
        setDocs(data.documents ?? []);
        setAvailable(data.available ?? false);
      })
      .catch(() => setAvailable(false));
  }, []);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/documents/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setDocs((prev) => [
        ...prev,
        { id: data.docId, name: data.name, chunkCount: data.chunkCount, uploadedAt: new Date().toISOString() },
      ]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  };

  const deleteDoc = async (id: string) => {
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      {/* Header — always visible */}
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 text-left"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2.5">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-white text-sm font-medium">Knowledge Base</span>
          {docs.length > 0 && (
            <span className="text-xs bg-blue-900 text-blue-300 border border-blue-700 px-1.5 py-0.5 rounded-md font-medium">
              {docs.length} doc{docs.length !== 1 ? "s" : ""} · {docs.reduce((s, d) => s + d.chunkCount, 0)} chunks
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {docs.length > 0 && (
            <span className="hidden sm:inline text-xs text-green-400">Active in next query</span>
          )}
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-800 pt-4">
          {!available ? (
            <div className="rounded-lg bg-yellow-950 border border-yellow-800 p-3">
              <p className="text-yellow-300 text-xs font-medium">RAG disabled</p>
              <p className="text-yellow-600 text-xs mt-0.5">
                Add <code className="font-mono">OPENAI_API_KEY</code> to your <code className="font-mono">.env</code> to enable document upload and retrieval.
              </p>
            </div>
          ) : (
            <>
              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? "border-blue-500 bg-blue-950/30"
                    : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/30"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.pdf"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-gray-400 text-sm">Embedding document...</span>
                  </div>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-gray-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-400 text-sm">Drop files here or click to browse</p>
                    <p className="text-gray-600 text-xs mt-1">.txt · .md · .pdf — up to 10 MB each</p>
                  </>
                )}
              </div>

              {uploadError && (
                <p className="text-red-400 text-xs">{uploadError}</p>
              )}
            </>
          )}

          {/* Document list */}
          {docs.length > 0 && (
            <div className="space-y-2">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">Uploaded documents</p>
              {docs.map((doc) => (
                <div key={doc.id} className="group flex items-center gap-3 p-2.5 rounded-lg bg-gray-800 border border-gray-700">
                  <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{doc.name}</p>
                    <p className="text-gray-600 text-xs">{doc.chunkCount} chunks · {timeAgo(doc.uploadedAt)}</p>
                  </div>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition-all p-1 rounded shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
              <p className="text-gray-700 text-xs">
                Note: documents are stored in memory and cleared on server restart. Use a persistent vector DB (e.g. pgvector, Qdrant) for production.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
