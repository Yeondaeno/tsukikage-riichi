# 월영마작 · 입체 마작탁

## 1. Atmosphere & Identity
사용자가 제공한 마작 화면의 사다리꼴 원근, 두꺼운 목재 테두리, 금색 패 뒷면, 중앙 점수판과 네 방향 버림패를 채택한다. 기존 월영마작의 녹색 펠트와 달빛, 제작된 히나·아카네·시즈쿠·코하루 이미지를 유지한다. 참고 게임의 이미지나 워터마크는 사용하지 않는다.

## 2. Color
기존 jade/ivory/midnight 테마의 패 잉크와 손패 설정을 유지한다. 탁의 재질 팔레트는 src/table-perspective.css의 #stage에서 정의하며, 아래 역할 토큰을 프레임·공개 패·CPU 패·중앙판·HUD·드롭 영역이 소비한다. 모든 색상은 실제 선언과 일치한다.

| 재질 역할 | CSS 토큰 | 값 |
|---|---|---|
| room-light | --table-room-light | #1c5c4c |
| room-mid | --table-room-mid | #0e312a |
| room-dark | --table-room-dark | #071d19 |
| wood-edge | --table-wood-edge | #4d2919 |
| felt-light | --table-felt-light | #3f9676 |
| felt-mid | --table-felt-mid | #247056 |
| felt-dark | --table-felt-dark | #124939 |
| wood-highlight | --table-wood-highlight | #bc7d3e |
| wood-outer | --table-wood-outer | #24140d |
| frame-shadow | --table-frame-shadow | #000a |
| wood-inner-glow | --table-wood-inner-glow | #d49b5180 |
| felt-inset | --table-felt-inset | #021d1666 |
| frame-line | --table-frame-line | #f3c77763 |
| frame-line-shadow | --table-frame-line-shadow | #50261599 |
| felt-sheen | --table-felt-sheen | #fff2b510 |
| felt-shade | --table-felt-shade | #00180f35 |
| felt-guide | --table-felt-guide | #e3c37938 |
| felt-guide-subtle | --table-felt-guide-subtle | #e3c37925 |
| stamp-ink | --table-stamp-ink | #fff5cf38 |
| stamp-shadow | --table-stamp-shadow | #003426 |
| note-ink | --table-note-ink | #f9edcf9c |
| text-shadow | --table-text-shadow | #062b20 |
| river-face | --table-river-face | #fff9de |
| river-edge | --table-river-edge | #f5e7bb |
| tile-side | --table-tile-side | #b9873d |
| tile-shadow | --table-tile-shadow | #061f1799 |
| bank-shadow | --table-bank-shadow | #041b14aa |
| bank-side | --table-bank-side | #a97032 |
| bank-tile-shadow | --table-bank-tile-shadow | #08261b99 |
| back-light | --table-back-light | #ffdf83 |
| back-mid | --table-back-mid | #efa92e |
| back-dark | --table-back-dark | #ba7225 |
| back-border | --table-back-border | #fff0ae |
| back-inner | --table-back-inner | #82501e |
| back-inset | --table-back-inset | #ffd36b88 |
| back-side | --table-back-side | #85501f |
| back-shadow | --table-back-shadow | #061e1799 |
| board-border | --table-board-border | #f1d58b9e |
| board-light | --table-board-light | #254f42 |
| board-dark | --table-board-dark | #102f28 |
| board-base | --table-board-base | #1a6b52 |
| board-side | --table-board-side | #815a2d |
| board-shadow | --table-board-shadow | #001b1499 |
| round-ink | --table-round-ink | #ffe7a6 |
| counter-bg | --table-counter-bg | #0a2c25 |
| count-ink | --table-count-ink | #fff4c5 |
| compass-border | --table-compass-border | #e6c66a91 |
| compass-bg | --table-compass-bg | #183f35 |
| compass-ink | --table-compass-ink | #ffe8a6 |
| compass-side | --table-compass-side | #78552d |
| compass-active | --table-compass-active | #e5c66e |
| compass-active-ink | --table-compass-active-ink | #18352c |
| compass-glow | --table-compass-glow | #ffe69d |
| hud-bg | --table-hud-bg | #143c32ed |
| hud-edge | --table-hud-edge | #e7d49678 |
| hud-shadow | --table-hud-shadow | #001a1399 |
| toast-shadow | --table-toast-shadow | #000 |
| drop-bg | --table-drop-bg | #123b30db |
| drop-edge | --table-drop-edge | #f0d684aa |
| drop-shadow | --table-drop-shadow | #001b1599 |
| river-label | --table-river-label | #fff0c7 |
| label-shadow | --table-label-shadow | #03251b |

## 3. Typography
기존 한국어 system-ui/Malgun Gothic와 패의 serif SVG를 유지한다. 점수는 tabular-nums, 안내는 기존 본문 크기. 탁 위의 작은 공개 패에는 기존 숫자/종류 보조 표기를 유지하며, 손패와 조작 안내를 기울이지 않는다.

## 4. Spacing & Layout
앱 전체는 100dvh 안에 머문다. 마작탁 영역만 perspective/rotateX를 적용하고, 손패·캐릭터 좌석·왕패·드롭 영역·대화·일시정지는 평면으로 유지한다. 탁 안에서는 네 방향 버림패와 중앙판, CPU 비공개 손패를 배치한다. 데스크톱은 넓은 탁, 짧은 휴대폰 가로 화면은 낮은 기울기와 압축 배치로 공개 패 가독성을 우선한다. 긴 국면의 20/16/16/16장 버림패가 잘리지 않아야 한다. 기존 사이드바와 모달만 자신의 스크롤을 소유한다.

## 5. Components
- Table plane: 기존 실제 게임 요소를 감싸는 단일 면. 빈 국면/긴 국면/리치/부로/정산을 같은 구조로 표시한다.
- Tile: 기존 SVG 패, 아이보리 상판과 금색 측면 그림자. 선택/추천/리치 선언 90도 회전/가져간 패/도라/키보드 포커스를 보존한다.
- Seat: 실제 표정 이미지와 이름·점수·풍·CPU 성향. 차례/리치/화료/실점 상태를 기존 렌더링으로 표시한다.
- Drop zone: 평면의 명시적 사각형 영역. 대기/드래그 시작/유효 드롭/취소를 기존 입력 모듈로 표시한다.
- Hand: 평면 네이티브 버튼. 같은 물리 패 재클릭·재터치 또는 드래그. 첫 클릭은 선택이며 시간 제한을 추가하지 않는다.

## 6. Motion & Interaction
새 탁 시점은 고정이며 계속 흔들리지 않는다. 기존 캐릭터·도라·화료 연출과 reduced-motion 설정을 유지한다. 드래그 고스트는 body의 화면 좌표를 사용하고 드롭 영역은 변형 면 밖에 둔다. 상태 변화/창 크기 변경/포인터 취소 시 기존 공통 취소 로직을 사용한다. 키보드 선택과 Enter, Escape도 유지한다.

## 7. Depth & Surface
혼합 전략: 목재 테두리의 다층 inset 그림자, 펠트의 정적 명암, 패의 아래·측면 그림자. 실제 DOM 요소의 CSS 3D를 사용하며 WebGL이나 추가 라이브러리는 필요하지 않다. 화면 이미지를 배경에 붙여 대국을 대체하지 않는다.

## 8. Accessibility Constraints & Accepted Debt
손패와 유효 드롭 영역은 평면이므로 원근 좌표 역변환이 필요하지 않다. 드래그의 대안으로 재클릭/재터치/키보드를 제공한다. 숨겨진 CPU 패와 왕패는 실제 패의 정체를 DOM에 노출하지 않는다. 가로 휴대폰과 PC의 실제 브라우저 에뮬레이션을 검수하고 실물 휴대폰/Safari 검증 여부는 보고서에 구분한다. 온라인/패보/전적 등은 이전 설계 범위 그대로다.
