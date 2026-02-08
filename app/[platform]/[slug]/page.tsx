import { notFound, redirect } from "next/navigation"
import { contentLoaders, contentSlugs } from "@/build/content-map"
import { contentMetadataByKey } from "@/build/content-metadata"
import { platformToSlug } from "@/lib/content-routing"

type PageProps = {
  params: Promise<{ platform: string; slug: string }>
}

export default async function Page({ params }: PageProps) {
  const { platform, slug } = await params
  const key = `${platform}/${slug}`
  const loader = contentLoaders[key as keyof typeof contentLoaders]
  if (!loader) notFound()

  const meta = contentMetadataByKey[key]
  const expectedPlatform = meta ? platformToSlug(meta.platform) : null
  if (!expectedPlatform) notFound()
  if (platform !== expectedPlatform) {
    redirect(`/${expectedPlatform}/${slug}`)
  }

  const mod = await loader()
  const Post = mod.default

  return (
    <article
      className="
      w-full
      mx-auto pb-16
      px-4 sm:px-6 lg:px-8
      max-w-none sm:max-w-2xl md:max-w-3xl lg:max-w-4xl
      prose prose-invert
      prose-headings:text-
      prose-p:text-slate-300
      prose-strong:text-slate-200
      prose-a:text-cyan-300 prose-a:no-underline hover:prose-a:underline
      prose-code:text-accent
      prose-pre:bg-slate-900
      prose-hr:border-slate-800
      prose-blockquote:border-slate-700 prose-blockquote:text-slate-300
  "
    >
      <Post />
    </article>
  )
}

export async function generateStaticParams() {
  return contentSlugs.map((key) => {
    const [platform, slug] = key.split("/")
    return { platform, slug }
  })
}

export const dynamicParams = false
