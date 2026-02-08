"use client"


import * as React from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavWriteups } from "./write-ups"
import Link from "next/link"
import { contentMetadata, type ContentMetadata } from "@/build/content-metadata"
import { platformToSlug } from "@/lib/content-routing"

const PLATFORM_ORDER = ["TryHackMe", "HackTheBox", "Other"]
const CATEGORY_FALLBACK = "Misc"
const PLATFORM_ICONS: Record<string, string> = {
  TryHackMe: "https://tryhackme.com/favicon.svg",
  HackTheBox: "https://app.hackthebox.com/favicon.ico",
  "NCC CTF": "/branding/ncc-ctf.png",
}

function toSortDate(value: string | null) {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

function buildWriteupGroups() {
  const platformMap = new Map<string, Map<string, ContentMetadata[]>>()

  for (const entry of contentMetadata) {
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
    const entries = categoryMap.get(category)
    if (entries) entries.push(entry)
  }

  const platforms = Array.from(platformMap.entries()).sort((a, b) => {
    const aIndex = PLATFORM_ORDER.indexOf(a[0])
    const bIndex = PLATFORM_ORDER.indexOf(b[0])
    if (aIndex === -1 && bIndex === -1) return a[0].localeCompare(b[0])
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return platforms.map(([platform, categoryMap]) => {
    const categories = Array.from(categoryMap.entries()).sort((a, b) => {
      if (a[0] === CATEGORY_FALLBACK) return 1
      if (b[0] === CATEGORY_FALLBACK) return -1
      return a[0].localeCompare(b[0])
    })

    const items = categories.map(([category, entries]) => {
      const sorted = [...entries].sort((a, b) => {
        const dateDiff = toSortDate(b.date) - toSortDate(a.date)
        if (dateDiff !== 0) return dateDiff
        return a.title.localeCompare(b.title)
      })

      return {
        title: category,
        isActive: true,
        items: sorted.map((entry) => ({
          title: entry.title,
          url: `/${platformToSlug(entry.platform)}/${entry.slug}`,
        })),
      }
    })

    return {
      label: platform,
      href: `/${platformToSlug(platform)}`,
      iconSrc: PLATFORM_ICONS[platform],
      items,
    }
  })
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
  const writeupGroups = buildWriteupGroups()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>

            <Link
              href="https://ruohao.dev/"
              className="cursor-pointer"
              target="_blank"
              rel="noreferrer"
            >
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:pointer data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center">
                  <Avatar className="h-7 w-7 shrink-0 rounded-none">
                    <AvatarImage src="https://ruohao.dev/profile.jpg" className='${state === "collapsed" ? "hidden" : ""}' />
                    <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">RH</AvatarFallback>
                  </Avatar>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Ruohao</span>
                </div>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavWriteups groups={writeupGroups} />

      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
