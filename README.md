# Diseñador MER para escritorio

Aplicación Electron que empaqueta la página actual en una ventana de escritorio. Mantiene el editor, cardinalidades, importación JSON, guardado local y biblioteca remota por PIN. No abre un navegador.

## Atributos compuestos

Selecciona una entidad para abrir sus propiedades. En la lista de atributos, pulsa el botón `＋` junto a un atributo para añadirle un subatributo. Puedes repetirlo para anidar varios niveles. Los subatributos aparecen conectados en el diagrama y se conservan al guardar, importar y exportar modelos.

## Sincronización por PIN

Los modelos compartidos se guardan en el servicio HTTPS de `mer-pin-service`. La página y las funciones de edición se empaquetan localmente; cada ordenador requiere internet para acceder a los modelos remotos.

1. Aloja el servicio `mer-pin-service` en un servidor HTTPS con almacenamiento persistente.
2. En el servicio configura `MER_DESKTOP_ORIGINS=merapp://app` y conserva estable el secreto `MER_PIN_SECRET`.
3. En el primer inicio de escritorio, introduce el dominio HTTPS del servicio. Se guarda en la configuración de ese ordenador. Se puede cambiar desde **Archivo → Configurar servicio compartido…**.
4. Crea el PIN una vez y usa el mismo en los otros ordenadores. Al crear una cuenta se transfieren los modelos locales guardados y el modelo activo. Después de editar un modelo remoto, pulsa **Guardar en la nube** para sincronizar los cambios.

Solo se permite HTTP para `localhost` durante desarrollo. La sincronización entre ordenadores necesita internet y el servicio compartido desplegado; la app no crea por sí sola un servidor público. El guardado local sigue funcionando sin conexión.

## Compilar

Requisitos: Node.js 22.12 o posterior y npm. Desde esta carpeta:

```sh
npm install
```

### Windows

```powershell
npm run dist:win
```

Genera un instalador NSIS `.exe` x64 en `release/`. Para Windows ARM64: `npm run dist:win:arm64`. La variante ZIP portátil de Windows se genera con `npm run dist:win:zip`; extrae el archivo y ejecuta `Diseñador MER.exe` desde la carpeta extraída.

### macOS

```sh
npm run dist:mac
```

Genera archivos `.dmg` y `.zip` para Intel y Apple Silicon. La compilación se debe ejecutar en macOS. Para distribuirla públicamente con instalación fluida, firma y notariza la app con certificados de Apple.

### Linux

```sh
npm run dist:linux
```

Genera `.AppImage` y `.deb` x64 en `release/`. Al AppImage dale permiso de ejecución antes de abrirlo; instala el DEB con el gestor de paquetes. Para Linux ARM64: `npm run dist:linux:arm64`.

Electron-builder no genera de forma fiable los instaladores de todos los sistemas operativos desde un solo equipo. Ejecuta el workflow `.github/workflows/build.yml` en GitHub Actions (manual o con una etiqueta `v*`) para crear los tres artefactos en runners Windows, macOS y Linux. [La guía oficial explica sus límites de compilación entre plataformas](https://www.electron.build/docs/features/multi-platform-build/).

Los instaladores sin firma pueden mostrar avisos de seguridad del sistema operativo. Para distribuciones públicas, configura la firma de código de Windows y la firma/notarización de Apple.

## Configuración local

La dirección del servicio se guarda en `settings.json` en la carpeta de datos de usuario de la aplicación. No se guarda el PIN. El token de acceso queda en la sesión de la app y caduca a las 12 horas. Los modelos remotos y las copias de seguridad dependen del servidor compartido.
