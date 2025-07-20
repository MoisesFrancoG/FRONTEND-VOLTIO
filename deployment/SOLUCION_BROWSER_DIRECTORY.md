# 🔧 SOLUCIÓN COMPLETA PARA ERROR 403 FORBIDDEN

## 🎯 PROBLEMA ESPECÍFICO IDENTIFICADO: DIRECTORIO BROWSER

### El problema principal detectado:
Angular 17+ genera los archivos de build en un subdirectorio llamado `browser` dentro del directorio de distribución. Esto causa que:

- Los archivos reales estén en `/var/www/voltio/browser/`
- Nginx intente servir desde `/var/www/voltio/`
- Resultado: Error 403 Forbidden

### ✅ SOLUCIÓN INMEDIATA

**Opción 1: Script de corrección automática**
```bash
# Ejecutar en el servidor EC2
cd ~/FRONTEND-VOLTIO/deployment
chmod +x quick-fix-browser.sh
./quick-fix-browser.sh
```

**Opción 2: Corrección manual**
```bash
# Verificar el problema
ls -la /var/www/voltio/
# Si ves un directorio 'browser', ejecuta:

cd /var/www/voltio
sudo cp -r browser/* .
sudo rm -rf browser
sudo chown -R www-data:www-data /var/www/voltio
sudo chmod -R 755 /var/www/voltio
sudo find /var/www/voltio -type f -exec chmod 644 {} \;
sudo systemctl reload nginx
```

**Opción 3: Usar utilidades del servidor**
```bash
./server-utils.sh fix-browser
```

### 🔍 VERIFICACIÓN

Después de aplicar la corrección:

1. **Verificar estructura de archivos:**
```bash
ls -la /var/www/voltio/
# Deberías ver index.html directamente en la raíz
```

2. **Probar conectividad:**
```bash
curl -I http://localhost
# Debería devolver: HTTP/1.1 200 OK
```

3. **Verificar en navegador:**
```
https://voltio.acstree.xyz
```

### 🚀 PREVENCIÓN FUTURA

El workflow de GitHub Actions ahora incluye detección automática del directorio browser:

```yaml
# Verifica si existe directorio browser (Angular 17+)
if [ -d "/tmp/voltio-extract/browser" ]; then
  echo "📦 Found Angular browser directory, copying contents..."
  sudo cp -r /tmp/voltio-extract/browser/* /var/www/voltio/
else
  echo "📦 Using direct copy for Angular files..."
  sudo cp -r /tmp/voltio-extract/* /var/www/voltio/
fi
```

## 📋 OTRAS POSIBLES CAUSAS DE ERROR 403

### 1. Permisos incorrectos
```bash
# Síntomas: Archivos existen pero no son accesibles
sudo chown -R www-data:www-data /var/www/voltio
sudo chmod -R 755 /var/www/voltio
sudo find /var/www/voltio -type f -exec chmod 644 {} \;
```

### 2. Configuración de Nginx incorrecta
```bash
# Verificar configuración
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Archivos faltantes
```bash
# Verificar que index.html existe
ls -la /var/www/voltio/index.html
```

## 🛠️ HERRAMIENTAS DE DIAGNÓSTICO

### Scripts disponibles:
- `quick-fix-browser.sh` - Corrección específica para directorio browser
- `deploy-diagnosis.sh` - Diagnóstico completo
- `server-utils.sh` - Utilidades del servidor
- `fix-403.sh` - Corrección general de errores 403

### Comandos útiles:
```bash
# Diagnóstico completo
./deploy-diagnosis.sh

# Verificación post-despliegue
./server-utils.sh post-deploy

# Corrección específica browser
./server-utils.sh fix-browser

# Estado general del servidor
./server-utils.sh status
```

## 🎯 RESUMEN DE LA SOLUCIÓN

1. **Problema identificado:** Angular 17+ coloca archivos en subdirectorio `browser`
2. **Solución:** Mover archivos de `browser/` a la raíz de `/var/www/voltio/`
3. **Prevención:** Workflow actualizado para manejar automáticamente este caso
4. **Verificación:** Scripts de diagnóstico disponibles

### ✅ Después de la corrección deberías ver:
- ✅ index.html en `/var/www/voltio/index.html`
- ✅ Respuesta HTTP 200 en `curl http://localhost`
- ✅ Aplicación Angular funcionando en `https://voltio.acstree.xyz`
