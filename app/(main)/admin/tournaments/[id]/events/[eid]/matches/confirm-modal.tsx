"use client"

import { useEffect } from "react"
import { AlertTriangle, Check, Loader2, Play, Trophy } from "lucide-react"

type ConfirmModalProps = {
  type: "confirm" | "complete" | "start"
  roundNumber: number
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}

export function ConfirmModal({
  type,
  roundNumber,
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) onCancel()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onCancel, isLoading])

  const iconConfig = {
    confirm: {
      bgClass: "bg-gradient-to-br from-primary to-amber-500",
      icon: <AlertTriangle className="w-4 h-4 text-white" />,
      title: "結果確定の確認",
      body: `ラウンド${roundNumber}の結果を確定しますか？確定後は変更できません。`,
      buttonIcon: <Check className="w-4 h-4" />,
      buttonText: "確定する",
      buttonClass: "glow-button",
    },
    start: {
      bgClass: "bg-gradient-to-br from-blue-500 to-indigo-600",
      icon: <Play className="w-4 h-4 text-white" />,
      title: "試合開始の確認",
      body: `ラウンド${roundNumber}の試合を開始しますか？`,
      buttonIcon: <Play className="w-4 h-4" />,
      buttonText: "開始する",
      buttonClass: "glow-button",
    },
    complete: {
      bgClass: "bg-gradient-to-br from-green-500 to-emerald-600",
      icon: <Trophy className="w-4 h-4 text-white" />,
      title: "イベント完了の確認",
      body: "イベントを完了しますか？全ラウンドの結果が確定済みです。",
      buttonIcon: <Trophy className="w-4 h-4" />,
      buttonText: "完了する",
      buttonClass:
        "bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/25",
    },
  }

  const config = iconConfig[type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={() => !isLoading && onCancel()}
        aria-label="モーダルを閉じる"
      />
      <div
        className="relative modal-content rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden opacity-0"
        style={{
          animation: "card-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        }}
      >
        {/* ヘッダー */}
        <div className="px-6 py-5 border-b border-orange-100 bg-gradient-to-r from-primary/5 to-amber-50">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bgClass}`}
            >
              {config.icon}
            </div>
            {config.title}
          </h2>
        </div>

        {/* 本文 */}
        <div className="px-6 py-6">
          <p className="text-sm text-gray-700 leading-relaxed">
            {config.body}
          </p>
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-orange-100 flex gap-3 bg-gray-50/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="glass-button flex-1 px-4 py-2.5 text-sm font-medium rounded-xl text-gray-700"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${config.buttonClass}`}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              config.buttonIcon
            )}
            {isLoading ? "処理中..." : config.buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
