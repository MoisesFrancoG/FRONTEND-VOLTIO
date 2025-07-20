# 🚀 Guía de Despliegue Automático - Voltio App

Esta guía te llevará paso a paso para configurar el despliegue automático de tu aplicación Angular en una instancia EC2 Ubuntu usando GitHub Actions, Nginx y SSL con Let's Encrypt.

## 📋 Requisitos Previos

- ✅ Instancia EC2 Ubuntu (20.04 LTS o superior)
- ✅ Dominio configurado: `voltio.acstree.xyz` apuntando a la IP de tu EC2
- ✅ Acceso SSH a la instancia EC2
- ✅ Repositorio en GitHub
- ✅ Par de llaves SSH para acceso automatizado

## 🔧 Paso 1: Configuración Inicial del Servidor EC2

### 1.1 Conectarse al servidor

```bash
ssh -i tu-llave.pem ubuntu@tu-ip-publica
```

### 1.2 Clonar el repositorio y ejecutar configuración inicial

```bash
# Clonar el repositorio
git clone https://github.com/MoisesFrancoG/FRONTEND-VOLTIO.git
cd FRONTEND-VOLTIO/deployment

# Hacer ejecutables los scripts
chmod +x *.sh

# Ejecutar configuración inicial del servidor
sudo ./server-setup.sh
```

Este script realizará:

- ✅ Actualización del sistema
- ✅ Instalación de Nginx
- ✅ Configuración del firewall UFW
- ✅ Creación de directorios necesarios
- ✅ Configuración básica de Nginx
- ✅ Instalación de Certbot

### 1.3 Verificar que el servidor esté funcionando

Visita `http://voltio.acstree.xyz` - deberías ver una página temporal.

## 🔐 Paso 2: Configuración SSL

### 2.1 Editar el email en el script SSL

```bash
nano ssl-setup.sh
```

Cambia la línea:

```bash
EMAIL="admin@acstree.xyz"  # Cambia este email por el tuyo
```

### 2.2 Ejecutar configuración SSL

```bash
sudo ./ssl-setup.sh
```

Este script:

- ✅ Obtiene certificados SSL de Let's Encrypt
- ✅ Configura HTTPS y redirección HTTP→HTTPS
- ✅ Configura renovación automática
- ✅ Mejora la seguridad con headers adicionales

### 2.3 Verificar SSL

Visita `https://voltio.acstree.xyz` - ahora debería cargar con HTTPS.

## 🔑 Paso 3: Configuración de GitHub Secrets

### 3.1 Generar llave SSH para despliegue

En tu máquina local:

```bash
ssh-keygen -t rsa -b 4096 -C "deployment@voltio.acstree.xyz" -f ~/.ssh/voltio_deploy
```

### 3.2 Agregar llave pública al servidor

```bash
# Copiar llave pública al servidor
ssh-copy-id -i ~/.ssh/voltio_deploy.pub ubuntu@tu-ip-publica

# O manualmente:
cat ~/.ssh/voltio_deploy.pub | ssh ubuntu@tu-ip-publica "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3.3 Configurar secrets en GitHub

Ve a tu repositorio → Settings → Secrets and variables → Actions

Agrega estos secrets:

| Secret Name    | Valor                     | Descripción                                     |
| -------------- | ------------------------- | ----------------------------------------------- |
| `EC2_HOST`     | `tu-ip-publica`           | IP pública de tu instancia EC2                  |
| `EC2_USERNAME` | `ubuntu`                  | Usuario SSH (generalmente 'ubuntu' para Ubuntu) |
| `EC2_SSH_KEY`  | `contenido-llave-privada` | Contenido completo de `~/.ssh/voltio_deploy`    |

Para obtener la llave privada:

```bash
cat ~/.ssh/voltio_deploy
```

Copia todo el contenido (incluyendo `-----BEGIN` y `-----END`).

## 🔄 Paso 4: Configuración de GitHub Actions

El archivo `.github/workflows/deploy.yml` ya está configurado y realizará:

### 4.1 En cada push a `main` o `develop`:

1. ✅ Instala dependencias
2. ✅ Ejecuta tests
3. ✅ Construye la aplicación
4. ✅ Crea un artefacto de despliegue
5. ✅ Se conecta al servidor EC2
6. ✅ Hace backup de la versión anterior
7. ✅ Despliega la nueva versión
8. ✅ Recarga Nginx

### 4.2 Estructura del workflow:

```
Build Job (Ubuntu) → Deploy Job (Solo en main/develop) → Notify Job
```

## 🚀 Paso 5: Primer Despliegue

### 5.1 Hacer push al repositorio

```bash
git add .
git commit -m "🚀 Configuración inicial de despliegue"
git push origin develop
```

### 5.2 Verificar el despliegue

1. Ve a la pestaña "Actions" en GitHub
2. Observa el progreso del workflow
3. Una vez completado, visita `https://voltio.acstree.xyz`

## 🛠️ Paso 6: Utilidades de Mantenimiento

Hemos incluido un script de utilidades para el mantenimiento del servidor:

```bash
# Ver estado del servidor
./server-utils.sh status

# Ver logs en tiempo real
./server-utils.sh logs nginx

# Crear backup
./server-utils.sh backup

# Limpiar archivos temporales
./server-utils.sh cleanup

# Actualizar sistema
./server-utils.sh update

# Verificar configuración
./server-utils.sh verify
```

## 📊 Monitoreo y Mantenimiento

### Logs importantes:

```bash
# Logs de Nginx
sudo tail -f /var/log/nginx/voltio.access.log
sudo tail -f /var/log/nginx/voltio.error.log

# Logs del sistema
sudo journalctl -u nginx -f

# Estado de certificados SSL
sudo certbot certificates
```

### Comandos útiles:

```bash
# Verificar estado de Nginx
sudo systemctl status nginx

# Recargar configuración de Nginx
sudo systemctl reload nginx

# Verificar configuración de Nginx
sudo nginx -t

# Renovar certificados SSL manualmente
sudo certbot renew

# Ver estado del firewall
sudo ufw status
```

## 🔍 Solución de Problemas Comunes

### ✅ Errores de Angular Corregidos

**Los siguientes errores fueron identificados y corregidos en el proyecto:**

1. **Error: "Can't bind to 'options' on 'div'"**

   - **Causa:** El componente `MonitoringComponent` usa la directiva `echarts` pero no estaba importada en los tests
   - **Solución:** Agregado `NgxEchartsModule` en `monitoring.component.spec.ts`

2. **Error: "Can't bind to 'formGroup' on 'form'"**

   - **Causa:** Los tests de `LoginComponent` y `RegisterComponent` no importaban `ReactiveFormsModule`
   - **Solución:** Agregado `ReactiveFormsModule` en ambos archivos `.spec.ts`

3. **Error: "'app-navbar' is not a known element"**

   - **Causa:** El test de `AppComponent` no importaba `SharedModule` que contiene `NavbarComponent`
   - **Solución:** Agregado `SharedModule` en `app.component.spec.ts`

4. **Errores adicionales corregidos:**
   - Agregado `RouterTestingModule` en tests que usan `routerLink`
   - Corregidos imports faltantes en `HomeComponent` y `NavbarComponent` tests

**Estado actual:** ✅ Todos los tests pasan correctamente (12/12 SUCCESS)

### � Problema: Jobs de GitHub exitosos pero Error 403 persiste

**Síntomas:**
- ✅ GitHub Actions se completa exitosamente
- ❌ La aplicación Angular no se despliega (Error 403)
- ❌ Solo se ve página temporal o error de Nginx

**Causas comunes:**
1. **Build incompleto:** Los archivos de Angular no se copiaron correctamente
2. **Permisos perdidos:** Durante el despliegue se perdieron permisos www-data
3. **Estructura incorrecta:** Los archivos no están en la ubicación correcta
4. **Cache de Nginx:** El servidor está sirviendo contenido anterior

**Solución paso a paso:**

1. **Diagnóstico inmediato:**
   ```bash
   # En el servidor EC2, ejecutar diagnóstico completo
   chmod +x deploy-diagnosis.sh
   ./deploy-diagnosis.sh
   
   # O usar utilidades
   ./server-utils.sh post-deploy
   ```

2. **Verificar estructura de archivos:**
   ```bash
   # Verificar que los archivos Angular existen
   ls -la /var/www/voltio/
   
   # Debería mostrar archivos como:
   # index.html, main*.js, polyfills*.js, styles*.css
   ```

3. **Corregir permisos post-despliegue:**
   ```bash
   sudo chown -R www-data:www-data /var/www/voltio
   sudo chmod -R 755 /var/www/voltio
   sudo find /var/www/voltio -type f -exec chmod 644 {} \;
   sudo systemctl reload nginx
   ```

4. **Si los archivos Angular faltan, re-ejecutar despliegue:**
   ```bash
   # Hacer un cambio mínimo y push
   git commit --allow-empty -m "🔄 Re-trigger deployment"
   git push origin develop
   ```

### �🚨 Problema: Error 403 Forbidden en Nginx

**Síntomas:**

- Página muestra "403 Forbidden"
- Nginx está funcionando pero no puede servir archivos

**Causas comunes:**

1. Directorio `/var/www/voltio` no existe o está vacío
2. Permisos incorrectos (no es propiedad de www-data)
3. Archivo `index.html` faltante o corrupto
4. Configuración de Nginx incorrecta

**Solución rápida:**

```bash
# En el servidor EC2
./server-utils.sh fix403

# O ejecutar el script de diagnóstico completo
chmod +x fix-403.sh
./fix-403.sh
```

**Solución manual:**

```bash
# 1. Crear directorio si no existe
sudo mkdir -p /var/www/voltio

# 2. Corregir permisos
sudo chown -R www-data:www-data /var/www/voltio
sudo chmod -R 755 /var/www/voltio

# 3. Crear archivo index.html temporal
sudo tee /var/www/voltio/index.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html><head><title>Voltio</title></head>
<body><h1>Voltio - Servidor funcionando</h1></body></html>
EOF

# 4. Recargar Nginx
sudo systemctl reload nginx
```

### Problema: El despliegue falla en GitHub Actions

**Solución:**

1. Verifica que los secrets estén configurados correctamente
2. Asegúrate de que la llave SSH sea correcta
3. Verifica que el usuario tenga permisos sudo sin contraseña

### Problema: SSL no funciona

**Solución:**

1. Verifica que el dominio esté apuntando correctamente:
   ```bash
   nslookup voltio.acstree.xyz
   ```
2. Ejecuta el test de renovación:
   ```bash
   sudo certbot renew --dry-run
   ```

### Problema: 502 Bad Gateway

**Solución:**

1. Verifica que Nginx esté funcionando:
   ```bash
   sudo systemctl status nginx
   ```
2. Revisa los logs:
   ```bash
   sudo tail -f /var/log/nginx/voltio.error.log
   ```
3. Verifica permisos:
   ```bash
   sudo chown -R www-data:www-data /var/www/voltio
   ```

### Problema: La aplicación no carga rutas de Angular

**Solución:**
Verifica que la configuración de Nginx tenga:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## 🎯 Configuraciones Avanzadas

### Configurar backend API (opcional)

Si tienes un backend, edita `/etc/nginx/sites-available/voltio`:

```nginx
location /api/ {
    proxy_pass http://localhost:3000;  # Tu puerto de backend
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Configurar múltiples ambientes

Puedes modificar el workflow para manejar diferentes ramas:

- `develop` → Despliega en subdirectorio `/dev`
- `main` → Despliega en directorio principal

### Notificaciones de Slack/Discord

Agrega al final del workflow:

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📈 Métricas y Analytics

Para monitorear el rendimiento:

1. **Instalar GoAccess** (analizador de logs):

```bash
sudo apt install goaccess
goaccess /var/log/nginx/voltio.access.log --log-format=COMBINED
```

2. **Configurar monitoreo básico** con uptimerobot.com

3. **Google Analytics** en tu aplicación Angular

## 🔐 Seguridad Adicional

### 1. Configurar fail2ban

```bash
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### 2. Deshabilitar autenticación por contraseña

```bash
sudo nano /etc/ssh/sshd_config
# Cambiar: PasswordAuthentication no
sudo systemctl restart ssh
```

### 3. Configurar actualizaciones automáticas

```bash
sudo apt install unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades
```

## ✅ Checklist Final

- [ ] Servidor EC2 configurado con Ubuntu
- [ ] Dominio `voltio.acstree.xyz` apunta a la IP
- [ ] Scripts de configuración ejecutados
- [ ] SSL configurado y funcionando
- [ ] GitHub Secrets configurados
- [ ] Primer despliegue exitoso
- [ ] Aplicación accesible en HTTPS
- [ ] Logs monitoreados
- [ ] Backups configurados

## 🆘 Contacto y Soporte

Si encuentras problemas:

1. Revisa los logs con `./server-utils.sh logs`
2. Verifica el estado con `./server-utils.sh status`
3. Consulta la documentación de cada servicio
4. Crea un issue en el repositorio

## 🎉 ¡Felicitaciones!

Tu aplicación Voltio ahora tiene:

- ✅ Despliegue automático con GitHub Actions
- ✅ HTTPS con certificados SSL automáticos
- ✅ Servidor Nginx optimizado
- ✅ Monitoreo y utilidades de mantenimiento
- ✅ Backups automáticos
- ✅ Configuración de seguridad robusta

¡Tu aplicación está lista para producción! 🚀
