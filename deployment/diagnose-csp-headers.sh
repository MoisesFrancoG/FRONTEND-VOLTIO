#!/bin/bash

# 🔍 DIAGNÓSTICO CSP HEADERS
# Script para verificar qué headers CSP se están enviando

echo "🔍 DIAGNÓSTICO CSP HEADERS"
echo "=========================="
echo ""

echo "🌐 Verificando headers HTTP de voltio.acstree.xyz..."
echo ""

# Verificar headers
curl -I https://voltio.acstree.xyz 2>/dev/null | grep -i "content-security-policy"

echo ""
echo "📋 Headers completos:"
curl -I https://voltio.acstree.xyz 2>/dev/null

echo ""
echo "🔧 Verificando configuración de Nginx..."

# Verificar si el CSP está en la configuración de Nginx
if grep -q "Content-Security-Policy" /etc/nginx/sites-available/voltio; then
    echo "✅ CSP encontrado en configuración de Nginx"
    echo "📋 Configuración actual:"
    grep -A 2 -B 2 "Content-Security-Policy" /etc/nginx/sites-available/voltio
else
    echo "❌ CSP NO encontrado en configuración de Nginx"
    echo "📋 Configuración actual de Nginx:"
    cat /etc/nginx/sites-available/voltio
fi

echo ""
echo "🧪 Posibles causas del problema:"
echo "1. El CSP se está configurando en otro lugar (CloudFlare, etc.)"
echo "2. Hay un CSP por defecto de Nginx que se está aplicando"
echo "3. La configuración no se aplicó correctamente"
echo "4. Hay otro archivo de configuración sobrescribiendo"

echo ""
echo "💡 Próximo paso: Revisar la salida de este script"
