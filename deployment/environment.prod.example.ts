// Archivo de configuración de ambiente para producción
// Copia este archivo a src/environments/environment.prod.ts

export const environment = {
  production: true,
  apiUrl: 'https://voltioapi.acstree.xyz', // Cambia por tu API si tienes
  appName: 'Voltio',
  version: '1.0.0',

  // Configuraciones específicas de producción
  enableAnalytics: true,
  logLevel: 'error',

  // URLs y endpoints
  endpoints: {
    auth: '/auth',
    bluetooth: '/bluetooth',
    monitoring: '/monitoring',
  },

  // Configuraciones de UI
  ui: {
    showDebugInfo: false,
    enableDevTools: false,
  },

  // Configuraciones de bluetooth (si aplica)
  bluetooth: {
    enabled: true,
    autoConnect: false,
    scanDuration: 10000,
  },
};
