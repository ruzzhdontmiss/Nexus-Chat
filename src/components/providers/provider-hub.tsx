"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ArrowLeft,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { ProviderDefinition } from "@/lib/ai/types";

type ConnectionInfo = {
  id: string;
  providerId: string;
  authType: string;
  displayName: string | null;
  maskedKey: string;
  createdAt: string;
};

type TestResult = {
  ok: boolean;
  message: string;
} | null;

export function ProviderHub() {
  const { data: session } = useSession();
  const [providers, setProviders] = useState<ProviderDefinition[]>([]);
  const [connections, setConnections] = useState<ConnectionInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Connect form state
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Test state
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});

  // Delete state
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!session?.user) return;
    setLoading(true);
    try {
      const [provRes, connRes] = await Promise.all([
        fetch("/api/providers"),
        fetch("/api/providers/connections"),
      ]);
      if (provRes.ok) {
        const provData = await provRes.json();
        setProviders(provData.providers || []);
      }
      if (connRes.ok) {
        const connData = await connRes.json();
        setConnections(connData.connections || []);
      }
    } catch {
      // Fail silently — UI will show empty state
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const connectedIds = new Set(connections.map((c) => c.providerId));

  const handleConnect = async (providerId: string) => {
    if (!apiKeyInput.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/providers/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          authType: "api_key",
          credential: apiKeyInput.trim(),
        }),
      });
      if (res.ok) {
        setApiKeyInput("");
        setConnectingProvider(null);
        setShowKey(false);
        await fetchData();
      } else {
        const data = await res.json();
        setSaveError(data.error || "Failed to save connection.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (connectionId: string) => {
    setTesting(connectionId);
    setTestResults((prev) => ({ ...prev, [connectionId]: null }));
    try {
      const res = await fetch(`/api/providers/connections/${connectionId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [connectionId]: { ok: data.ok, message: data.message },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [connectionId]: { ok: false, message: "Network error." },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleDisconnect = async (connectionId: string) => {
    setDeleting(connectionId);
    try {
      const res = await fetch(`/api/providers/connections/${connectionId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTestResults((prev) => {
          const next = { ...prev };
          delete next[connectionId];
          return next;
        });
        await fetchData();
      }
    } catch {
      // Fail silently
    } finally {
      setDeleting(null);
    }
  };

  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Sign in to manage your AI providers.
      </div>
    );
  }

  const connectedProviders = providers.filter((p) => connectedIds.has(p.id));
  const availableProviders = providers.filter(
    (p) => !connectedIds.has(p.id) && p.authMethods.includes("api_key")
  );

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-display font-medium tracking-tight">
            AI Providers
          </h1>
        </div>
        <p className="text-sm text-muted-foreground pl-7">
          Connect your own API keys to use models from any provider.
          Your keys are encrypted at rest and never sent to the browser.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Connected Providers */}
          {connectedProviders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">
                Connected
              </h2>
              <div className="space-y-2">
                {connectedProviders.map((prov) => {
                  const conn = connections.find((c) => c.providerId === prov.id)!;
                  const result = testResults[conn.id];
                  return (
                    <div
                      key={prov.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{prov.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {conn.displayName || "API key connected"} · {conn.maskedKey}
                          </div>
                          {result && (
                            <div
                              className={`text-xs mt-0.5 ${
                                result.ok ? "text-emerald-500" : "text-destructive"
                              }`}
                            >
                              {result.message}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleTest(conn.id)}
                          disabled={testing === conn.id}
                        >
                          {testing === conn.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <FlaskConical className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDisconnect(conn.id)}
                          disabled={deleting === conn.id}
                        >
                          {deleting === conn.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Available Providers */}
          {availableProviders.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs uppercase tracking-wider text-muted-foreground/60 font-semibold">
                Available
              </h2>
              <div className="space-y-2">
                {availableProviders.map((prov) => (
                  <div key={prov.id}>
                    <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center">
                          <Key className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="text-sm font-medium">{prov.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {prov.description}
                          </div>
                          {!prov.implemented && (
                            <div className="text-[10px] mt-0.5 text-amber-500/80 font-medium">
                              Coming soon
                            </div>
                          )}
                        </div>
                      </div>
                      {prov.implemented && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => {
                            setConnectingProvider(
                              connectingProvider === prov.id ? null : prov.id
                            );
                            setApiKeyInput("");
                            setSaveError(null);
                            setShowKey(false);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      )}
                    </div>

                    {/* Inline connect form */}
                    {connectingProvider === prov.id && (
                      <div className="mt-2 p-4 rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="text-xs font-medium text-muted-foreground">
                          Enter your {prov.name} API key
                        </div>
                        <div className="relative">
                          <input
                            type={showKey ? "text" : "password"}
                            value={apiKeyInput}
                            onChange={(e) => setApiKeyInput(e.target.value)}
                            placeholder="sk-..."
                            className="w-full h-9 px-3 pr-9 rounded-lg bg-background border border-border text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/30"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleConnect(prov.id);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showKey ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        {saveError && (
                          <div className="text-xs text-destructive flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            {saveError}
                          </div>
                        )}
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              setConnectingProvider(null);
                              setApiKeyInput("");
                              setSaveError(null);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleConnect(prov.id)}
                            disabled={!apiKeyInput.trim() || saving}
                          >
                            {saving ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Key className="h-3 w-3 mr-1" />
                            )}
                            Save Key
                          </Button>
                        </div>
                        <div className="text-[10px] text-muted-foreground/60">
                          Your key is encrypted with AES-256-GCM and never stored in plaintext.
                          Using your own API key means you pay the provider directly.
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Cost disclaimer */}
          <div className="text-xs text-muted-foreground/50 text-center pt-4 border-t border-border/30">
            Models under "Nexus" use Nexus-managed keys with usage limits.
            <br />
            BYOK models use your own API keys — you pay the provider directly.
          </div>
        </>
      )}
    </div>
  );
}
