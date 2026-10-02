# v3.2 Three.js 탁 구현·검수

수행일: 2026-10-02. 이 보고서는 v3.2 소스와 `tests/results/three/three-checks.json`을 대조한 로컬 검수 기록이다. 실제 공개 배포 결과와 추가 브라우저 검수는 [DEPLOYMENT.md](DEPLOYMENT.md)에 별도로 기록한다.

## 구현 범위

- Three.js `0.186.1` WebGL2 렌더러가 목재 결, 녹색 펠트, 조명과 카메라를 그린다. 37개 로컬 공개 패면 SVG(34종+적패 3종)는 UTF-8로 읽어 기존 CSS 스킨 색을 적용한 뒤 `CanvasTexture`로 만든다.
- 3D로 그리는 패는 네 사람의 공개 버림패와 공개 부로뿐이다. CPU 손패는 면 정보 없이 뒷면 개수로 표시하며, 공개 패에는 리치·가져간 패·마지막 버림 표시가 반영된다.
- 손패, 버림 영역, 왕패 HUD, 캐릭터와 게임 조작은 DOM을 계속 쓴다. 렌더러 서명에는 아카·스킨을 포함하고, 텍스처 키는 세 스킨×37개 패면으로 제한한다. 재클릭은 시간 제한이 없고, 유효 드래그·영역 밖 취소·포인터 취소의 기존 동작도 유지한다.
- 짧고 넓은 스테이지(가로/세로 비율 1.75 초과, 높이 500px 미만)는 별도 compact 배치를 쓴다. 휴대폰 가로 배치에서는 좌석을 왼쪽에, 중앙 HUD를 오른쪽에 둔다. 세로 휴대폰은 이번 검증 범위에 없다.

WebGL2가 없거나 Three.js를 읽지 못하면 CSS 탁으로 전환한다. 컨텍스트를 잃어도 손패 조작과 대국은 계속되고, 복구하면 같은 게임 스냅샷으로 Three.js를 다시 표시한다.

현재 약 300줄의 렌더러는 텍스처·장면·컨텍스트 복구의 자원 소유권을 한 파일에서 관리하는 크기 예외로 둔다. 게임 규칙과 조작 모듈은 별도로 유지한다. 렌더러에 기능을 더 추가할 때 텍스처 관리와 배치를 분리하는 것이 다음 확장 경계다. 독립 리뷰는 [REVIEW-V3.2.md](REVIEW-V3.2.md)에 보관한다.

## 번들·소재

일반 `python build.py`는 미리 만든 `assets/vendor/three.min.js`를 사용하므로 Python 표준 라이브러리만 필요하다. Three.js `0.186.1`과 번들러 esbuild `0.28.2`는 MIT다. 번들을 다시 만들 때만 `npm ci`와 `npm run build:vendor`가 필요하다.

기존 WebP 40개, WAV 7개, SVG 37개와 PNG 원본을 재사용했다. 새 캐릭터나 음성은 만들지 않았다.

## 실제 브라우저 검수

검수 환경은 Windows 격리 Chromium 151, RTX 5050의 D3D11 WebGL2 백엔드였다. `tests/results/three/three-checks.json`은 `browser-harness < tests/three_checks.py`로 기록한 현재 58/58 통과 결과를 담고 있다.

| 시나리오 | 이진 관찰 결과 | 캡처 증거 |
|---|---|---|
| 공개 패 텍스처 로드와 3D 활성화 | `active=true`, `renderer=WebGL2`, 공개 패면만 진단에 남음 | `tests/results/three/three-canvas-seed-12345.png` |
| 늦은 136장 국면 | 공개 버림패·부로만 3D 표시, CPU 뒷면 개수 유지 | `tests/results/three/three-active-late-hand.png` |
| 파일 URL 오프라인 실행 | HTTP(S) 차단 상태에서도 Three.js 활성 | `tests/results/three/three-file-url.png` |
| 최종 Three.js 화면 | 최종 렌더링 PNG 생성 | `tests/results/three/three-final.png` |

58개 검사는 1920×1080·1366×768·844×390·740×360 리사이즈, 긴 국면의 136장 보존, 공개 패 위치·최소 12px·가림·투명 접근 버튼, 네 크기에서 중앙 카운터 보드 내부 포함, 실제 엔진의 공개 치·퐁·대명깡과 암깡 안쪽 두 면, 적5/아카 전환, 세 가지 스킨 전환 뒤 게임 상태 보존, 손패 재클릭·드래그, 컨텍스트 손실/복구, WebGL2·Three.js 누락 대체, 100회 동기화/리사이즈 자원 안정성, DPR 상한 1.5, 파일 URL 오프라인 실행을 확인했다.

844×390·740×360은 터치와 크기 에뮬레이션이다. 실물 iPhone/Android, Safari/WebKit, 모바일 GPU·배터리·FPS는 확인하지 않았다.

기존 브라우저 회귀 91/91은 2026-10-02에 다시 통과했다. 규칙·v3 엔진은 46/46, 자동 대국은 100국에서 화료 69·유국 28·도중 유국 3, 동풍전·반장전은 6회 46국을 완료했다. 이 수치는 Three.js 58개 검사와 분리된 현재 증적이다.

대전 모드 분리, 리플레이·패보, 전적 통계는 [FUTURE-DESIGN.md](FUTURE-DESIGN.md)의 설계만 존재하며 이번 구현·검수에 포함하지 않았다.
