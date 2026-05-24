type StatCardProps = {
  label: string;
  value: string;
  description: string;
  accent: "blue" | "green" | "purple" | "teal";
};

const icons: Record<StatCardProps["accent"], string> = {
  blue: "📋",
  green: "✓",
  purple: "👥",
  teal: "📅",
};

export function StatCard({ label, value, description, accent }: StatCardProps) {
  return (
    <article className={`stat-card accent-${accent}`}>
      <div className="stat-icon" aria-hidden="true">
        {icons[accent]}
      </div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        <p className="stat-desc">{description}</p>
      </div>
    </article>
  );
}
