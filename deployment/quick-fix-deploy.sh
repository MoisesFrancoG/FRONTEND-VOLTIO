#!/bin/bash

# SOLUCIÓN INMEDIATA para Error 403 después de despliegue exitoso
# Ejecutar este script en el servidor EC2 cuando GitHub Actions se complete
# pero la aplicación Angular no se muestre

echo "🚀 VOLTIO - Solución Rápida Post-Despliegue"
echo "=========================================="

# Variables
APP_DIR="/var/www/voltio"
DOMAIN="voltio.acstree.xyz"

# Función para logging con colores
log_info() { echo -e "\e[34m[INFO]\e[0m $1"; }
log_success() { echo -e "\e[32m[SUCCESS]\e[0m $1"; }
log_warning() { echo -e "\e[33m[WARNING]\e[0m $1"; }
log_error() { echo -e "\e[31m[ERROR]\e[0m $1"; }

# 1. Verificación rápida del estado actual
log_info "1. Verificando estado actual..."

if [ ! -d "$APP_DIR" ]; then
    log_error "Directorio $APP_DIR no existe - creando..."
    sudo mkdir -p "$APP_DIR"
fi

# Verificar si hay archivos
file_count=$(find "$APP_DIR" -type f | wc -l)
log_info "Archivos encontrados en $APP_DIR: $file_count"

# 2. Corregir permisos SIEMPRE (principal causa del problema)
log_info "2. Corrigiendo permisos..."
sudo chown -R www-data:www-data "$APP_DIR"
sudo chmod -R 755 "$APP_DIR"
sudo find "$APP_DIR" -type f -exec chmod 644 {} \; 2>/dev/null
log_success "Permisos corregidos"

# 3. Verificar que index.html existe y tiene contenido Angular
log_info "3. Verificando archivo index.html..."

if [ -f "$APP_DIR/index.html" ]; then
    file_size=$(stat -c%s "$APP_DIR/index.html")
    log_info "index.html encontrado ($file_size bytes)"
    
    # Verificar si contiene contenido Angular
    if grep -q "voltioapp\|ng-\|angular" "$APP_DIR/index.html" 2>/dev/null; then
        log_success "index.html contiene contenido Angular"
    else
        log_warning "index.html no parece contener contenido Angular"
        echo "Primeras líneas del archivo:"
        head -3 "$APP_DIR/index.html"
    fi
else
    log_error "index.html no encontrado"
    
    # Verificar si hay archivos de build
    if [ "$file_count" -gt 0 ]; then
        log_info "Archivos presentes pero sin index.html:"
        ls -la "$APP_DIR" | head -5
    else
        log_error "Directorio completamente vacío - posible fallo en el despliegue"
    fi
fi

# 4. Verificar archivos críticos de Angular
log_info "4. Verificando archivos críticos de Angular..."

js_files=$(find "$APP_DIR" -name "*.js" | wc -l)
css_files=$(find "$APP_DIR" -name "*.css" | wc -l)

log_info "Archivos JavaScript: $js_files"
log_info "Archivos CSS: $css_files"

if [ "$js_files" -gt 0 ] && [ "$css_files" -gt 0 ]; then
    log_success "Archivos Angular presentes"
else
    log_warning "Faltan archivos de Angular - posible error en build/deploy"
fi

# 5. Recargar Nginx
log_info "5. Recargando Nginx..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    log_success "Nginx recargado exitosamente"
else
    log_error "Error en configuración de Nginx"
    exit 1
fi

# 6. Test de conectividad
log_info "6. Probando conectividad..."
sleep 2

response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
log_info "Código de respuesta: $response_code"

# 7. Resultados y recomendaciones
echo ""
echo "========================================"
echo "🔍 DIAGNÓSTICO COMPLETADO"
echo "========================================"

if [ "$response_code" = "200" ]; then
    log_success "✅ PROBLEMA RESUELTO"
    echo ""
    echo "🌐 Tu aplicación debería estar funcionando:"
    echo "   https://$DOMAIN"
    echo ""
    echo "🔧 Acción completada: Permisos corregidos y Nginx recargado"
    
elif [ "$file_count" -eq 0 ]; then
    log_error "❌ DIRECTORIO VACÍO - FALLO EN DESPLIEGUE"
    echo ""
    echo "🚨 El directorio está vacío. Esto indica que:"
    echo "   1. El workflow no copió los archivos correctamente"
    echo "   2. Hubo un error en el proceso de extracción"
    echo ""
    echo "💡 SOLUCIONES:"
    echo "   1. Re-ejecutar el workflow:"
    echo "      git commit --allow-empty -m '🔄 Re-trigger deployment'"
    echo "      git push origin develop"
    echo ""
    echo "   2. Verificar logs del workflow en GitHub Actions"
    echo "   3. Revisar que el build generó archivos en dist/"
    
elif [ ! -f "$APP_DIR/index.html" ]; then
    log_error "❌ INDEX.HTML FALTANTE"
    echo ""
    echo "🚨 Los archivos existen pero falta index.html:"
    ls -la "$APP_DIR" | head -5
    echo ""
    echo "💡 Esto puede indicar:"
    echo "   1. Error en el proceso de build de Angular"
    echo "   2. Archivos extraídos en ubicación incorrecta"
    echo "   3. Configuración incorrecta del outputPath en angular.json"
    
else
    log_warning "⚠️ PROBLEMA PARCIAL - Código: $response_code"
    echo ""
    echo "🔧 Los archivos existen pero el servidor no responde correctamente"
    echo ""
    echo "💡 ACCIONES ADICIONALES:"
    echo "   1. Revisar logs: sudo tail -f /var/log/nginx/error.log"
    echo "   2. Ejecutar diagnóstico completo: ./deploy-diagnosis.sh"
    echo "   3. Verificar configuración: ./server-utils.sh verify"
fi

echo ""
echo "📊 RESUMEN:"
echo "   - Archivos total: $file_count"
echo "   - JavaScript: $js_files"
echo "   - CSS: $css_files"
echo "   - Respuesta servidor: $response_code"
echo "   - Permisos: www-data:www-data (corregidos)"

echo ""
echo "🛠️ COMANDOS ÚTILES:"
echo "   ./server-utils.sh status       # Ver estado general"
echo "   ./server-utils.sh logs nginx   # Ver logs en tiempo real"
echo "   ./deploy-diagnosis.sh          # Diagnóstico completo"

# Mostrar próximos pasos basados en el resultado
echo ""
if [ "$response_code" = "200" ]; then
    echo "🎉 ¡Todo listo! Tu aplicación Angular está funcionando."
else
    echo "🔄 Si el problema persiste, ejecuta el diagnóstico completo:"
    echo "   chmod +x deploy-diagnosis.sh && ./deploy-diagnosis.sh"
fi
