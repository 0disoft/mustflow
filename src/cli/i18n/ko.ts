import type { MessageKey } from "./en.js";

export const koMessages = {
  "cli.error.withUsage":
    "오류: {message}\n사용법은 `{helpCommand}` 명령으로 확인하세요.",
  "cli.error.prefix": "오류: {message}",
  "cli.error.unknownCommand": "알 수 없는 명령: {command}",
  "cli.error.unsupportedLanguage": "지원하지 않는 CLI 언어: {language}",
  "cli.error.missingLangValue": "--lang 값이 없습니다",
  "cli.option.help": "이 도움말을 보여줍니다",
  "cli.option.json": "기계가 읽기 쉬운 JSON을 출력합니다",
  "cli.heading.usage": "사용법",
  "cli.heading.commands": "명령어",
  "cli.heading.topics": "주제",
  "cli.heading.options": "선택지",
  "cli.heading.examples": "예시",
  "cli.heading.exitCodes": "종료 코드",
  "cli.common.invalidInput": "잘못된 입력이 제공되었습니다",
  "cli.error.unknownOption": "알 수 없는 선택지: {option}",
  "cli.error.unexpectedArgument": "예상하지 못한 인자: {argument}",
  "cli.error.unexpectedValue": "{option}에 예상치 못한 값이 제공되었습니다",
  "cli.error.missingValue": "{option} 값이 없습니다",

  "command.init.summary": "기본 mustflow 에이전트 워크플로우을 복사합니다",
  "command.check.summary": "mustflow 파일을 검사합니다",
  "command.status.summary": "로컬 mustflow 설치 상태를 보여줍니다",
  "command.update.summary": "mustflow 워크플로우 갱신을 미리 보거나 적용합니다",
  "command.map.summary": "REPO_MAP.md를 생성합니다",
  "command.run.summary": "설정된 일회성 명령을 실행합니다",
  "command.context.summary": "에이전트 작업 맥락을 출력합니다",
  "command.doctor.summary": "mustflow 상태와 다음 단계를 점검합니다",
  "command.index.summary": "로컬 mustflow SQLite 색인을 만듭니다",
  "command.search.summary": "로컬 mustflow SQLite 색인을 검색합니다",
  "command.dashboard.summary":
    "로컬 mustflow 대시보드를 엽니다. 아직 구현되지 않았습니다",
  "command.help.summary": "설치된 워크플로우 도움말을 보여줍니다",

  "top.help.option.lang": "CLI 출력 언어를 선택합니다. 지원값: {languages}",
  "top.help.option.version": "패키지 버전을 보여줍니다",
  "top.help.exit.ok": "명령이 성공적으로 완료되었습니다",
  "top.help.exit.fail":
    "검증 문제 또는 잘못된 입력으로 인해 명령이 실패했습니다",

  "check.help.summary": "현재 저장소의 mustflow 파일을 검사합니다.",
  "check.help.option.strict":
    "에이전트 안전성에 대한 추가 엄격 검사를 실행합니다",
  "check.help.exit.ok": "필수 mustflow 파일과 설정이 모두 유효합니다",
  "check.help.exit.fail": "검증 실패 또는 잘못된 입력이 제공되었습니다",
  "check.result.passed": "mustflow 검사 통과",
  "check.result.strictPassed": "mustflow 엄격 검사 통과",

  "context.help.summary":
    "현재 mustflow 루트의 에이전트 작업 맥락을 출력합니다.",
  "context.help.option.json": "기계가 읽기 쉬운 맥락 JSON을 출력합니다",
  "context.help.exit.ok": "맥락을 확인하고 출력했습니다",
  "context.title": "mustflow 맥락",
  "label.installed": "설치됨",
  "label.mustflowRoot": "mustflow 루트",
  "label.commandContract": "명령 규약",
  "label.runnableIntents": "실행 가능한 명령",
  "label.latestRun": "마지막 실행",
  "label.manifestLock": "잠금 파일",
  "label.trackedFiles": "추적 파일",
  "label.changedFiles": "변경 파일",
  "label.missingFiles": "누락 파일",
  "label.database": "데이터베이스",
  "label.documents": "문서",
  "label.skills": "스킬",
  "label.commandIntents": "명령 규칙",
  "label.wroteFiles": "파일 쓰기",
  "label.query": "검색어",
  "label.results": "결과",

  "dashboard.help.summary":
    "로컬 mustflow 대시보드를 위한 예약된 명령입니다. 이 기능은 아직 구현되지 않았습니다.",
  "dashboard.help.exit.ok": "도움말을 출력했습니다",
  "dashboard.help.exit.notImplemented":
    "대시보드 기능이 아직 구현되지 않았습니다",
  "dashboard.notImplemented": "mf dashboard는 아직 구현되지 않은 기능입니다",

  "doctor.help.summary":
    "파일을 수정하지 않고 mustflow 루트 상태를 점검하고 다음 단계를 확인합니다.",
  "doctor.help.option.json": "기계가 읽기 쉬운 JSON 진단 결과를 출력합니다",
  "doctor.help.option.strict":
    "에이전트 안전성에 대한 추가 엄격 검사를 포함합니다",
  "doctor.help.exit.ok": "mustflow 상태를 확인했고 문제가 없습니다",
  "doctor.help.exit.fail": "검증 문제 또는 잘못된 입력이 있었습니다",
  "doctor.title": "mustflow 진단",
  "doctor.label.strict": "엄격 검사",
  "doctor.label.check": "검사",
  "doctor.label.issues": "문제",
  "doctor.section.health": "상태 점검:",
  "doctor.section.issueList": "문제 목록:",
  "doctor.section.suggestedCommands": "추천 명령:",
  "doctor.actionLabel": "명령",
  "doctor.diagnostic.install": "설치",
  "doctor.diagnostic.validation": "검증",
  "doctor.diagnostic.commands": "명령 규약",
  "doctor.diagnostic.readOrder": "읽기 순서",
  "doctor.diagnostic.optionalReadOrder": "선택 읽기 순서",
  "doctor.diagnostic.repoMap": "REPO_MAP.md",
  "doctor.diagnostic.localIndex": "로컬 색인",
  "doctor.diagnostic.latestRun": "최근 실행",

  "help.missingFile":
    "현재 디렉터리에서 {path} 파일을 찾지 못했습니다. 먼저 mf init을 실행하거나 mustflow 루트로 이동하세요.",
  "help.commands.title": "명령어",
  "help.commands.noIntents":
    "명령어\n\n.mustflow/config/commands.toml에서 [intents] 테이블을 찾지 못했습니다.",
  "help.commands.configuredIntents":
    ".mustflow/config/commands.toml에 설정된 명령:",
  "help.preferences.title": "설정값",
  "help.preferences.intro":
    ".mustflow/config/preferences.toml의 저장소별 에이전트 설정값:",
  "help.help.summary": "설치된 mustflow 작업 흐름에서 도움말을 보여줍니다.",
  "help.topic.workflow": ".mustflow/docs/agent-workflow.md를 출력합니다",
  "help.topic.skills": ".mustflow/skills/INDEX.md를 출력합니다",
  "help.topic.commands": ".mustflow/config/commands.toml을 요약합니다",
  "help.topic.preferences": ".mustflow/config/preferences.toml을 요약합니다",
  "help.help.exit.ok": "도움말 주제를 출력했거나 설치된 주제가 없었습니다",
  "help.help.exit.fail": "알 수 없는 주제나 선택지가 있었습니다",
  "help.error.unknownTopic": "알 수 없는 도움말 주제: {topic}",

  "index.help.summary":
    "mustflow 워크플로우를 다시 만들 수 있는 SQLite 색인으로 만듭니다.",
  "index.help.option.dryRun": "색인 대상만 계산하고 파일을 쓰지 않습니다",
  "index.help.exit.ok":
    "색인 대상을 계산했고 선택적으로 SQLite 파일을 썼습니다",
  "index.title": "mustflow 색인",
  "index.dryRunNoFiles": "드라이런: 파일을 쓰지 않았습니다.",

  "init.routerBlock": `<!-- mustflow:start schema=1 -->
이 저장소는 mustflow 에이전트 워크플로우 구조를 따릅니다.

작업 시작 전 다음 파일들을 읽어 주세요.
- \`.mustflow/docs/agent-workflow.md\`
- \`.mustflow/config/mustflow.toml\`
- \`.mustflow/config/commands.toml\`
- \`.mustflow/config/preferences.toml\`이 있으면 읽기
- \`.mustflow/skills/INDEX.md\`
<!-- mustflow:end -->`,
  "init.help.summary":
    "현재 저장소에 기본 mustflow 에이전트 워크플로우을 복사합니다.",
  "init.help.option.yes": "안전한 기본값을 사용합니다",
  "init.help.option.dryRun": "파일을 쓰지 않고 설치 계획만 출력합니다",
  "init.help.option.interactive": "질문에 답하며 초기 설정을 선택합니다",
  "init.help.option.merge": "기존 AGENTS.md에 mustflow 관리 블록만 병합합니다",
  "init.help.option.force": "충돌 파일을 백업한 뒤 덮어씁니다",
  "init.help.option.profile":
    "프로젝트 성격을 설정합니다: minimal, oss, team, product, library",
  "init.help.option.locale": "설치할 mustflow 문서 언어를 설정합니다",
  "init.help.option.agentLang": "에이전트 보고 언어를 설정합니다",
  "init.help.option.set":
    "git.auto_commit=true 또는 git.auto_push=false 같은 안전한 설정 값을 지정합니다",
  "init.help.option.productSourceLocale":
    "제품 문자열의 기준 언어를 설정합니다",
  "init.help.option.productLocale":
    "제품 사용자 대상 로케일을 추가합니다. 반복할 수 있습니다",
  "init.help.exit.ok":
    "설치가 완료되었거나, 변경 사항이 없거나, 설치 계획이 출력되었습니다",
  "init.help.exit.fail": "잘못된 선택지 또는 파일 충돌로 쓰기를 중단했습니다",
  "init.error.cannotCombineMergeForce":
    "--merge와 --force는 함께 사용할 수 없습니다",
  "init.error.cannotCombineInteractiveYes":
    "--interactive와 --yes는 함께 사용할 수 없습니다",
  "init.error.unsupportedProfile": "지원하지 않는 프로젝트 성격: {profile}",
  "init.error.supportedProfiles": "지원하는 프로젝트 성격: {profiles}",
  "init.error.unsupportedLocale": "지원하지 않는 문서 언어: {locale}",
  "init.error.supportedLocales": "이 패키지가 지원하는 템플릿 언어: {locales}",
  "init.error.invalidLocaleTag":
    "{label}의 언어 태그가 올바르지 않습니다: {value}",
  "init.error.invalidPreference": "초기 설정 값 형식이 올바르지 않습니다: {value}",
  "init.error.invalidPreferenceValue": "{key}에 사용할 수 없는 값입니다: {value}",
  "init.error.unsupportedPreference": "지원하지 않는 초기 설정 항목입니다: {key}",
  "init.prompt.locale": "mustflow 문서는 어떤 언어로 설치할까요?",
  "init.prompt.profile": "이 저장소에는 어떤 프로젝트 성격을 사용할까요?",
  "init.prompt.agentLang": "에이전트 최종 보고는 어떤 언어로 받을까요?",
  "init.prompt.advanced": "고급 설정도 바꿀까요?",
  "init.prompt.autoStage": "에이전트가 파일을 자동으로 스테이징해도 될까요?",
  "init.prompt.autoCommit": "에이전트가 커밋을 자동으로 만들어도 될까요?",
  "init.prompt.commitMessageLanguage": "커밋 메시지 기본 언어를 무엇으로 할까요?",
  "init.prompt.commitSuggestions": "커밋 메시지 제안을 켤까요?",
  "init.prompt.preserveExisting": "기존 설정 유지",
  "init.prompt.sameAsAgentReports": "에이전트 보고 언어와 동일",
  "init.prompt.sameAsDocuments": "문서 언어와 동일",
  "init.prompt.select": "선택 [{defaultChoice}]: ",
  "init.prompt.invalidChoice": "1부터 {count} 사이의 번호를 입력하세요.",
  "init.prompt.invalidBoolean": "yes 또는 no로 입력하세요.",
  "init.plan.would": "{path}: {action} 예정",
  "init.plan.noFilesWritten": "파일을 쓰지 않았습니다.",
  "init.conflict": "충돌: {path} 파일이 이미 있고 mustflow 템플릿과 다릅니다.",
  "init.conflictGuidance":
    "--dry-run으로 미리 보거나, --merge로 AGENTS.md에 mustflow 블록만 추가하거나, --force로 백업 후 덮어쓰세요.",
  "init.selection.profile": "템플릿 프로필: {profile}",
  "init.selection.locale": "템플릿 언어: {locale}",
  "init.selection.agentLang": "에이전트 보고 언어: {locale}",
  "init.selection.productSourceLocale": "제품 기준 언어: {locale}",
  "init.selection.productLocales": "제품 대상 언어: {locales}",
  "init.selection.sourceLocaleOnly": "(기준 언어만)",
  "init.backup.conflicts": "충돌 파일 {count}개를 {path}에 백업했습니다",
  "init.fileWord.singular": "file",
  "init.fileWord.plural": "files",
  "init.action.created": "{path} 생성",
  "init.action.unchanged": "{path} 변경 없음",
  "init.action.merged": "{path} 병합",
  "init.action.overwrote": "{path} 덮어쓰기",
  "init.action.customizedPreferences":
    ".mustflow/config/preferences.toml 맞춤 설정",
  "init.action.wrote": "{path} 작성",
  "init.complete":
    "mustflow init 완료: 생성 {created}, 병합 {merged}, 덮어쓰기 {overwritten}, 변경 없음 {unchanged}.",

  "map.help.summary":
    "저장소 주요 파일을 기준으로 에이전트 탐색 지도를 생성합니다.",
  "map.help.option.stdout": "생성한 지도를 출력합니다",
  "map.help.option.write": "REPO_MAP.md를 씁니다",
  "map.help.option.depth": "우선순위가 낮은 디렉터리 깊이를 제한합니다",
  "map.help.option.includeNested":
    "설정된 작업 공간 루트의 하위 저장소를 포함합니다",
  "map.help.option.rootOnly": "설정이 있어도 하위 저장소를 무시합니다",
  "map.help.exit.ok": "지도를 생성하고 선택적으로 썼습니다",
  "map.error.nestedConflict":
    "--include-nested와 --root-only는 함께 사용할 수 없습니다",
  "map.error.invalidDepth": "--depth 값이 올바르지 않습니다",
  "map.wrote": "REPO_MAP.md를 썼습니다",

  "run.help.summary":
    ".mustflow/config/commands.toml에 설정된 일회성 명령을 실행합니다.",
  "run.help.option.json": "실행 결과를 JSON으로 출력합니다",
  "run.help.exit.ok": "명령이 허용된 종료 코드로 끝났습니다",
  "run.help.exit.fail":
    "명령이 잘못되었거나, 거부되었거나, 제한 시간을 넘겼거나, 실패했습니다",
  "run.error.missingIntent": "명령 이름이 없습니다",
  "run.error.unknownIntent": "알 수 없는 명령: {intent}",
  "run.error.statusNotConfigured":
    '명령 "{intent}"의 상태는 {status}입니다. configured 상태인 명령만 실행할 수 있습니다',
  "run.error.lifecycleNotOneshot":
    '거부됨: 명령 "{intent}"의 lifecycle은 "{lifecycle}"입니다. mf run은 oneshot 명령만 실행합니다',
  "run.error.runPolicy":
    '명령 "{intent}"는 mf run에서 실행하려면 run_policy = "agent_allowed"가 필요합니다',
  "run.error.stdin": '명령 "{intent}"는 stdin = "closed"를 설정해야 합니다',
  "run.error.timeout": '명령 "{intent}"는 timeout_seconds를 정의해야 합니다',
  "run.error.commandSource":
    '명령 "{intent}"는 argv를 정의하거나 mode = "shell"과 cmd를 함께 정의해야 합니다',
  "run.error.timedOut": '명령 "{intent}"가 {seconds}초 뒤 시간 초과되었습니다',
  "run.error.startFailed": '명령 "{intent}"를 시작하지 못했습니다: {message}',

  "search.help.summary":
    "로컬 SQLite 색인에서 mustflow 워크플로우를 검색합니다.",
  "search.help.option.limit":
    "출력할 검색 결과 수를 설정합니다. 기본값: 10, 최대: 50",
  "search.help.exit.ok": "검색을 완료했습니다",
  "search.help.exit.fail": "잘못된 입력이 있거나 로컬 색인이 없습니다",
  "search.error.missingLimit": "--limit 값이 없습니다",
  "search.error.invalidLimit": "--limit는 1 이상 50 이하의 정수여야 합니다",
  "search.error.missingQuery": "검색어가 필요합니다",
  "search.title": "mustflow 검색",
  "search.noMatches": "일치하는 항목이 없습니다.",

  "status.help.summary":
    "파일을 수정하지 않고 로컬 mustflow 설치 상태를 보여줍니다.",
  "status.help.exit.ok": "상태를 확인하고 출력했습니다",
  "status.title": "mustflow 상태",

  "update.help.summary":
    "설치된 mustflow 작업 흐름의 갱신을 미리 보거나 적용합니다.",
  "update.help.option.dryRun": "파일을 쓰지 않고 갱신 계획만 출력합니다",
  "update.help.option.apply":
    "차단된 로컬 변경이 없을 때 안전한 템플릿 갱신을 적용합니다",
  "update.help.exit.ok": "계획을 출력했거나 안전한 갱신을 적용했습니다",
  "update.help.exit.fail":
    "차단된 변경, 누락된 상태, 또는 잘못된 입력이 있습니다",
  "update.error.cannotCombineModes":
    "--dry-run과 --apply는 함께 사용할 수 없습니다.",
  "update.error.missingMode": "--dry-run 또는 --apply를 지정하세요.",
  "update.backup.files": "{path}에 {count}개 파일을 백업했습니다",
  "update.action.created": "{path} 생성",
  "update.action.updated": "{path} 갱신",
  "update.action.wrote": "{path} 작성",
  "update.policy.title": "정책:",
  "update.policy.baseline": "기준선",
  "update.policy.applyActions": "적용 대상",
  "update.policy.blockingActions": "차단 대상",
  "update.policy.backupPath": "백업 위치",
  "update.plan.title": "mustflow 갱신 계획",
  "update.plan.blocked": "차단된 로컬 변경",
  "update.plan.manualReview": "수동 검토",
  "update.plan.wouldUpdate": "갱신 예정",
  "update.plan.wouldCreate": "생성 예정",
  "update.plan.noUpdates": "필요한 템플릿 갱신이 없습니다.",
  "update.plan.noFilesWritten": "파일을 쓰지 않았습니다.",
  "update.complete": "mustflow update 완료: 갱신 {updated}, 생성 {created}.",
} satisfies Record<MessageKey, string>;
