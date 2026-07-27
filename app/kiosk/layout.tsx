export default function KioskLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-foreground">
      {children}
    </div>
  )
}
