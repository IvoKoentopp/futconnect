import { ThemeProvider as NextThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';

const isOldiOS = () => {
  const ua = window.navigator.userAgent;
  const matches = ua.match(/OS (\d+)_/);
  if (matches && matches[1]) {
    return parseInt(matches[1], 10) < 13;
  }
  return false;
};

interface SafeThemeProviderProps {
  children: React.ReactNode;
}

export function SafeThemeProvider({ children }: SafeThemeProviderProps) {
  const [mounted, setMounted] = useState(false);
  const isLegacyDevice = isOldiOS();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Em dispositivos antigos, apenas renderiza o conteúdo com tema claro
  if (isLegacyDevice) {
    if (!mounted) return null;
    return (
      <div className="light">
        {children}
      </div>
    );
  }

  // Em dispositivos modernos, usa o ThemeProvider normal
  return (
    <NextThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {mounted ? children : null}
    </NextThemeProvider>
  );
}
