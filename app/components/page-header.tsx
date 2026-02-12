type PageHeaderProps = {
  title: string
  subtitle?: string
  showIcons?: boolean
}

export function PageHeader({ title, subtitle, showIcons = true }: PageHeaderProps) {
  const StarIcon = () => (
    <svg
      className="w-8 h-8 text-primary animate-pulse"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
  )

  return (
    <div className="mb-10 text-center">
      <div className="inline-flex items-center gap-3 mb-2">
        {showIcons && <StarIcon />}
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-orange-400 to-amber-500 bg-clip-text text-transparent">
          {title}
        </h1>
        {showIcons && <StarIcon />}
      </div>
      {subtitle && (
        <p className="text-text-secondary text-sm tracking-wide">{subtitle}</p>
      )}
    </div>
  )
}
