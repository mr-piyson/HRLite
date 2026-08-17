"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Monitor } from "lucide-react";

export default function KioskConfigPage() {
  const { data: configs, isLoading } = trpc.settings.list.useQuery();
  const { data: activeConfig } = trpc.settings.active.useQuery();

  if (isLoading) {
    return null;
  }

  if (configs && configs.length > 0 && activeConfig) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-sm text-muted-foreground">Select a kiosk from the sidebar to configure</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <Monitor className="mb-3 size-10 text-muted-foreground/50" />
        <p className="text-sm font-medium">No kiosks configured</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Create your first kiosk configuration using the button in the sidebar.
        </p>
      </CardContent>
    </Card>
  );
}
