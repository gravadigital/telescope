---
id: testing
display_name: Testing (Testing Library + Jest vía CRA)
language: react
description: CRA's built-in Jest + Testing Library; four suites, run in CI
applies_to: [frontend]
required_by: []
package: '@testing-library/react'
---

# Testing

## Estado actual

Cuatro suites, 15 tests, que corren en CI (`ci.yml`, job `web`) y con `make test`:

| Suite | Qué cubre |
|---|---|
| `src/App.test.tsx` | Smoke test: la app renderiza |
| `src/services/api.test.ts` | Que los servicios relancen el error de red en vez de devolver datos fabricados (story S-001) |
| `src/components/auth/Auth.test.tsx` | El aviso de API caída |
| `src/components/auth-form/AuthForm.test.tsx` | Validación del formulario y que un fallo de la API no derive en un login falso |

No hay tests de hooks, de `AuthContext`, de `apiRequest` ni de los flujos de votación.

**Jest y react-router 7.** El Jest de `react-scripts` 5 no resuelve los `exports` de
react-router-dom 7 por sí solo. El `moduleNameMapper` de `package.json` lo resuelve: no lo
saques, o todas las suites que importan `App` fallan al cargar.

## Herramientas disponibles

Ya instaladas, listas para usar:

```
@testing-library/react 16.3.0     @testing-library/jest-dom 6.6.4
@testing-library/user-event 13.5.0  @testing-library/dom 10.4.1
```

Jest viene con `react-scripts`. `src/setupTests.ts` ya importa `@testing-library/jest-dom`.

```bash
make test             # desde la raíz: api + web, una corrida
npm test              # desde web/: watch mode
CI=true npm test      # desde web/: una corrida
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
