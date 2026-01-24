import { notFound } from "next/navigation";
import { contentLoaders, contentSlugs, type ContentSlug } from "@/build/content-map";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const key = slug as ContentSlug;

  const loader = contentLoaders[key];
  if (!loader) notFound();

  const mod = await loader();
  const Post = mod.default;

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
  return contentSlugs.map((slug) => ({ slug }));
}

export const dynamicParams = false;
