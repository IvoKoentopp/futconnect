import { useEffect, useState } from 'react';

interface LogMessage {
  type: 'error' | 'info';
  message: string;
  timestamp: Date;
}

const DebugLogger = () => {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Captura erros não tratados
    const errorHandler = (event: ErrorEvent) => {
      addLog('error', `${event.message}\nStack: ${event.error?.stack || 'No stack trace'}`);
    };

    // Captura rejeições de promise não tratadas
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      addLog('error', `Promise Rejected: ${event.reason}`);
    };

    // Sobrescreve console.error
    const originalConsoleError = console.error;
    console.error = (...args) => {
      addLog('error', args.join(' '));
      originalConsoleError.apply(console, args);
    };

    // Sobrescreve console.info
    const originalConsoleInfo = console.info;
    console.info = (...args) => {
      addLog('info', args.join(' '));
      originalConsoleInfo.apply(console, args);
    };

    window.addEventListener('error', errorHandler);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // Adiciona log inicial
    addLog('info', 'App initialized');
    addLog('info', `User Agent: ${navigator.userAgent}`);

    return () => {
      window.removeEventListener('error', errorHandler);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      console.error = originalConsoleError;
      console.info = originalConsoleInfo;
    };
  }, []);

  const addLog = (type: 'error' | 'info', message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isVisible ? 0 : 'auto',
        top: isVisible ? 0 : 'auto',
        right: 0,
        width: isVisible ? '100%' : 'auto',
        maxWidth: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        zIndex: 9999,
        padding: isVisible ? '1rem' : '0.5rem',
        fontSize: '12px',
        fontFamily: 'monospace',
        maxHeight: '100%',
        overflowY: 'auto'
      }}
    >
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          background: '#444',
          border: 'none',
          color: 'white',
          padding: '4px 8px',
          cursor: 'pointer',
          borderRadius: '4px',
          marginBottom: isVisible ? '1rem' : 0
        }}
      >
        {isVisible ? 'Hide Logs' : 'Show Logs'}
      </button>
      {isVisible && (
        <div>
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                color: log.type === 'error' ? '#ff6b6b' : '#69db7c',
                marginBottom: '0.5rem',
                wordBreak: 'break-word'
              }}
            >
              [{log.timestamp.toLocaleTimeString()}] {log.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugLogger;
