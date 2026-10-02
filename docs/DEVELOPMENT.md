# 개발 시작과 보호 장치

먼저 루트 [AGENTS.md](../AGENTS.md)를 읽는다. 이 설정은 저장소에 동봉된 개발 환경이며, 사용자 PC에 프로그램을 설치하거나 ChatGPT 프로젝트를 생성하지 않는다.

## 준비와 실행

전체 저장소 체크아웃, Python 3.10 이상, Node.js 22 이상, Git이 필요하다. CI 기준은 Node 22 / Python 3.11이다. `.nvmrc`는 Node 22를 지정한다. Python 명령이 `python3`인 환경에서는 아래의 `python`을 바꿔 실행한다.

```sh
python tools/dev.py doctor
python tools/dev.py check
python tools/dev.py serve
```

`doctor`는 환경만 확인한다. `check`는 추적 파일 경로, JS 구문, 개발 도구 자체 검사, 기존 `npm test`의 4개 Node 검사 묶음, 정적 빌드를 실행한다. 외부 패키지 설치와 Git 쓰기·배포는 하지 않는다. 기존 npm test 스크립트가 달라지면 조용히 일부 검사를 생략하지 않고 검토를 요구하며 실패한다.

`serve`는 먼저 빌드하고 `dist/`만 `127.0.0.1:8000`으로 제공한다. Ctrl+C로 종료한다. 포트를 바꾸려면 `python tools/dev.py serve --port 8080`을 사용한다. 저장소 전체나 .env를 서비스하지 않는다. Python 기본 서버이므로 공개 운영용으로 사용하지 않는다.

일반 게임 빌드만 필요할 때는 기존 `python build.py --output dist/index.html`도 그대로 사용할 수 있다. Node 의존성을 설치하지 않아도 저장소에 포함된 Three.js 번들로 빌드한다. 번들을 재생성할 때만 기존 문서에 따라 `npm ci` 후 `npm run build:vendor`를 실행한다. 잠금 파일을 임의로 갱신하지 않는다.

## 검증과 변경 절차

작업 전 HEAD와 미커밋 변경을 확인하고 작업 브랜치를 만든다. 수정 범위를 작게 유지하고, 기존 코드를 통째로 포맷하지 않는다. PR에는 변경 이유와 실제 검사 결과를 적는다.

`Tsukikage development checks`의 `tsukikage-validation` 작업은 main 대상 PR 및 main push에서 개발 검증을 실행한다. 기존 `pages.yml`은 변경하지 않았으며 main 반영 시 기존 테스트·빌드·배포 흐름을 유지한다.

입력이나 화면을 바꾼 경우 자동 검증만으로 완료 처리하지 않는다. 같은 물리 패 선택 후 시간 제한 없는 재클릭, 적5/일반5 선택 구분, 유효/무효 드래그, 포인터 취소, 차례 전환, 모달, 리사이즈, WebGL2 대체를 실제 브라우저에서 확인한다. 기존 `tests`의 브라우저 하네스는 해당 실행 도구가 있는 환경에서 수행한다. 없으면 미검증으로 보고한다.

## 보호 범위와 한계

- `.gitignore`와 `guard`는 실제 .env, 주요 개인 키 경로와 생성물을 실수로 커밋하는 위험을 줄인다. `guard`는 Git이 추적하는 파일명을 검사하며 내용 기반 비밀 검사나 과거 이력 정리는 아니다. `.env.example`, `.env.sample`, `.env.template`에는 가짜 값만 넣는다.
- 변경 전 커밋은 `backup/pre-dev-setup-20261003`에 보관했다. 이 브랜치는 동일 저장소 안의 복구 기준이며 외부 백업이나 변경 불가능한 잠금은 아니다.
- 브랜치 보호/Rulesets는 GitHub 서버의 별도 설정이다. 문서나 CI 파일 추가만으로 활성화되지 않는다. 이 개발 설정은 강제 푸시 금지, 리뷰 필수 또는 필수 상태 검사 설정을 활성화한 것으로 보고하지 않는다.
- 향후 서버 보호 규칙을 설정할 때는 main의 force push/삭제 차단, PR 요구와 `tsukikage-validation` 필수 검사를 검토한다. 단독 개발자에게 타인 승인 1개를 무조건 요구해 작업을 잠그지 않는다.
- 사용자 승인·sandbox·전역 Codex 설정, 계정 권한, 결제, 외부 서버는 수정하지 않는다.

## Work / Codex / ChatGPT에서 사용

이 저장소의 최신 파일을 작업 대상으로 열고 `AGENTS.md`부터 읽게 한다. Codex의 저장소 지침은 해당 파일을 사용한다. 일반 ChatGPT 프로젝트나 Work 작업공간의 등록 상태는 별개이며 자동 적용된 것으로 추정하지 않는다. 기존 PC 체크아웃의 미커밋 작업을 보존하고 정상적인 동기화 절차를 사용한다.

```text
월영마작 저장소의 AGENTS.md, docs/PROJECT-CONTEXT.md,
docs/DEVELOPMENT.md를 읽고 현재 HEAD와 작업 트리 상태를 확인해.
원클릭 즉시 버리기는 옵션으로도 금지야.
요청 범위만 수정하고, 직접 실행한 검사와 미검증 사항을 구분해.
```

공식 참고: [Codex AGENTS.md](https://developers.openai.com/codex/guides/agents-md), [GitHub 브랜치 보호](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule).
