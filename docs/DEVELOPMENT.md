# 월영마작 개발 프로젝트

저장소의 정확한 이름은 **Yeondaeno/tsukikage-riichi**다. 끝의 `i`를 빠뜨리지 않는다.

## 시작

Node.js 22 이상과 Python 3.10 이상을 준비한다. 이 환경에서는 Node.js 24와 Python 3.12를 사용한다.

```powershell
git clone https://github.com/Yeondaeno/tsukikage-riichi.git
cd tsukikage-riichi
npm ci
npm run dev
```

브라우저에서 `http://127.0.0.1:8000`을 연다. 서버는 로컬 컴퓨터에만 바인딩된다. 수정 후 다른 터미널에서 `npm run build`하고 새로고침한다. 종료는 Ctrl+C다.

VS Code에서는 `tsukikage.code-workspace`를 연다. ‘터미널 → 작업 실행’에서 개발 서버·빌드·전체 테스트를 실행할 수 있다. Codex 등 개발 에이전트는 루트 `AGENTS.md`의 요구사항을 사용한다.

## 검증

```powershell
npm test
npm run build
```

Three.js 버전을 바꿀 때는 `npm run build:vendor`로 포함된 번들을 먼저 갱신한다. 일반 빌드는 저장소의 기존 번들을 사용한다.

브라우저 QA 스크립트에는 별도 자동화 호스트가 필요하다. 일반 `python tests/browser_checks.py`는 독립 실행 명령이 아니다.

## SSH 연결 (사용자 PC에서 최초 1회)

GitHub 앱 연결과 Git SSH 인증은 별개다. 이 Work 실행 환경에는 SSH 인증 키가 없으며, GitHub SSH 호스트 이름 조회도 실패했다. HTTPS clone과 GitHub 앱 접근은 확인했지만 SSH 인증 성공을 확인한 상태는 아니다.

사용자 PC에서 이미 GitHub SSH를 사용 중이라면 먼저 아래 명령으로 확인한다.

```powershell
ssh -T git@github.com
```

`Hi Yeondaeno! You've successfully authenticated`라는 응답이면 연결되어 있다. GitHub는 정상 인증에도 종료 코드 1을 반환할 수 있다. 다른 계정 이름이 나오면 먼저 계정을 확인한다.

인증 확인 기준은 [GitHub 공식 SSH 연결 테스트 안내](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)를 따른다.

키가 없을 때는 사용자 PC에서 생성한다. 기존 키가 있다면 덮어쓰지 않는다. 다음 명령의 이메일은 본인의 GitHub 이메일로 바꾸고, 키 암호는 프롬프트에서 설정한다.

```powershell
ssh-keygen -t ed25519 -C "YOUR_GITHUB_EMAIL"
Get-Content "$HOME/.ssh/id_ed25519.pub" | Set-Clipboard
```

[GitHub SSH 키 설정](https://github.com/settings/ssh/new)에 클립보드의 **공개키(`.pub`)만** 등록한다. 개인키 파일은 업로드하거나 채팅에 붙이지 않는다. 최초 접속에서 호스트 키를 확인할 때는 [GitHub 공식 지문](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)과 대조한다.

인증 응답을 확인한 뒤 저장소 경로에서 아래를 실행한다.

```powershell
git ls-remote git@github.com:Yeondaeno/tsukikage-riichi.git HEAD
git remote set-url origin git@github.com:Yeondaeno/tsukikage-riichi.git
git remote -v
```

SSH가 통하지 않는 환경에서는 HTTPS origin을 유지해도 소스 읽기와 로컬 개발이 가능하다. 이 Work 세션은 HTTPS origin과 별도 `ssh` remote를 구성하고, 쓰기는 연결된 GitHub 앱을 사용한다.

## 작업 저장

작업용 브랜치에서 변경과 검증을 끝낸 뒤 GitHub에 저장한다. `main` push는 기존 Pages 배포를 실행하므로 공개 배포를 의도하는 변경인지 확인한다. 생성물 `dist/`는 커밋하지 않는다.

## 이번 개발 환경 검증 (2026-10-03 KST)

- `npm ci --ignore-scripts`: 잠금 파일 기준으로 의존성 설치 완료.
- `npm test`: 규칙 검사 39개, v3 검사 7개, 자동 100국, 동풍전·반장전 6회 통과.
- `npm run build`: HTML과 인접 소재 빌드 완료.
- `npm run dev`: HTML 응답 200 및 빌드 결과와 바이트 일치, 캐릭터 소재 응답 200 확인.
- VS Code workspace JSON, 검사 workflow YAML, `git diff --check` 확인.
- 이 검증에는 실제 브라우저 렌더링·스마트폰 검수·SSH 인증 성공이 포함되지 않는다.
