"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Plus, Pencil } from "lucide-react"
import type { Project } from "@prisma/client"

interface ProjectFormDialogProps {
  project?: Project
  trigger?: React.ReactElement
  onCreated?: () => void
}

export function ProjectFormDialog({ project, trigger, onCreated }: ProjectFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(project?.name ?? "")
  const [description, setDescription] = useState(project?.description ?? "")

  const utils = trpc.useUtils()

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      toast.success("Project created")
      setOpen(false)
      resetForm()
      onCreated?.()
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      utils.project.getById.invalidate({ id: project?.id ?? "" })
      toast.success("Project updated")
      setOpen(false)
      onCreated?.()
    },
    onError: (err) => toast.error(err.message),
  })

  const resetForm = () => {
    setName("")
    setDescription("")
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (project) {
      updateMutation.mutate({
        id: project.id,
        data: { name, description: description || undefined },
      })
    } else {
      createMutation.mutate({
        name,
        description: description || undefined,
      })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v && project) {
          setName(project.name)
          setDescription(project.description ?? "")
        } else if (v) {
          resetForm()
        }
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <Plus className="mr-1 size-4" />
              New Project
            </Button>
          )
        }
      ></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="projectName">Project Name *</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Site Alpha"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="projectDesc">Description</Label>
            <Textarea
              id="projectDesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : project ? "Save Changes" : "Create Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
