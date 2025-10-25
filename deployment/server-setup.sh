#!/bin/bash

# Script para configurar una instancia EC2 Ubuntu desde cero para desplegar una aplicación Angular
# Este script debe ejecutarse como usuario con privilegios sudo

set -e

echo "🚀 Iniciando configuración del servidor EC2 Ubuntu..."

# Actualizar el sistema
echo "📦 Actualizando paquetes del sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependencias básicas
echo "🔧 Instalando dependencias básicas..."
sudo apt install -y curl wget unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release

# Instalar Nginx
echo "🌐 Instalando Nginx..."
sudo apt install -y nginx

# Habilitar y iniciar Nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Verificar que Nginx esté funcionando
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx instalado y funcionando correctamente"
else
    echo "❌ Error: Nginx no está funcionando"
    exit 1
fi

# Configurar firewall UFW
echo "🔥 Configurando firewall UFW..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# Crear directorio para la aplicación
echo "📁 Creando directorio para la aplicación..."
sudo mkdir -p /var/www/voltio
sudo chown -R $USER:$USER /var/www/voltio
sudo chmod -R 755 /var/www

# Crear configuración básica de Nginx para la aplicación
echo "⚙️ Configurando Nginx para la aplicación..."
sudo tee /etc/nginx/sites-available/voltio > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    
    server_name voltio.acstree.xyz www.voltio.acstree.xyz;
    root /var/www/voltio;
    index index.html index.htm;

    # Configuración para Angular SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Configuración de archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Configuración de seguridad
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Logs
    access_log /var/log/nginx/voltio.access.log;
    error_log /var/log/nginx/voltio.error.log;
}
EOF

# Habilitar el sitio
sudo ln -sf /etc/nginx/sites-available/voltio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Verificar configuración de Nginx
if sudo nginx -t; then
    echo "✅ Configuración de Nginx válida"
    sudo systemctl reload nginx
else
    echo "❌ Error en la configuración de Nginx"
    exit 1
fi

# Instalar Certbot para SSL
echo "🔐 Instalando Certbot para certificados SSL..."
sudo apt install -y certbot python3-certbot-nginx

# Crear página temporal
echo "📄 Creando página temporal..."
sudo tee /var/www/voltio/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voltio - Configuración en Progreso</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 2.5rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; opacity: 0.9; }
        .status { color: #4ade80; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Voltio</h1>
        <p>Servidor configurado correctamente</p>
        <p class="status">✅ Nginx funcionando</p>
        <p>Esperando despliegue de la aplicación...</p>
    </div>
</body>
</html>
EOF

sudo chown -R www-data:www-data /var/www/voltio
sudo chmod -R 755 /var/www/voltio

echo ""
echo "🎉 ¡Configuración inicial completada!"
echo ""
echo "📋 Resumen de la configuración:"
echo "   • Nginx instalado y configurado"
echo "   • Firewall UFW habilitado (puertos 22, 80, 443)"
echo "   • Directorio de aplicación: /var/www/voltio"
echo "   • Configuración del sitio: /etc/nginx/sites-available/voltio"
echo "   • Certbot instalado para SSL"
echo ""
echo "🔗 Tu sitio debería estar disponible en: http://voltio.acstree.xyz"
echo ""
echo "📝 Próximos pasos:"
echo "   1. Configurar SSL ejecutando: sudo ./ssl-setup.sh"
echo "   2. Configurar los secrets en GitHub (EC2_HOST, EC2_USERNAME, EC2_SSH_KEY)"
echo "   3. Hacer push al repositorio para activar el despliegue automático"
echo ""
