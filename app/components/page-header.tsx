type PageHeaderProps = {
  title: string
  subtitle?: string
  showIcons?: boolean
}

export function PageHeader({
  title,
  subtitle,
  showIcons = true,
}: PageHeaderProps) {
  return (
    <div className="mb-10 text-center">
      <div className="mb-3 flex items-center justify-center gap-4">
        {showIcons && (
          <span
            className="h-px w-10 bg-gradient-to-r from-transparent via-[#d8a24c] to-transparent"
            aria-hidden="true"
          />
        )}
        <span className="panel-title">Tournament View</span>
        {showIcons && (
          <span
            className="h-px w-10 bg-gradient-to-r from-transparent via-[#d8a24c] to-transparent"
            aria-hidden="true"
          />
        )}
      </div>
      <div className="inline-flex items-center gap-3">
        <h1 className="bg-gradient-to-r from-[#f4efe6] via-[#d8a24c] to-[#c61f2a] bg-clip-text text-4xl font-black tracking-[0.08em] text-transparent sm:text-5xl">
          {title}
        </h1>
      </div>
      {subtitle && (
        <p className="mt-3 text-sm tracking-[0.18em] text-text-secondary uppercase">
          {subtitle}
        </p>
      )}
    </div>
  )
}
