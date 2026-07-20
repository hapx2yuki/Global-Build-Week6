"use client"

import {
  ChevronsUpDown,
  CircleCheck,
  CircleDashed,
  FolderGit2,
  HardDrive,
  Languages,
  MoreHorizontal,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { stages } from "@/lib/criteriaforge-data"

export function CriteriaForgeSidebar() {
  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <SidebarHeader className="gap-4 border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="font-editorial text-[22px] leading-none tracking-[-0.03em]">
            CriteriaForge
          </div>
          <Badge
            variant="outline"
            className="border-sidebar-foreground/15 bg-sidebar-foreground/5 font-mono text-[9px] tracking-[0.14em] text-sidebar-foreground/60"
          >
            LOCAL
          </Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-lg border border-sidebar-border bg-sidebar-accent/55 px-3 py-2.5 text-left outline-none transition-colors hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/50"
              />
            }
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-foreground text-sidebar">
              <FolderGit2 className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                CriteriaForge
              </span>
              <span className="block truncate font-mono text-[10px] text-sidebar-foreground/50">
                constitution v0.3
              </span>
            </span>
            <ChevronsUpDown className="size-4 text-sidebar-foreground/50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>Current project</DropdownMenuLabel>
            <DropdownMenuItem>
              <FolderGit2 />
              CriteriaForge
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Languages />
              English / 日本語
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
            Build loop
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {stages.map((stage, index) => {
                const Icon = stage.icon
                const isCurrent = stage.state === "current"
                const isComplete = stage.state === "complete"

                return (
                  <SidebarMenuItem key={stage.id}>
                    <SidebarMenuButton
                      isActive={isCurrent}
                      tooltip={stage.label}
                      className="h-auto min-h-11 items-start gap-3 py-2.5 data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      <span className="relative mt-0.5 flex size-6 shrink-0 items-center justify-center">
                        {isCurrent && (
                          <span className="absolute -left-3 h-5 w-0.5 rounded-full bg-ember" />
                        )}
                        <Icon
                          className={
                            isCurrent
                              ? "text-ember"
                              : isComplete
                                ? "text-approved"
                                : "text-sidebar-foreground/45"
                          }
                        />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium">
                          {stage.label}
                        </span>
                        <span className="mt-0.5 block line-clamp-2 text-[10px] leading-relaxed text-sidebar-foreground/45">
                          {stage.description}
                        </span>
                      </span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge className="font-mono text-[9px] text-sidebar-foreground/35">
                      {String(index + 1).padStart(2, "0")}
                    </SidebarMenuBadge>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto px-3 pb-4">
          <SidebarGroupLabel className="px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Private evidence store">
                  <HardDrive className="text-sidebar-foreground/55" />
                  <span>Private evidence</span>
                </SidebarMenuButton>
                <SidebarMenuBadge className="text-sidebar-foreground/50">
                  14
                </SidebarMenuBadge>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Local status">
                  <CircleCheck className="text-approved" />
                  <span>Saved locally</span>
                </SidebarMenuButton>
                <SidebarMenuAction aria-label="More local storage options">
                  <MoreHorizontal />
                </SidebarMenuAction>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <Avatar className="size-8 border border-sidebar-border">
            <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">
              CO
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">Constitution Owner</p>
            <p className="flex items-center gap-1 truncate text-[10px] text-sidebar-foreground/45">
              <CircleDashed className="size-3" />
              ChatGPT sign-in pending
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
