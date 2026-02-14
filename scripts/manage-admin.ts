/**
 * 運営者権限管理スクリプト
 *
 * 使用方法:
 *   pnpm exec tsx --env-file=.env.local scripts/manage-admin.ts <command> [discord_id]
 *
 * コマンド:
 *   grant <discord_id>  - 指定したDiscord IDのユーザーにadmin権限を付与
 *   revoke <discord_id> - 指定したDiscord IDのユーザーからadmin権限を剥奪
 *   list                - 現在のadminユーザー一覧を表示
 *
 * 環境変数 (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL    - Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY   - Supabase service_role キー
 */

import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "エラー: 環境変数 NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください",
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function grantAdmin(discordId: string): Promise<void> {
  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("id, discord_id, discord_username, player_name, role")
    .eq("discord_id", discordId)
    .single()

  if (selectError || !profile) {
    console.error(`エラー: Discord ID "${discordId}" のユーザーが見つかりません`)
    process.exit(1)
  }

  if (profile.role === "admin") {
    console.log(
      `${profile.player_name ?? profile.discord_username} (${discordId}) は既にadminです`,
    )
    return
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin" })
    .eq("discord_id", discordId)

  if (updateError) {
    console.error("エラー: admin権限の付与に失敗しました", updateError.message)
    process.exit(1)
  }

  console.log(
    `✓ ${profile.player_name ?? profile.discord_username} (${discordId}) にadmin権限を付与しました`,
  )
}

async function revokeAdmin(discordId: string): Promise<void> {
  const { data: profile, error: selectError } = await supabase
    .from("profiles")
    .select("id, discord_id, discord_username, player_name, role")
    .eq("discord_id", discordId)
    .single()

  if (selectError || !profile) {
    console.error(`エラー: Discord ID "${discordId}" のユーザーが見つかりません`)
    process.exit(1)
  }

  if (profile.role === "user") {
    console.log(
      `${profile.player_name ?? profile.discord_username} (${discordId}) は既にuserです`,
    )
    return
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "user" })
    .eq("discord_id", discordId)

  if (updateError) {
    console.error("エラー: admin権限の剥奪に失敗しました", updateError.message)
    process.exit(1)
  }

  console.log(
    `✓ ${profile.player_name ?? profile.discord_username} (${discordId}) のadmin権限を剥奪しました`,
  )
}

async function listAdmins(): Promise<void> {
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("discord_id, discord_username, player_name")
    .eq("role", "admin")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("エラー: admin一覧の取得に失敗しました", error.message)
    process.exit(1)
  }

  if (!admins || admins.length === 0) {
    console.log("adminユーザーはいません")
    return
  }

  console.log("=== adminユーザー一覧 ===")
  for (const admin of admins) {
    const name = admin.player_name ?? admin.discord_username ?? "(名前未設定)"
    console.log(`  ${name} (Discord ID: ${admin.discord_id})`)
  }
  console.log(`合計: ${admins.length}名`)
}

function showUsage(): void {
  console.log(`
使用方法:
  pnpm exec tsx --env-file=.env.local scripts/manage-admin.ts <command> [discord_id]

コマンド:
  grant <discord_id>  - 指定したDiscord IDのユーザーにadmin権限を付与
  revoke <discord_id> - 指定したDiscord IDのユーザーからadmin権限を剥奪
  list                - 現在のadminユーザー一覧を表示
`)
}

async function main(): Promise<void> {
  const [, , command, discordId] = process.argv

  switch (command) {
    case "grant":
      if (!discordId) {
        console.error("エラー: Discord IDを指定してください")
        showUsage()
        process.exit(1)
      }
      await grantAdmin(discordId)
      break

    case "revoke":
      if (!discordId) {
        console.error("エラー: Discord IDを指定してください")
        showUsage()
        process.exit(1)
      }
      await revokeAdmin(discordId)
      break

    case "list":
      await listAdmins()
      break

    default:
      showUsage()
      process.exit(command ? 1 : 0)
  }
}

main()
