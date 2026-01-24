"use client"


import * as React from "react"
import {
  Shield,
  BookOpen,
  Bot,
  Settings2,
  SquareTerminal,
} from "lucide-react"

import { NavUser } from "./user"
import { NavNotes } from "./notes"
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
import { NavTHM } from "./tryhackme"
import Link from "next/link"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navTHM: [
    {
      title: "Red",
      url: "/red",
      icon: Shield,
      iconClassName: "text-red-500",
      isActive: true,
      items: [
        {
          title: "dogcat",
          url: "/dogcat",
        },
        {
          title: "wonderland",
          url: "/wonderland",
        },
        {
          title: "ultratech",
          url: "/ultratech",
        },
      ],
    },
    {
      title: "Blue",
      url: "/blue",
      icon: Shield,
      iconClassName: "text-blue-500",
      isActive: true,
      items: [
      ],
    },
    {
      title: "Purple",
      url: "/purple",
      icon: Shield,
      iconClassName: "text-purple-500",
      isActive: true,
      items: [
      ],
    }

  ],

  navWriteups: [
    {
      title: "TryHackMe",
      url: "/tryhackme",
      iconSrc: "https://tryhackme.com/favicon.svg",
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>

            <Link href="https://ruohao.dev/" className="cursor-pointer" >
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:pointer data-[state=open]:text-sidebar-accent-foreground"
              >
                <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center">
                  <Avatar className="h-7 w-7 shrink-0 rounded-lg!">
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
        <NavTHM items={data.navTHM} />
        {/* <NavWriteups items={data.navWriteups} /> */}
        {/* <NavNotes items={data.navMain} /> */}

      </SidebarContent>
      <SidebarFooter>
        {/* <NavUser user={data.user} /> */}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
