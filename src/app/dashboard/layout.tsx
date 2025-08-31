'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Plus, 
  Trophy, 
  Users, 
  LogOut,
  Target
} from 'lucide-react'
import Link from 'next/link'

const menuItems = [
  {
    title: "Programs",
    url: "/dashboard/programs",
    icon: BookOpen,
  },
  {
    title: "Add Programs",
    url: "/dashboard/add-programs",
    icon: Plus,
  },
  {
    title: "Add Prizes",
    url: "/dashboard/add-prizes",
    icon: Trophy,
  },
  {
    title: "Program Assignments",
    url: "/dashboard/program-assignments",
    icon: Target,
  },
  {
    title: "Add Students",
    url: "/dashboard/add-students",
    icon: Users,
  },
]

function AppSidebar() {
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarContent className="p-0">
        <SidebarGroup className="px-3 py-4">
          <SidebarGroupLabel className="px-2 text-xs font-semibold text-gray-900 uppercase tracking-wider">
            Program Manager
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-3">
            <SidebarMenu className="space-y-1">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-9 px-3 rounded-md hover:bg-gray-100 transition-colors">
                    <Link href={item.url} className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mt-auto p-3">
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            size="sm"
            className="w-full h-8 text-xs"
          >
            <LogOut className="mr-1.5 h-3 w-3" />
            Logout
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
      }
      setLoading(false)
    }

    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/login')
      } else if (session?.user) {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="flex h-12 items-center px-4">
              <SidebarTrigger className="h-8 w-8" />
              <div className="ml-auto">
                <span className="text-xs text-gray-600">
                  {user.email}
                </span>
              </div>
            </div>
          </header>
          <div className="flex-1 p-4">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}