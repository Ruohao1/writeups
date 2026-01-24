export default function Page() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="grid auto-rows-min gap-4 md:grid-cols-3">
        <div className="bg-muted/50 aspect-video " />
        <div className="bg-muted/50 aspect-video " />
        <div className="bg-muted/50 aspect-video " />
      </div>
      <div className="bg-muted/50 min-h-screen flex-1 md:min-h-min" />
    </div>
  )
}
