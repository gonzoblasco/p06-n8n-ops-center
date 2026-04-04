---
name: commit-formatter
description: Usá este skill cuando necesites formatear un mensaje de commit siguiendo Conventional Commits. Se activa cuando el usuario dice "genera un commit", "formateá este commit", o cuando hay cambios listos para commitear.
---

# Commit Formatter

Formateá mensajes de commit siguiendo el estándar Conventional Commits.

## Formato

```
<tipo>(<scope opcional>): <descripción corta en minúsculas>

[cuerpo opcional: qué cambió y por qué, no cómo]

[footer opcional: BREAKING CHANGE o refs a issues]
```

## Tipos válidos

- `feat`: nueva funcionalidad
- `fix`: corrección de bug
- `refactor`: cambio de código sin nueva feature ni fix
- `test`: agrega o corrige tests
- `docs`: cambios en documentación
- `chore`: tareas de mantenimiento (deps, config)
- `perf`: mejora de performance
- `ci`: cambios en CI/CD

## Reglas

1. La descripción va en minúsculas, sin punto final
2. Máximo 72 caracteres en la primera línea
3. El scope es el módulo o feature afectada (ej: `auth`, `dashboard`, `api`)
4. Si hay breaking changes, marcarlo explícitamente en el footer

## Ejemplo de input → output

Input: "cambié cómo se procesa el webhook de mercado libre para manejar mensajes duplicados"
Output: `fix(webhook): ignorar mensajes duplicados por message_id`

## Output esperado

Un único mensaje de commit listo para copiar y pegar.
