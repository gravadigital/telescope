---
id: testing
display_name: Testing (Testing Library + Jest vía CRA)
language: react
description: CRA's built-in Jest + Testing Library; currently a single smoke test, no real coverage
applies_to: [frontend]
required_by: []
package: '@testing-library/react'
---

# Testing

## Estado actual

**Un test en todo el proyecto**: `src/App.test.tsx`, el smoke test que genera CRA, adaptado
para buscar el texto "TELESCOPIO".

```tsx
test('renders telescopio app', () => {
  render(<App />);
  expect(screen.getByText(/TELESCOPIO/i)).toBeInTheDocument();
});
```

No hay tests de componentes, de hooks, del cliente de API ni de los flujos. `TESTING.md` en
la raíz del repositorio **no es una suite automatizada**: es una guía de pruebas manuales
paso a paso.

## Herramientas disponibles

Ya instaladas, listas para usar:

```
@testing-library/react 16.3.0     @testing-library/jest-dom 6.6.4
@testing-library/user-event 13.5.0  @testing-library/dom 10.4.1
```

Jest viene con `react-scripts`. `src/setupTests.ts` ya importa `@testing-library/jest-dom`.

```bash
npm test              # watch mode
CI=true npm test      # una corrida, para CI
```

## Cómo escribir tests acá

Archivo `.test.tsx` al lado del componente.

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('muestra un error cuando el evento no existe', async () => {
  render(<EventDetailPage eventId="inexistente" onBack={() => {}} />);
  expect(await screen.findByText(/was not found/i)).toBeInTheDocument();
});
```

Reglas:

- **Consultá por lo que ve el usuario** (`getByRole`, `getByLabelText`, `getByText`), no por
  clases CSS ni `data-testid`. Un test que busca `.btn-primary` se rompe con un cambio de
  estilos sin que nada funcional haya cambiado.
- **`userEvent` antes que `fireEvent`**: simula la interacción real (foco, teclado).
- **`findBy*` para lo asíncrono**, no `waitFor` con `getBy*`.

### Dos cosas que hay que mockear casi siempre

1. **La API.** Los componentes llaman a `src/services/api.ts`; mockeá ese módulo con
   `jest.mock('../../services/api')` en vez de interceptar `fetch`. Los servicios son la
   frontera natural.
2. **La sesión.** Todo lo que use `useAuth()` tiene que renderizarse dentro de
   `<AuthProvider>`, o `useAuth` lanza. Conviene un helper `renderWithAuth(ui, { user })`.

`localStorage` existe en jsdom, pero **limpialo entre tests** (`beforeEach(() => localStorage.clear())`):
`AuthContext` lo lee al montar y una sesión filtrada de un test anterior hace fallar al
siguiente de forma confusa.

## Qué priorizar

1. **`RankingVotePanel`** — donde el participante arma su ranking. Es la interacción más
   compleja y la de mayor costo si falla.
2. **`AuthContext`** — restauración de sesión, logout, manejo de `auth:logout`.
3. **`apiRequest`** — inyección del token, manejo del 401, normalización del error.
4. **Formularios** — creación de evento y configuración de votación, con sus validaciones.

No hay tests E2E ni Playwright configurado.
