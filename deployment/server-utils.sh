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
show_help() {
    echo -e "${BLUE}🔧 Utilidades del Servidor Voltio${NC}"
    echo "=================================="
    echo ""
    echo "Uso: $0 [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  status      - Mostrar estado del servidor"
    echo "  logs        - Ver logs en tiempo real"
    echo "  logs nginx  - Ver solo logs de Nginx"
    echo "  logs system - Ver logs del sistema"
    echo "  logs ssl    - Ver logs de SSL/Certbot"
    echo "  backup      - Crear backup completo"
    echo "  cleanup     - Limpiar archivos temporales"
    echo "  update      - Actualizar sistema"
    echo "  verify      - Verificar configuración"
    echo "  help        - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  $0 status"
    echo "  $0 logs nginx"
    echo "  $0 backup"
    echo ""
}

# Script principal
case "$1" in
    "status")
        show_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "backup")
        create_backup
        ;;
    "cleanup")
        cleanup
        ;;
    "update")
        update_system
        ;;
    "verify")
        verify_config
        ;;
    "help"|"--help"|"-h")
        show_help
        ;;
    "")
        show_status
        echo ""
        echo -e "${YELLOW}💡 Tip: Usa '$0 help' para ver todos los comandos disponibles${NC}"
        ;;
    *)
        echo -e "${RED}❌ Comando desconocido: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
