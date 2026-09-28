"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, Zap, Key, Sparkles } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AVAILABLE_MODELS } from "@/lib/ai/models";
import { OPENROUTER_MODELS } from "@/lib/ai/providers/openrouter-provider";
import { MOONSHOT_MODELS } from "@/lib/ai/providers/moonshot-provider";
import { GLM_MODELS } from "@/lib/ai/providers/glm-provider";
import { ANTHROPIC_MODELS } from "@/lib/ai/providers/anthropic-provider";
import type { ModelInfo } from "@/lib/ai/types";

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (id: string) => void;
}

// All available models combined
const ALL_MODELS: ModelInfo[] = [
  ...AVAILABLE_MODELS,
  ...OPENROUTER_MODELS,
  ...MOONSHOT_MODELS,
  ...GLM_MODELS,
  ...ANTHROPIC_MODELS,
];

type ModelGroup = {
  label: string;
  icon: typeof Zap;
  models: ModelInfo[];
};

function groupModels(
  models: ModelInfo[],
  connectedProviders: Set<string>
): ModelGroup[] {
  const groups: ModelGroup[] = [];

  // 1. Nexus (managed + mock)
  const nexusModels = models.filter(
    (m) => m.source === "managed" || m.provider === "mock"
  );
  if (nexusModels.length > 0) {
    groups.push({ label: "Nexus", icon: Sparkles, models: nexusModels });
  }

  // 2. Connected providers (BYOK)
  const byokModels = models.filter(
    (m) => m.source === "byok" && connectedProviders.has(m.provider)
  );
  if (byokModels.length > 0) {
    // Sub-group by provider
    const byProvider = new Map<string, ModelInfo[]>();
    for (const m of byokModels) {
      const group = byProvider.get(m.provider) || [];
      group.push(m);
      byProvider.set(m.provider, group);
    }
    for (const [provider, provModels] of byProvider) {
      const provName = provider.charAt(0).toUpperCase() + provider.slice(1);
      groups.push({ label: provName, icon: Key, models: provModels });
    }
  }

  return groups;
}

export function ModelSelector({ selectedModelId, onSelectModel }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState<Set<string>>(new Set());

  // Fetch connected providers to know which BYOK models to show
  useEffect(() => {
    fetch("/api/providers/connections")
      .then((res) => (res.ok ? res.json() : { connections: [] }))
      .then((data) => {
        const ids = new Set<string>(
          (data.connections || []).map((c: any) => c.providerId)
        );
        setConnectedProviders(ids);
      })
      .catch(() => setConnectedProviders(new Set()));
  }, []);

  const groups = useMemo(
    () => groupModels(ALL_MODELS, connectedProviders),
    [connectedProviders]
  );

  const selectedModel =
    ALL_MODELS.find((m) => m.id === selectedModelId) || ALL_MODELS[0];

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
      <DropdownMenuContent align="start" className="w-[240px] max-h-[360px] overflow-y-auto">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex justify-between items-center">
          <span>Models</span>
          <span className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border">⌘K</span>
        </div>
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold flex items-center gap-1.5">
              <group.icon className="h-3 w-3" />
              {group.label}
            </div>
            {group.models.map((model) => (
              <DropdownMenuItem
                key={model.id}
                onClick={() => onSelectModel(model.id)}
                className="cursor-pointer py-2 pl-6"
              >
                <span className="truncate">{model.name}</span>
                {model.id === selectedModelId && (
                  <span className="ml-auto text-primary text-xs">✓</span>
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        {groups.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-muted-foreground">
            No models available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
