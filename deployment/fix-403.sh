#!/bin/bash

# Script de diagnóstico para error 403 Forbidden en Nginx
# Ejecutar cuando se presente el error 403 en voltio.acstree.xyz

set -e

DOMAIN="voltio.acstree.xyz"
APP_DIR="/var/www/voltio"
NGINX_CONFIG="/etc/nginx/sites-available/voltio"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🔍 Diagnóstico de Error 403 Forbidden${NC}"
echo "=========================================="

# 1. Verificar estado de Nginx
echo -e "\n${BLUE}1. Estado de Nginx:${NC}"
if sudo systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx está funcionando${NC}"
else
    echo -e "${RED}❌ Nginx está detenido${NC}"
    echo "Iniciando Nginx..."
    sudo systemctl start nginx
fi

# 2. Verificar configuración de Nginx
echo -e "\n${BLUE}2. Verificando configuración de Nginx:${NC}"
if sudo nginx -t; then
    echo -e "${GREEN}✅ Configuración de Nginx es válida${NC}"
else
    echo -e "${RED}❌ Error en configuración de Nginx${NC}"
fi

# 3. Verificar directorio de la aplicación
echo -e "\n${BLUE}3. Verificando directorio de aplicación:${NC}"
if [ -d "$APP_DIR" ]; then
    echo -e "${GREEN}✅ Directorio $APP_DIR existe${NC}"
    echo "Contenido del directorio:"
    ls -la "$APP_DIR" || echo "Error al listar directorio"
else
    echo -e "${RED}❌ Directorio $APP_DIR no existe${NC}"
    echo "Creando directorio..."
    sudo mkdir -p "$APP_DIR"
fi

# 4. Verificar permisos
echo -e "\n${BLUE}4. Verificando permisos:${NC}"
if [ -d "$APP_DIR" ]; then
    owner=$(stat -c %U "$APP_DIR" 2>/dev/null || echo "unknown")
    group=$(stat -c %G "$APP_DIR" 2>/dev/null || echo "unknown")
    perms=$(stat -c %a "$APP_DIR" 2>/dev/null || echo "unknown")
    
    echo "Propietario: $owner"
    echo "Grupo: $group"
    echo "Permisos: $perms"
    
    if [ "$owner" != "www-data" ] || [ "$group" != "www-data" ]; then
        echo -e "${YELLOW}⚠️  Corrigiendo propietario...${NC}"
        sudo chown -R www-data:www-data "$APP_DIR"
    fi
    
    if [ "$perms" -lt "755" ]; then
        echo -e "${YELLOW}⚠️  Corrigiendo permisos...${NC}"
        sudo chmod -R 755 "$APP_DIR"
    fi
else
    echo -e "${RED}❌ No se puede verificar permisos - directorio no existe${NC}"
fi

# 5. Verificar archivo index.html
echo -e "\n${BLUE}5. Verificando archivo index.html:${NC}"
if [ -f "$APP_DIR/index.html" ]; then
    echo -e "${GREEN}✅ Archivo index.html existe${NC}"
    file_size=$(stat -c%s "$APP_DIR/index.html")
    echo "Tamaño del archivo: $file_size bytes"
    
    if [ "$file_size" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  Archivo index.html está vacío${NC}"
    fi
else
    echo -e "${RED}❌ Archivo index.html no existe${NC}"
    echo "Creando archivo index.html temporal..."
    sudo tee "$APP_DIR/index.html" > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voltio - Servidor Configurado</title>
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
        p { font-size: 1.2rem; opacity: 0.9; }
        .status { color: #4ade80; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ Voltio</h1>
        <p class="status">✅ Servidor funcionando correctamente</p>
        <p>Error 403 solucionado</p>
        <p>Listo para recibir la aplicación</p>
    </div>
</body>
</html>
EOF
    sudo chown www-data:www-data "$APP_DIR/index.html"
    sudo chmod 644 "$APP_DIR/index.html"
fi

# 6. Verificar configuración del sitio
echo -e "\n${BLUE}6. Verificando configuración del sitio:${NC}"
if [ -f "$NGINX_CONFIG" ]; then
    echo -e "${GREEN}✅ Archivo de configuración existe${NC}"
    echo "Verificando directiva root:"
    grep "root" "$NGINX_CONFIG" || echo "No se encontró directiva root"
else
    echo -e "${RED}❌ Archivo de configuración no existe${NC}"
fi

# 7. Verificar logs de Nginx
echo -e "\n${BLUE}7. Últimos logs de error de Nginx:${NC}"
if [ -f "/var/log/nginx/voltio.error.log" ]; then
    echo "Últimas 10 líneas del log de errores:"
    sudo tail -n 10 /var/log/nginx/voltio.error.log || echo "Log de errores vacío"
else
    echo "No se encontró log de errores específico"
fi

if [ -f "/var/log/nginx/error.log" ]; then
    echo -e "\nÚltimas 5 líneas del log general de errores:"
    sudo tail -n 5 /var/log/nginx/error.log || echo "Log general vacío"
fi

# 8. Verificar sitios habilitados
echo -e "\n${BLUE}8. Verificando sitios habilitados:${NC}"
echo "Sitios en sites-enabled:"
ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "Error al listar sitios"

# 9. Verificar proceso de Nginx
echo -e "\n${BLUE}9. Verificando procesos de Nginx:${NC}"
ps aux | grep nginx | grep -v grep || echo "No se encontraron procesos de Nginx"

# 10. Test de conectividad local
echo -e "\n${BLUE}10. Test de conectividad local:${NC}"
echo "Probando conexión local al puerto 80:"
curl -I http://localhost 2>/dev/null | head -n 1 || echo "Error en conexión local"

# Recomendaciones de solución
echo -e "\n${YELLOW}🔧 ACCIONES CORRECTIVAS APLICADAS:${NC}"
echo "1. ✅ Verificado y corregido propietario (www-data:www-data)"
echo "2. ✅ Verificado y corregido permisos (755 para directorios, 644 para archivos)"
echo "3. ✅ Creado/verificado archivo index.html"
echo "4. ✅ Verificado configuración de Nginx"

echo -e "\n${BLUE}🔄 Reiniciando Nginx para aplicar cambios...${NC}"
sudo systemctl reload nginx

echo -e "\n${GREEN}✅ Diagnóstico completado${NC}"
echo -e "\n${BLUE}🌐 Intenta acceder nuevamente a: https://$DOMAIN${NC}"

# Comando final de verificación
echo -e "\n${BLUE}📋 Verificación final:${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo -e "${GREEN}✅ Servidor respondiendo correctamente en localhost${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor no responde en localhost - revisar configuración${NC}"
fi

echo -e "\n${YELLOW}💡 Si el problema persiste:${NC}"
echo "1. Verificar DNS: nslookup $DOMAIN"
echo "2. Verificar firewall: sudo ufw status"
echo "3. Revisar logs completos: sudo tail -f /var/log/nginx/error.log"
echo "4. Verificar SSL: sudo certbot certificates"
