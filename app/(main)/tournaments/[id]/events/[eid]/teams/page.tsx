import { ChevronLeft, Trophy, User, Users } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"

import { PageHeader } from "@/app/components/page-header"
import { createClient } from "@/lib/supabase/server"
import type { Role } from "@/lib/types/profile"
import { ROLE_BADGE_COLORS, ROLE_LABELS } from "@/lib/types/profile"

function isAllowedAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false
    }
    const { hostname } = parsed
    return (
      hostname === "cdn.discordapp.com" ||
      hostname.endsWith(".discordapp.com") ||
      hostname.endsWith(".discord.com")
    )
  } catch {
    return false
  }
}

export default async function GfTeamsPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>
}) {
  const { id, eid } = await params
  const supabase = await createClient()

  // イベント情報取得
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      "id, name, match_format, tournaments!inner(id, name)",
    )
    .eq("id", eid)
    .eq("tournament_id", id)
    .single()

  if (eventError || !event) {
    notFound()
  }

  if (event.match_format !== "double_elimination") {
    notFound()
  }

  const tournament = Array.isArray(event.tournaments)
    ? event.tournaments[0]
    : event.tournaments

  // チーム + メンバー取得
  const { data: teams, error: teamsError } = await supabase
    .from("tournament_teams")
    .select(
      `
      id, name, seed,
      tournament_team_members (
        profile_id,
        profiles (player_name, avatar_url, first_role, second_role, third_role)
      )
    `,
    )
    .eq("event_id", eid)
    .order("seed")

  if (teamsError) {
    notFound()
  }

  if (!teams || teams.length === 0) {
    return (
      <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            大会一覧に戻る
          </Link>

          <PageHeader
            title={tournament.name}
            subtitle={`${event.name} - チーム一覧`}
          />

          <div className="rich-card p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <Users className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">
              チーム編成がまだ確定されていません
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8 page-bg-pattern">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/tournaments"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          大会一覧に戻る
        </Link>

        <PageHeader
          title={tournament.name}
          subtitle={`${event.name} - チーム一覧`}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team, index) => (
            <div
              key={team.id}
              className="rich-card p-5 opacity-0"
              style={{
                animation: `card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.08}s forwards`,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-amber-100 text-primary font-bold text-sm">
                  {team.seed}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {team.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Seed {team.seed}
                  </p>
                </div>
                <div className="ml-auto">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
              </div>

              <div className="space-y-2">
                {(team.tournament_team_members ?? []).map((member) => {
                  const prof = Array.isArray(member.profiles)
                    ? member.profiles[0]
                    : member.profiles
                  const roles = [
                    { role: prof?.first_role as Role | null, priority: 1 },
                    { role: prof?.second_role as Role | null, priority: 2 },
                    { role: prof?.third_role as Role | null, priority: 3 },
                  ].filter(
                    (r): r is { role: Role; priority: number } =>
                      r.role !== null,
                  )

                  return (
                    <div
                      key={member.profile_id}
                      className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg"
                    >
                      {prof?.avatar_url &&
                      isAllowedAvatarUrl(prof.avatar_url) ? (
                        <img
                          src={prof.avatar_url}
                          alt=""
                          loading="lazy"
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {prof?.player_name ?? "（未設定）"}
                        </p>
                        {roles.length > 0 && (
                          <div className="flex flex-wrap gap-0.5 mt-0.5">
                            {roles.map((r) => (
                              <span
                                key={r.role}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium leading-tight ${ROLE_BADGE_COLORS[r.role]} ${
                                  r.priority === 1
                                    ? "ring-1 ring-current/20"
                                    : "opacity-60"
                                }`}
                              >
                                {ROLE_LABELS[r.role]}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
