# 월영마작 v3 · TSUKIKAGE 03

히나와 CPU 아카네·시즈쿠·코하루가 함께하는 4인 리치마작입니다. 실제 캐릭터 이미지와 표정, 화료 컷인, 효과음, 규칙 엔진을 포함합니다.

[브라우저에서 바로 플레이](https://yeondaeno.github.io/tsukikage-riichi/)

## 바로 실행

배포 ZIP을 풀고 `index.html`을 Chrome 또는 Edge에서 여세요. `assets` 폴더를 옆에 그대로 두어야 합니다. 휴대폰은 정적 서버에 올린 전체 배포 폴더에 접속하고 가로 화면으로 사용합니다. GitHub Pages 자동 배포 설정은 [배포 안내](docs/DEPLOYMENT.md)에 있습니다.

첫 화면에서 1국 연습·동풍전·반장전, CPU 난이도와 초보자 가이드를 선택합니다. 처음 누른 패는 선택되며, 같은 물리 패를 다시 누르거나 유효한 버림 영역으로 끌어 놓으면 버립니다. 재클릭에 시간 제한은 없습니다.

## 소스 실행과 수정

Python 3 표준 라이브러리만으로 `python build.py --output dist/index.html`을 실행합니다. HTML·CSS·JavaScript와 실제 소재가 함께 출력됩니다. `python -m http.server 8765 --directory dist --bind 127.0.0.1`로 로컬 실행할 수 있습니다. 게임 실행에는 Node나 Python이 필요하지 않습니다.

- [실행·배포 설명](docs/RUN-AND-DEPLOY.md)
- [조작·설정·초보자 안내](docs/CONTROLS-AND-GUIDE.md)
- [변경 내역](docs/CHANGELOG.md)
- [하우스 룰과 한계](docs/HOUSE-RULES.md)
- [실제 소재 목록](assets/README.md)
- [실제 검수 결과](TEST_REPORT.md)
- [향후 기능 설계만](docs/FUTURE-DESIGN.md)

규칙·CPU 검사는 Node.js로 `npm test`를 실행합니다. 추가 브라우저 검사는 설치된 browser-harness와 격리 Chromium CDP 연결을 사용하며, 재현 절차는 검수 결과에 적었습니다.

캐릭터 음성은 제작하지 않았습니다. PC의 Chromium과 휴대폰 크기·터치 에뮬레이션을 검사했으며, 실물 iPhone/Android 및 Safari/WebKit 검증은 하지 않았습니다.
