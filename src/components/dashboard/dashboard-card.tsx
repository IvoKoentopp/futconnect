import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorMessage } from "@/components/ui/error-message";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  error?: any;
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({
  title,
  description,
  icon: Icon,
  isLoading,
  error,
  children,
  className = "",
}: DashboardCardProps) {
  return (
    <Card className={`shadow-md ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base md:text-lg flex items-center">
          {Icon && <Icon className="mr-2 h-5 w-5 text-futconnect-600" />}
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message={`Erro ao carregar ${title.toLowerCase()}.`} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
