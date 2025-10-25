#!/bin/bash

# Script de utilidades para el mantenimiento del servidor Voltio
# Contiene funciones útiles para el mantenimiento y monitoreo

DOMAIN="voltio.acstree.xyz"
APP_DIR="/var/www/voltio"
NGINX_CONFIG="/etc/nginx/sites-available/voltio"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar el estado del servidor
show_status() {
    echo -e "${BLUE}🔍 Estado del Servidor Voltio${NC}"
    echo "=================================="
    
    # Estado de Nginx
    if sudo systemctl is-active --quiet nginx; then
        echo -e "Nginx: ${GREEN}✅ Funcionando${NC}"
    else
        echo -e "Nginx: ${RED}❌ Detenido${NC}"
    fi
    
    # Estado del firewall
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "Firewall: ${GREEN}✅ Activo${NC}"
    else
        echo -e "Firewall: ${YELLOW}⚠️ Inactivo${NC}"
    fi
    
    # Estado de SSL
    if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
        expiry=$(sudo certbot certificates 2>/dev/null | grep "Expiry Date" | head -1 | awk '{print $3, $4}')
        echo -e "SSL: ${GREEN}✅ Activo${NC} (Expira: $expiry)"
    else
        echo -e "SSL: ${RED}❌ No configurado${NC}"
    fi
    
    # Espacio en disco
    disk_usage=$(df -h / | awk 'NR==2{print $5}')
    echo -e "Disco: ${BLUE}$disk_usage usado${NC}"
    
    # Memoria
    memory_usage=$(free -h | awk 'NR==2{printf "%.1f/%.1f GB (%.0f%%)", $3/1024, $2/1024, $3*100/$2}')
    echo -e "Memoria: ${BLUE}$memory_usage${NC}"
    
    # Última actualización
    last_update=$(stat -c %y /var/log/apt/history.log 2>/dev/null | cut -d' ' -f1 || echo "Desconocido")
    echo -e "Última actualización: ${BLUE}$last_update${NC}"
    
    echo ""
}

# Función para ver logs en tiempo real
show_logs() {
    echo -e "${BLUE}📋 Logs del servidor${NC}"
    echo "Presiona Ctrl+C para salir"
    echo "=========================="
    
    case $1 in
        "nginx")
            echo "Mostrando logs de Nginx..."
            sudo tail -f /var/log/nginx/voltio.access.log /var/log/nginx/voltio.error.log
            ;;
        "system")
            echo "Mostrando logs del sistema..."
            sudo journalctl -f
            ;;
        "ssl")
            echo "Mostrando logs de certificados SSL..."
            sudo journalctl -u certbot -f
            ;;
        *)
            echo "Mostrando todos los logs de la aplicación..."
            sudo tail -f /var/log/nginx/voltio.access.log /var/log/nginx/voltio.error.log
            ;;
    esac
}

# Función para crear backup
create_backup() {
    backup_date=$(date +%Y%m%d_%H%M%S)
    backup_dir="/opt/voltio-backups"
    
    echo -e "${BLUE}💾 Creando backup...${NC}"
    
    # Crear directorio de backups si no existe
    sudo mkdir -p $backup_dir
    
    # Backup de la aplicación
    if [ -d "$APP_DIR" ]; then
        sudo tar -czf "$backup_dir/voltio-app-$backup_date.tar.gz" -C "$APP_DIR" .
        echo -e "${GREEN}✅ Backup de aplicación creado: voltio-app-$backup_date.tar.gz${NC}"
    fi
    
    # Backup de configuración de Nginx
    if [ -f "$NGINX_CONFIG" ]; then
        sudo cp "$NGINX_CONFIG" "$backup_dir/nginx-config-$backup_date.conf"
        echo -e "${GREEN}✅ Backup de configuración Nginx creado${NC}"
    fi
    
    # Backup de certificados SSL (solo configuración)
    if [ -d "/etc/letsencrypt" ]; then
        sudo tar -czf "$backup_dir/ssl-config-$backup_date.tar.gz" -C "/etc/letsencrypt" .
        echo -e "${GREEN}✅ Backup de configuración SSL creado${NC}"
    fi
    
    # Mostrar tamaño de backups
    echo ""
    echo -e "${BLUE}📊 Backups disponibles:${NC}"
    sudo ls -lah $backup_dir/
}

# Función para limpiar archivos temporales y logs antiguos
cleanup() {
    echo -e "${BLUE}🧹 Limpiando archivos temporales...${NC}"
    
    # Limpiar cache de apt
    sudo apt autoremove -y
    sudo apt autoclean
    
    # Limpiar logs antiguos (mantener últimos 7 días)
    sudo journalctl --vacuum-time=7d
    
    # Limpiar backups antiguos (mantener últimos 5)
    if [ -d "/opt/voltio-backups" ]; then
        cd /opt/voltio-backups
        sudo ls -t voltio-app-*.tar.gz 2>/dev/null | tail -n +6 | sudo xargs rm -f
        echo -e "${GREEN}✅ Backups antiguos eliminados${NC}"
    fi
    
    echo -e "${GREEN}✅ Limpieza completada${NC}"
}

# Función para actualizar el sistema
update_system() {
    echo -e "${BLUE}📦 Actualizando sistema...${NC}"
    
    sudo apt update
    sudo apt upgrade -y
    sudo apt autoremove -y
    
    # Reiniciar servicios si es necesario
    if [ -f /var/run/reboot-required ]; then
        echo -e "${YELLOW}⚠️ Se requiere reinicio del sistema${NC}"
        read -p "¿Deseas reiniciar ahora? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo reboot
        fi
    else
        # Reiniciar servicios que lo requieran
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Sistema actualizado correctamente${NC}"
    fi
}

# Función para diagnosticar problemas post-despliegue
function post_deploy_check() {
    echo "🔍 VERIFICACIÓN POST-DESPLIEGUE"
    echo "================================"
    
    # Verificar estructura de directorios
    echo "📁 Estructura de directorios:"
    ls -la /var/www/voltio/
    
    # Verificar si existe directorio browser (problema común en Angular 17+)
    if [ -d "/var/www/voltio/browser" ]; then
        echo "⚠️ PROBLEMA DETECTADO: Directorio 'browser' encontrado"
        echo "🔧 Los archivos de Angular están en un subdirectorio 'browser'"
        echo ""
        echo "💡 SOLUCIÓN SUGERIDA:"
        echo "   Ejecuta: ./fix-browser-directory.sh"
        echo ""
        return 1
    fi
    
    # Verificar index.html
    if [ -f "/var/www/voltio/index.html" ]; then
        echo "✅ index.html encontrado"
        echo "📊 Tamaño: $(stat -c '%s bytes' /var/www/voltio/index.html)"
    else
        echo "❌ index.html NO encontrado"
        return 1
    fi
    
    # Verificar permisos
    local owner=$(stat -c '%U:%G' /var/www/voltio)
    local perms=$(stat -c '%a' /var/www/voltio)
    
    echo "🔒 Permisos:"
    echo "   Propietario: $owner"
    echo "   Permisos: $perms"
    
    if [ "$owner" != "www-data:www-data" ]; then
        echo "⚠️ Permisos incorrectos detectados"
        echo "🔧 Corrigiendo permisos..."
        sudo chown -R www-data:www-data /var/www/voltio
        sudo chmod -R 755 /var/www/voltio
        sudo find /var/www/voltio -type f -exec chmod 644 {} \;
        echo "✅ Permisos corregidos"
    fi
    
    # Prueba de conectividad
    echo "🌐 Prueba de conectividad:"
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost)
    echo "   Código HTTP: $response_code"
    
    if [ "$response_code" = "200" ]; then
        echo "✅ Servidor funcionando correctamente"
        return 0
    else
        echo "❌ Problema de conectividad detectado"
        return 1
    fi
}

function fix_browser_directory() {
    echo "� CORRECCIÓN: DIRECTORIO BROWSER"
    echo "=================================="
    
    if [ -d "/var/www/voltio/browser" ]; then
        echo "📦 Directorio browser detectado - moviendo archivos..."
        
        # Backup
        sudo cp -r /var/www/voltio /var/www/voltio-backup-browser-$(date +%Y%m%d_%H%M%S)
        
        # Mover archivos
        sudo cp -r /var/www/voltio/browser/* /var/www/voltio/
        sudo rm -rf /var/www/voltio/browser
        
        # Permisos
        sudo chown -R www-data:www-data /var/www/voltio
        sudo chmod -R 755 /var/www/voltio
        sudo find /var/www/voltio -type f -exec chmod 644 {} \;
        
        # Recargar Nginx
        sudo systemctl reload nginx
        
        echo "✅ Corrección completada"
        
        # Verificar
        if [ -f "/var/www/voltio/index.html" ]; then
            echo "✅ index.html ahora en la raíz"
        else
            echo "❌ Error en la corrección"
        fi
    else
        echo "ℹ️ No se detectó directorio browser"
    fi
}

# Función para solucionar error 403 Forbidden
fix_403() {
    echo -e "${RED}🔧 Solucionando Error 403 Forbidden${NC}"
    echo "====================================="
    
    # Verificar que el directorio existe
    if [ ! -d "$APP_DIR" ]; then
        echo -e "${YELLOW}⚠️ Creando directorio de aplicación...${NC}"
        sudo mkdir -p "$APP_DIR"
    fi
    
    # Corregir permisos
    echo -e "${BLUE}🔧 Corrigiendo permisos...${NC}"
    sudo chown -R www-data:www-data "$APP_DIR"
    sudo chmod -R 755 "$APP_DIR"
    
    # Verificar/crear archivo index.html
    if [ ! -f "$APP_DIR/index.html" ] || [ ! -s "$APP_DIR/index.html" ]; then
        echo -e "${YELLOW}⚠️ Creando archivo index.html...${NC}"
        sudo tee "$APP_DIR/index.html" > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voltio - Error 403 Solucionado</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 0; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; text-align: center;
        }
        .container {
            padding: 2rem; border-radius: 10px;
            background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; opacity: 0.9; margin: 0.5rem 0; }
        .status { color: #4ade80; font-weight: bold; }
        .fixed { color: #10b981; background: rgba(16, 185, 129, 0.1); padding: 0.5rem; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ Voltio</h1>
        <div class="fixed">
            <p>✅ Error 403 Forbidden Solucionado</p>
        </div>
        <p class="status">🔧 Servidor configurado correctamente</p>
        <p>Permisos corregidos</p>
        <p>Listo para recibir la aplicación Angular</p>
        <small>$(date)</small>
    </div>
</body>
</html>
EOF
        sudo chown www-data:www-data "$APP_DIR/index.html"
        sudo chmod 644 "$APP_DIR/index.html"
    fi
    
    # Verificar configuración de Nginx
    echo -e "${BLUE}🔧 Verificando configuración de Nginx...${NC}"
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Configuración válida${NC}"
        sudo systemctl reload nginx
    else
        echo -e "${RED}❌ Error en configuración de Nginx${NC}"
        return 1
    fi
    
    # Test final
    echo -e "${BLUE}🔍 Verificando solución...${NC}"
    sleep 2
    
    local_test=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
    if [ "$local_test" = "200" ]; then
        echo -e "${GREEN}✅ Error 403 solucionado - servidor responde correctamente${NC}"
        echo -e "${GREEN}🌐 Intenta acceder nuevamente a: https://$DOMAIN${NC}"
    else
        echo -e "${YELLOW}⚠️ Código de respuesta: $local_test${NC}"
        echo -e "${YELLOW}💡 Si persiste el problema, revisar logs: sudo tail -f /var/log/nginx/error.log${NC}"
    fi
}

# Función para verificar la configuración
verify_config() {
    echo -e "${BLUE}🔧 Verificando configuración...${NC}"
    
    # Verificar Nginx
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Configuración de Nginx correcta${NC}"
    else
        echo -e "${RED}❌ Error en configuración de Nginx${NC}"
        return 1
    fi
    
    # Verificar SSL
    if command -v openssl &> /dev/null && [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        expiry_date=$(sudo openssl x509 -enddate -noout -in "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" | cut -d= -f2)
        echo -e "${GREEN}✅ Certificado SSL válido hasta: $expiry_date${NC}"
    fi
    
    # Verificar permisos
    if [ -d "$APP_DIR" ] && [ "$(stat -c %U $APP_DIR)" = "www-data" ]; then
        echo -e "${GREEN}✅ Permisos de aplicación correctos${NC}"
    else
        echo -e "${YELLOW}⚠️ Corrigiendo permisos de aplicación...${NC}"
        sudo chown -R www-data:www-data $APP_DIR
        sudo chmod -R 755 $APP_DIR
    fi
}

# Función para mostrar ayuda
function show_help() {
    echo "�️ UTILIDADES DEL SERVIDOR VOLTIO"
    echo "==================================="
    echo ""
    echo "Uso: ./server-utils.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  status       - Estado del servidor y servicios"
    echo "  logs         - Ver logs de Nginx y aplicación"
    echo "  backup       - Crear backup de la aplicación"
    echo "  cleanup      - Limpiar archivos temporales y backups antiguos"
    echo "  verify       - Verificar configuración completa"
    echo "  fix403       - Solucionar errores 403 Forbidden"
    echo "  post-deploy  - Verificación completa post-despliegue"
    echo "  fix-browser  - Corregir problema de directorio browser (Angular 17+)"
    echo ""
    echo "Ejemplos:"
    echo "  ./server-utils.sh status"
    echo "  ./server-utils.sh fix403"
    echo "  ./server-utils.sh post-deploy"
    echo "  ./server-utils.sh fix-browser"
}

# Script principal
case "${1:-help}" in
    "status")
        check_server_status
        ;;
    "logs")
        show_logs
        ;;
    "backup")
        create_backup
        ;;
    "cleanup")
        cleanup_files
        ;;
    "verify")
        verify_installation
        ;;
    "fix403")
        fix_403_error
        ;;
    "post-deploy")
        post_deploy_check
        ;;
    "fix-browser")
        fix_browser_directory
        ;;
    "help"|*)
        show_help
        ;;
esac
