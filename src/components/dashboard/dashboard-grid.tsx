interface DashboardGridProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className = "" }: DashboardGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${className}`}>
      {children}
    </div>
  );
}
