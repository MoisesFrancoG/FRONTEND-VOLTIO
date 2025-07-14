# Módulo de Configuración Bluetooth ESP32/RaspberryPI

Este módulo implementa la funcionalidad de configuración inalámbrica de dispositivos IoT (ESP32/RaspberryPI) mediante la API Web Bluetooth del navegador.

## Características

- ✅ Búsqueda automática de dispositivos ESP32 en modo configuración
- ✅ Conexión segura via Web Bluetooth API
- ✅ Configuración de credenciales WiFi de forma inalámbrica
- ✅ Estados de conexión en tiempo real
- ✅ Interfaz intuitiva con Tailwind CSS
- ✅ Manejo de errores robusto
- ✅ Compatible con Chrome, Edge y Opera

## Flujo de Configuración

### Paso 0: Preparación del Dispositivo

- El dispositivo ESP32 entra en modo configuración
- Se inicia el servidor Bluetooth "Configuracion PZEM"
- Los LEDs parpadean alternadamente indicando modo configuración

### Paso 1: Búsqueda de Dispositivos

- Usuario hace clic en "Buscar Dispositivos"
- Se abre ventana nativa de selección Bluetooth
- Filtra automáticamente por UUID específico

### Paso 2: Conexión

- Usuario selecciona "Configuracion PZEM"
- Se establece conexión GATT
- Los LEDs dejan de parpadear

### Paso 3: Configuración WiFi

- Usuario ingresa SSID y contraseña
- Se envían las credenciales via características Bluetooth
- Se envía comando SAVE

### Paso 4: Finalización

- El dispositivo guarda la configuración
- Se reinicia automáticamente
- Se conecta a la red WiFi configurada

## Estructura del Módulo

```
bluetooth/
├── bluetooth.module.ts                 # Módulo principal
├── bluetooth-routing.module.ts         # Rutas del módulo
├── models/
│   └── bluetooth.models.ts            # Interfaces y tipos
├── services/
│   └── bluetooth.service.ts           # Lógica de negocio Bluetooth
├── bluetooth-config/
│   ├── bluetooth-config.component.ts  # Componente principal
│   ├── bluetooth-config.component.html # Template del componente
│   ├── bluetooth-config.component.css # Estilos del componente
│   └── bluetooth-config.component.spec.ts # Tests
└── types/
    └── bluetooth.d.ts                 # Declaraciones Web Bluetooth API
```

## UUIDs del Protocolo

- **Servicio Principal**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **SSID WiFi**: `6d68efe5-04b6-4a85-abc4-c2670b7bf7fd`
- **Contraseña WiFi**: `f27b53ad-c63d-49a0-8c0f-9f297e6cc520`
- **Comando Guardado**: `a87988b9-694c-479c-900e-95ab6e7b6c5f`

## Estados de Configuración

- `SEARCHING`: Listo para buscar dispositivos
- `FOUND`: Dispositivo encontrado
- `CONNECTING`: Conectando al dispositivo
- `CONNECTED`: Conectado - Listo para configurar
- `CONFIGURING`: Enviando configuración WiFi
- `CONFIGURED`: Configuración completada
- `ERROR`: Error en el proceso

## Uso

### Navegación

La funcionalidad está disponible en la ruta `/bluetooth` y accesible desde el menú principal como "Configuración BT".

### Requisitos del Navegador

- Chrome 56+
- Edge 79+
- Opera 43+
- Conexión HTTPS (para producción)

### API Utilizada

El módulo utiliza la [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API) estándar del W3C.

## Servicios

### BluetoothService

Servicio principal que maneja:

- Búsqueda de dispositivos
- Conexión GATT
- Envío de configuración WiFi
- Estados observables (RxJS)
- Manejo de errores

### Observables Disponibles

- `configurationStatus$`: Estado actual del proceso
- `connectedDevice$`: Información del dispositivo conectado
- `errorMessage$`: Mensajes de error

## Componentes

### BluetoothConfigComponent

Componente principal que incluye:

- Formulario reactivo para credenciales WiFi
- Indicadores visuales de estado
- Botones de acción contextual
- Instrucciones de uso
- Manejo de errores

## Validaciones

- SSID: Requerido, mínimo 1 caracter
- Contraseña: Requerida, mínimo 8 caracteres
- Verificación de soporte Web Bluetooth
- Validación de conexión activa

## Seguridad

- Comunicación encriptada via Bluetooth
- Filtrado específico por UUID de servicio
- Validación de características antes de escritura
- Timeouts para evitar bloqueos

## Responsive Design

- Adaptable a dispositivos móviles
- Grid system con Tailwind CSS
- Iconografía con Font Awesome
- Estados visuales claros

## Testing

Incluye tests unitarios con:

- Inicialización de componente
- Validación de formularios
- Interacción con servicios
- Manejo de estados

## Extensibilidad

El módulo está diseñado para:

- Agregar nuevos tipos de dispositivos
- Personalizar protocolos de comunicación
- Integrar con otros servicios IoT
- Soporte para múltiples dispositivos simultáneos
