import type { MessageKey } from "./en.js";

export const koMessages = {
  "cli.error.withUsage":
    "오류: {message}\n사용법은 `{helpCommand}` 명령으로 확인하세요.",
  "cli.error.prefix": "오류: {message}",
  "cli.error.unknownCommand": "알 수 없는 명령: {command}",
  "cli.error.unsupportedLanguage": "지원하지 않는 CLI 언어: {language}",
  "cli.error.missingLangValue": "--lang 값이 없습니다",
  "cli.option.help": "도움말을 출력합니다",
  "cli.option.json": "JSON 형식으로 출력합니다",
  "cli.heading.usage": "사용법",
  "cli.heading.commands": "명령어",
  "cli.heading.topics": "주제",
  "cli.heading.options": "옵션",
  "cli.heading.examples": "예시",
  "cli.heading.exitCodes": "종료 코드",
  "cli.common.invalidInput": "잘못된 입력이 제공되었습니다",
  "cli.error.unknownOption": "알 수 없는 옵션: {option}",
  "cli.error.unexpectedArgument": "예상하지 못한 인자: {argument}",
  "cli.error.unexpectedValue": "{option}에 예상치 못한 값이 제공되었습니다",
  "cli.error.missingValue": "{option} 값이 없습니다",

  "command.init.summary": "기본 mustflow 에이전트 워크플로우를 복사합니다",
  "command.check.summary": "mustflow 파일을 검사합니다",
  "command.status.summary": "로컬 mustflow 설치 상태를 출력합니다",
  "command.update.summary": "mustflow 워크플로우 갱신을 미리 보거나 적용합니다",
  "command.map.summary": "REPO_MAP.md를 작성합니다",
  "command.run.summary": "설정된 일회성 명령을 실행합니다",
  "command.context.summary": "에이전트 작업 맥락을 출력합니다",
  "command.doctor.summary": "mustflow 상태를 점검하고 후속 조치를 안내합니다",
  "command.index.summary": "로컬 mustflow SQLite 색인을 만듭니다",
  "command.search.summary": "로컬 mustflow SQLite 색인을 검색합니다",
  "command.dashboard.summary":
    "로컬 mustflow 대시보드를 시작합니다",
  "command.versionSources.summary": "감지된 버전 기준 원본을 출력합니다",
  "command.help.summary": "설치된 워크플로우 도움말을 출력합니다",

  "top.help.option.lang": "CLI 출력 언어를 선택합니다. 지원값: {languages}",
  "top.help.option.version": "패키지 버전을 출력합니다",
  "top.help.exit.ok": "명령이 성공적으로 완료되었습니다",
  "top.help.exit.fail":
    "검증 문제 또는 잘못된 입력으로 인해 명령이 실패했습니다",

  "check.help.summary": "현재 저장소의 mustflow 파일을 검사합니다.",
  "check.help.option.strict":
    "에이전트 안전성 엄격 검사를 추가로 실행합니다",
  "check.help.exit.ok": "필수 mustflow 파일과 설정이 모두 유효합니다",
  "check.help.exit.fail": "검증 실패 또는 잘못된 입력이 제공되었습니다",
  "check.result.passed": "mustflow 검사 통과",
  "check.result.strictPassed": "mustflow 엄격 검사 통과",

  "context.help.summary":
    "현재 mustflow 루트의 에이전트 작업 맥락을 출력합니다.",
  "context.help.option.json": "맥락을 JSON 형식으로 출력합니다",
  "context.help.exit.ok": "맥락을 확인하고 출력했습니다",
  "context.title": "mustflow 맥락",
  "label.installed": "설치됨",
  "label.mustflowRoot": "mustflow 루트",
  "label.commandContract": "명령 계약",
  "label.runnableIntents": "실행 가능한 명령",
  "label.latestRun": "마지막 실행",
  "label.manifestLock": "잠금 파일",
  "label.trackedFiles": "추적 파일",
  "label.changedFiles": "변경 파일",
  "label.missingFiles": "누락 파일",
  "label.database": "데이터베이스",
  "label.documents": "문서",
  "label.skills": "스킬",
  "label.commandIntents": "명령 의도",
  "label.wroteFiles": "작성된 파일",
  "label.query": "검색어",
  "label.results": "결과",

  "dashboard.help.summary":
    "안전한 mustflow 설정을 확인하고 수정하는 로컬 대시보드를 시작합니다.",
  "dashboard.help.option.host":
    "대시보드를 바인딩할 로컬 호스트입니다. 기본값: 127.0.0.1",
  "dashboard.help.option.port":
    "대시보드를 바인딩할 포트입니다. 기본값 0이면 사용 가능한 포트를 자동으로 선택합니다",
  "dashboard.help.option.noOpen": "브라우저를 자동으로 열지 않습니다",
  "dashboard.help.exit.ok": "대시보드를 시작했거나 도움말을 출력했습니다",
  "dashboard.help.exit.fail":
    "대시보드를 시작하지 못했거나 잘못된 입력이 제공되었습니다",
  "dashboard.error.invalidPort": "잘못된 대시보드 포트: {port}",
  "dashboard.error.nonLocalHost":
    "대시보드 호스트 {host} 사용을 거부했습니다. localhost, 127.0.0.1, ::1 중 하나를 사용하세요.",
  "dashboard.listening": "mf dashboard 실행 중: {url}",
  "dashboard.ui.title": "mustflow 대시보드",
  "dashboard.ui.language": "언어",
  "dashboard.ui.noChanges": "변경 없음",
  "dashboard.ui.unsavedChanges": "저장하지 않은 변경",
  "dashboard.ui.reloaded": "다시 불러왔습니다",
  "dashboard.ui.saved": "저장했습니다",
  "dashboard.ui.reload": "새로고침",
  "dashboard.ui.save": "저장",
  "dashboard.ui.locked": "잠김",
  "dashboard.ui.customLocale": "직접 입력",
  "dashboard.ui.openMustflow": ".mustflow 폴더 열기",
  "dashboard.ui.openedMustflow": ".mustflow 폴더를 열었습니다",
  "dashboard.locked.git.auto_push": "원격 저장소 변경은 명시적 요청이 필요합니다.",
  "dashboard.group.git": "Git",
  "dashboard.group.commitMessage": "커밋 메시지",
  "dashboard.group.reporting": "보고",
  "dashboard.group.verification": "검증",
  "dashboard.group.testAuthoring": "테스트 작성",
  "dashboard.group.codeStyle": "코드 스타일",
  "dashboard.group.versioning": "버전",
  "dashboard.setting.git.auto_stage": "Git 자동 스테이징",
  "dashboard.setting.git.auto_commit": "Git 자동 커밋",
  "dashboard.setting.git.auto_push": "Git 자동 푸시",
  "dashboard.setting.git.commit_message.style": "커밋 메시지 형식",
  "dashboard.setting.git.commit_message.style.description.conventional":
    "feat: 또는 fix: 같은 유형 접두어를 사용합니다.",
  "dashboard.setting.git.commit_message.style.description.descriptive":
    "필수 유형 접두어 없이 짧은 자연어 요약을 사용합니다.",
  "dashboard.setting.git.commit_message.style.description.gitmoji":
    "Gitmoji 이모지를 앞에 붙이고 feat: 또는 fix: 같은 유형 접두어도 함께 유지합니다.",
  "dashboard.setting.git.commit_message.language": "커밋 메시지 언어",
  "dashboard.setting.git.commit_message.language.description.preserve_existing":
    "저장소의 기존 커밋 메시지 언어를 따릅니다.",
  "dashboard.setting.git.commit_message.language.description.agent_response":
    "에이전트 응답 언어와 같은 언어를 사용합니다.",
  "dashboard.setting.git.commit_message.language.description.docs":
    "프로젝트 문서 언어와 같은 언어를 사용합니다.",
  "dashboard.setting.git.commit_message.language.description.en": "영어로 커밋 메시지를 제안합니다.",
  "dashboard.setting.git.commit_message.language.description.ko": "한국어로 커밋 메시지를 제안합니다.",
  "dashboard.setting.git.commit_message.language.description.zh": "중국어로 커밋 메시지를 제안합니다.",
  "dashboard.setting.git.commit_message.language.description.es": "스페인어로 커밋 메시지를 제안합니다.",
  "dashboard.setting.git.commit_message.language.description.fr": "프랑스어로 커밋 메시지를 제안합니다.",
  "dashboard.setting.git.commit_message.language.description.hi": "힌디어로 커밋 메시지를 제안합니다.",
  "dashboard.setting.git.commit_message.language.description":
    "직접 입력한 언어 태그를 커밋 메시지 제안에 사용합니다.",
  "dashboard.setting.git.commit_message.max_suggestions": "커밋 메시지 제안 수",
  "dashboard.setting.git.commit_message.include_body": "커밋 본문",
  "dashboard.setting.git.commit_message.include_body.description.never":
    "커밋 메시지 본문을 넣지 않습니다. 제목 한 줄만 제안합니다.",
  "dashboard.setting.git.commit_message.include_body.description.when_non_trivial":
    "변경 내용을 제목만으로 설명하기 어려울 때만 본문을 함께 제안합니다.",
  "dashboard.setting.git.commit_message.include_body.description.always":
    "항상 커밋 메시지 본문을 넣습니다.",
  "dashboard.setting.git.commit_message.split_when_multiple_concerns": "여러 주제면 커밋 분리 제안",
  "dashboard.setting.git.commit_message.avoid_sensitive_details": "민감한 세부 정보 제외",
  "dashboard.setting.git.commit_message.avoid_sensitive_details.description":
    "비밀값, 인증 정보, 개인정보, 비공개 장애 세부사항을 메시지에서 제외합니다.",
  "dashboard.setting.reporting.commit_suggestion.enabled": "커밋 메시지 제안",
  "dashboard.setting.verification.selection.strategy": "검증 전략",
  "dashboard.setting.verification.selection.strategy.description.risk_based":
    "변경 위험에 따라 검증 범위를 조절합니다.",
  "dashboard.setting.verification.selection.strategy.description.targeted":
    "바뀐 영역과 직접 관련된 검사만 우선합니다.",
  "dashboard.setting.verification.selection.strategy.description.full":
    "설정된 전체 검증 묶음을 우선합니다.",
  "dashboard.setting.verification.selection.prefer_related_tests": "관련 테스트 우선 실행",
  "dashboard.setting.verification.selection.skip_docs_only_full_test": "문서만 바뀐 경우 전체 테스트 생략",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test": "낮은 위험 코드 변경이면 전체 테스트 생략",
  "dashboard.setting.verification.selection.skip_low_risk_code_full_test.description":
    "공개 동작, 설정, 스키마, 보안, 마이그레이션에 영향이 없는 코드 변경일 때 전체 묶음만 생략합니다.",
  "dashboard.setting.verification.selection.skip_translation_only_full_test": "번역만 바뀐 경우 전체 테스트 생략",
  "dashboard.setting.verification.selection.skip_copy_only_full_test": "문구만 바뀐 경우 전체 테스트 생략",
  "dashboard.setting.verification.selection.report_skipped": "생략한 검증 보고",
  "dashboard.setting.testing.authoring.new_test_policy": "새 테스트 작성 정책",
  "dashboard.setting.testing.authoring.new_test_policy.description.evidence_required":
    "동작 계약을 검증해야 한다는 근거가 있을 때만 새 테스트를 추가합니다.",
  "dashboard.setting.testing.authoring.new_test_policy.description.manual_approval":
    "사용자가 직접 테스트를 요청하지 않았다면 새 테스트 추가 전에 확인합니다.",
  "dashboard.setting.testing.authoring.new_test_policy.description.broad":
    "중요한 동작을 더 분명히 검증할 수 있으면 새 테스트를 적극적으로 허용합니다.",
  "dashboard.setting.testing.authoring.prefer_existing_tests": "기존 테스트 우선",
  "dashboard.setting.testing.authoring.prefer_existing_tests.description":
    "새 테스트 파일이나 사례를 만들기 전에 가까운 기존 테스트를 먼저 수정합니다.",
  "dashboard.setting.testing.authoring.require_new_test_rationale": "새 테스트 근거 요구",
  "dashboard.setting.testing.authoring.require_new_test_rationale.description":
    "테스트를 추가했다면 각 테스트가 왜 필요한지 최종 보고에 남깁니다.",
  "dashboard.setting.code_style.avoid_drive_by_refactors": "요청과 무관한 리팩터링 방지",
  "dashboard.setting.release.versioning.impact_check": "버전 영향 확인",
  "dashboard.setting.release.versioning.impact_check.description":
    "변경사항이 패키지나 템플릿 버전에 영향을 주는지 확인합니다.",
  "dashboard.setting.release.versioning.suggest_bump": "버전 올림 제안",
  "dashboard.setting.release.versioning.suggest_bump.description":
    "버전 변경이 필요해 보일 때 올릴 단계를 제안합니다.",
  "dashboard.setting.release.versioning.auto_bump": "버전 자동 올림",
  "dashboard.setting.release.versioning.auto_bump.description":
    "별도 수동 단계 없이 버전 파일을 직접 수정할 수 있게 합니다.",
  "dashboard.setting.release.versioning.require_user_confirmation": "버전 확인 요청",
  "dashboard.setting.release.versioning.require_user_confirmation.description":
    "버전 변경을 적용하거나 받아들이기 전에 사용자 확인을 요구합니다.",
  "dashboard.setting.release.versioning.sync_template_version": "템플릿 버전 동기화",
  "dashboard.setting.release.versioning.sync_template_version.description":
    "패키지 버전과 템플릿 매니페스트 버전을 함께 맞춥니다.",
  "dashboard.setting.release.versioning.sync_docs_examples": "문서 예시 동기화",
  "dashboard.setting.release.versioning.sync_docs_examples.description":
    "문서 예시에 적힌 버전 값을 선택한 버전과 함께 맞춥니다.",
  "dashboard.setting.release.versioning.sync_tests": "테스트 동기화",
  "dashboard.setting.release.versioning.sync_tests.description":
    "버전에 민감한 테스트와 픽스처를 함께 맞춥니다.",

  "doctor.help.summary":
    "파일을 수정하지 않고 mustflow 루트 상태를 점검하고 후속 조치를 안내합니다.",
  "doctor.help.option.json": "진단 결과를 JSON 형식으로 출력합니다",
  "doctor.help.option.strict":
    "에이전트 안전성 엄격 검사를 추가로 포함합니다",
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
  "doctor.diagnostic.skillRoutes": "스킬 라우팅",
  "doctor.diagnostic.commands": "명령",
  "doctor.diagnostic.readOrder": "읽기 순서",
  "doctor.diagnostic.optionalReadOrder": "선택적 읽기 순서",
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
  "help.preferences.title": "환경 설정",
  "help.preferences.intro":
    ".mustflow/config/preferences.toml에 기록된 저장소별 에이전트 환경 설정입니다.",
  "help.help.summary": "설치된 mustflow 작업 흐름에서 도움말을 출력합니다.",
  "help.topic.workflow": ".mustflow/docs/agent-workflow.md를 출력합니다",
  "help.topic.skills": ".mustflow/skills/INDEX.md를 출력합니다",
  "help.topic.commands": ".mustflow/config/commands.toml을 요약합니다",
  "help.topic.preferences": ".mustflow/config/preferences.toml을 요약합니다",
  "help.help.exit.ok": "도움말 주제를 출력했거나 설치된 주제가 없었습니다",
  "help.help.exit.fail": "알 수 없는 주제나 옵션이 있었습니다",
  "help.error.unknownTopic": "알 수 없는 도움말 주제: {topic}",

  "index.help.summary":
    "mustflow 워크플로우를 SQLite 색인으로 생성합니다.",
  "index.help.option.dryRun": "색인 대상만 계산하고 파일을 쓰지 않습니다",
  "index.help.exit.ok":
    "색인 대상을 계산했고 선택적으로 SQLite 파일을 저장했습니다",
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
    "현재 저장소에 기본 mustflow 에이전트 워크플로우를 복사합니다.",
  "init.help.option.yes": "안전한 기본값을 사용합니다",
  "init.help.option.dryRun": "파일을 쓰지 않고 설치 계획만 출력합니다",
  "init.help.option.interactive": "질문에 답하며 초기 설정을 선택합니다",
  "init.help.option.merge": "기존 AGENTS.md에 mustflow 관리 블록만 병합합니다",
  "init.help.option.force": "충돌 파일을 백업한 뒤 덮어씁니다",
  "init.help.option.profile":
    "프로젝트 유형을 설정합니다: minimal, oss, team, product, library",
  "init.help.option.locale": "설치할 mustflow 문서 언어를 설정합니다",
  "init.help.option.agentLang": "에이전트 응답 언어를 설정합니다",
  "init.help.option.set":
    "git.auto_commit=true 또는 git.auto_push=false 같은 안전한 설정 항목의 값을 지정합니다",
  "init.help.option.productSourceLocale":
    "제품 문자열의 기준 언어를 설정합니다",
  "init.help.option.productLocale":
    "제품 사용자 대상 로케일을 추가합니다. 여러 번 지정할 수 있습니다",
  "init.help.exit.ok":
    "설치가 완료되었거나, 변경 사항이 없거나, 설치 계획이 출력되었습니다",
  "init.help.exit.fail": "잘못된 옵션 또는 파일 충돌로 작성을 중단했습니다",
  "init.error.cannotCombineMergeForce":
    "--merge와 --force는 함께 사용할 수 없습니다",
  "init.error.cannotCombineInteractiveYes":
    "--interactive와 --yes는 함께 사용할 수 없습니다",
  "init.error.unsupportedProfile": "지원하지 않는 프로젝트 유형: {profile}",
  "init.error.supportedProfiles": "지원하는 프로젝트 유형: {profiles}",
  "init.error.unsupportedLocale": "지원하지 않는 문서 언어: {locale}",
  "init.error.supportedLocales": "이 패키지가 지원하는 템플릿 언어: {locales}",
  "init.error.invalidLocaleTag":
    "{label}의 언어 태그가 올바르지 않습니다: {value}",
  "init.error.invalidPreference": "초기 설정 항목 형식이 올바르지 않습니다: {value}",
  "init.error.invalidPreferenceValue": "{key}에 사용할 수 없는 값입니다: {value}",
  "init.error.unsupportedPreference": "지원하지 않는 초기 설정 항목입니다: {key}",
  "init.prompt.locale": "mustflow 문서는 어떤 언어로 설치할까요?",
  "init.prompt.profile": "이 저장소에는 어떤 프로젝트 유형을 사용할까요?",
  "init.prompt.agentLang": "에이전트 최종 응답은 어떤 언어로 받을까요?",
  "init.prompt.advanced": "고급 설정도 바꿀까요?",
  "init.prompt.autoStage": "에이전트가 파일을 자동으로 스테이징해도 될까요?",
  "init.prompt.autoCommit": "에이전트가 커밋을 자동으로 만들어도 될까요?",
  "init.prompt.commitMessageLanguage": "커밋 메시지 기본 언어를 무엇으로 할까요?",
  "init.prompt.commitSuggestions": "커밋 메시지 제안을 켤까요?",
  "init.prompt.preserveExisting": "기존 설정 유지",
  "init.prompt.sameAsAgentReports": "에이전트 응답 언어와 동일",
  "init.prompt.sameAsDocuments": "템플릿 언어와 동일",
  "init.prompt.select": "선택 [{defaultChoice}]: ",
  "init.prompt.invalidChoice": "1부터 {count} 사이의 번호를 입력하세요.",
  "init.prompt.invalidBoolean": "yes 또는 no로 입력하세요.",
  "init.plan.would": "{path}: {action} 예정",
  "init.plan.noFilesWritten": "파일을 쓰지 않았습니다.",
  "init.conflict": "충돌: {path} 파일이 이미 있고 mustflow 템플릿과 다릅니다.",
  "init.conflictGuidance":
    "--dry-run으로 미리 보거나, --merge로 AGENTS.md에 mustflow 블록만 추가하거나, --force로 백업 후 덮어쓰세요.",
  "init.selection.profile": "템플릿 유형: {profile}",
  "init.selection.locale": "템플릿 언어: {locale}",
  "init.selection.agentLang": "에이전트 응답 언어: {locale}",
  "init.selection.productSourceLocale": "제품 기준 언어: {locale}",
  "init.selection.productLocales": "제품 대상 언어: {locales}",
  "init.selection.sourceLocaleOnly": "(기준 언어만 포함)",
  "init.backup.conflicts": "충돌 파일 {count}개를 {path}에 백업했습니다",
  "init.fileWord.singular": "파일",
  "init.fileWord.plural": "파일",
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
  "map.help.option.write": "REPO_MAP.md를 작성합니다",
  "map.help.option.depth": "우선순위가 낮은 디렉터리 깊이를 제한합니다",
  "map.help.option.includeNested":
    "설정된 작업 공간 루트의 하위 저장소를 포함합니다",
  "map.help.option.rootOnly": "설정이 있어도 하위 저장소를 무시합니다",
  "map.help.exit.ok": "지도를 생성하고 선택적으로 저장했습니다",
  "map.error.nestedConflict":
    "--include-nested와 --root-only는 함께 사용할 수 없습니다",
  "map.error.invalidDepth": "--depth 값이 올바르지 않습니다",
  "map.wrote": "REPO_MAP.md를 작성했습니다",

  "run.help.summary":
    ".mustflow/config/commands.toml에 설정된 일회성 명령을 실행합니다.",
  "run.help.option.json": "실행 결과를 JSON으로 출력합니다",
  "run.help.exit.ok": "명령이 허용된 종료 코드로 완료되었습니다",
  "run.help.exit.fail":
    "명령이 잘못되었거나, 거부되었거나, 시간 초과되었거나, 실패했습니다",
  "run.error.missingIntent": "명령 이름이 없습니다",
  "run.error.unknownIntent": "알 수 없는 명령: {intent}",
  "run.error.statusNotConfigured":
    '명령 "{intent}"의 상태는 {status}입니다. 설정된 상태(configured)인 명령만 실행할 수 있습니다',
  "run.error.lifecycleNotOneshot":
    '거부됨: 명령 "{intent}"의 수명 주기(lifecycle)는 "{lifecycle}"입니다. mf run은 일회성(oneshot) 명령만 실행합니다',
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
    "파일을 수정하지 않고 로컬 mustflow 설치 상태를 출력합니다.",
  "status.help.exit.ok": "상태를 확인하고 출력했습니다",
  "status.title": "mustflow 상태",

  "versionSources.help.summary":
    "파일을 수정하지 않고 패키지와 템플릿 버전 기준 원본을 출력합니다.",
  "versionSources.help.exit.ok": "버전 기준 원본을 확인하고 출력했습니다",
  "versionSources.title": "mustflow 버전 기준 원본",
  "versionSources.label.versioning": "버전 관리 선호값",
  "versionSources.label.sources": "기준 원본",
  "versionSources.value.enabled": "켜짐",
  "versionSources.value.disabled": "꺼짐",
  "versionSources.noSources": "감지된 버전 기준 원본이 없습니다",

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
