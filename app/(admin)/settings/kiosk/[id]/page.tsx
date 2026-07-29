"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { KioskConfigEditor } from "@/components/settings/kiosk-config-editor";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function KioskConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: config, isLoading } = trpc.settings.getById.useQuery({ id });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          nativeButton={false}
          render={<Link href="/settings/kiosk" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{config?.kioskName ?? "Edit Configuration"}</h1>
          <p className="text-sm text-muted-foreground">{config?.location ?? "Kiosk settings"}</p>
        </div>
      </div>

      <KioskConfigEditor config={config ?? null} isLoading={isLoading} />
    </div>
  );
}
