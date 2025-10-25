#!/bin/bash

# Script para configurar SSL con Certbot y Let's Encrypt
# Ejecutar después de server-setup.sh

set -e

DOMAIN="voltio.acstree.xyz"
EMAIL="miguemolina4570@gmail.com"  # Cambia este email por el tuyo

echo "🔐 Configurando SSL para $DOMAIN..."

# Verificar que Nginx esté funcionando
if ! sudo systemctl is-active --quiet nginx; then
    echo "❌ Error: Nginx no está funcionando. Ejecuta server-setup.sh primero."
    exit 1
fi

# Verificar que el dominio esté apuntando al servidor
echo "🔍 Verificando resolución DNS..."
if ! nslookup $DOMAIN | grep -q "$(curl -s ifconfig.me)"; then
    echo "⚠️  Advertencia: El dominio $DOMAIN podría no estar apuntando a este servidor"
    echo "    Asegúrate de que el DNS esté configurado correctamente"
    read -p "¿Deseas continuar? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Obtener certificado SSL
echo "📜 Obteniendo certificado SSL de Let's Encrypt..."
sudo certbot --nginx -d $DOMAIN -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# Verificar que el certificado se instaló correctamente
if sudo certbot certificates | grep -q $DOMAIN; then
    echo "✅ Certificado SSL instalado correctamente"
else
    echo "❌ Error: No se pudo obtener el certificado SSL"
    exit 1
fi

# Configurar renovación automática
echo "🔄 Configurando renovación automática de certificados..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Verificar la configuración de renovación
if sudo certbot renew --dry-run; then
    echo "✅ Renovación automática configurada correctamente"
else
    echo "❌ Error en la configuración de renovación automática"
fi

# Mejorar la configuración de seguridad SSL en Nginx
echo "🛡️ Mejorando configuración de seguridad SSL..."
sudo tee /etc/nginx/sites-available/voltio > /dev/null << 'EOF'
# Redirigir HTTP a HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name voltio.acstree.xyz www.voltio.acstree.xyz;
    return 301 https://$server_name$request_uri;
}

# Configuración HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name voltio.acstree.xyz www.voltio.acstree.xyz;
    root /var/www/voltio;
    index index.html index.htm;

    # Certificados SSL (Certbot los configurará automáticamente)
    ssl_certificate /etc/letsencrypt/live/voltio.acstree.xyz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/voltio.acstree.xyz/privkey.pem;
    
    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    
    # Configuración de seguridad HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;
    
    # Configuración para Angular SPA
    location / {
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad adicionales
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
    }

    # Configuración optimizada para archivos estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header Vary "Accept-Encoding";
        access_log off;
        
        # Compresión
        gzip on;
        gzip_vary on;
        gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    }

    # Configuración para API (si aplica)
    location /api/ {
        # Configurar proxy si tienes un backend
        # proxy_pass http://localhost:3000;
        # proxy_http_version 1.1;
        # proxy_set_header Upgrade $http_upgrade;
        # proxy_set_header Connection 'upgrade';
        # proxy_set_header Host $host;
        # proxy_cache_bypass $http_upgrade;
        # proxy_set_header X-Real-IP $remote_addr;
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # proxy_set_header X-Forwarded-Proto $scheme;
        
        return 404; # Por ahora retorna 404
    }

    # Ocultar archivos sensibles
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }

    # Logs
    access_log /var/log/nginx/voltio.access.log;
    error_log /var/log/nginx/voltio.error.log;
}
EOF

# Verificar la nueva configuración
if sudo nginx -t; then
    echo "✅ Nueva configuración de Nginx válida"
    sudo systemctl reload nginx
else
    echo "❌ Error en la nueva configuración de Nginx"
    exit 1
fi

# Verificar que SSL esté funcionando
echo "🔍 Verificando configuración SSL..."
sleep 5

if curl -I https://$DOMAIN 2>/dev/null | grep -q "200 OK"; then
    echo "✅ SSL configurado correctamente"
else
    echo "⚠️  Advertencia: No se pudo verificar SSL automáticamente"
fi

echo ""
echo "🎉 ¡Configuración SSL completada!"
echo ""
echo "📋 Resumen:"
echo "   • Certificado SSL instalado para $DOMAIN"
echo "   • HTTPS habilitado y HTTP redirige a HTTPS"
echo "   • Renovación automática configurada"
echo "   • Headers de seguridad mejorados"
echo "   • Compresión gzip habilitada"
echo ""
echo "🔗 Tu sitio ahora está disponible en: https://$DOMAIN"
echo ""
echo "🔄 Para verificar la renovación automática:"
echo "   sudo certbot renew --dry-run"
echo ""
echo "📊 Para ver el estado de los certificados:"
echo "   sudo certbot certificates"
echo ""
