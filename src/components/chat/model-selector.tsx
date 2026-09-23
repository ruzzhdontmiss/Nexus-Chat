"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AVAILABLE_MODELS } from "@/lib/ai/models";

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

export function ModelSelector({ selectedModelId, onSelectModel }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedModel = AVAILABLE_MODELS.find(m => m.id === selectedModelId) || AVAILABLE_MODELS[0];

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={
        <Button variant="ghost" className="h-8 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-full">
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          {selectedModel.name}
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-50" />
        </Button>
      } />
      <DropdownMenuContent align="start" className="w-[220px]">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex justify-between items-center">
          <span>Models</span>
          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border">⌘K</span>
        </div>
        {AVAILABLE_MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => onSelectModel(model.id)}
            className="cursor-pointer py-2"
          >
            {model.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
