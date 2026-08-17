"use client"

import { useParams, useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AssignEmployeesPanel } from "@/components/projects/assign-employees-panel"
import { ProjectFormDialog } from "@/components/projects/project-form-dialog"
import { toast } from "sonner"
import { ArrowLeft, FolderKanban } from "lucide-react"
import Link from "next/link"
import type { Project } from "@prisma/client"

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: project, isLoading } = trpc.project.getById.useQuery({ id })

  const toggleActiveMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      utils.project.getById.invalidate({ id })
      toast.success(project?.isActive ? "Project deactivated" : "Project activated")
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <FolderKanban className="size-12 text-muted-foreground/40 mb-4" />
        <p className="text-sm text-muted-foreground">Project not found</p>
        <Button variant="link" onClick={() => router.push("/projects")}>
          Back to Projects
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/projects" />}>
          <ArrowLeft className="mr-1 size-4" />
          Projects
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant={project.isActive ? "default" : "secondary"}>
              {project.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {project.isActive ? "Active" : "Inactive"}
            </span>
            <Switch
              checked={project.isActive}
              onCheckedChange={(checked) =>
                toggleActiveMutation.mutate({
                  id: project.id,
                  data: { isActive: checked },
                })
              }
            />
          </div>
          <ProjectFormDialog project={project} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Employee Assignment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AssignEmployeesPanel projectId={project.id} />
        </CardContent>
      </Card>
    </div>
  )
}
