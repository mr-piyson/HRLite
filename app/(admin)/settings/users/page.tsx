import { UsersManagement } from "@/components/settings/users-management"

export default function UsersSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">User Management</h1>
        <p className="text-sm text-muted-foreground">
          Create, edit, and manage system accounts, roles, and access
        </p>
      </div>

      <UsersManagement />
    </div>
  )
}
