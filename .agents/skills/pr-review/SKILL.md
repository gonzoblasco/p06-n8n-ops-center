---
name: pr-review
description: Usá este skill cuando necesites revisar código. Se activa con "$pr-review", "review", "revisá los cambios", "code review", o "hacé el PR review".
---

# PR Review

Revisá los cambios del PR buscando bugs, gaps de tests, y violaciones de convenciones.

## Antes de empezar

1. Leé `.knowledge/conventions.md` si existe
2. Leé `.knowledge/architecture.md` si existe
3. Identificá qué módulos fueron tocados

## Proceso de revisión

### 1. Correctitud funcional

- ¿El código hace lo que dice que hace?
- ¿Hay edge cases no manejados? (null, empty, error paths)
- ¿Hay race conditions o problemas de concurrencia?
- ¿Las validaciones están en el lugar correcto (frontend + backend)?

### 2. Tests

- ¿Los cambios tienen tests?
- ¿Los tests cubren el happy path Y los casos de error?
- ¿Hay lógica crítica sin cobertura?
- ¿Los tests existentes siguen pasando?

### 3. Convenciones y calidad

- ¿Sigue las convenciones del proyecto?
- ¿Hay código duplicado que debería estar abstraído?
- ¿Los nombres de variables/funciones son descriptivos?
- ¿Hay console.logs o comentarios de debug olvidados?

### 4. Seguridad

- ¿Hay credenciales o secrets hardcodeados?
- ¿Los inputs del usuario están validados y sanitizados?
- ¿Las queries a DB son seguras contra injection?
- ¿Los endpoints nuevos tienen la auth correcta?

### 5. Performance

- ¿Hay queries N+1 obvias?
- ¿Se están cargando datos innecesarios?
- ¿Hay operaciones costosas que podrían cachearse?

## Output esperado

Estructurá el resultado así:

```
## PR Review — [nombre del PR o branch]

### ✅ Bien
- [qué está bien hecho]

### 🔴 Bloqueantes (deben resolverse antes de merge)
- [issue]: [archivo:línea] — [descripción + sugerencia]

### 🟡 Mejoras (no bloquean merge)
- [issue]: [archivo:línea] — [descripción + sugerencia]

### 🔵 Observaciones
- [notas de arquitectura, deuda técnica, o contexto útil]

### Veredicto
APPROVE / REQUEST CHANGES / NEEDS DISCUSSION
```

## Reglas

- Sé específico: indicá archivo y línea cuando sea posible
- Distinguí entre bloqueante y mejora — no todo es crítico
- Si algo está bien hecho, decilo — el review no es solo crítica
- Si no hay tests para código crítico, es siempre bloqueante
