---
id: forms
display_name: Formularios (controlados + validación nativa)
language: react
description: Controlled inputs backed by a single formData object, native HTML validation plus manual checks
applies_to: [frontend]
required_by: []
package: null
---

# Formularios

Sin react-hook-form, sin Formik, sin Zod. Inputs controlados con `useState` y validación
apoyada en los atributos nativos de HTML.

## El patrón

Un solo objeto de estado para todo el formulario, más `loading` y `error`:

```tsx
const [formData, setFormData] = useState<CreateEventFormData>({
  name: '', description: '', organizer: '', maxParticipants: 20,
});
const [creating, setCreating] = useState(false);
const [error, setError] = useState('');

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  setCreating(true);
  try {
    await EventService.createEvent(formData);
    navigate('/events');
  } catch (err) {
    setError(mensajeLegible(err));
  } finally {
    setCreating(false);
  }
};
```

Reglas:

- **Un `formData`**, no un `useState` por campo. El `name` del input tiene que coincidir con
  la clave del objeto: de ahí sale el `handleChange` genérico.
- `e.preventDefault()` siempre en el submit.
- `setCreating(false)` en `finally`.
- **Deshabilitá el botón mientras se envía** (`disabled={creating}`), para no permitir doble
  submit.

## Validación

Tres niveles, en este orden:

### 1. Atributos HTML — la primera barrera

```tsx
<input id="name" name="name" value={formData.name} onChange={handleChange} required />
```

`required`, `type="email"`, `min`, `max`, `minLength`. El navegador bloquea el submit y
muestra su propio mensaje. **Es gratis: usalos siempre.**

### 2. Validación manual — lo que HTML no cubre

Reglas que dependen de más de un campo (rangos de fechas, confirmación de contraseña) van
en el `handleSubmit`, antes de la llamada, seteando `error` y cortando.

### 3. El backend — la garantía real

La validación del cliente es para dar feedback rápido, no una garantía. El backend valida
todo de nuevo y puede devolver errores que el cliente no anticipó.

**El mensaje del backend no siempre es mostrable.** El patrón vigente es traducirlo:

```tsx
let msg = 'Failed to create event. Please try again.';
if (err instanceof Error && err.message.includes('INVALID_PAYLOAD')) {
  msg = 'Invalid form data. Please check all required fields.';
}
setError(msg);
```

Es frágil (depende de buscar substrings en el texto del error) pero es lo que hay: el
cliente **descarta el `code`** que devuelve el backend, así que solo le queda el texto. Si
se mejora el manejo de errores, empezar por preservar el `code` en `apiRequest`.

## Accesibilidad

El patrón existente asocia label e input correctamente:

```tsx
<label className="form-label" htmlFor="name">
  Event name <span className="required">*</span>
</label>
<input id="name" name="name" ... />
```

**Mantené el par `htmlFor` / `id`.** Sin eso, el label no es clickeable y los lectores de
pantalla no anuncian el campo.

El asterisco de obligatorio es visual: el `required` del input es lo que comunica la
obligatoriedad a la tecnología asistiva.

## Pendiente

- **El error del formulario no recibe foco** al aparecer: un usuario de lector de pantalla
  no se entera de que el submit falló.
- **No hay error por campo**: todo se muestra en un único mensaje arriba del formulario.
- **No hay estado de éxito consistente**: algunas pantallas navegan, otras setean `success`.
