# 월영마작 프로젝트 기준

작성 기준: 2026-10-03 KST. 아래 제품 상태는 커밋 `cdbd609e8f0f4c8d36a1b9432d410e8bdf1ab1cf`의 파일에 근거한다. 작업마다 현재 HEAD와 차이를 확인한다.

## 목적과 현재 구현

브라우저에서 실행하는 월영마작 v3.2다. [README](../README.md)에 따르면 히나가 플레이어이고 아카네·시즈쿠·코하루가 CPU인 로컬 4인 리치마작이다. 1국 연습·동풍전·반장전은 대국 길이 옵션이며 온라인 멀티플레이가 아니다.

[Three.js 보고서](THREE-REPORT.md)에 따르면 공개 버림패·부로·CPU 패 뒷면은 Three.js/WebGL2 탁으로 표시한다. 자기 손패, 버림 영역과 조작 UI는 DOM을 유지한다. WebGL2 사용 불가/컨텍스트 손실 시 CSS 탁으로 대체한다.

[조작 안내](CONTROLS-AND-GUIDE.md)의 같은 물리 패 재클릭·드래그를 보존한다. 사용자 확정 기준인 원클릭 즉시 버리기 금지는 설정 옵션에도 적용한다. 안내 개입 수준과 기존 캐릭터의 방향은 루트 [AGENTS.md](../AGENTS.md)를 따른다.

## 파일 지도

| 파일 | 역할 |
|---|---|
| `src/engine.js` | 규칙, 정산, 국 진행, 사건과 난수 |
| `src/policy.js` | CPU 성향과 후보 선택 |
| `src/input.js`, `src/app.js` | 입력, 조립, 화면·설정·저장 UI |
| `src/table-3d.js`, `src/table-3d.css` | Three.js 탁 |
| `src/visuals.js`, `src/characters.js` | 공개 정보 연출, 캐릭터 소재·대사 |
| `src/template.html`, `src/*.css` | 화면 뼈대와 스타일 |
| `build.py` | HTML 결합과 인접 assets 복사 |
| `package.json`, `package-lock.json` | 고정 라이브러리와 기존 검사 명령 |
| `.github/workflows/pages.yml` | 기존 main 테스트·정적 빌드·Pages 배포 |
| `tests/`, `tests/results/` | 검사 코드와 날짜별 증거 |

이 표의 경계는 [향후 설계](FUTURE-DESIGN.md)와 빌드 파일을 기준으로 한 작업 안내다. 구체적인 기능 변경 전에는 해당 소스를 직접 읽는다.

## 설계와 검증의 경계

[향후 설계](FUTURE-DESIGN.md)는 대전 모드 분리, 리플레이·패보, 전적·통계를 미구현으로 명시한다. 계정·온라인 전송·매칭 서버도 현재 구현으로 취급하지 않는다. 음성 슬롯은 미제작이며 WAV 효과음을 캐릭터 음성으로 설명하지 않는다.

[배포 기록](DEPLOYMENT.md)은 2026-10-02 v3.2 배포와 당시 검사를 기록한다. 이는 이번 개발 설정 변경에서 직접 재실행한 증거가 아니다. 실물 iPhone/Android, Safari, 지속 FPS, 실제 스피커 출력도 과거 보고서상 미검증이다.

`DESIGN.md`의 추가 라이브러리 없는 CSS 3D 설명과 v3.2 Three.js 문서는 시점이 다르다. 오래된 문서에 맞추려고 현재 렌더러를 제거하지 않는다.

## 새 작업의 입력

요청 목적, 바꿀 화면/동작, 유지할 조건, 완료 기준을 정한 뒤 실제 관련 파일을 읽는다. 답변은 확인된 구현 / 설계 / 이번 검증 / 미검증을 구분한다. GitHub에 추가한 문서가 ChatGPT 프로젝트 UI에 자동 등록되거나 PC의 Work 작업 폴더에 자동 동기화된 것으로 간주하지 않는다.
