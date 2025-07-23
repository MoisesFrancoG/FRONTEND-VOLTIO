#!/bin/bash

# 🔧 CONFIGURACIÓN CSP EN NGINX
# Script para configurar Content Security Policy en el servidor Nginx

echo "🔧 CONFIGURANDO CSP EN NGINX"
echo "============================="

# Verificar si somos root o tenemos sudo
if [ "$EUID" -ne 0 ]; then
    echo "⚠️ Este script necesita permisos de administrador"
    echo "Ejecuta: sudo $0"
    exit 1
fi

# Backup de la configuración actual
echo "💾 Creando backup de configuración..."
cp /etc/nginx/sites-available/voltio /etc/nginx/sites-available/voltio.backup.$(date +%Y%m%d_%H%M%S)

# Configuración de CSP para Nginx
echo "🔧 Aplicando configuración CSP..."

# Crear configuración temporal
cat > /tmp/nginx_csp_config << 'EOF'
    # Content Security Policy Headers
    add_header Content-Security-Policy "default-src 'self'; connect-src 'self' wss://websocketvoltio.acstree.xyz ws://websocketvoltio.acstree.xyz https://voltio.acstree.xyz; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self';" always;
    
    # Otros headers de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
EOF

# Verificar si la configuración ya existe
if grep -q "Content-Security-Policy" /etc/nginx/sites-available/voltio; then
    echo "⚠️ CSP ya configurado en Nginx"
else
    # Añadir la configuración CSP después de la línea 'root /var/www/voltio;'
    sed -i '/root \/var\/www\/voltio;/r /tmp/nginx_csp_config' /etc/nginx/sites-available/voltio
    echo "✅ CSP añadido a la configuración de Nginx"
fi

# Limpiar archivo temporal
rm /tmp/nginx_csp_config

# Verificar configuración de Nginx
echo "🧪 Verificando configuración de Nginx..."
if nginx -t; then
    echo "✅ Configuración de Nginx válida"
    
    # Recargar Nginx
    echo "🔄 Recargando Nginx..."
    systemctl reload nginx
    echo "✅ Nginx recargado exitosamente"
    
    echo ""
    echo "🎉 CSP CONFIGURADO EXITOSAMENTE"
    echo "==============================="
    echo ""
    echo "✅ Headers CSP añadidos a Nginx"
    echo "✅ WebSockets permitidos para websocketvoltio.acstree.xyz"
    echo "✅ Configuración aplicada y activa"
    echo ""
    echo "🧪 Para probar:"
    echo "curl -I https://voltio.acstree.xyz"
    echo ""
    
else
    echo "❌ Error en configuración de Nginx"
    echo "🔄 Restaurando backup..."
    cp /etc/nginx/sites-available/voltio.backup.$(date +%Y%m%d)* /etc/nginx/sites-available/voltio
    exit 1
fi
