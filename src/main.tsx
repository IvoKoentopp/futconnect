import './polyfills';  // Import polyfills first

try {
  console.log('Initializing app...');
  console.log('User Agent:', navigator.userAgent);
  
  const renderApp = async () => {
    try {
      const { createRoot } = await import('react-dom/client');
      const { default: App } = await import('./App');
      await import('./index.css');
      
      console.log('Modules loaded successfully');
      
      const root = document.getElementById('root');
      if (!root) {
        throw new Error('Root element not found');
      }
      
      createRoot(root).render(<App />);
      console.log('App rendered successfully');
      
    } catch (error) {
      console.error('Error loading app:', error);
      const errorInfo = document.getElementById('error-info');
      if (errorInfo) {
        errorInfo.innerHTML += '<br>Error loading app: ' + (error as Error).message;
        document.getElementById('error-container')?.classList.add('show-error');
      }
    }
  };

  renderApp();
  
} catch (error) {
  console.error('Critical error:', error);
  const errorInfo = document.getElementById('error-info');
  if (errorInfo) {
    errorInfo.innerHTML += '<br>Critical error: ' + (error as Error).message;
    document.getElementById('error-container')?.classList.add('show-error');
  }
}
