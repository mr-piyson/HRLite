import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Monitor } from "lucide-react"

const settingGroups = [
  {
    title: "Kiosk Configuration",
    description: "Configure kiosk devices, display settings, identification methods, and attendance policy",
    href: "/settings/kiosk",
    icon: Monitor,
  },
]

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage system configuration and attendance policies
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingGroups.map((group) => (
          <Link key={group.href} href={group.href} className="block">
            <Card className="transition-colors hover:bg-accent/50">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <group.icon className="size-4" />
                  </div>
                  <CardTitle className="text-sm font-medium">{group.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{group.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
