# 실행 · 빌드 · 정적 호스팅

v3.2는 외부 API·로그인·런타임 CDN 없이 실행됩니다. 배포 폴더의 `index.html`과 `assets`를 같은 상대 경로로 유지하세요.

## 실행과 일반 빌드

`index.html`을 열거나, 파일 URL을 제한하는 브라우저에서는 다음처럼 로컬 서버를 사용합니다.

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

소스에서 정적 결과물을 만들 때는 Python 3만 필요합니다.

```powershell
python build.py --output dist/index.html
```

빌드는 이미 저장소에 있는 `assets/vendor/three.min.js`와 37개 패면 SVG를 결과 HTML에 포함합니다. 따라서 일반 빌드나 플레이에 Node.js·네트워크가 필요하지 않습니다.

## Three.js 번들 재생성

Three.js 의존성을 변경한 경우에만 실행합니다.

```powershell
npm ci
npm run build:vendor
python build.py --output dist/index.html
```

`three@0.186.1`과 `esbuild@0.28.2`는 MIT 라이선스이며, `build:vendor`는 Three.js를 로컬 IIFE 번들로 만듭니다. 번들이 없으면 Python 빌드는 중단하고 이 절차를 안내합니다.

## 호스팅 상태

정적 호스팅에는 `dist` 전체를 올리고 WebP·PNG·SVG·WAV MIME 형식을 허용하세요. main의 변경을 GitHub Pages 작업이 검사·빌드·배포합니다. 실제 공개 버전·작업 실행·배포 후 검수는 [DEPLOYMENT.md](DEPLOYMENT.md)에 기록합니다.

브라우저별 localStorage는 출처마다 분리됩니다. 파일 실행, 로컬 서버, 공개 호스팅의 저장은 서로 공유되지 않습니다.

WebGL2 미지원·Three.js 누락·WebGL 컨텍스트 손실에서는 CSS 탁으로 전환합니다. 이것은 렌더링 대체 경로이며 게임 엔진, 현재 대국, 손패 재클릭과 드래그의 동작은 유지합니다. 범위와 검수 증거는 [Three.js 보고서](THREE-REPORT.md)에 있습니다.
