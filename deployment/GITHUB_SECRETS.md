# 🔐 Configuración de GitHub Secrets para Despliegue Automático

Esta guía te ayudará a configurar los secrets necesarios en GitHub para el despliegue automático de tu aplicación Voltio.

## 📋 Secrets Requeridos

Tu repositorio necesita estos 3 secrets para funcionar:

| Secret Name    | Descripción                    | Ejemplo                                  |
| -------------- | ------------------------------ | ---------------------------------------- |
| `EC2_HOST`     | IP pública de tu instancia EC2 | `52.91.234.567`                          |
| `EC2_USERNAME` | Usuario SSH del servidor       | `ubuntu`                                 |
| `EC2_SSH_KEY`  | Llave privada SSH para acceso  | `-----BEGIN OPENSSH PRIVATE KEY-----...` |

## 🔑 Paso 1: Generar Llave SSH de Despliegue

En tu máquina local, ejecuta:

```bash
# Generar nueva llave SSH específica para despliegue
ssh-keygen -t rsa -b 4096 -C "voltio-deploy@acstree.xyz" -f ~/.ssh/voltio_deploy

# Esto creará dos archivos:
# ~/.ssh/voltio_deploy      (llave privada - para GitHub Secret)
# ~/.ssh/voltio_deploy.pub  (llave pública - para el servidor)
```

## 🖥️ Paso 2: Configurar la Llave en el Servidor EC2

### Opción A: Usando ssh-copy-id (recomendado)

```bash
# Copiar llave pública al servidor
ssh-copy-id -i ~/.ssh/voltio_deploy.pub ubuntu@TU_IP_SERVIDOR

# Verificar que funciona
ssh -i ~/.ssh/voltio_deploy ubuntu@TU_IP_SERVIDOR
```

### Opción B: Manual

```bash
# 1. Mostrar contenido de la llave pública
cat ~/.ssh/voltio_deploy.pub

# 2. Conectarse al servidor
ssh ubuntu@TU_IP_SERVIDOR

# 3. En el servidor, agregar la llave
mkdir -p ~/.ssh
echo "CONTENIDO_DE_LA_LLAVE_PUBLICA" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
exit

# 4. Verificar conexión
ssh -i ~/.ssh/voltio_deploy ubuntu@TU_IP_SERVIDOR
```

## 🐙 Paso 3: Configurar Secrets en GitHub

### 3.1 Acceder a la configuración de secrets

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (⚙️)
3. En el menú izquierdo, click en **Secrets and variables**
4. Click en **Actions**
5. Click en **New repository secret**

### 3.2 Agregar cada secret

#### Secret 1: EC2_HOST

- **Name:** `EC2_HOST`
- **Secret:** Tu IP pública (ej: `52.91.234.567`)
- Click **Add secret**

#### Secret 2: EC2_USERNAME

- **Name:** `EC2_USERNAME`
- **Secret:** `ubuntu`
- Click **Add secret**

#### Secret 3: EC2_SSH_KEY

- **Name:** `EC2_SSH_KEY`
- **Secret:** Contenido completo de la llave privada

Para obtener la llave privada:

```bash
cat ~/.ssh/voltio_deploy
```

Copia **TODO** el contenido, incluyendo:

```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAA...
...contenido de la llave...
-----END OPENSSH PRIVATE KEY-----
```

> ⚠️ **Importante:** Incluye las líneas BEGIN y END, y todo el contenido sin modificar

## ✅ Paso 4: Verificar la Configuración

Una vez configurados los secrets:

1. **Verificar que los secrets aparecen en GitHub:**

   - Ve a Settings → Secrets and variables → Actions
   - Deberías ver los 3 secrets listados

2. **Hacer un push de prueba:**

   ```bash
   git add .
   git commit -m "🚀 Test: Configuración de despliegue automático"
   git push origin develop
   ```

3. **Verificar el workflow:**
   - Ve a la pestaña **Actions** en GitHub
   - Observa que el workflow se ejecute sin errores
   - El deploy debería completarse exitosamente

## 🔍 Solución de Problemas Comunes

### Error: "Permission denied (publickey)"

**Problema:** La llave SSH no está configurada correctamente.

**Solución:**

```bash
# Verificar que la llave esté en el servidor
ssh ubuntu@TU_IP_SERVIDOR "cat ~/.ssh/authorized_keys"

# Verificar permisos
ssh ubuntu@TU_IP_SERVIDOR "ls -la ~/.ssh/"
```

### Error: "Host key verification failed"

**Problema:** Primera conexión al servidor desde GitHub Actions.

**Solución:** Agregar esta configuración al workflow (ya incluida):

```yaml
- name: Add server to known hosts
  run: |
    mkdir -p ~/.ssh
    ssh-keyscan -H ${{ secrets.EC2_HOST }} >> ~/.ssh/known_hosts
```

### Error: "sudo: a password is required"

**Problema:** El usuario no tiene permisos sudo sin contraseña.

**Solución:**

```bash
# En el servidor EC2
sudo visudo

# Agregar al final:
ubuntu ALL=(ALL) NOPASSWD:ALL
```

### Error en el secret EC2_SSH_KEY

**Problema:** Formato incorrecto de la llave.

**Verificar:**

- ✅ Incluye `-----BEGIN OPENSSH PRIVATE KEY-----`
- ✅ Incluye `-----END OPENSSH PRIVATE KEY-----`
- ✅ No tiene espacios extra al inicio o final
- ✅ Mantiene los saltos de línea originales

## 🔒 Mejores Prácticas de Seguridad

### 1. Llave SSH específica para despliegue

- ✅ Usa una llave SSH dedicada solo para despliegue
- ✅ No uses tu llave personal
- ✅ Genera llaves con nombres descriptivos

### 2. Rotación de llaves

```bash
# Cada 6 meses, generar nuevas llaves
ssh-keygen -t rsa -b 4096 -C "voltio-deploy-$(date +%Y%m)" -f ~/.ssh/voltio_deploy_new

# Actualizar en servidor y GitHub
```

### 3. Monitoreo de accesos

```bash
# En el servidor, revisar logs de acceso SSH
sudo tail -f /var/log/auth.log | grep ssh
```

### 4. Restringir acceso SSH

```bash
# En el servidor, editar configuración SSH
sudo nano /etc/ssh/sshd_config

# Configuraciones recomendadas:
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
```

## 📊 Verificación Final

Usa este checklist para verificar que todo esté configurado:

- [ ] Llave SSH generada (`~/.ssh/voltio_deploy` y `~/.ssh/voltio_deploy.pub`)
- [ ] Llave pública agregada al servidor EC2
- [ ] Conexión SSH funciona: `ssh -i ~/.ssh/voltio_deploy ubuntu@TU_IP`
- [ ] Secret `EC2_HOST` configurado en GitHub
- [ ] Secret `EC2_USERNAME` configurado en GitHub
- [ ] Secret `EC2_SSH_KEY` configurado en GitHub
- [ ] Push de prueba ejecutado exitosamente
- [ ] Workflow de GitHub Actions completado sin errores
- [ ] Aplicación desplegada y accesible en `https://voltio.acstree.xyz`

## 🎯 Comandos de Verificación Rápida

```bash
# Verificar secrets están configurados (no muestra valores)
# Ve a GitHub → Settings → Secrets and variables → Actions

# Verificar conexión SSH
ssh -i ~/.ssh/voltio_deploy ubuntu@TU_IP_SERVIDOR "echo 'Conexión exitosa'"

# Verificar que el servidor puede recibir archivos
ssh -i ~/.ssh/voltio_deploy ubuntu@TU_IP_SERVIDOR "ls -la /var/www/voltio"

# Verificar logs del último despliegue
ssh -i ~/.ssh/voltio_deploy ubuntu@TU_IP_SERVIDOR "sudo tail -n 20 /var/log/nginx/voltio.access.log"
```

## 🆘 Soporte

Si tienes problemas:

1. **Revisa los logs del workflow** en GitHub Actions
2. **Verifica la conexión SSH** manualmente
3. **Comprueba los permisos** en el servidor
4. **Revisa la configuración de Nginx** con `sudo nginx -t`

¡Tu configuración de despliegue automático estará lista! 🚀
