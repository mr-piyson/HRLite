"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { KioskConfigEditor } from "@/components/settings/kiosk-config-editor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Monitor, CheckCircle2, Copy, ExternalLink, Eye, EyeOff } from "lucide-react";

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

function getKioskUrl(slug: string) {
  if (typeof window === "undefined") return `/kiosk/${slug}`;
  return `${window.location.origin}/kiosk/${slug}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleCopy();
      }}
      className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      {copied ? (
        <CheckCircle2 className="size-3 text-emerald-500" />
      ) : (
        <Copy className="size-3 text-muted-foreground" />
      )}
    </button>
  );
}

function CreateKioskDialog() {
  const [open, setOpen] = useState(false);
  const [kioskName, setKioskName] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [location, setLocation] = useState("");
  const [adminPin, setAdminPin] = useState("");

  const utils = trpc.useUtils();
  const { data: settings } = trpc.general.get.useQuery();
  const createMutation = trpc.settings.create.useMutation({
    onSuccess: (result) => {
      utils.settings.list.invalidate();
      utils.settings.active.invalidate();
      toast.success("Kiosk configuration created");
      setOpen(false);
      setKioskName("");
      setDeviceName("");
      setLocation("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = generateSlug(kioskName);
    createMutation.mutate({
      slug,
      kioskName,
      deviceName: deviceName || undefined,
      location: location || undefined,
      autoFullscreen: true,
      autoResetAfterSuccess: true,
      successScreenDuration: 3,
      cameraEnabled: false,
      qrCodeEnabled: true,
      rfidEnabled: false,
      pinEnabled: false,
      faceRecognitionEnabled: false,
      fingerprintEnabled: false,
      workdayStart: settings?.defaultWorkdayStart ?? "09:00",
      lateGraceMinutes: 15,
      standardWorkMinutes: 480,
      halfDayMinutes: 240,
      adminPin: adminPin || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm">
            <Plus className="mr-1 size-4" />
            New Kiosk
          </Button>
        }
      ></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Kiosk Configuration</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="kkName">Kiosk Name *</Label>
            <Input
              id="kkName"
              value={kioskName}
              onChange={(e) => setKioskName(e.target.value)}
              required
              placeholder="e.g. Main Gate Kiosk"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kkDevice">Device Name</Label>
            <Input
              id="kkDevice"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="e.g. Gate-Terminal-01"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kkLocation">Location</Label>
            <Input
              id="kkLocation"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Site A - Main Entrance"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="kkAdminPin">Admin PIN</Label>
            <Input
              id="kkAdminPin"
              type="password"
              maxLength={4}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="4-digit PIN for admin drawer"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">Optional. Used to access the admin drawer on the kiosk.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function KioskConfigPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { data: configs, isLoading } = trpc.settings.list.useQuery();
  const { data: activeConfig } = trpc.settings.active.useQuery();
  const selected = configs?.find((c) => c.id === (selectedId ?? activeConfig?.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kiosk Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Configure kiosk devices, display settings, identification methods, and attendance policies
          </p>
        </div>
        <CreateKioskDialog />
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Config list sidebar */}
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Kiosk Devices</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            {isLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : configs?.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No kiosks configured</p>
            ) : (
              <div className="space-y-1">
                {configs?.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`flex w-full items-start gap-3 rounded-lg p-3 text-left text-sm transition-colors hover:bg-accent ${
                      (selectedId ?? activeConfig?.id) === c.id ? "bg-accent" : ""
                    }`}
                  >
                    <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{c.kioskName}</span>
                        {activeConfig?.id === c.id && (
                          <Badge variant="default" className="shrink-0 text-[10px] px-1 py-0">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.location ?? "No location"}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <code className="text-[10px] text-muted-foreground/60 truncate">/kiosk/{c.slug}</code>
                        {c.slug && <CopyButton text={getKioskUrl(c.slug)} />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Editor */}
        <div className="min-w-0">
          <KioskConfigEditor config={selected ?? null} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}
