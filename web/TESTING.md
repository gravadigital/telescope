# Guía de Testing - Telescopio

## Funcionalidades Implementadas

✅ **Completado:**
- Vista de eventos públicos
- Sistema de autenticación (login/registro)
- Registro de usuarios en eventos
- Subida de archivos
- Estados de eventos
- Vista detallada de eventos

## Cómo Probar el Flujo

### 1. Preparar el Entorno

Tener ambos servidores corriendo:

```bash
# Terminal 1 - API Backend
cd telescopio-api
go run cmd/api/main.go

# Terminal 2 - Frontend
cd Telescopio-web
npm start
```

### 2. Ver Eventos Sin Autenticación

1. Abre http://localhost:3000
2. Navega a "Events"
3. ✅ **Deberías ver**: Lista de eventos disponibles para todos
4. ✅ **Deberías ver**: Botón "Ver Detalles" para cada evento
5. ✅ **Deberías ver**: Botón "Iniciar sesión para participar" (deshabilitado) para eventos en registro

### 3. Crear Eventos de Prueba

En la consola del navegador (F12):

```javascript
// Mostrar instrucciones
(window as any).telescopioTest.showTestInstructions();

// Crear eventos de prueba
await (window as any).telescopioTest.createTestEvents();

// Cambiar evento a fase de registro
await (window as any).telescopioTest.updateEventToRegistration('EVENT_ID');
```

Ver eventos existentes:
```javascript
const events = await fetch('http://localhost:8080/api/events').then(r => r.json());
console.log('Eventos:', events);
```

### 4. Flujo de Usuario Completo

#### Paso 1: Registro/Login
1. Click en "Login" en la navbar
2. Crear una cuenta nueva o usar credenciales existentes
3. ✅ **Verificar**: Usuario aparece en la navbar después del login

#### Paso 2: Unirse a un Evento
1. En la lista de eventos, buscar uno en estado "Registro Abierto"
2. Click en "Participar" (ya no debería estar deshabilitado)
3. ✅ **Verificar**: Mensaje de éxito "Te has registrado exitosamente"

#### Paso 3: Subir Archivo
1. Cambiar el evento a fase de subida:
   ```javascript
   await (window as any).telescopioTest.updateEventToAttachmentUpload('EVENT_ID');
   ```
2. Refresh la página
3. Abrir detalles del evento
4. ✅ **Debería aparecer**: Sección "Subir tu Participación"
5. Seleccionar un archivo (JPEG, PNG, PDF, etc.)
6. Click en "Subir Archivo"
7. ✅ **Verificar**: Mensaje "¡Archivo subido exitosamente!"

### 5. Estados de Eventos

Orden de estados: `creation` → `registration` → `attachment_upload` → `voting` → `results`

Cambiar estados:
```javascript
// Cambiar a registro
await fetch('http://localhost:8080/api/events/EVENT_ID/stage', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stage: 'registration' })
});

// Cambiar a subida de archivos
await fetch('http://localhost:8080/api/events/EVENT_ID/stage', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stage: 'attachment_upload' })
});
```

### 6. Verificar API

```javascript
// Ver todos los eventos
fetch('http://localhost:8080/api/events').then(r => r.json()).then(console.log);

// Ver participantes de un evento
fetch('http://localhost:8080/api/events/EVENT_ID/participants').then(r => r.json()).then(console.log);

// Health check
fetch('http://localhost:8080/ping').then(r => r.json()).then(console.log);
```

## Tecnologías

### Frontend
- React con TypeScript
- Context API para autenticación
- CSS personalizado
- Validación de archivos
- Diseño responsive

### Backend (API)
- Go con endpoints REST
- CORS configurado
- Sistema de stages
- Upload de archivos
- Validación de permisos

## Próximos Pasos Sugeridos

1. **Votación**: Implementar sistema de votación
2. **Resultados**: Vista de resultados con rankings
3. **Persistencia**: Migrar de in-memory a base de datos
4. **Autenticación**: JWT tokens y middleware
5. **Notificaciones**: Sistema de notificaciones de cambios de estado
6. **Admin Panel**: Vista para administradores de eventos

## Comandos Útiles

```javascript
// Limpiar autenticación
(window as any).telescopioTest.clearAuth();

// Mostrar instrucciones
(window as any).telescopioTest.showTestInstructions();

// Crear eventos de prueba
await (window as any).telescopioTest.createTestEvents();
```

## Troubleshooting

### Error: "No events found"
- Verifica que la API esté corriendo en puerto 8080
- Crea eventos usando `createTestEvents()`

### Error: "Cannot register"
- Verifica que estés logueado
- Verifica que el evento esté en estado 'registration'

### Error: "Cannot upload file"
- Verifica que estés registrado en el evento
- Verifica que el evento esté en estado 'attachment_upload'
- Verifica que el archivo sea del tipo correcto y menor a 10MB
