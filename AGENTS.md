# 월영마작 개발 지침

## 프로젝트

월영마작(TSUKIKAGE RIICHI)은 브라우저에서 실행하는 4인 리치마작이다. 현재 구현은 사람 1명과 CPU 3명의 로컬 대국이다. 기존 코드를 확인하고 수정하며, 별개의 게임으로 교체하지 않는다.

## 개발 명령

- 환경: Node.js 22 이상, npm, Python 3.10 이상.
- 설치: `npm ci`.
- 빌드: `npm run build` → `dist/index.html`과 `dist/assets`.
- 개발 실행: `npm run dev` → `http://127.0.0.1:8000`.
- 전체 규칙 검사: `npm test`.
- 빠른 단위 검사: `npm run test:unit`.
- Three.js 의존성을 변경할 때만: `npm run build:vendor` 후 재빌드.
- `npm run dev`는 시작할 때 빌드한다. 소스를 수정한 뒤 별도 터미널에서 `npm run build`하고 브라우저를 새로고침한다.

## 코드 위치

- `src/engine.js`: 규칙, 점수 계산, CPU 판단.
- `src/input.js`: 패 선택·재클릭·드래그.
- `src/app.js`: 게임 상태와 화면 연결.
- `src/table-3d.js`, `src/table-3d.css`: Three.js 마작탁.
- `src/template.html`, `src/*.css`: 화면과 스타일.
- `src/characters.js`, `src/visuals.js`, `assets/`: 캐릭터와 연출·음향·패면.
- `build.py`: 로컬 소재를 사용하는 정적 HTML 빌드.
- `tests/`: 규칙·조작 계약·시뮬레이션·대국 검사.

## 반드시 지킬 요구사항

1. 수동 버리기는 첫 클릭으로 선택한 같은 물리 패를 다시 누르거나, 유효한 버림 영역으로 드래그할 때만 확정한다. 재클릭에는 시간 제한을 두지 않는다.
2. 원클릭 즉시 버리기는 기본값·설정·빠른 모드 어디에도 추가하지 않는다. 다른 물리 패는 같은 종류라도 선택만 바뀐다.
3. 요청하지 않은 마작 룰 변경을 UI 작업에 섞지 않는다. 규칙 오류 수정에는 재현 검사를 추가한다.
4. 여성 캐릭터 중심의 기존 캐주얼 일본 애니메이션풍 소재와 녹색·청옥·달빛 정체성을 유지한다.
5. 비공개 CPU 손패·패산을 일반 화면이나 공개 스냅샷에 노출하지 않는다.
6. WebGL2를 사용할 수 없을 때 CSS 탁으로 돌아가도 대국과 손패 조작이 작동해야 한다.
7. 대전 모드 분리·리플레이·패보·전적 통계는 `docs/FUTURE-DESIGN.md`의 설계 범위다. 새 요청 없이 온라인 매칭·계정·결제·가챠를 추가하지 않는다.
8. 상세 요구사항은 `docs/REQUIREMENTS.md`, 조작은 `docs/CONTROLS-AND-GUIDE.md`, 하우스 룰은 `docs/HOUSE-RULES.md`를 확인한다. 새 사용자 지시가 우선한다.

## 변경과 검증

- 변경 전 `git status`를 확인하고 다른 작업의 변경을 덮어쓰지 않는다. 작업은 별도 브랜치에 저장한다.
- 규칙·입력 변경 시 `npm test`, 모든 소스 변경 시 `npm run build`를 실행한다.
- UI 변경은 PC와 모바일 가로 화면을 확인하고, 확인한 환경만 보고한다. 과거 보고서를 이번 테스트 결과로 제시하지 않는다.
- `tests/browser_checks.py` 등은 별도 브라우저 자동화 호스트의 전역 함수를 사용한다. 일반 Python으로 단독 실행 가능한 검사라고 안내하지 않는다.
- `npm test`는 `tests/results/full-matches.json`과 `tests/results/v3-engine.json`을 갱신한다. 결과 파일은 현재 변경의 검증 기록으로 의도적으로 포함할 때만 커밋한다.
- 생성된 `dist/`, 의존성, SSH 개인키, 토큰, `.env`는 커밋하지 않는다.
- `main`에 push하면 기존 GitHub Pages 배포가 실행된다. 검증과 사용자 요청 범위를 확인한 뒤 진행한다.
