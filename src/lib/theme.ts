// Função segura para verificar suporte a matchMedia
const safeMatchMedia = (query: string) => {
  try {
    const mql = window.matchMedia(query);
    // Verifica se o navegador suporta addEventListener no matchMedia
    if (mql && typeof mql.addEventListener === 'function') {
      return mql;
    }
    // Fallback para navegadores mais antigos que não suportam addEventListener
    if (mql && typeof mql.addListener === 'function') {
      return {
        ...mql,
        addEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => {
          mql.addListener(() => {
            listener({ matches: mql.matches } as MediaQueryListEvent);
          });
        },
        removeEventListener: (type: string, listener: (e: MediaQueryListEvent) => void) => {
          mql.removeListener(() => {
            listener({ matches: mql.matches } as MediaQueryListEvent);
          });
        }
      };
    }
    // Fallback final para navegadores sem suporte
    return null;
  } catch (error) {
    console.warn('matchMedia not supported:', error);
    return null;
  }
};

// Função para detectar o tema do sistema
export const getSystemTheme = () => {
  try {
    const mql = safeMatchMedia('(prefers-color-scheme: dark)');
    return mql?.matches ? 'dark' : 'light';
  } catch (error) {
    console.warn('Error detecting system theme:', error);
    return 'light'; // Fallback para tema claro
  }
};

// Função para observar mudanças no tema do sistema
export const watchSystemTheme = (onChange: (theme: 'dark' | 'light') => void) => {
  try {
    const mql = safeMatchMedia('(prefers-color-scheme: dark)');
    if (mql) {
      const listener = (e: MediaQueryListEvent) => {
        onChange(e.matches ? 'dark' : 'light');
      };
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
    return () => {}; // Noop para navegadores sem suporte
  } catch (error) {
    console.warn('Error watching system theme:', error);
    return () => {}; // Noop em caso de erro
  }
};
