"use client"

import { SignOutButton } from "@clerk/nextjs";
import {
  Activity,
  CreditCard,
  Home,
  LogOut,
  Settings,
  User
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Button } from "@workspace/ui/components/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar
} from "@workspace/ui/components/sidebar";

interface AppSidebarProps {
  user: {
    displayName: string
    email: string
    avatarUrl: string
  }
}

const navigationItems = [
  {
    title: "Overview",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Recent Activity",
    url: "#",
    icon: Activity,
  },
  {
    title: "Billing",
    url: "#",
    icon: CreditCard,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]

function AppSidebarContent({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  // Safety check for user data
  if (!user) {
    return null
  }

  return (
    <>
      <SidebarHeader>
        <div className={`flex items-center gap-3 py-2 ${isCollapsed ? "" : "px-2"}`}>
          <Avatar className={isCollapsed ? "h-8 w-8" : "h-12 w-12"}>
            <AvatarImage src={user.avatarUrl} alt={`${user.displayName} avatar`} />
            <AvatarFallback>
              <User className={isCollapsed ? "h-4 w-4" : "h-6 w-6"} />
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col">
              <p className="text-sm font-semibold leading-none">{user.displayName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={isCollapsed ? item.title : undefined}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2">
          <SignOutButton>
            <Button
              variant="outline"
              className={isCollapsed ? "w-full justify-center px-2" : "w-full justify-center"}
              size={isCollapsed ? "icon" : "default"}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed && <span className="ml-2">Sign Out</span>}
            </Button>
          </SignOutButton>
        </div>
      </SidebarFooter>
    </>
  )
}

export function AppSidebar({ user }: AppSidebarProps) {
  // Safety check for user data
  if (!user) {
    return null
  }

  return (
    <Sidebar
      variant="sidebar"
      collapsible="icon"
    >
      <AppSidebarContent user={user} />
      <SidebarRail />
    </Sidebar>
  )
}
