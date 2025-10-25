#!/bin/bash

# 🔧 Script de Corrección Inmediata para Directorio Browser
# Este script corrige el problema específico del directorio browser de Angular

echo "🔧 CORRECCIÓN INMEDIATA: DIRECTORIO BROWSER"
echo "=============================================="

# Verificar si existe el directorio browser
if [ -d "/var/www/voltio/browser" ]; then
    echo "📦 Se detectó directorio browser - Angular 17+ detectado"
    
    # Hacer backup del estado actual
    echo "💾 Creando backup..."
    sudo cp -r /var/www/voltio /var/www/voltio-backup-browser-fix-$(date +%Y%m%d_%H%M%S)
    
    # Mover contenido del directorio browser al directorio raíz
    echo "📁 Moviendo archivos del directorio browser..."
    sudo cp -r /var/www/voltio/browser/* /var/www/voltio/
    
    # Eliminar el directorio browser vacío
    echo "🗑️ Eliminando directorio browser vacío..."
    sudo rm -rf /var/www/voltio/browser
    
    # Establecer permisos correctos
    echo "🔒 Estableciendo permisos..."
    sudo chown -R www-data:www-data /var/www/voltio
    sudo chmod -R 755 /var/www/voltio
    sudo find /var/www/voltio -type f -exec chmod 644 {} \;
    
    # Verificar que index.html esté en la raíz
    if [ -f "/var/www/voltio/index.html" ]; then
        echo "✅ index.html encontrado en la raíz"
        echo "📊 Tamaño: $(stat -c '%s bytes' /var/www/voltio/index.html)"
    else
        echo "❌ ERROR: index.html no encontrado después de la corrección"
        exit 1
    fi
    
    # Recargar Nginx
    echo "🔄 Recargando Nginx..."
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo "✅ Nginx recargado exitosamente"
    else
        echo "❌ Error en configuración de Nginx"
        exit 1
    fi
    
    # Prueba final
    echo "🧪 Realizando prueba final..."
    sleep 2
    response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
    if [ "$response_code" = "200" ]; then
        echo "✅ ¡ÉXITO! El servidor responde con código 200"
        echo "🌐 La aplicación debería estar funcionando en: https://voltio.acstree.xyz"
    else
        echo "⚠️ Código de respuesta: $response_code"
    fi
    
else
    echo "ℹ️ No se detectó directorio browser"
    echo "📋 Contenido actual de /var/www/voltio:"
    ls -la /var/www/voltio/
    
    # Verificar si index.html ya está en la raíz
    if [ -f "/var/www/voltio/index.html" ]; then
        echo "✅ index.html ya está en la ubicación correcta"
        
        # Solo verificar permisos
        echo "🔒 Verificando permisos..."
        sudo chown -R www-data:www-data /var/www/voltio
        sudo chmod -R 755 /var/www/voltio
        sudo find /var/www/voltio -type f -exec chmod 644 {} \;
        
        # Recargar Nginx
        echo "🔄 Recargando Nginx..."
        sudo systemctl reload nginx
        
        # Prueba
        echo "🧪 Realizando prueba..."
        sleep 2
        response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
        echo "📊 Código de respuesta: $response_code"
    else
        echo "❌ No se encontró index.html en /var/www/voltio"
        echo "🔍 Es posible que necesites ejecutar un nuevo despliegue"
    fi
fi

echo ""
echo "🎯 RESUMEN:"
echo "- Directorio verificado: /var/www/voltio"
echo "- Permisos actualizados: www-data:www-data"
echo "- Nginx recargado"
echo "- Última respuesta HTTP: $response_code"
echo ""
echo "Si el problema persiste, ejecuta: ./deploy-diagnosis.sh"
