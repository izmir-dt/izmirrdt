export function PageHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-border mb-5">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, hsl(var(--sidebar-primary)) 15%, transparent)", color: "hsl(var(--sidebar-primary))" }}
          >
            <Icon className="w-4.5 h-4.5" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground leading-tight">{title}</h1>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
