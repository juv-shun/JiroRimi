"use client"

import { signOut } from "@/app/actions/auth"
import logoImage from "@/public/logo.png"
import {
  Home,
  LogOut,
  Menu,
  Settings,
  Trophy,
  User,
  X,
} from "lucide-react"
import Image from "next/image"
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
  // {
  //   label: "Schedule",
  //   href: "/schedule",
  //   icon: <Calendar className="size-5" />,
  // },
  {
    label: "My Page",
    href: "/mypage",
    icon: <User className="size-5" />,
  },
]

const adminNavItems: NavItem[] = [
  {
    label: "大会管理",
    href: "/admin/tournaments",
    icon: <Settings className="size-5" />,
  },
]

type SidebarProps = {
  isLoggedIn: boolean
  userName?: string
  isFirstTimeSetup?: boolean
  isAdmin?: boolean
}

export function Sidebar({
  isLoggedIn,
  userName,
  isFirstTimeSetup = false,
  isAdmin = false,
}: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/"
    }
    return pathname.startsWith(href)
  }

  const closeMenu = () => setIsOpen(false)

  // 初回登録モード時にナビゲーションを非活性化するか判定
  const isNavDisabled = (href: string) => {
    return isFirstTimeSetup && href !== "/mypage"
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-[#171310] text-text-primary">
      {/* Logo / App Name */}
      <div className="border-b border-[#d8a24c]/10 px-4 py-5">
        <div className="mb-2 flex items-center gap-3">
          <div className="rounded-2xl border border-[#d8a24c]/25 bg-[#f3ecde] p-2 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
            <Image
              src={logoImage}
              alt="Jiro-Rimi Cup"
              width={48}
              height={48}
              className="size-12"
              priority
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#d8a24c]">
              Official
            </p>
            <span className="text-lg font-black tracking-[0.08em] text-text-primary">
              Jiro-Rimi Cup
            </span>
          </div>
        </div>
        <p className="text-xs leading-5 text-text-secondary">
          競技進行と参加導線をまとめたトーナメントコンソール
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const disabled = isNavDisabled(item.href)

          if (disabled) {
            return (
              <div
                key={item.href}
                title="プロフィールを完了してください"
                className="group flex cursor-not-allowed items-center gap-3 rounded-2xl border border-white/5 px-4 py-3 opacity-45"
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeMenu}
              className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
                active
                  ? "border-[#d8a24c]/20 bg-gradient-to-r from-primary/90 to-[#7a1219] text-white shadow-[0_16px_30px_rgba(107,10,18,0.35)]"
                  : "border-transparent text-text-secondary hover:border-[#d8a24c]/12 hover:bg-white/[0.03] hover:text-[#f4efe6]"
              }`}
            >
              <span
                className={`transition-transform duration-200 ${!active && "group-hover:translate-x-0.5"}`}
              >
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {active && (
                <span className="ml-auto size-2 animate-pulse rounded-full bg-[#f2d7aa]" />
              )}
            </Link>
          )
        })}

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-[#d8a24c]/10" />
            {adminNavItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMenu}
                  className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
                    active
                      ? "border-[#d8a24c]/20 bg-gradient-to-r from-primary/90 to-[#7a1219] text-white shadow-[0_16px_30px_rgba(107,10,18,0.35)]"
                      : "border-transparent text-text-secondary hover:border-[#d8a24c]/12 hover:bg-white/[0.03] hover:text-[#f4efe6]"
                  }`}
                >
                  <span
                    className={`transition-transform duration-200 ${!active && "group-hover:translate-x-0.5"}`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                  {active && (
                    <span className="ml-auto size-2 animate-pulse rounded-full bg-[#f2d7aa]" />
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User Section & Logout */}
      <div className="border-t border-[#d8a24c]/10 p-4">
        {isLoggedIn ? (
          <>
            {userName && (
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3">
                <div className="flex size-9 items-center justify-center rounded-full border border-[#d8a24c]/20 bg-primary/10">
                  <User className="size-4 text-[#f2d7aa]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs uppercase tracking-[0.16em] text-text-secondary">
                    Signed in
                  </span>
                  <span className="max-w-[140px] truncate text-sm font-medium text-text-primary">
                    {userName}
                  </span>
                </div>
              </div>
            )}
            <form action={signOut}>
              <button
                type="submit"
                disabled={isFirstTimeSetup}
                title={
                  isFirstTimeSetup
                    ? "プロフィールを完了してください"
                    : undefined
                }
                className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-text-secondary transition-all duration-200 ${
                  isFirstTimeSetup
                    ? "cursor-not-allowed border-white/5 opacity-50"
                    : "border-transparent hover:border-primary/20 hover:bg-primary/10 hover:text-[#ffd7dc]"
                }`}
              >
                <LogOut
                  className={`size-5 transition-transform duration-200 ${!isFirstTimeSetup && "group-hover:-translate-x-0.5"}`}
                />
                <span className="font-medium">Sign out</span>
              </button>
            </form>
          </>
        ) : (
          <Link
            href="/login"
            onClick={closeMenu}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary-hover px-4 py-3 font-semibold text-white shadow-[0_18px_32px_rgba(107,10,18,0.32)] transition-all duration-200 hover:translate-y-[-1px] hover:shadow-[0_22px_36px_rgba(107,10,18,0.4)]"
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
      <header className="fixed top-0 right-0 left-0 z-40 flex h-14 items-center justify-between border-b border-[#d8a24c]/10 bg-[#171310]/95 px-4 backdrop-blur-sm md:hidden">
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[#d8a24c]/25 bg-[#f3ecde] p-1.5">
            <Image
              src={logoImage}
              alt="Jiro-Rimi Cup"
              width={36}
              height={36}
              className="size-9"
              priority
            />
          </div>
          <span className="font-bold tracking-[0.06em] text-text-primary">Jiro-Rimi Cup</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex size-10 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-white/5 hover:text-[#f4efe6]"
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-[#d8a24c]/10 bg-[#171310] shadow-xl transition-transform duration-300 ease-out md:translate-x-0 md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
