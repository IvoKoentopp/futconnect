interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className = "h-8 w-8" }: LoadingSpinnerProps) {
  return (
    <div className="flex justify-center items-center h-24">
      <div className={`animate-spin rounded-full border-b-2 border-futconnect-600 ${className}`}></div>
    </div>
  );
}
