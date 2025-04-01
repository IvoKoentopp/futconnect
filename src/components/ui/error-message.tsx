interface ErrorMessageProps {
  message?: string;
}

export function ErrorMessage({ message = "Erro ao carregar dados." }: ErrorMessageProps) {
  return <div className="text-red-500">{message}</div>;
}
