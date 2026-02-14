import { Plus } from "lucide-react"
import Link from "next/link"
import { PageHeader } from "@/app/components/page-header"

export default function AdminTournamentsPage() {
  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader title="大会管理" />

        <Link
          href="/admin/tournaments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          新規大会作成
        </Link>
      </div>
    </main>
  )
}
