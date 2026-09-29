import { FileIcon, Loader2Icon, XIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type AttachmentStatus = "uploading" | "processing" | "ready" | "failed";

export interface AttachedDocument {
  id: string; // temp client-side id
  file: File;
  name: string;
  size: number;
  status: AttachmentStatus;
  progress?: number; // 0-100
  documentId?: string; // server ID once ready
  error?: string;
}

interface DocumentAttachmentProps {
  document: AttachedDocument;
  onRemove: (id: string) => void;
}

export function DocumentAttachment({ document, onRemove }: DocumentAttachmentProps) {
  return (
    <div className="group relative flex items-center gap-3 bg-muted/30 border border-border/50 rounded-xl px-3 py-2 pr-8 min-w-[200px] max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
      <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
        <FileIcon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="text-xs font-medium text-foreground truncate">{document.name}</div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
          {document.status === "uploading" && (
            <>
              <Loader2Icon className="w-3 h-3 animate-spin text-primary" />
              <span>Uploading {document.progress ? `${Math.round(document.progress)}%` : ""}</span>
            </>
          )}
          {document.status === "processing" && (
            <>
              <Loader2Icon className="w-3 h-3 animate-spin text-primary" />
              <span>Indexing document...</span>
            </>
          )}
          {document.status === "ready" && (
            <>
              <CheckCircle2Icon className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500/90 font-medium">Ready</span>
            </>
          )}
          {document.status === "failed" && (
            <>
              <AlertCircleIcon className="w-3 h-3 text-destructive" />
              <span className="text-destructive/90">{document.error || "Failed"}</span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onRemove(document.id)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-colors"
      >
        <XIcon className="w-3.5 h-3.5" />
      </button>

      {/* Progress Bar Background */}
      {(document.status === "uploading" || document.status === "processing") && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/50 rounded-b-xl overflow-hidden">
          <div 
            className={cn(
              "h-full bg-primary transition-all duration-300 ease-out",
              document.status === "processing" ? "w-full animate-pulse" : ""
            )} 
            style={{ width: document.status === "uploading" ? `${document.progress || 0}%` : undefined }} 
          />
        </div>
      )}
    </div>
  );
}
