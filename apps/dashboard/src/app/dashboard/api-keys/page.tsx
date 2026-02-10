"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus, Key, Copy, Trash2, Check, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getApiKeys, createApiKey, deleteApiKey, type ApiKey } from "@/lib/api";

export default function ApiKeysPage() {
  const { getToken } = useAuth();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch API keys on mount
  useEffect(() => {
    async function fetchKeys() {
      try {
        const token = await getToken();
        if (token) {
          const response = await getApiKeys(token);
          setApiKeys(response.apiKeys);
        }
      } catch (err) {
        console.error("Failed to fetch API keys:", err);
        setError("Failed to load API keys");
      } finally {
        setLoading(false);
      }
    }
    fetchKeys();
  }, [getToken]);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const response = await createApiKey(token, { name: newKeyName });
      setNewlyCreatedKey(response.apiKey.key);
      setApiKeys([...apiKeys, {
        id: response.apiKey.id,
        name: response.apiKey.name,
        prefix: response.apiKey.prefix,
        lastUsedAt: null,
        createdAt: response.apiKey.createdAt,
      }]);
      setNewKeyName("");
      setShowCreateForm(false);
    } catch (err) {
      console.error("Failed to create API key:", err);
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("Are you sure you want to delete this API key? This cannot be undone.")) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      await deleteApiKey(token, id);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
    } catch (err) {
      console.error("Failed to delete API key:", err);
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    }
  }

  async function handleCopyKey(key: string, id: string) {
    await navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10 px-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage your API keys for the ContextKit API
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Key
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive rounded-lg flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Create Key Form */}
      {showCreateForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
            <CardDescription>
              Create a new API key to access the ContextKit API
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateKey} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyName">Key Name</Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Production, Development"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isCreating || !newKeyName.trim()}>
                  {isCreating ? "Creating..." : "Create Key"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Newly Created Key Alert */}
      {newlyCreatedKey && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">
              🔐 API Key Created
            </CardTitle>
            <CardDescription>
              Copy this key now — you won&apos;t be able to see it again!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 p-3 bg-white dark:bg-neutral-900 rounded-lg font-mono text-sm border">
              <code className="flex-1 break-all">{newlyCreatedKey}</code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopyKey(newlyCreatedKey, "new")}
              >
                {copiedKeyId === "new" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setNewlyCreatedKey(null)}
            >
              I&apos;ve copied the key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Key className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
            <p className="text-muted-foreground mb-4">
              Create an API key to start using the ContextKit API
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <Card key={key.id}>
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between py-4 gap-4">
                <div className="flex items-center gap-4">
                  <Key className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-medium">{key.name}</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      ck_{key.prefix}...
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    {key.lastUsedAt
                      ? `Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`
                      : "Never used"}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteKey(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Usage Example */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Using your API key</CardTitle>
          <CardDescription>
            Include your API key in the Authorization header
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
            <code>{`curl -X POST https://contextkit-api.milo4jo.workers.dev/v1/context/select \\
  -H "Authorization: Bearer ck_live_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"project_id": "...", "query": "How does auth work?"}'`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
