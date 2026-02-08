"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { contentMetadata, type ContentMetadata } from "@/build/content-metadata"
import { platformToSlug } from "@/lib/content-routing"

const PLATFORM_ORDER = ["TryHackMe", "HackTheBox", "Other"]
const CATEGORY_FALLBACK = "Misc"

const PLATFORM_ICONS: Record<string, string> = {
  TryHackMe: "https://tryhackme.com/favicon.svg",
  HackTheBox: "https://app.hackthebox.com/favicon.ico",
}

function formatDate(value: string | null) {
  if (!value) return ""
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date)
}

function sortByDateDesc(a: string | null, b: string | null) {
  const aTime = a ? Date.parse(a) : 0
  const bTime = b ? Date.parse(b) : 0
  return bTime - aTime
}

function buildGroups(items: ContentMetadata[]) {
  const platformMap = new Map<string, Map<string, ContentMetadata[]>>()

  for (const entry of items) {
    const platform = entry.platform || "Other"
    const category = entry.category || CATEGORY_FALLBACK
    let categoryMap = platformMap.get(platform)
    if (!categoryMap) {
      categoryMap = new Map()
      platformMap.set(platform, categoryMap)
    }
    if (!categoryMap.has(category)) {
      categoryMap.set(category, [])
    }
    const list = categoryMap.get(category)
    if (list) list.push(entry)
  }

  const platforms = Array.from(platformMap.entries()).sort((a, b) => {
    const aIndex = PLATFORM_ORDER.indexOf(a[0])
    const bIndex = PLATFORM_ORDER.indexOf(b[0])
    if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return platforms.map(([platform, categories]) => {
    const categoryEntries = Array.from(categories.entries()).sort((a, b) => {
      if (a[0] === CATEGORY_FALLBACK) return 1
      if (b[0] === CATEGORY_FALLBACK) return -1
      return a[0].localeCompare(b[0])
    })

    return {
      platform,
      categories: categoryEntries.map(([category, entries]) => ({
        category,
        entries: [...entries].sort((a, b) => {
          const dateDiff = sortByDateDesc(a.date, b.date)
          if (dateDiff !== 0) return dateDiff
          return a.title.localeCompare(b.title)
        }),
      })),
    }
  })
}

type WriteupsIndexProps = {
  platformSlug?: string
}

export default function WriteupsIndex({ platformSlug }: WriteupsIndexProps) {
  const [query, setQuery] = useState("")

  const scoped = useMemo(() => {
    if (!platformSlug) return contentMetadata
    return contentMetadata.filter(
      (entry) => platformToSlug(entry.platform) === platformSlug
    )
  }, [platformSlug])

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return scoped

    return scoped.filter((entry) => {
      const haystack = [
        entry.title,
        entry.summary ?? "",
        entry.platform,
        entry.category,
        entry.event ?? "",
        entry.difficulty ?? "",
        entry.tags.join(" "),
      ]
        .join(" ")
        .toLowerCase()

      return haystack.includes(trimmed)
    })
  }, [query, scoped])

  const groups = useMemo(() => buildGroups(filtered), [filtered])

  return (
    <div className="flex flex-1 flex-col gap-8 p-6 pt-0">
      <section className="border border-slate-800 bg-slate-950/70 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
            CTF Write-ups
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">
            Field Notes & Attack Paths
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Tactics, timelines, and exploitation notes across rooms, boxes, and events.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
          Search
        </label>
        <div className="relative">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by title, tag, platform, category, or summary"
            className="w-full rounded-none border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/60 focus:outline-none"
          />
        </div>
        <div className="text-xs text-slate-500">
          {filtered.length} result{filtered.length === 1 ? "" : "s"}
        </div>
      </section>

      {groups.map((group) => (
        <section key={group.platform} className="space-y-4">
          <div className="flex items-center gap-3">
            {PLATFORM_ICONS[group.platform] && (
              <img
                src={PLATFORM_ICONS[group.platform]}
                alt={`${group.platform} icon`}
                className="h-5 w-5"
              />
            )}
            <h2 className="text-xl font-semibold text-slate-200">
              {group.platform}
            </h2>
            <span className="text-xs text-slate-500">
              {group.categories.reduce((sum, category) => sum + category.entries.length, 0)} write-ups
            </span>
          </div>

          <div className="grid gap-4">
            {group.categories.map((category) => (
              <div
                key={category.category}
                className="rounded-none border border-slate-800/80 bg-slate-900/40 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-200">
                    {category.category}
                  </h3>
                  <span className="text-xs text-slate-500">
                    {category.entries.length} entries
                  </span>
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {category.entries.map((entry) => (
                    <Link
                      key={entry.slug}
                      href={`/${platformToSlug(entry.platform)}/${entry.slug}`}
                      className="group rounded-none border border-slate-800/70 bg-slate-950/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-950"
                    >
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{formatDate(entry.date)}</span>
                        {entry.difficulty && (
                          <span className="rounded-none border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                            {entry.difficulty}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-2 text-lg font-semibold text-slate-100 group-hover:text-white">
                        {entry.title}
                      </h4>
                      <p className="mt-1 text-sm text-slate-400">
                        {entry.summary || "No summary yet."}
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {entry.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="rounded-none bg-slate-900 px-2 py-1 text-[11px] text-slate-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
