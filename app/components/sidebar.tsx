"use client"

import { signOut } from "@/app/actions/auth"
import { Calendar, Home, LogOut, Menu, Trophy, User, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

type NavItem = {
  label: string
  href: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="size-5" />,
  },
  {
    label: "Tournaments",
    href: "/tournaments",
    icon: <Trophy className="size-5" />,
  },
  {
    label: "Schedule",
    href: "/schedule",
    icon: <Calendar className="size-5" />,
  },
  {
    label: "My Page",
    href: "/mypage",
    icon: <User className="size-5" />,
  },
]

type SidebarProps = {
  isLoggedIn: boolean
  userName?: string
}

export function Sidebar({ isLoggedIn, userName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  const closeMenu = () => setIsOpen(false)

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo / App Name */}
      <div className="flex h-16 items-center gap-3 border-b border-primary/20 px-6">
        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-amber-500 shadow-lg shadow-primary/25">
          <Trophy className="size-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-text-primary tracking-tight">
            JiroRimi
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                active
                  ? "bg-gradient-to-r from-primary to-primary-hover text-white shadow-md shadow-primary/30"
                  : "text-text-secondary hover:bg-primary-light hover:text-primary"
              }`}
            >
              <span
                className={`transition-transform duration-200 ${!active && "group-hover:scale-110"}`}
              >
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {active && (
                <span className="ml-auto size-2 animate-pulse rounded-full bg-white/80" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User Section & Logout */}
      <div className="border-t border-primary/10 p-4">
        {isLoggedIn ? (
          <>
            {userName && (
              <div className="mb-3 flex items-center gap-3 rounded-xl bg-primary-light/50 px-4 py-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-amber-500/20">
                  <User className="size-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-text-secondary">
                    Signed in
                  </span>
                  <span className="font-medium text-sm text-text-primary truncate max-w-[140px]">
                    {userName}
                  </span>
                </div>
              </div>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-text-secondary transition-all duration-200 hover:bg-error/10 hover:text-error"
              >
                <LogOut className="size-5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                <span className="font-medium">Sign out</span>
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            onClick={closeMenu}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-hover px-4 py-3 font-semibold text-white shadow-md shadow-primary/30 transition-all duration-200 hover:shadow-lg hover:shadow-primary/40"
          >
            <User className="size-5" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center justify-between border-b border-primary/10 bg-white/95 px-4 backdrop-blur-sm md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-amber-500">
            <Trophy className="size-4 text-white" />
          </div>
          <span className="font-bold text-text-primary">JiroRimi</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex size-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-primary-light hover:text-primary"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 cursor-default bg-black/20 backdrop-blur-sm md:hidden"
          onClick={closeMenu}
          onKeyDown={(e) => e.key === "Escape" && closeMenu()}
          aria-label="Close menu"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-primary/10 bg-white shadow-xl transition-transform duration-300 ease-out md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
