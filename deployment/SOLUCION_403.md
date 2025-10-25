# 🚨 Solución Rápida: Error 403 Forbidden en Nginx

## ❌ Problema Identificado

Tu servidor muestra **403 Forbidden** cuando intentas acceder a `https://voltio.acstree.xyz`

```
403 Forbidden
nginx/1.24.0 (Ubuntu)
```

## 🔍 Causas Comunes

1. **Directorio faltante:** `/var/www/voltio` no existe
2. **Permisos incorrectos:** El directorio no pertenece a `www-data`
3. **Archivo index.html faltante:** No hay archivo para servir
4. **Configuración de Nginx:** Directiva `root` incorrecta

## ⚡ Solución Inmediata

### Opción 1: Script Automático (Recomendado)

```bash
# En tu servidor EC2, ejecuta:
cd /path/to/FRONTEND-VOLTIO/deployment
./server-utils.sh fix403
```

### Opción 2: Script de Diagnóstico Completo

```bash
chmod +x fix-403.sh
./fix-403.sh
```

### Opción 3: Solución Manual

```bash
# 1. Verificar si el directorio existe
ls -la /var/www/voltio

# 2. Crear directorio si no existe
sudo mkdir -p /var/www/voltio

# 3. Corregir propietario y permisos
sudo chown -R www-data:www-data /var/www/voltio
sudo chmod -R 755 /var/www/voltio

# 4. Crear archivo index.html
sudo tee /var/www/voltio/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voltio - Funcionando</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            border-radius: 10px;
            background: rgba(255,255,255,0.1);
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        p { font-size: 1.2rem; }
        .success { color: #4ade80; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚡ Voltio</h1>
        <p class="success">✅ Error 403 Solucionado</p>
        <p>Servidor funcionando correctamente</p>
        <p>Listo para recibir la aplicación Angular</p>
    </div>
</body>
</html>
EOF

# 5. Asegurar permisos del archivo
sudo chown www-data:www-data /var/www/voltio/index.html
sudo chmod 644 /var/www/voltio/index.html

# 6. Verificar configuración de Nginx
sudo nginx -t

# 7. Recargar Nginx
sudo systemctl reload nginx

# 8. Verificar que funciona
curl -I http://localhost
```

## 🔧 Diagnóstico Paso a Paso

### 1. Verificar Estado de Nginx

```bash
sudo systemctl status nginx
```

**Esperado:** `active (running)`

### 2. Verificar Configuración

```bash
sudo nginx -t
```

**Esperado:** `syntax is ok` y `test is successful`

### 3. Verificar Directorio de la Aplicación

```bash
ls -la /var/www/voltio
```

**Esperado:** Directorio existe con propietario `www-data`

### 4. Verificar Contenido del Directorio

```bash
ls -la /var/www/voltio/
```

**Esperado:** Archivo `index.html` presente

### 5. Verificar Permisos

```bash
stat /var/www/voltio
```

**Esperado:**

- Owner: `www-data`
- Group: `www-data`
- Access: `755`

### 6. Verificar Logs de Error

```bash
sudo tail -f /var/log/nginx/voltio.error.log
```

## ✅ Verificación de la Solución

### Test Local

```bash
curl -I http://localhost
```

**Esperado:** `HTTP/1.1 200 OK`

### Test Externo

Visita `https://voltio.acstree.xyz` en tu navegador
**Esperado:** Página con mensaje de éxito

## 🛠️ Comandos de Utilidad

```bash
# Ver estado del servidor
./server-utils.sh status

# Ver logs en tiempo real
./server-utils.sh logs nginx

# Verificar configuración completa
./server-utils.sh verify
```

## 🔄 Después de Solucionar

1. **El error 403 debería estar resuelto**
2. **La página temporal debería cargar correctamente**
3. **El servidor estará listo para recibir la aplicación Angular**
4. **El despliegue automático funcionará normalmente**

## 🚨 Si el Problema Persiste

### Verificaciones Adicionales:

1. **DNS:**

   ```bash
   nslookup voltio.acstree.xyz
   ```

2. **Firewall:**

   ```bash
   sudo ufw status
   ```

3. **Procesos de Nginx:**

   ```bash
   ps aux | grep nginx
   ```

4. **Puertos:**
   ```bash
   sudo netstat -tlnp | grep :80
   sudo netstat -tlnp | grep :443
   ```

### Logs Detallados:

```bash
# Error logs
sudo tail -20 /var/log/nginx/error.log

# Access logs
sudo tail -20 /var/log/nginx/voltio.access.log

# System logs
sudo journalctl -u nginx -n 20
```

## 📞 Soporte

Si después de seguir estos pasos el problema persiste:

1. Ejecuta el diagnóstico completo: `./fix-403.sh`
2. Revisa los logs: `./server-utils.sh logs nginx`
3. Verifica la configuración: `./server-utils.sh verify`

---

**¡El error 403 Forbidden es uno de los problemas más comunes y fáciles de solucionar!**

Una vez resuelto, tu aplicación estará lista para el despliegue automático. 🚀
