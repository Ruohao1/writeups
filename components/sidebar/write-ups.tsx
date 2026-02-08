"use client"

import { ChevronRight, type LucideIcon } from "lucide-react"
import Link from "next/link"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

export function NavWriteups({
  groups,
}: {
  groups: {
    label: string
    href?: string
    icon?: LucideIcon
    iconSrc?: string
    items: {
      title: string
      icon?: LucideIcon
      iconSrc?: string
      isActive?: boolean
      items?: {
        title: string
        url: string
      }[]
    }[]
  }[]
}) {
  return (
    <>
      {groups.map((group) => (
        <SidebarGroup key={group.label}>
          <SidebarGroupLabel className="flex items-center gap-2 transition-colors hover:bg-accent hover:text-accent-foreground">
            {group.href ? (
              <Link
                href={group.href}
                className="flex items-center gap-2 "
              >
                {group.icon && <group.icon className="h-4 w-4" />}
                {!group.icon && group.iconSrc && (
                  <img src={group.iconSrc} className="h-4 w-4" />
                )}
                <span>{group.label}</span>
              </Link>
            ) : (
              <>
                {group.icon && <group.icon className="h-4 w-4" />}
                {!group.icon && group.iconSrc && (
                  <img src={group.iconSrc} className="h-4 w-4" />
                )}
                <span>{group.label}</span>
              </>
            )}
          </SidebarGroupLabel>
          <SidebarMenu>
            {group.items.map((item) => (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={item.isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      {item.icon && <item.icon />}
                      {!item.icon && item.iconSrc && (
                        <img src={item.iconSrc} className="h-4 w-4" />
                      )}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      ))}
    </>
  )
}
