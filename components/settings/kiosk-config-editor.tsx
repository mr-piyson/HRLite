"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, CheckCircle2, ExternalLink } from "lucide-react"
import type { KioskConfig } from "@prisma/client"

interface KioskConfigEditorProps {
  config: KioskConfig | null
  isLoading?: boolean
}

export function KioskConfigEditor({ config, isLoading }: KioskConfigEditorProps) {
  const [kioskName, setKioskName] = useState(config?.kioskName ?? "")
  const [deviceName, setDeviceName] = useState(config?.deviceName ?? "")
  const [location, setLocation] = useState(config?.location ?? "")
  const [autoFullscreen, setAutoFullscreen] = useState(config?.autoFullscreen ?? true)
  const [autoResetAfterSuccess, setAutoResetAfterSuccess] = useState(config?.autoResetAfterSuccess ?? true)
  const [successScreenDuration, setSuccessScreenDuration] = useState(config?.successScreenDuration ?? 3)
  const [cameraEnabled, setCameraEnabled] = useState(config?.cameraEnabled ?? false)
  const [qrCodeEnabled, setQrCodeEnabled] = useState(config?.qrCodeEnabled ?? true)
  const [rfidEnabled, setRfidEnabled] = useState(config?.rfidEnabled ?? false)
  const [pinEnabled, setPinEnabled] = useState(config?.pinEnabled ?? false)
  const [faceRecognitionEnabled, setFaceRecognitionEnabled] = useState(config?.faceRecognitionEnabled ?? false)
  const [fingerprintEnabled, setFingerprintEnabled] = useState(config?.fingerprintEnabled ?? false)
  const [workdayStart, setWorkdayStart] = useState(config?.workdayStart ?? "09:00")
  const [lateGraceMinutes, setLateGraceMinutes] = useState(config?.lateGraceMinutes ?? 15)
  const [standardWorkMinutes, setStandardWorkMinutes] = useState(config?.standardWorkMinutes ?? 480)
  const [halfDayMinutes, setHalfDayMinutes] = useState(config?.halfDayMinutes ?? 240)

  const utils = trpc.useUtils()
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.list.invalidate()
      utils.settings.active.invalidate()
      toast.success("Kiosk configuration updated")
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.settings.delete.useMutation({
    onSuccess: () => {
      utils.settings.list.invalidate()
      utils.settings.active.invalidate()
      toast.success("Kiosk configuration deleted")
      setShowDeleteAlert(false)
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">No kiosk configuration found</p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      id: config.id,
      data: {
        kioskName,
        deviceName: deviceName || undefined,
        location: location || undefined,
        autoFullscreen,
        autoResetAfterSuccess,
        successScreenDuration,
        cameraEnabled,
        qrCodeEnabled,
        rfidEnabled,
        pinEnabled,
        faceRecognitionEnabled,
        fingerprintEnabled,
        workdayStart,
        lateGraceMinutes,
        standardWorkMinutes,
        halfDayMinutes,
      },
    })
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label htmlFor="kioskName">Kiosk Name *</Label>
              <Input id="kioskName" value={kioskName} onChange={(e) => setKioskName(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="deviceName">Device Name</Label>
              <Input id="deviceName" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          {config?.slug && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <Label className="text-xs text-muted-foreground">Kiosk URL</Label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate text-sm font-mono">
                  /kiosk/{config.slug}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/kiosk/${config.slug}`
                    navigator.clipboard.writeText(url)
                    toast.success("URL copied to clipboard")
                  }}
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <Copy className="size-3.5" />
                </button>
                <a
                  href={`/kiosk/${config.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Display Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Display</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Fullscreen</Label>
              <p className="text-xs text-muted-foreground">Automatically enter fullscreen mode</p>
            </div>
            <Switch checked={autoFullscreen} onCheckedChange={setAutoFullscreen} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto Reset After Success</Label>
              <p className="text-xs text-muted-foreground">Automatically return to idle after check-in/out</p>
            </div>
            <Switch checked={autoResetAfterSuccess} onCheckedChange={setAutoResetAfterSuccess} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="successScreenDuration">Success Screen Duration (seconds)</Label>
            <Input
              id="successScreenDuration"
              type="number"
              min={1}
              max={30}
              value={successScreenDuration}
              onChange={(e) => setSuccessScreenDuration(parseInt(e.target.value) || 3)}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Identification Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Identification Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Camera Enabled", key: "cameraEnabled", value: cameraEnabled, set: setCameraEnabled },
            { label: "QR Code", key: "qrCodeEnabled", value: qrCodeEnabled, set: setQrCodeEnabled },
            { label: "RFID", key: "rfidEnabled", value: rfidEnabled, set: setRfidEnabled },
            { label: "PIN Code", key: "pinEnabled", value: pinEnabled, set: setPinEnabled },
            { label: "Face Recognition", key: "faceRecognitionEnabled", value: faceRecognitionEnabled, set: setFaceRecognitionEnabled },
            { label: "Fingerprint", key: "fingerprintEnabled", value: fingerprintEnabled, set: setFingerprintEnabled },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <Label>{item.label}</Label>
              <Switch checked={item.value} onCheckedChange={item.set} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Attendance Policy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Attendance Policy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="workdayStart">Workday Start Time</Label>
              <Input id="workdayStart" type="time" value={workdayStart} onChange={(e) => setWorkdayStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lateGraceMinutes">Late Grace Period (minutes)</Label>
              <Input id="lateGraceMinutes" type="number" min={0} max={240} value={lateGraceMinutes} onChange={(e) => setLateGraceMinutes(parseInt(e.target.value) || 0)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="standardWorkMinutes">Standard Work Day (minutes)</Label>
              <Input id="standardWorkMinutes" type="number" min={60} max={1440} value={standardWorkMinutes} onChange={(e) => setStandardWorkMinutes(parseInt(e.target.value) || 480)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="halfDayMinutes">Half Day Threshold (minutes)</Label>
              <Input id="halfDayMinutes" type="number" min={30} max={1440} value={halfDayMinutes} onChange={(e) => setHalfDayMinutes(parseInt(e.target.value) || 240)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteAlert(true)}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? "Deleting..." : "Delete Kiosk"}
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </form>

    <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Kiosk Configuration</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{config?.kioskName}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate({ id: config!.id })}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
