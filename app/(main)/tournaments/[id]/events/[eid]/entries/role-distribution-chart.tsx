import type { Role } from "@/lib/types/profile"
import { ROLE_LABELS } from "@/lib/types/profile"
import type { RoleDistribution } from "@/lib/types/entry"

const ROLE_COLORS: Record<Role, string> = {
  top_carry: "bg-red-400",
  bot_carry: "bg-blue-400",
  mid: "bg-yellow-400",
  tank: "bg-green-400",
  support: "bg-purple-400",
}

type RoleDistributionChartProps = {
  distribution: RoleDistribution[]
}

export function RoleDistributionChart({
  distribution,
}: RoleDistributionChartProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">ロール分布</h2>
      <div className="space-y-3">
        {distribution.map(({ role, count, percentage }) => (
          <div key={role} className="flex items-center gap-3">
            <span className="text-sm text-gray-700 w-24 shrink-0">
              {ROLE_LABELS[role]}
            </span>
            <div className="flex-1 bg-gray-100 rounded-lg h-6 overflow-hidden">
              {percentage > 0 && (
                <div
                  className={`h-full rounded-lg ${ROLE_COLORS[role]}`}
                  style={{ width: `${percentage}%` }}
                />
              )}
            </div>
            <span className="text-sm text-gray-600 w-20 shrink-0 text-right">
              {count}人 ({percentage}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
