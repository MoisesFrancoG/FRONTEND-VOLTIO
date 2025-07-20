#!/bin/bash

# 🚀 CORRECCIÓN RÁPIDA - PROBLEMA DIRECTORIO BROWSER
# Este script soluciona el problema específico de Angular 17+ donde los archivos
# se encuentran en un subdirectorio 'browser' en lugar de la raíz

echo "🚀 CORRECCIÓN RÁPIDA: DIRECTORIO BROWSER"
echo "========================================="
echo ""

# Verificar ubicación actual
echo "📍 Verificando ubicación actual..."
cd /var/www/voltio

if [ ! -d "/var/www/voltio" ]; then
    echo "❌ ERROR: Directorio /var/www/voltio no existe"
    exit 1
fi

echo "📋 Contenido actual de /var/www/voltio:"
ls -la

# Verificar si existe el problema del directorio browser
if [ -d "browser" ]; then
    echo ""
    echo "🎯 PROBLEMA DETECTADO: Directorio 'browser' encontrado"
    echo "📦 Angular 17+ coloca los archivos en subdirectorio 'browser'"
    echo ""
    
    # Crear backup
    echo "💾 Creando backup de seguridad..."
    backup_dir="/var/www/voltio-backup-browser-fix-$(date +%Y%m%d_%H%M%S)"
    sudo cp -r /var/www/voltio "$backup_dir"
    echo "✅ Backup creado en: $backup_dir"
    echo ""
    
    # Verificar contenido del directorio browser
    echo "📋 Contenido del directorio browser:"
    ls -la browser/
    echo ""
    
    # Verificar que index.html existe en browser
    if [ -f "browser/index.html" ]; then
        echo "✅ index.html encontrado en directorio browser"
        
        # Mover archivos del directorio browser a la raíz
        echo "📁 Moviendo archivos a la raíz..."
        sudo cp -r browser/* .
        
        # Verificar que la copia fue exitosa
        if [ -f "index.html" ]; then
            echo "✅ Archivos copiados exitosamente"
            
            # Eliminar directorio browser
            echo "🗑️ Eliminando directorio browser..."
            sudo rm -rf browser
            
            # Establecer permisos correctos
            echo "🔒 Estableciendo permisos correctos..."
            sudo chown -R www-data:www-data /var/www/voltio
            sudo chmod -R 755 /var/www/voltio
            sudo find /var/www/voltio -type f -exec chmod 644 {} \;
            
            # Verificar estructura final
            echo ""
            echo "📋 Estructura final:"
            ls -la
            echo ""
            
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
            echo ""
            echo "🧪 Realizando prueba final..."
            sleep 3
            
            response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
            echo "📊 Código de respuesta HTTP: $response_code"
            
            if [ "$response_code" = "200" ]; then
                echo ""
                echo "🎉 ¡ÉXITO TOTAL!"
                echo "✅ El problema del directorio browser ha sido solucionado"
                echo "🌐 La aplicación Angular debería estar funcionando en:"
                echo "   https://voltio.acstree.xyz"
                echo ""
                echo "📊 Estadísticas:"
                echo "   - Tamaño de index.html: $(stat -c '%s bytes' index.html)"
                echo "   - Archivos totales: $(find . -type f | wc -l)"
                echo "   - Propietario: $(stat -c '%U:%G' .)"
                echo ""
            else
                echo ""
                echo "⚠️ Corrección aplicada pero respuesta HTTP: $response_code"
                echo "🔍 Pueden existir otros problemas. Ejecuta:"
                echo "   ./deploy-diagnosis.sh"
            fi
            
        else
            echo "❌ Error al copiar archivos"
            exit 1
        fi
        
    else
        echo "❌ index.html no encontrado en directorio browser"
        echo "📋 Contenido de browser/:"
        ls -la browser/
        exit 1
    fi
    
else
    echo ""
    echo "ℹ️ No se detectó el problema del directorio browser"
    
    if [ -f "index.html" ]; then
        echo "✅ index.html ya está en la ubicación correcta"
        
        # Solo verificar y corregir permisos
        echo "🔒 Verificando permisos..."
        current_owner=$(stat -c '%U:%G' .)
        
        if [ "$current_owner" != "www-data:www-data" ]; then
            echo "🔧 Corrigiendo permisos..."
            sudo chown -R www-data:www-data /var/www/voltio
            sudo chmod -R 755 /var/www/voltio
            sudo find /var/www/voltio -type f -exec chmod 644 {} \;
            echo "✅ Permisos corregidos"
        else
            echo "✅ Permisos correctos"
        fi
        
        # Recargar Nginx por si acaso
        echo "🔄 Recargando Nginx..."
        sudo systemctl reload nginx
        
        # Prueba
        echo "🧪 Realizando prueba..."
        sleep 2
        response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
        echo "📊 Código de respuesta: $response_code"
        
        if [ "$response_code" = "200" ]; then
            echo "✅ ¡Todo funcionando correctamente!"
        else
            echo "⚠️ Respuesta HTTP: $response_code"
            echo "🔍 Ejecuta ./deploy-diagnosis.sh para más información"
        fi
        
    else
        echo "❌ index.html no encontrado en la raíz"
        echo "🔍 Posibles problemas:"
        echo "   1. Despliegue incompleto"
        echo "   2. Archivos en otra ubicación"
        echo "   3. Error en el proceso de build"
        echo ""
        echo "💡 Ejecuta ./deploy-diagnosis.sh para un diagnóstico completo"
    fi
fi

echo ""
echo "🏁 SCRIPT COMPLETADO"
