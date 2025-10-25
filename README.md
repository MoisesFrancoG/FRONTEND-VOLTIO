# Voltioapp - Sistema de Monitoreo Energético 🚀

**Estado del Despliegue:** ✅ DEPLOY TEST v2.0 ACTIVO  
**Última actualización:** Julio 19, 2025  
**URL de producción:** https://voltio.acstree.xyz

Este proyecto fue generado con [Angular CLI](https://github.com/angular/angular-cli) versión 18.2.2.

## 🧪 Verificación de Despliegue Automático

**Cambios de prueba implementados para verificar CI/CD:**

- 🏠 **Home:** Título actualizado con "DEPLOY TEST v2.0", botón verde, emojis
- 🧭 **Navbar:** Fondo verde, indicador "DEPLOY v2.0", emojis en navegación
- 📡 **Bluetooth:** Banner de test deploy, títulos actualizados
- 🔐 **Login:** Indicador verde de deploy activo

**Para verificar el despliegue:**

```bash
# Ejecutar script de verificación
./deployment/verify-deployment.sh
```

## 🚀 Despliegue Automático

El proyecto incluye CI/CD completo con GitHub Actions:

- ✅ Build automático en push a `main`/`develop`
- ✅ Tests automatizados
- ✅ Despliegue a EC2 Ubuntu con Nginx
- ✅ SSL automático con Let's Encrypt
- ✅ Corrección automática de directorio browser (Angular 17+)

### Scripts de mantenimiento disponibles:

```bash
./deployment/server-utils.sh status     # Estado del servidor
./deployment/quick-fix-browser.sh       # Corrección directorio browser
./deployment/deploy-diagnosis.sh        # Diagnóstico completo
```

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
