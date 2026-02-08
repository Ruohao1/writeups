import { notFound, redirect } from "next/navigation"
import WriteupsIndex from "@/components/writeups/index"
import { contentMetadata, contentMetadataBySlug } from "@/build/content-metadata"
import { platformToSlug } from "@/lib/content-routing"

type PageProps = {
  params: Promise<{ platform: string }>
}

export default async function Page({ params }: PageProps) {
  const { platform } = await params
  const platformSlugs = new Set(
    contentMetadata.map((entry) => platformToSlug(entry.platform))
  )

  if (platformSlugs.has(platform)) {
    return <WriteupsIndex platformSlug={platform} />
  }

  const legacyMatches = contentMetadataBySlug[platform] as unknown as
    | typeof contentMetadata
    | undefined
  if (legacyMatches?.length === 1) {
    const entry = legacyMatches[0]
    const platformSlug = platformToSlug(entry.platform)
    redirect(`/${platformSlug}/${entry.slug}`)
  }

  notFound()
}

export async function generateStaticParams() {
  const platformSlugs = new Set(
    contentMetadata.map((entry) => platformToSlug(entry.platform))
  )
  const legacySlugs = contentMetadata.map((entry) => entry.slug)
  return [...platformSlugs, ...legacySlugs].map((platform) => ({ platform }))
}

export const dynamicParams = false
