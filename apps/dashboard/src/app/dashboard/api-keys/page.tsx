"use client";

import { useState } from "react";
import { Plus, Key, Copy, Trash2, Eye, EyeOff, Check } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Mock data - will be replaced with API calls
const mockApiKeys = [
  {
    id: "key_1",
    name: "Development",
    prefix: "ck_test_a1b2",
    lastUsed: "2026-02-09T10:30:00Z",
    createdAt: "2026-01-15T08:00:00Z",
  },
  {
    id: "key_2",
    name: "Production",
    prefix: "ck_live_x9y8",
    lastUsed: "2026-02-09T14:22:00Z",
    createdAt: "2026-01-20T12:00:00Z",
  },
];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState(mockApiKeys);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);

    try {
      // TODO: Call API to create key
      // const response = await fetch("/api/keys", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ name: newKeyName }),
      // });

      // Simulate API response
      const mockNewKey = `ck_live_${Math.random().toString(36).slice(2, 34)}`;
      setNewlyCreatedKey(mockNewKey);

      // Add to list (in real app, refetch from API)
      setApiKeys([
        ...apiKeys,
        {
          id: `key_${Date.now()}`,
          name: newKeyName,
          prefix: mockNewKey.slice(0, 12),
          lastUsed: null as unknown as string,
          createdAt: new Date().toISOString(),
        },
      ]);

      setNewKeyName("");
    } catch (error) {
      console.error("Error creating key:", error);
    } finally {
      setIsCreating(false);
    }
  }

  function handleCopyKey(key: string) {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(key);
    setTimeout(() => setCopiedKeyId(null), 2000);
  }

  async function handleDeleteKey(id: string) {
    if (!confirm("Are you sure you want to delete this API key? This action cannot be undone.")) {
      return;
    }

    // TODO: Call API to delete key
    setApiKeys(apiKeys.filter((k) => k.id !== id));
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-muted-foreground mt-2">
            Manage your API keys for accessing the ContextKit API
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Newly created key alert */}
      {newlyCreatedKey && (
        <Card className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  API Key Created Successfully
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Copy this key now. You won&apos;t be able to see it again!
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewlyCreatedKey(null)}
              >
                Dismiss
              </Button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-white dark:bg-black rounded border font-mono text-sm">
                {newlyCreatedKey}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleCopyKey(newlyCreatedKey)}
              >
                {copiedKeyId === newlyCreatedKey ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create form */}
      {showCreateForm && !newlyCreatedKey && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New API Key</CardTitle>
            <CardDescription>
              Give your key a name to help you identify it later
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateKey} className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="keyName" className="sr-only">
                  Key Name
                </Label>
                <Input
                  id="keyName"
                  placeholder="e.g., Development, CI/CD, Production"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isCreating || !newKeyName}>
                {isCreating ? "Creating..." : "Create Key"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewKeyName("");
                }}
              >
                Cancel
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* API Keys list */}
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
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-full bg-muted">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{key.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {key.prefix}••••••••••••••••••••
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm text-muted-foreground">
                    <p>
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                      Last used:{" "}
                      {key.lastUsed
                        ? new Date(key.lastUsed).toLocaleDateString()
                        : "Never"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
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

      {/* Usage info */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-lg">Using Your API Key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Include your API key in the Authorization header:
          </p>
          <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm">
            <code>{`curl -X POST https://api.contextkit.dev/v1/context/select \\
  -H "Authorization: Bearer ck_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "How does auth work?", "project_id": "your-project"}'`}</code>
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
