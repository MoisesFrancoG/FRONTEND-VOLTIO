#!/bin/bash

# Script de instalación rápida para Voltio App
# Este script automatiza toda la configuración del servidor

set -e

# Configuración
DOMAIN="voltio.acstree.xyz"
EMAIL="miguemolina4570@gmail.com"  # Cambia este email
REPO_URL="https://github.com/MoisesFrancoG/FRONTEND-VOLTIO.git"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Banner
echo -e "${PURPLE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    🚀 VOLTIO APP INSTALLER                   ║"
echo "║              Configuración automática del servidor          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Verificar si se ejecuta como root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ No ejecutes este script como root. Usa un usuario con sudo.${NC}"
   exit 1
fi

# Verificar conexión a internet
echo -e "${BLUE}🌐 Verificando conexión a internet...${NC}"
if ! ping -c 1 google.com &> /dev/null; then
    echo -e "${RED}❌ No hay conexión a internet${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión a internet OK${NC}"

# Solicitar confirmación del email
echo -e "${YELLOW}📧 Email actual para SSL: $EMAIL${NC}"
read -p "¿Es correcto este email? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    read -p "Ingresa tu email: " EMAIL
fi

# Verificar DNS
echo -e "${BLUE}🔍 Verificando configuración DNS...${NC}"
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(nslookup $DOMAIN | grep "Address:" | tail -n1 | awk '{print $2}')

if [[ "$SERVER_IP" != "$DOMAIN_IP" ]]; then
    echo -e "${YELLOW}⚠️  Advertencia: El dominio $DOMAIN no apunta a este servidor${NC}"
    echo -e "${YELLOW}   Servidor: $SERVER_IP${NC}"
    echo -e "${YELLOW}   Dominio:  $DOMAIN_IP${NC}"
    read -p "¿Deseas continuar de todos modos? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ Configura el DNS primero y vuelve a ejecutar${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ DNS configurado correctamente${NC}"
fi

# Paso 1: Configuración del sistema
echo -e "${BLUE}📦 Paso 1/4: Configurando sistema base...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release git

# Paso 2: Instalación y configuración de Nginx
echo -e "${BLUE}🌐 Paso 2/4: Instalando y configurando Nginx...${NC}"
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Configurar firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Crear directorio de la aplicación
sudo mkdir -p /var/www/voltio
sudo chown -R $USER:$USER /var/www/voltio
sudo chmod -R 755 /var/www

# Configuración inicial de Nginx
sudo tee /etc/nginx/sites-available/voltio > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    
    server_name $DOMAIN www.$DOMAIN;
    root /var/www/voltio;
    index index.html index.htm;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    access_log /var/log/nginx/voltio.access.log;
    error_log /var/log/nginx/voltio.error.log;
}
EOF

sudo ln -sf /etc/nginx/sites-available/voltio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

if sudo nginx -t; then
    sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx configurado correctamente${NC}"
else
    echo -e "${RED}❌ Error en configuración de Nginx${NC}"
    exit 1
fi

# Página temporal
sudo tee /var/www/voltio/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voltio - Instalación en Progreso</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 0; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center; padding: 2rem; border-radius: 10px;
            background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; opacity: 0.9; }
        .status { color: #4ade80; font-weight: bold; }
        .loader { margin: 20px auto; width: 40px; height: 40px;
            border: 4px solid rgba(255,255,255,0.3);
            border-radius: 50%; border-top: 4px solid #4ade80;
            animation: spin 1s linear infinite;
        }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ Voltio</h1>
        <div class="loader"></div>
        <p>Instalación automática en progreso...</p>
        <p class="status">✅ Servidor configurado</p>
        <p class="status">🔧 Configurando SSL...</p>
    </div>
</body>
</html>
EOF

sudo chown -R www-data:www-data /var/www/voltio

# Paso 3: Configuración SSL
echo -e "${BLUE}🔐 Paso 3/4: Configurando SSL con Let's Encrypt...${NC}"
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado SSL
if sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL; then
    echo -e "${GREEN}✅ Certificado SSL obtenido correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo obtener SSL automáticamente${NC}"
    echo -e "${YELLOW}   Puedes intentar manualmente después con:${NC}"
    echo -e "${YELLOW}   sudo certbot --nginx -d $DOMAIN${NC}"
fi

# Configurar renovación automática
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Mejorar configuración SSL
sudo tee /etc/nginx/sites-available/voltio > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name $DOMAIN www.$DOMAIN;
    root /var/www/voltio;
    index index.html index.htm;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    
    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        try_files \$uri \$uri/ /index.html;
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        gzip on;
        gzip_vary on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    }

    location ~ /\. { deny all; access_log off; log_not_found off; }

    access_log /var/log/nginx/voltio.access.log;
    error_log /var/log/nginx/voltio.error.log;
}
EOF

if sudo nginx -t; then
    sudo systemctl reload nginx
else
    echo -e "${YELLOW}⚠️  Usando configuración básica SSL${NC}"
fi

# Paso 4: Instalación de utilidades
echo -e "${BLUE}🛠️  Paso 4/4: Instalando utilidades de mantenimiento...${NC}"

# Crear directorio de scripts
sudo mkdir -p /opt/voltio-scripts
cd /opt/voltio-scripts

# Descargar scripts de utilidades del repositorio
if curl -s "https://raw.githubusercontent.com/MoisesFrancoG/FRONTEND-VOLTIO/develop/deployment/server-utils.sh" -o server-utils.sh; then
    chmod +x server-utils.sh
    echo -e "${GREEN}✅ Scripts de utilidades instalados${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudieron descargar las utilidades${NC}"
fi

# Crear alias para facilitar el uso
echo "alias voltio-status='/opt/voltio-scripts/server-utils.sh status'" >> ~/.bashrc
echo "alias voltio-logs='/opt/voltio-scripts/server-utils.sh logs'" >> ~/.bashrc
echo "alias voltio-backup='/opt/voltio-scripts/server-utils.sh backup'" >> ~/.bashrc

# Crear página de instalación completada
sudo tee /var/www/voltio/index.html > /dev/null << 'EOF'
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
            color: white;
        }
        .container {
            text-align: center; padding: 2rem; border-radius: 10px;
            background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px);
            max-width: 600px;
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.1rem; opacity: 0.9; margin: 0.5rem 0; }
        .status { color: #4ade80; font-weight: bold; }
        .code { background: rgba(0,0,0,0.3); padding: 0.5rem; border-radius: 5px; font-family: monospace; margin: 1rem 0; }
        .next-steps { text-align: left; background: rgba(255,255,255,0.1); padding: 1rem; border-radius: 5px; margin: 1rem 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ Voltio</h1>
        <p class="status">🎉 ¡Servidor configurado exitosamente!</p>
        
        <div class="next-steps">
            <h3>✅ Configurado:</h3>
            <p>• Nginx con SSL automático</p>
            <p>• Firewall UFW habilitado</p>
            <p>• Certificados Let's Encrypt</p>
            <p>• Utilidades de mantenimiento</p>
        </div>

        <div class="next-steps">
            <h3>📝 Próximos pasos:</h3>
            <p>1. Configurar GitHub Secrets</p>
            <p>2. Hacer push al repositorio</p>
            <p>3. ¡Tu app se desplegará automáticamente!</p>
        </div>

        <div class="code">
            Servidor listo para recibir despliegues automáticos
        </div>
    </div>
</body>
</html>
EOF

sudo chown -R www-data:www-data /var/www/voltio

# Resumen final
echo ""
echo -e "${GREEN}🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📊 Resumen de la configuración:${NC}"
echo -e "   • Servidor:     Ubuntu $(lsb_release -rs)"
echo -e "   • Dominio:      https://$DOMAIN"
echo -e "   • IP Servidor:  $SERVER_IP"
echo -e "   • Nginx:        ✅ Configurado con SSL"
echo -e "   • Firewall:     ✅ UFW habilitado"
echo -e "   • SSL:          ✅ Let's Encrypt configurado"
echo -e "   • Auto-renovar: ✅ Cada 12 horas"
echo ""
echo -e "${YELLOW}🔑 Configurar GitHub Secrets:${NC}"
echo -e "   • EC2_HOST:     $SERVER_IP"
echo -e "   • EC2_USERNAME: ubuntu"
echo -e "   • EC2_SSH_KEY:  [tu llave privada SSH]"
echo ""
echo -e "${BLUE}🛠️  Comandos útiles:${NC}"
echo -e "   • voltio-status  - Ver estado del servidor"
echo -e "   • voltio-logs    - Ver logs en tiempo real"
echo -e "   • voltio-backup  - Crear backup"
echo ""
echo -e "${GREEN}🔗 Tu sitio está disponible en: https://$DOMAIN${NC}"
echo ""
echo -e "${PURPLE}═══════════════════════════════════════════════════════════${NC}"

# Verificación final opcional
read -p "¿Deseas abrir el sitio en el navegador? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open "https://$DOMAIN"
    elif command -v open > /dev/null; then
        open "https://$DOMAIN"
    else
        echo -e "${BLUE}Visita: https://$DOMAIN${NC}"
    fi
fi

echo -e "${GREEN}✨ ¡Listo para recibir despliegues automáticos!${NC}"
