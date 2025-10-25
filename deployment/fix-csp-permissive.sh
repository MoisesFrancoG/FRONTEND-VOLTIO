#!/bin/bash

# 🔧 CONFIGURACIÓN CSP PERMISIVA PARA WEBSOCKETS
# Solución directa para permitir WebSockets

echo "🔧 APLICANDO CSP PERMISIVO PARA WEBSOCKETS"
echo "=========================================="

# Verificar permisos
if [ "$EUID" -ne 0 ]; then
    echo "⚠️ Ejecuta con sudo: sudo $0"
    exit 1
fi

echo "💾 Creando backup..."
cp /etc/nginx/sites-available/voltio /etc/nginx/sites-available/voltio.backup.csp.$(date +%Y%m%d_%H%M%S)

# Leer configuración actual
echo "📋 Configuración actual:"
cat /etc/nginx/sites-available/voltio

echo ""
echo "🔧 Aplicando configuración CSP permisiva..."

# Eliminar cualquier CSP existente
sed -i '/Content-Security-Policy/d' /etc/nginx/sites-available/voltio

# Añadir CSP permisivo después de la línea 'root /var/www/voltio;'
CSP_CONFIG='        # CSP permisivo para WebSockets
        add_header Content-Security-Policy "default-src '\''self'\''; connect-src '\''self'\'' wss: ws: https: http:; script-src '\''self'\'' '\''unsafe-inline'\'' '\''unsafe-eval'\''; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data: blob:; font-src '\''self'\'' data:;" always;'

# Usar un delimitador único para evitar problemas con comillas
cat > /tmp/csp_permisivo << 'EOL'
        # CSP permisivo para WebSockets y desarrollo
        add_header Content-Security-Policy "default-src 'self'; connect-src 'self' wss: ws: https: http:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:;" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
EOL

# Insertar después de 'root /var/www/voltio;'
sed -i '/root \/var\/www\/voltio;/r /tmp/csp_permisivo' /etc/nginx/sites-available/voltio

# Limpiar archivo temporal
rm /tmp/csp_permisivo

echo "✅ CSP permisivo aplicado"

# Verificar configuración
echo "🧪 Verificando configuración..."
if nginx -t; then
    echo "✅ Configuración válida"
    
    # Mostrar configuración final
    echo "📋 Configuración final:"
    cat /etc/nginx/sites-available/voltio
    
    echo ""
    echo "🔄 Recargando Nginx..."
    systemctl reload nginx
    echo "✅ Nginx recargado"
    
    echo ""
    echo "🧪 Probando headers:"
    sleep 2
    curl -I https://voltio.acstree.xyz | grep -i content-security
    
    echo ""
    echo "🎉 ¡CSP PERMISIVO APLICADO!"
    echo "Ahora el WebSocket debería poder conectar sin restricciones"
    
else
    echo "❌ Error en configuración, restaurando backup..."
    cp /etc/nginx/sites-available/voltio.backup.csp.$(date +%Y%m%d)* /etc/nginx/sites-available/voltio
    exit 1
fi
