# 실행 · 빌드 · 정적 호스팅

배포 빌드 ZIP을 풀고 **index.html**을 열면 플레이할 수 있다. **assets 폴더를 HTML 옆에 유지해야 한다.** 인터넷 서비스, 로그인, API 키가 필요하지 않다. 소재가 빠지면 텍스트 결과는 계속 작동하지만 캐릭터 이미지와 효과음은 나오지 않는다.

브라우저의 파일 제한이 있으면 폴더에서 로컬 정적 서버를 실행한다:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

브라우저에서 http://127.0.0.1:8000/index.html 을 연다. 이는 사용자의 PC에서 실행하는 주소이며 공개 배포 주소가 아니다.

소스 빌드: Python 3 표준 라이브러리만으로 실행한다.

```powershell
python build.py --output dist/index.html
node tests/unit.js
node tests/simulation.js
node tests/v3.js
```

캐릭터 WebP/PNG, SVG, WAV는 이미 포함되어 있으므로 빌드에 이미지 생성이나 외부 서비스가 필요하지 않다. tools/create_assets.py는 제작 원본 재포장용이며 Pillow가 필요하다. 재포장은 일반 빌드에 필요하지 않다.

정적 호스팅에는 dist 전체를 같은 경로 구조로 올린다. index.html과 assets의 상대 경로를 유지하고 WebP/PNG/SVG/WAV의 MIME 타입을 허용한다. 앱은 외부 API를 호출하지 않는다. CSP를 설정한다면 현재 번들에 들어 있는 인라인 JS/CSS와 img-src/data, 로컬 media-src를 고려해야 한다.

GitHub Pages 배포는 저장소의 main 변경에 연결됩니다. 현재 배포 상태와 주소는 [배포 안내](DEPLOYMENT.md)와 저장소의 github-pages 환경에서 확인합니다. 서비스 워커/PWA 설치는 제공하지 않습니다.

저장은 해당 브라우저/출처의 localStorage를 사용한다. 파일 실행과 로컬 서버/호스팅은 출처가 달라 저장도 별개다. 저장 거부·용량 초과 시 현재 대국은 계속할 수 있다. v1 저장은 복사하여 검사한 뒤 이어하기에서 v3로 전환하며 원래 v1 키를 지우지 않는다. 형식이 맞지 않으면 이어하기를 거부하고 원본을 보존한다.

브라우저 검수 명령은 독립 Chromium CDP와 설치된 browser-harness를 사용한다. 테스트 스크립트의 localhost 포트는 8765, CDP 포트는 9331이다. 일반 사용자 실행에는 검수 도구가 필요하지 않다.
