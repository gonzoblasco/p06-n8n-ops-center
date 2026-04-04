# Skill: test-writer

## Qué hace

Escribe tests para Server Actions y API routes siguiendo los patrones
de cobertura establecidos en el proyecto.

## Cuándo usarlo

- Después de implementar una nueva Server Action o API route
- Cuando el pr-review reporta tests faltantes
- Antes de un refactor de lógica crítica

## Stack de testing

- Vitest para unit tests
- Archivos en `__tests__/` junto al código que testean
- Naming: `<archivo>.test.ts`

## Qué testear siempre en Server Actions

- [ ] Usuario no autenticado → retorna error descriptivo
- [ ] Ownership check → usuario no puede operar sobre recursos ajenos
- [ ] Happy path → retorna `{ data, error: null }`
- [ ] Input inválido → retorna error descriptivo

## Qué testear siempre en API Routes

- [ ] Sin auth → 401
- [ ] Input faltante o inválido → 400 con mensaje claro
- [ ] Strings vacíos o solo espacios → 400
- [ ] Strings > límite máximo → 400
- [ ] Error interno (mock del servicio externo) → 500 con mensaje genérico
- [ ] Happy path → 200 con estructura esperada

## Proceso

1. Leer el archivo a testear completo antes de escribir el primer test
2. Identificar todos los branches (`if/else`, `try/catch`, validaciones)
3. Un `describe` por función o handler
4. Mocks al tope del archivo, no inline
5. Nombres descriptivos: `"retorna 401 si no hay sesión activa"`

## Output esperado

Archivo `__tests__/<nombre>.test.ts` con cobertura de todos los branches críticos.

## Warnings

- No testear implementación interna, testear comportamiento observable
- Si mockear Supabase es complejo, priorizar los auth checks y validaciones
- Un test que pasa siempre no vale nada — verificar que falla si se rompe el código
