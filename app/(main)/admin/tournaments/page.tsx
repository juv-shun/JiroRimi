import { Plus } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { TournamentWithEventCount } from "@/lib/types/tournament"
import { TournamentList } from "./tournament-list"

export default async function AdminTournamentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect("/")
  }

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("id, name, status, created_at, events(count)")
    .order("created_at", { ascending: false })

  if (error) {
    throw error
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <PageHeader title="大会管理" />

        <div className="mb-6">
          <Link
            href="/admin/tournaments/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Plus className="w-4 h-4" />
            新規大会作成
          </Link>
        </div>

        <TournamentList
          tournaments={tournaments as TournamentWithEventCount[]}
        />
      </div>
    </main>
  )
}
