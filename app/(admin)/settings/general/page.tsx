import { GeneralSettings } from "@/components/settings/general-settings"

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">General Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage app branding, company information, and system defaults
        </p>
      </div>

      <GeneralSettings />
    </div>
  )
}
