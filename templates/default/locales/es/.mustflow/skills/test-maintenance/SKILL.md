---
mustflow_doc: skill.test-maintenance
locale: es
canonical: false
revision: 2
name: test-maintenance
description: Aplica esta skill al agregar, actualizar, eliminar o auditar pruebas en respuesta a cambios de comportamiento, API, snapshots, compatibilidad o correcciones de errores.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.test-maintenance
  command_intents:
    - test
    - test_related
    - test_audit
    - snapshot_update
    - lint
    - build
---

# Mantenimiento De Pruebas

## Proposito

Mantener las pruebas alineadas con el contrato de comportamiento actual.

## Usar Cuando

- Se agregue, cambie, elimine o depreque comportamiento.
- Una correccion de error necesite una prueba de regresion.
- Las pruebas existentes puedan estar desactualizadas, duplicadas, ser demasiado amplias o depender de detalles de implementacion eliminados.
- Haya cambiado la salida de snapshot.

## No Usar Cuando

- La tarea solo cambie redaccion o comentarios.
- El repositorio no tenga un intent de pruebas configurado y el usuario haya pedido no agregar pruebas.

## Entradas Requeridas

- Solicitud del usuario
- Contrato de comportamiento actual
- Ruta de codigo cambiada o eliminada
- Estilo de pruebas existente
- `.mustflow/config/commands.toml`
- `.mustflow/config/mustflow.toml` `[testing]`

## Precondiciones

- La tarea coincide con las condiciones de uso y no coincide con las exclusiones.
- Las entradas requeridas estan disponibles, o las entradas faltantes pueden reportarse sin adivinar.
- Las instrucciones de mayor prioridad y `.mustflow/config/commands.toml` se revisaron para el alcance actual.

## Ediciones Permitidas

- Mantener las ediciones dentro del alcance descrito por esta skill, la solicitud del usuario y la ruta coincidente en `.mustflow/skills/INDEX.md`.
- No ampliar permisos de comando, inventar hechos del proyecto ni cambiar archivos de workflow no relacionados.

## Procedimiento

1. Define el comportamiento actual esperado.
2. Busca pruebas existentes antes de introducir pruebas nuevas.
3. Clasifica las pruebas afectadas:
   - `active`: aun valida el comportamiento actual
   - `update_needed`: el comportamiento cambio
   - `obsolete_candidate`: probablemente valida comportamiento eliminado o irrelevante
   - `legacy_contract`: el comportamiento antiguo se conserva intencionalmente
   - `flaky_or_environmental`: el fallo puede depender del entorno
4. Agrega, actualiza, elimina o reporta pruebas segun la clasificacion.
5. No reintroduzcas comportamiento eliminado solo porque pruebas antiguas lo esperan.
6. Trata las actualizaciones de snapshot como manuales, salvo que `snapshot_update` este aprobado y configurado de forma explicita.
7. Manten las pruebas deterministas y cercanas al contrato de comportamiento.

## Postcondiciones

- La salida esperada puede producirse con evidencia clara, intentos de comando ejecutados, verificaciones omitidas y riesgos restantes.
- Cualquier intento de comando faltante, entrada desconocida o conflicto de autoridad se reporta en lugar de ocultarse.

## Verificacion

Usa command intents oneshot configurados cuando esten disponibles:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update` solo con aprobacion explicita
- `lint`
- `build`

No infieras comandos de prueba faltantes.

## Manejo De Fallos

- Si las pruebas fallan, inspecciona el primer fallo relevante.
- No elimines ni debilites pruebas solo para hacer pasar la validacion.
- Si no esta claro si una prueba esta obsoleta, reportala en lugar de eliminarla.
- Si el comando de pruebas no esta disponible, reporta el intent faltante.

## Formato De Salida

- Contrato de comportamiento que se esta probando
- Pruebas agregadas
- Pruebas actualizadas
- Pruebas eliminadas, con motivo
- Candidatas a pruebas obsoletas
- Command intents ejecutados
- Command intents omitidos y razones
- Riesgos de pruebas remanentes
