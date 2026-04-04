# Skill: doc-writer

## Qué hace

Genera y actualiza documentación técnica del proyecto: arquitectura,
convenciones, decisiones de diseño, y changelogs.

## Cuándo usarlo

- Al terminar un proyecto o feature importante
- Cuando `.knowledge/` está desactualizado respecto al código real
- Cuando un nuevo agente necesita contexto del proyecto

## Archivos que genera o actualiza

- `.knowledge/README.md` — visión general del proyecto
- `.knowledge/architecture.md` — decisiones técnicas y estructura
- `.knowledge/conventions.md` — patrones de código, naming, estructura de carpetas
- `CHANGELOG.md` — historial de cambios por versión

## Proceso

1. Leer el código actual (estructura de carpetas, archivos clave)
2. Comparar con `.knowledge/` existente
3. Actualizar solo lo que cambió, no reescribir desde cero
4. Mantener tono técnico y conciso — estos docs los leen agentes, no humanos

## Output esperado

Archivos `.md` actualizados con fecha de última modificación en el header.

## Warnings

- No inventar comportamientos no implementados
- Si hay ambigüedad, documentar lo que está en el código, no lo que debería estar
- Mantener `.knowledge/` como source of truth — no duplicar en `/docs`
