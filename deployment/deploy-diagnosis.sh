#!/bin/bash

# Script para diagnosticar problemas de despliegue de la aplicación Angular
# Ejecutar después de un despliegue que parece exitoso pero no funciona

set -e

DOMAIN="voltio.acstree.xyz"
APP_DIR="/var/www/voltio"
NGINX_CONFIG="/etc/nginx/sites-available/voltio"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           🔍 DIAGNÓSTICO DE DESPLIEGUE ANGULAR              ║"
echo "║              Solucionando Error 403 Post-Deploy             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Función para verificar y mostrar resultado
check_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
        return 0
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

# 1. Verificar estado básico del servidor
echo -e "${BLUE}═══ 1. ESTADO DEL SERVIDOR ═══${NC}"

# Nginx
if sudo systemctl is-active --quiet nginx; then
    check_result 0 "Nginx está funcionando"
else
    check_result 1 "Nginx está detenido"
    echo "Iniciando Nginx..."
    sudo systemctl start nginx
fi

# Configuración
sudo nginx -t >/dev/null 2>&1
check_result $? "Configuración de Nginx"

# 2. Verificar estructura de archivos
echo -e "\n${BLUE}═══ 2. ESTRUCTURA DE ARCHIVOS ═══${NC}"

if [ -d "$APP_DIR" ]; then
    check_result 0 "Directorio de aplicación existe"
    
    # Mostrar contenido
    echo -e "${YELLOW}📋 Contenido del directorio:${NC}"
    ls -la "$APP_DIR" | head -10
    
    # Contar archivos
    total_files=$(find "$APP_DIR" -type f | wc -l)
    echo -e "${BLUE}📊 Total de archivos: $total_files${NC}"
    
    # Verificar index.html
    if [ -f "$APP_DIR/index.html" ]; then
        file_size=$(stat -c%s "$APP_DIR/index.html")
        check_result 0 "index.html existe ($file_size bytes)"
        
        # Verificar contenido del index.html
        if grep -q "voltioapp" "$APP_DIR/index.html" 2>/dev/null; then
            check_result 0 "index.html contiene contenido de Angular"
        else
            check_result 1 "index.html no parece ser de Angular"
            echo -e "${YELLOW}Primeras líneas del index.html:${NC}"
            head -5 "$APP_DIR/index.html" 2>/dev/null || echo "No se puede leer"
        fi
    else
        check_result 1 "index.html no encontrado"
    fi
    
    # Verificar archivos JavaScript
    js_count=$(find "$APP_DIR" -name "*.js" | wc -l)
    if [ "$js_count" -gt 0 ]; then
        check_result 0 "Archivos JavaScript encontrados ($js_count)"
    else
        check_result 1 "No se encontraron archivos JavaScript"
    fi
    
    # Verificar archivos CSS
    css_count=$(find "$APP_DIR" -name "*.css" | wc -l)
    if [ "$css_count" -gt 0 ]; then
        check_result 0 "Archivos CSS encontrados ($css_count)"
    else
        check_result 1 "No se encontraron archivos CSS"
    fi
    
else
    check_result 1 "Directorio de aplicación no existe"
    echo "Creando directorio..."
    sudo mkdir -p "$APP_DIR"
fi

# 3. Verificar permisos
echo -e "\n${BLUE}═══ 3. PERMISOS Y PROPIETARIOS ═══${NC}"

if [ -d "$APP_DIR" ]; then
    owner=$(stat -c %U "$APP_DIR")
    group=$(stat -c %G "$APP_DIR")
    perms=$(stat -c %a "$APP_DIR")
    
    echo -e "${BLUE}📋 Estado actual:${NC}"
    echo "  Propietario: $owner"
    echo "  Grupo: $group"
    echo "  Permisos: $perms"
    
    # Verificar propietario correcto
    if [ "$owner" = "www-data" ] && [ "$group" = "www-data" ]; then
        check_result 0 "Propietario correcto (www-data:www-data)"
    else
        check_result 1 "Propietario incorrecto ($owner:$group)"
        echo -e "${YELLOW}Corrigiendo propietario...${NC}"
        sudo chown -R www-data:www-data "$APP_DIR"
        check_result 0 "Propietario corregido"
    fi
    
    # Verificar permisos
    if [ "$perms" = "755" ]; then
        check_result 0 "Permisos de directorio correctos (755)"
    else
        check_result 1 "Permisos de directorio incorrectos ($perms)"
        echo -e "${YELLOW}Corrigiendo permisos...${NC}"
        sudo chmod 755 "$APP_DIR"
        sudo find "$APP_DIR" -type f -exec chmod 644 {} \;
        check_result 0 "Permisos corregidos"
    fi
fi

# 4. Test de conectividad
echo -e "\n${BLUE}═══ 4. TESTS DE CONECTIVIDAD ═══${NC}"

# Test local HTTP
echo -e "${YELLOW}🔍 Probando HTTP local...${NC}"
local_http=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
echo "Código de respuesta HTTP local: $local_http"

if [ "$local_http" = "200" ]; then
    check_result 0 "Servidor HTTP local responde correctamente"
else
    check_result 1 "Servidor HTTP local no responde correctamente (código: $local_http)"
fi

# Test local HTTPS (si SSL está configurado)
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${YELLOW}🔍 Probando HTTPS local...${NC}"
    local_https=$(curl -s -k -o /dev/null -w "%{http_code}" https://localhost 2>/dev/null || echo "000")
    echo "Código de respuesta HTTPS local: $local_https"
    
    if [ "$local_https" = "200" ] || [ "$local_https" = "301" ] || [ "$local_https" = "302" ]; then
        check_result 0 "Servidor HTTPS local responde"
    else
        check_result 1 "Servidor HTTPS local no responde (código: $local_https)"
    fi
fi

# 5. Verificar logs recientes
echo -e "\n${BLUE}═══ 5. LOGS RECIENTES ═══${NC}"

echo -e "${YELLOW}📋 Últimos errores de Nginx:${NC}"
if [ -f "/var/log/nginx/error.log" ]; then
    recent_errors=$(sudo tail -5 /var/log/nginx/error.log | grep -v "^$" | wc -l)
    if [ "$recent_errors" -gt 0 ]; then
        sudo tail -5 /var/log/nginx/error.log | grep -v "^$"
    else
        echo "No hay errores recientes en Nginx"
    fi
else
    echo "No se encontró log de errores"
fi

echo -e "\n${YELLOW}📋 Últimos accesos:${NC}"
if [ -f "/var/log/nginx/voltio.access.log" ]; then
    sudo tail -3 /var/log/nginx/voltio.access.log 2>/dev/null || echo "No hay logs de acceso"
else
    echo "No se encontró log de accesos específico"
fi

# 6. Verificar configuración específica de Angular
echo -e "\n${BLUE}═══ 6. CONFIGURACIÓN ANGULAR ═══${NC}"

# Verificar que Nginx esté configurado para SPA
if grep -q "try_files.*index.html" "$NGINX_CONFIG" 2>/dev/null; then
    check_result 0 "Configuración SPA de Angular en Nginx"
else
    check_result 1 "Configuración SPA faltante en Nginx"
    echo -e "${YELLOW}La configuración debería incluir: try_files \$uri \$uri/ /index.html;${NC}"
fi

# 7. Aplicar correcciones automáticas
echo -e "\n${BLUE}═══ 7. APLICANDO CORRECCIONES ═══${NC}"

corrections_applied=0

# Corregir permisos si es necesario
if [ -d "$APP_DIR" ]; then
    current_owner=$(stat -c %U "$APP_DIR")
    if [ "$current_owner" != "www-data" ]; then
        echo -e "${YELLOW}🔧 Corrigiendo propietario...${NC}"
        sudo chown -R www-data:www-data "$APP_DIR"
        corrections_applied=$((corrections_applied + 1))
    fi
    
    # Asegurar permisos correctos
    echo -e "${YELLOW}🔧 Asegurando permisos correctos...${NC}"
    sudo chmod -R 755 "$APP_DIR"
    sudo find "$APP_DIR" -type f -exec chmod 644 {} \; 2>/dev/null
    corrections_applied=$((corrections_applied + 1))
fi

# Recargar Nginx
echo -e "${YELLOW}🔧 Recargando Nginx...${NC}"
if sudo systemctl reload nginx; then
    check_result 0 "Nginx recargado"
    corrections_applied=$((corrections_applied + 1))
else
    check_result 1 "Error al recargar Nginx"
fi

# 8. Verificación final
echo -e "\n${BLUE}═══ 8. VERIFICACIÓN FINAL ═══${NC}"

echo -e "${YELLOW}🔍 Esperando estabilización del servidor...${NC}"
sleep 3

final_test=$(curl -s -o /dev/null -w "%{http_code}" http://localhost 2>/dev/null || echo "000")
echo "Código de respuesta final: $final_test"

if [ "$final_test" = "200" ]; then
    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 ÉXITO: PROBLEMA RESUELTO               ║"
    echo "║                                                              ║"
    echo "║  Tu aplicación Angular debería estar funcionando ahora:     ║"
    echo "║  https://$DOMAIN                                        ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
else
    echo -e "${RED}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                 ⚠️ PROBLEMA PERSISTE                        ║"
    echo "║                                                              ║"
    echo "║  El servidor aún responde con código: $final_test             ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    echo -e "\n${YELLOW}🔧 ACCIONES ADICIONALES RECOMENDADAS:${NC}"
    echo "1. Verificar que el build de Angular se completó correctamente"
    echo "2. Revisar logs detallados: sudo tail -f /var/log/nginx/error.log"
    echo "3. Verificar GitHub Actions logs para errores en el build"
    echo "4. Re-ejecutar el despliegue: git push origin develop"
    echo ""
    echo "5. Ejecutar diagnóstico de utilidades:"
    echo "   ./server-utils.sh post-deploy"
    echo "   ./server-utils.sh verify"
fi

echo -e "\n${BLUE}📊 RESUMEN DEL DIAGNÓSTICO:${NC}"
echo "- Correcciones aplicadas: $corrections_applied"
echo "- Estado final del servidor: $final_test"
echo "- Archivos en directorio: $(find "$APP_DIR" -type f 2>/dev/null | wc -l)"

if [ -f "$APP_DIR/index.html" ]; then
    echo "- Tamaño de index.html: $(stat -c%s "$APP_DIR/index.html") bytes"
fi

echo ""
echo -e "${BLUE}💡 Para monitoreo continuo, usa:${NC}"
echo "   ./server-utils.sh logs nginx"
echo "   ./server-utils.sh status"
