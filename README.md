# 월영마작 v3.2 · Three.js 탁

히나와 CPU 아카네·시즈쿠·코하루가 함께하는 로컬 4인 리치마작입니다. v3.2는 기존 규칙 엔진과 손패 DOM 조작을 유지한 채, 공개 버림패·부로와 비공개 패 뒷면을 WebGL2/Three.js 탁에 표시합니다.

[브라우저에서 플레이](https://yeondaeno.github.io/tsukikage-riichi/) · 공개 배포 버전과 실행 후 검수 증거는 [배포 기록](docs/DEPLOYMENT.md)에 있습니다.

## 실행

개발하려면 [개발 프로젝트 안내](docs/DEVELOPMENT.md)를 확인하세요. `npm ci` 후 `npm run dev`로 빌드와 로컬 서버를 실행할 수 있습니다. VS Code는 `tsukikage.code-workspace`, 개발 에이전트는 `AGENTS.md`를 사용합니다.

배포 폴더의 `index.html`과 `assets`를 함께 두고 열면 됩니다. 브라우저의 파일 제약이 있으면 폴더에서 정적 서버를 실행하세요.

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

소스 빌드는 Python 3 표준 라이브러리만 사용합니다.

```powershell
python build.py --output dist/index.html
```

일반 빌드는 미리 포함된 Three.js 번들을 사용합니다. `assets/vendor/three.min.js`를 다시 만들 때만 `npm ci` 후 `npm run build:vendor`를 실행합니다.

첫 클릭은 선택이고, 같은 물리 패를 다시 누르거나 유효한 버림 영역으로 끌면 버립니다. 재클릭에는 시간 제한이 없습니다. WebGL2를 쓸 수 없거나 컨텍스트가 사라지면 기존 CSS 탁으로 돌아가며, 게임과 손패 조작은 계속됩니다.

## 문서

- [v3.2 Three.js 구현·검수](docs/THREE-REPORT.md)
- [실행·빌드·정적 호스팅](docs/RUN-AND-DEPLOY.md)
- [변경 내역](docs/CHANGELOG.md)
- [조작·설정·초보자 안내](docs/CONTROLS-AND-GUIDE.md)
- [하우스 룰과 한계](docs/HOUSE-RULES.md)
- [실제 소재 목록](assets/README.md)
- [향후 기능 설계만](docs/FUTURE-DESIGN.md)

`TEST_REPORT.md`는 v3.2의 58개 추가 검사와 기존 91개 브라우저 회귀 검사, 규칙·자동 대국 검사를 기록합니다. 실제 공개 호스팅 검수는 배포 기록에 별도로 있습니다.

캐릭터 WebP 40개, WAV 7개, 패면 SVG 37개와 기존 PNG 원본을 재사용했습니다. 새 캐릭터나 음성은 제작하지 않았습니다. 실물 iPhone/Android, Safari/WebKit, 실제 기기 FPS는 검증하지 않았습니다.
