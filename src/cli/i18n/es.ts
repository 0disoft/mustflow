import type { MessageKey } from "./en.js";

export const esMessages = {
  "cli.error.withUsage": "Error: {message}\nEjecuta `{helpCommand}` para ver el uso.",
  "cli.error.prefix": "Error: {message}",
  "cli.error.unknownCommand": "Comando desconocido: {command}",
  "cli.error.unsupportedLanguage": "Idioma de CLI no admitido: {language}",
  "cli.error.missingLangValue": "Falta el valor de --lang",
  "cli.option.help": "Muestra este mensaje de ayuda",
  "cli.option.json": "Imprime JSON legible por máquinas",
  "cli.heading.usage": "Uso",
  "cli.heading.commands": "Comandos",
  "cli.heading.topics": "Temas",
  "cli.heading.options": "Opciones",
  "cli.heading.examples": "Ejemplos",
  "cli.heading.exitCodes": "Códigos de salida",
  "cli.common.invalidInput": "Se proporcionó una entrada no válida",
  "cli.error.unknownOption": "Opción desconocida: {option}",
  "cli.error.unexpectedArgument": "Argumento inesperado: {argument}",
  "cli.error.unexpectedValue": "Valor inesperado para {option}",
  "cli.error.missingValue": "Falta el valor de {option}",

  "command.init.summary": "Copia el flujo de trabajo de agente mustflow predeterminado",
  "command.check.summary": "Valida los archivos mustflow",
  "command.status.summary": "Muestra el estado de la instalación local de mustflow",
  "command.update.summary": "Previsualiza o aplica actualizaciones del flujo de trabajo mustflow",
  "command.map.summary": "Genera REPO_MAP.md",
  "command.run.summary": "Ejecuta un comando configurado de una sola ejecución",
  "command.context.summary": "Imprime contexto de agente legible por máquinas",
  "command.doctor.summary": "Inspecciona la salud de mustflow y los siguientes pasos",
  "command.index.summary": "Construye el índice SQLite local de mustflow",
  "command.search.summary": "Busca en el índice SQLite local de mustflow",
  "command.dashboard.summary":
    "Inicia el dashboard local de mustflow",
  "command.help.summary": "Muestra la ayuda del flujo de trabajo instalado",

  "top.help.option.lang":
    "Selecciona el idioma de salida de la CLI. Valores admitidos: {languages}",
  "top.help.option.version": "Muestra la versión del paquete",
  "top.help.exit.ok": "El comando se completo correctamente",
  "top.help.exit.fail":
    "El comando falló por problemas de validación o entrada no válida",

  "check.help.summary":
    "Valida los archivos mustflow del repositorio actual.",
  "check.help.option.strict": "Ejecuta comprobaciones estrictas adicionales de seguridad para agentes",
  "check.help.exit.ok": "Todos los archivos y ajustes mustflow requeridos son válidos",
  "check.help.exit.fail":
    "La validación falló o el comando recibió una entrada no válida",
  "check.result.passed": "comprobacion mustflow superada",
  "check.result.strictPassed": "comprobacion estricta de mustflow superada",

  "context.help.summary":
    "Imprime el contexto de agente para la raíz mustflow actual.",
  "context.help.option.json": "Imprime JSON de contexto legible por máquinas",
  "context.help.exit.ok": "El contexto se inspeccionó e imprimió",
  "context.title": "contexto mustflow",
  "label.installed": "Instalado",
  "label.mustflowRoot": "raíz mustflow",
  "label.commandContract": "Especificación de comandos",
  "label.runnableIntents": "Comandos ejecutables",
  "label.latestRun": "Última ejecución",
  "label.manifestLock": "Bloqueo de manifiesto",
  "label.trackedFiles": "Archivos rastreados",
  "label.changedFiles": "Archivos cambiados",
  "label.missingFiles": "Archivos faltantes",
  "label.database": "Base de datos",
  "label.documents": "Documentos",
  "label.skills": "Habilidades",
  "label.commandIntents": "Definiciones de comandos",
  "label.wroteFiles": "Archivos escritos",
  "label.query": "Consulta",
  "label.results": "Resultados",

  "dashboard.help.summary":
    "Inicia un dashboard local para ver y editar preferencias seguras de mustflow.",
  "dashboard.help.option.host": "Vincula el dashboard a un host local. Predeterminado: 127.0.0.1",
  "dashboard.help.option.port": "Vincula el dashboard a un puerto. Predeterminado: 0 elige un puerto disponible",
  "dashboard.help.option.noOpen": "No abre el dashboard automáticamente en un navegador",
  "dashboard.help.exit.ok": "El dashboard se inició o se imprimió la ayuda",
  "dashboard.help.exit.fail": "No se pudo iniciar el dashboard o la entrada no fue válida",
  "dashboard.error.invalidPort": "Puerto de dashboard no válido: {port}",
  "dashboard.error.nonLocalHost":
    "Se rechazo el host de dashboard {host}. Usa localhost, 127.0.0.1 o ::1.",
  "dashboard.listening": "mf dashboard escuchando en {url}",
  "dashboard.ui.title": "Dashboard de mustflow",
  "dashboard.ui.language": "Idioma",
  "dashboard.ui.noChanges": "Sin cambios",
  "dashboard.ui.unsavedChanges": "Cambios sin guardar",
  "dashboard.ui.reloaded": "Recargado",
  "dashboard.ui.saved": "Guardado",
  "dashboard.ui.reload": "Recargar",
  "dashboard.ui.save": "Guardar",
  "dashboard.ui.locked": "Bloqueado",
  "dashboard.ui.customLocale": "Etiqueta de idioma personalizada",
  "dashboard.ui.openMustflow": "Abrir carpeta .mustflow",
  "dashboard.ui.openedMustflow": "Carpeta .mustflow abierta",
  "dashboard.locked.git.auto_push": "Los push remotos requieren una solicitud explícita.",
  "dashboard.group.git": "Git",
  "dashboard.group.commitMessage": "Mensaje de commit",
  "dashboard.group.reporting": "Informes",
  "dashboard.group.verification": "Verificación",
  "dashboard.group.codeStyle": "Estilo de código",
  "dashboard.group.versioning": "Versionado",
  "dashboard.setting.git.auto_stage": "Stage automático de Git",
  "dashboard.setting.git.auto_commit": "Commit automático de Git",
  "dashboard.setting.git.auto_push": "Push automático de Git",
  "dashboard.setting.git.commit_message.style": "Estilo del mensaje de commit",
  "dashboard.setting.git.commit_message.style.description.conventional":
    "Usa prefijos de tipo como feat: o fix:.",
  "dashboard.setting.git.commit_message.style.description.descriptive":
    "Usa un resumen breve en lenguaje natural sin prefijo obligatorio.",
  "dashboard.setting.git.commit_message.style.description.gitmoji":
    "Añade un emoji Gitmoji al inicio y conserva un prefijo de tipo como feat: o fix:.",
  "dashboard.setting.git.commit_message.language": "Idioma del mensaje de commit",
  "dashboard.setting.git.commit_message.language.description.preserve_existing":
    "Respeta el idioma ya usado en los mensajes de commit del repositorio.",
  "dashboard.setting.git.commit_message.language.description.agent_response":
    "Usa el mismo idioma que la respuesta del agente.",
  "dashboard.setting.git.commit_message.language.description.docs":
    "Usa el mismo idioma que la documentación del proyecto.",
  "dashboard.setting.git.commit_message.language.description.en": "Sugiere mensajes de commit en inglés.",
  "dashboard.setting.git.commit_message.language.description.ko": "Sugiere mensajes de commit en coreano.",
  "dashboard.setting.git.commit_message.language.description.zh": "Sugiere mensajes de commit en chino.",
  "dashboard.setting.git.commit_message.language.description.es": "Sugiere mensajes de commit en español.",
  "dashboard.setting.git.commit_message.language.description.fr": "Sugiere mensajes de commit en francés.",
  "dashboard.setting.git.commit_message.language.description.hi": "Sugiere mensajes de commit en hindi.",
  "dashboard.setting.git.commit_message.language.description":
    "Usa la etiqueta de idioma personalizada elegida para sugerir mensajes de commit.",
  "dashboard.setting.git.commit_message.max_suggestions": "Número de sugerencias de mensaje de commit",
  "dashboard.setting.git.commit_message.include_body": "Cuerpo del commit",
  "dashboard.setting.git.commit_message.include_body.description.never":
    "No incluye cuerpo en el mensaje de commit; solo sugiere el asunto.",
  "dashboard.setting.git.commit_message.include_body.description.when_non_trivial":
    "Incluye cuerpo solo cuando el cambio necesita más contexto que el asunto.",
  "dashboard.setting.git.commit_message.include_body.description.always":
    "Incluye siempre un cuerpo en las sugerencias de mensaje de commit.",
  "dashboard.setting.git.commit_message.split_when_multiple_concerns": "Sugerir commits separados",
  "dashboard.setting.git.commit_message.avoid_sensitive_details": "Evitar detalles sensibles",
  "dashboard.setting.git.commit_message.avoid_sensitive_details.description":
    "Evita secretos, credenciales, datos personales y detalles privados de incidentes.",
  "dashboard.setting.reporting.commit_suggestion.enabled": "Sugerencias de mensaje de commit",
  "dashboard.setting.verification.selection.strategy": "Estrategia de verificación",
  "dashboard.setting.verification.selection.strategy.description.risk_based":
    "Ajusta el alcance de verificación según el riesgo del cambio.",
  "dashboard.setting.verification.selection.strategy.description.targeted":
    "Prioriza solo las comprobaciones vinculadas al área modificada.",
  "dashboard.setting.verification.selection.strategy.description.full":
    "Prioriza el conjunto completo de verificación configurado.",
  "dashboard.setting.verification.selection.prefer_related_tests": "Priorizar tests relacionados",
  "dashboard.setting.verification.selection.skip_docs_only_full_test": "Omitir test completo en cambios solo de docs",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test": "Omitir test completo en cambios de código de bajo riesgo",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test.description":
    "Omite solo la suite completa cuando el código no afecta comportamiento público, configuración, esquemas, seguridad ni migraciones.",
  "dashboard.setting.verification.selection.skip_translation_only_full_test": "Omitir test completo en cambios solo de traducción",
  "dashboard.setting.verification.selection.skip_copy_only_full_test": "Omitir test completo en cambios solo de texto",
  "dashboard.setting.verification.selection.report_skipped": "Informar verificaciones omitidas",
  "dashboard.setting.code_style.avoid_drive_by_refactors": "Evitar refactors ajenos al cambio",
  "dashboard.setting.release.versioning.impact_check": "Comprobar impacto de versión",
  "dashboard.setting.release.versioning.impact_check.description":
    "Comprueba si el cambio debe afectar una versión de paquete o plantilla.",
  "dashboard.setting.release.versioning.suggest_bump": "Sugerir cambio de versión",
  "dashboard.setting.release.versioning.suggest_bump.description":
    "Sugiere el nivel de cambio cuando parece necesaria una nueva versión.",
  "dashboard.setting.release.versioning.auto_bump": "Subir versiones automáticamente",
  "dashboard.setting.release.versioning.auto_bump.description":
    "Permite editar archivos de versión directamente sin un paso manual separado.",
  "dashboard.setting.release.versioning.require_user_confirmation": "Requerir confirmación de versión",
  "dashboard.setting.release.versioning.require_user_confirmation.description":
    "Pregunta antes de aplicar o aceptar un cambio de versión.",
  "dashboard.setting.release.versioning.sync_template_version": "Sincronizar versión de plantillas",
  "dashboard.setting.release.versioning.sync_template_version.description":
    "Mantiene alineadas las versiones del paquete y del manifest de plantillas.",
  "dashboard.setting.release.versioning.sync_docs_examples": "Sincronizar ejemplos de docs",
  "dashboard.setting.release.versioning.sync_docs_examples.description":
    "Mantiene los ejemplos de documentación alineados con la versión elegida.",
  "dashboard.setting.release.versioning.sync_tests": "Sincronizar tests",
  "dashboard.setting.release.versioning.sync_tests.description":
    "Mantiene alineados los tests y fixtures sensibles a la versión.",

  "doctor.help.summary":
    "Inspecciona la salud de la raiz mustflow y ofrece pistas para los siguientes pasos sin modificar archivos.",
  "doctor.help.option.json": "Imprime JSON de diagnóstico legible por máquinas",
  "doctor.help.option.strict":
    "Incluye comprobaciones estrictas adicionales de seguridad para agentes",
  "doctor.help.exit.ok":
    "Se inspeccionó el estado de mustflow y no se encontraron problemas",
  "doctor.help.exit.fail": "Se encontraron problemas de validación o la entrada no fue válida",
  "doctor.title": "doctor de mustflow",
  "doctor.label.strict": "Estricto",
  "doctor.label.check": "Comprobacion",
  "doctor.label.issues": "Problemas",
  "doctor.section.health": "Salud:",
  "doctor.section.issueList": "Lista de problemas:",
  "doctor.section.suggestedCommands": "Comandos sugeridos:",
  "doctor.actionLabel": "ejecutar",
  "doctor.diagnostic.install": "Instalación",
  "doctor.diagnostic.validation": "Validación",
  "doctor.diagnostic.commands": "Especificación de comandos",
  "doctor.diagnostic.readOrder": "Orden de lectura",
  "doctor.diagnostic.optionalReadOrder": "Orden de lectura opcional",
  "doctor.diagnostic.repoMap": "REPO_MAP.md",
  "doctor.diagnostic.localIndex": "Índice local",
  "doctor.diagnostic.latestRun": "Última ejecución",

  "help.missingFile":
    "No se encontro {path} en el directorio actual. Ejecuta mf init primero o cambia a una raiz mustflow.",
  "help.commands.title": "Comandos",
  "help.commands.noIntents":
    "Comandos\n\nNo se encontro una tabla [intents] en .mustflow/config/commands.toml.",
  "help.commands.configuredIntents":
    "Comandos configurados en .mustflow/config/commands.toml:",
  "help.preferences.title": "Preferencias",
  "help.preferences.intro":
    "Preferencias de agente a nivel de repositorio en .mustflow/config/preferences.toml:",
  "help.help.summary": "Muestra ayuda desde el flujo de trabajo mustflow instalado.",
  "help.topic.workflow": "Imprime .mustflow/docs/agent-workflow.md",
  "help.topic.skills": "Imprime .mustflow/skills/INDEX.md",
  "help.topic.commands": "Resume .mustflow/config/commands.toml",
  "help.topic.preferences": "Resume .mustflow/config/preferences.toml",
  "help.help.exit.ok":
    "El tema de ayuda se imprimio o no habia tema instalado disponible",
  "help.help.exit.fail": "El comando recibió un tema u opción desconocidos",
  "help.error.unknownTopic": "Tema de ayuda desconocido: {topic}",

  "index.help.summary":
    "Construye un índice SQLite que se puede regenerar para el flujo de trabajo mustflow.",
  "index.help.option.dryRun": "Calcula los objetivos del índice sin escribir archivos",
  "index.help.exit.ok": "Los objetivos del índice se calcularon y se escribieron opcionalmente",
  "index.title": "índice mustflow",
  "index.dryRunNoFiles": "Ensayo: no se escribieron archivos.",

  "init.routerBlock": `<!-- mustflow:start schema=1 -->
Este repositorio sigue el flujo de trabajo de agente mustflow.

Lee estos archivos antes de trabajar:
- \`.mustflow/docs/agent-workflow.md\`
- \`.mustflow/config/mustflow.toml\`
- \`.mustflow/config/commands.toml\`
- \`.mustflow/config/preferences.toml\` si existe
- \`.mustflow/skills/INDEX.md\`
<!-- mustflow:end -->`,
  "init.help.summary":
    "Copia el flujo de trabajo de agente mustflow predeterminado en el repositorio actual.",
  "init.help.option.yes": "Usa valores seguros predeterminados para las preguntas",
  "init.help.option.dryRun": "Imprime el plan de instalación sin escribir archivos",
  "init.help.option.interactive": "Elige ajustes de inicio mediante preguntas",
  "init.help.option.merge":
    "Fusiona un bloque administrado por mustflow en un AGENTS.md existente",
  "init.help.option.force": "Respalda los archivos en conflicto y los sobrescribe",
  "init.help.option.profile":
    "Define el perfil del proyecto: minimal, oss, team, product o library",
  "init.help.option.locale": "Define el idioma de los documentos mustflow instalados",
  "init.help.option.agentLang": "Define el idioma preferido para las respuestas del agente",
  "init.help.option.set":
    "Define una preferencia segura como git.auto_commit=true o git.auto_push=false",
  "init.help.option.productSourceLocale":
    "Define el idioma fuente del texto de producto visible para usuarios",
  "init.help.option.productLocale":
    "Agrega un locale de producto visible para usuarios; se puede repetir",
  "init.help.exit.ok": "Instalación completada, omitida o plan impreso",
  "init.help.exit.fail": "Opciones no válidas o conflictos de archivos impidieron escribir",
  "init.error.cannotCombineMergeForce": "No se pueden combinar --merge y --force",
  "init.error.cannotCombineInteractiveYes":
    "No se pueden combinar --interactive y --yes",
  "init.error.unsupportedProfile": "Perfil no admitido: {profile}",
  "init.error.supportedProfiles": "Perfiles admitidos: {profiles}",
  "init.error.unsupportedLocale": "Locale no admitido: {locale}",
  "init.error.supportedLocales":
    "Locales de plantilla admitidos por este paquete: {locales}",
  "init.error.invalidLocaleTag": "Etiqueta de locale no válida para {label}: {value}",
  "init.error.invalidPreference":
    "Anulación de preferencia de inicio no válida: {value}",
  "init.error.invalidPreferenceValue":
    "Valor no valido para {key}: {value}",
  "init.error.unsupportedPreference":
    "Ajuste de preferencia de inicio no admitido: {key}",
  "init.prompt.locale": "¿Qué idioma deben usar los documentos mustflow?",
  "init.prompt.profile": "¿Qué perfil de proyecto debe usar mustflow?",
  "init.prompt.agentLang":
    "¿Qué idioma deben usar los agentes en los informes finales?",
  "init.prompt.advanced": "¿Personalizar preferencias avanzadas?",
  "init.prompt.autoStage":
    "¿Permitir que los agentes preparen archivos automáticamente?",
  "init.prompt.autoCommit":
    "¿Permitir que los agentes creen commits automáticamente?",
  "init.prompt.commitMessageLanguage":
    "¿Idioma preferido para los mensajes de commit?",
  "init.prompt.commitSuggestions":
    "¿Activar sugerencias de mensajes de commit?",
  "init.prompt.preserveExisting": "Conservar existente",
  "init.prompt.sameAsAgentReports": "Igual que los informes del agente",
  "init.prompt.sameAsDocuments": "Igual que los documentos",
  "init.prompt.select": "Selecciona [{defaultChoice}]: ",
  "init.prompt.invalidChoice":
    "Introduce un número entre 1 y {count}.",
  "init.prompt.invalidBoolean": "Introduce yes o no.",
  "init.plan.would": "Se {action} {path}",
  "init.plan.noFilesWritten": "No se escribieron archivos.",
  "init.conflict":
    "Conflicto: {path} ya existe y difiere de la plantilla mustflow.",
  "init.conflictGuidance":
    "Usa --dry-run para previsualizar, --merge para agregar un bloque mustflow a AGENTS.md, o --force para respaldar y sobrescribir.",
  "init.selection.profile": "Perfil de plantilla: {profile}",
  "init.selection.locale": "Locale de plantilla: {locale}",
  "init.selection.agentLang": "Idioma de respuesta del agente: {locale}",
  "init.selection.productSourceLocale": "Locale fuente del producto: {locale}",
  "init.selection.productLocales": "Locales del producto: {locales}",
  "init.selection.sourceLocaleOnly": "(sólo locale fuente)",
  "init.backup.conflicts": "Se respaldaron {count} {fileWord} en {path}",
  "init.fileWord.singular": "archivo",
  "init.fileWord.plural": "archivos",
  "init.action.created": "Creado {path}",
  "init.action.unchanged": "Sin cambios {path}",
  "init.action.merged": "Fusionado {path}",
  "init.action.overwrote": "Sobrescrito {path}",
  "init.action.customizedPreferences":
    "Personalizado .mustflow/config/preferences.toml",
  "init.action.wrote": "Escrito {path}",
  "init.complete":
    "mustflow init completo: {created} creados, {merged} fusionados, {overwritten} sobrescritos, {unchanged} sin cambios.",

  "map.help.summary":
    "Genera un mapa de navegacion para agentes a partir de archivos clave del repositorio.",
  "map.help.option.stdout": "Imprime el mapa generado",
  "map.help.option.write": "Escribe REPO_MAP.md",
  "map.help.option.depth": "Limita la profundidad de directorios no prioritarios",
  "map.help.option.includeNested":
    "Incluye repositorios anidados desde raíces de espacio de trabajo configuradas",
  "map.help.option.rootOnly": "Ignora repositorios anidados incluso si están configurados",
  "map.help.exit.ok": "El mapa se generó y se escribió opcionalmente",
  "map.error.nestedConflict": "No se pueden combinar --include-nested y --root-only",
  "map.error.invalidDepth": "Valor no valido para --depth",
  "map.wrote": "Se escribio REPO_MAP.md",

  "run.help.summary":
    "Ejecuta un comando configurado de una sola ejecución desde .mustflow/config/commands.toml.",
  "run.help.option.json": "Imprime el registro de ejecución como JSON",
  "run.help.exit.ok": "El comando se completo con un codigo de salida permitido",
  "run.help.exit.fail": "El comando no era válido, fue rechazado, agotó el tiempo o falló",
  "run.error.missingIntent": "Falta el nombre del comando",
  "run.error.unknownIntent": "Comando desconocido: {intent}",
  "run.error.statusNotConfigured":
    'El comando "{intent}" está en estado {status}; sólo se pueden ejecutar comandos configurados',
  "run.error.lifecycleNotOneshot":
    'Rechazado: el comando "{intent}" tiene lifecycle = "{lifecycle}"; mf run sólo ejecuta comandos oneshot',
  "run.error.runPolicy":
    'El comando "{intent}" requiere run_policy = "agent_allowed" para mf run',
  "run.error.stdin": 'El comando "{intent}" debe establecer stdin = "closed"',
  "run.error.timeout": 'El comando "{intent}" debe definir timeout_seconds',
  "run.error.commandSource":
    'El comando "{intent}" debe definir argv o mode = "shell" con cmd',
  "run.error.timedOut": 'El comando "{intent}" agotó el tiempo después de {seconds} segundos',
  "run.error.startFailed": 'No se pudo iniciar el comando "{intent}": {message}',

  "search.help.summary":
    "Busca en el índice SQLite local del flujo de trabajo mustflow.",
  "search.help.option.limit":
    "Define la cantidad de resultados que se imprimen. Predeterminado: 10, máximo: 50",
  "search.help.exit.ok": "Búsqueda completada",
  "search.help.exit.fail": "Entrada no válida o índice local faltante",
  "search.error.missingLimit": "Falta el valor de --limit",
  "search.error.invalidLimit": "--limit debe ser un entero entre 1 y 50",
  "search.error.missingQuery": "Se requiere una consulta de búsqueda",
  "search.title": "búsqueda mustflow",
  "search.noMatches": "No hay entradas coincidentes.",

  "status.help.summary":
    "Muestra el estado de la instalación local de mustflow sin modificar archivos.",
  "status.help.exit.ok": "El estado se inspeccionó e imprimió",
  "status.title": "estado mustflow",

  "update.help.summary":
    "Previsualiza o aplica actualizaciones para el flujo de trabajo mustflow instalado.",
  "update.help.option.dryRun": "Imprime el plan de actualizacion sin escribir archivos",
  "update.help.option.apply":
    "Aplica actualizaciones seguras de plantilla cuando no hay cambios locales bloqueados",
  "update.help.exit.ok": "El plan se imprimio o se aplicaron actualizaciones seguras",
  "update.help.exit.fail":
    "El plan encontró cambios bloqueados, estado faltante o entrada no válida",
  "update.error.cannotCombineModes": "No se pueden combinar --dry-run y --apply.",
  "update.error.missingMode": "Especifica --dry-run o --apply.",
  "update.backup.files": "Se respaldaron {count} {fileWord} en {path}",
  "update.action.created": "Creado {path}",
  "update.action.updated": "Actualizado {path}",
  "update.action.wrote": "Escrito {path}",
  "update.policy.title": "Política:",
  "update.policy.baseline": "Línea base",
  "update.policy.applyActions": "Acciones de aplicacion",
  "update.policy.blockingActions": "Acciones bloqueantes",
  "update.policy.backupPath": "Ruta de respaldo",
  "update.plan.title": "plan de actualizacion mustflow",
  "update.plan.blocked": "Cambios locales bloqueados",
  "update.plan.manualReview": "Revisión manual",
  "update.plan.wouldUpdate": "Se actualizaría",
  "update.plan.wouldCreate": "Se crearía",
  "update.plan.noUpdates": "No se necesitan actualizaciones de plantilla.",
  "update.plan.noFilesWritten": "No se escribieron archivos.",
  "update.complete":
    "mustflow update completo: {updated} actualizados, {created} creados.",
} satisfies Record<MessageKey, string>;
