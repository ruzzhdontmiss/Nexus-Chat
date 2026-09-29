"use client";

import { Button } from "@/components/ui/button";
import { PaperclipIcon, ArrowUpIcon, SearchIcon } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useRef, useEffect } from "react";
import { ModelSelector } from "./model-selector";
import { cn } from "@/lib/utils";
import { AttachedDocument, DocumentAttachment } from "./document-attachment";

interface MessageComposerProps {
  input: string;
  setInput: (value: string) => void;
  isGenerating: boolean;
  onSubmit: () => void;
  onFocusChange?: (focused: boolean) => void;
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  searchEnabled: boolean;
  onToggleSearch: (enabled: boolean) => void;
  attachments: AttachedDocument[];
  onRemoveAttachment: (id: string) => void;
  onFilesSelected: (files: FileList) => void;
}

export function MessageComposer({
  input,
  setInput,
  isGenerating,
  onSubmit,
  onFocusChange,
  selectedModelId,
  onSelectModel,
  searchEnabled,
  onToggleSearch,
  attachments,
  onRemoveAttachment,
  onFilesSelected,
}: MessageComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 256)}px`;
    }
  };

  useEffect(() => {
    if (textareaRef.current && input === "") {
      textareaRef.current.style.height = "auto";
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
    if (e.key === "Escape") {
      textareaRef.current?.blur();
    }
  };

  return (
    <div className="w-full">
      <div className="relative flex flex-col w-full bg-background border border-border/50 rounded-3xl overflow-hidden transition-all duration-150 ease-out hover:border-white/20 focus-within:border-white/30 focus-within:ring-1 focus-within:ring-white/10 shadow-sm backdrop-blur-md">
        
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="application/pdf"
          multiple 
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onFilesSelected(e.target.files);
              e.target.value = ''; // Reset
            }
          }} 
        />

        {/* Attachments Area */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-4 pb-1">
            {attachments.map(doc => (
              <DocumentAttachment key={doc.id} document={doc} onRemove={onRemoveAttachment} />
            ))}
          </div>
        )}

        {/* Top Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
          placeholder="Type your message here..."
          className="w-full bg-transparent px-5 pt-5 pb-3 text-foreground placeholder:text-muted-foreground focus:outline-none resize-none min-h-[72px] leading-relaxed"
          rows={1}
        />

        {/* Bottom Controls */}
        <div className="flex items-center justify-between px-3 pb-3">
          
          {/* Left: Model Selector */}
          <div className="flex items-center">
            <ModelSelector selectedModelId={selectedModelId} onSelectModel={onSelectModel} />
          </div>

          {/* Middle: Search & Attach */}
          <div className="hidden sm:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleSearch(!searchEnabled)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium transition-all duration-200",
                searchEnabled
                  ? "bg-primary/15 text-primary hover:bg-primary/25 ring-1 ring-primary/20"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <SearchIcon className="h-3.5 w-3.5 mr-1.5" />
              Search
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => fileInputRef.current?.click()}
              className="h-8 text-muted-foreground hover:text-foreground rounded-full px-3 text-xs font-medium transition-colors"
            >
              <PaperclipIcon className="h-3.5 w-3.5 mr-1.5" />
              Attach
            </Button>
          </div>

          {/* Right: Send Button */}
          <div className="flex items-center gap-2 z-10">
            <div className="sm:hidden flex items-center gap-1">
               {/* Mobile search toggle */}
               <Button
                 variant="ghost"
                 size="icon"
                 onClick={() => onToggleSearch(!searchEnabled)}
                 className={cn(
                   "h-8 w-8 rounded-full transition-all",
                   searchEnabled
                     ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                     : "text-muted-foreground hover:text-foreground"
                 )}
               >
                 <SearchIcon className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full">
                 <PaperclipIcon className="h-4 w-4" />
               </Button>
            </div>
            <Button 
              size="icon"
              onClick={onSubmit}
              disabled={!input.trim() || isGenerating}
              className={`h-8 w-8 rounded-full transition-all duration-300 ${input.trim() && !isGenerating ? 'bg-foreground text-background hover:bg-foreground/90' : 'bg-muted text-muted-foreground opacity-50'}`}
            >
              <ArrowUpIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
