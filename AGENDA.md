# Agenda de TosiLab

La agenda requiere Node.js 22.13 o posterior. Arranca el servidor desde esta carpeta en PowerShell:

```powershell
$env:TOSILAB_AGENDA_KEY = Read-Host 'Clave de la agenda' -MaskInput
node serve-tosilab.js
```

- Página de turnos: http://127.0.0.1:5184/#turnos
- Panel de gestión: http://127.0.0.1:5184/agenda
- La base SQLite se guarda fuera de las rutas públicas. Por defecto es `.tosilab-agenda.sqlite`. Para desplegar, usá `TOSILAB_AGENDA_DB` con una ruta en almacenamiento persistente.
- Antes de compartir la agenda, bloqueá los horarios que ya tengas tomados en Google Calendar. Los cambios de Calendar se cargan manualmente.
- Los horarios son bloques de una hora, de lunes a viernes de 9 a 15 y sábados de 9 a 17. Las solicitudes pendientes expiran después de 30 minutos. Confirmá la solicitud en el panel cuando la coordines por WhatsApp.
- Para publicar la agenda usá el servidor Node con HTTPS delante y una clave fuerte. GitHub sirve para compartir el código. El HTML abierto como archivo mantiene la consulta directa por WhatsApp.
