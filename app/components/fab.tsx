import { Plus } from "lucide-react"
import Link from "next/link"

interface FabProps {
  href: string
  label: string
}

export function Fab({ href, label }: FabProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-white shadow-lg transition-all duration-200"
    >
      <Plus className="w-6 h-6" />
    </Link>
  )
}
