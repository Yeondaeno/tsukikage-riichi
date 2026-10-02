# GitHub Pages 배포

이 저장소의 main 변경은 GitHub Actions에서 규칙 검사와 정적 빌드를 수행한 뒤 GitHub Pages로 배포합니다. 실행 파일은 dist/index.html과 assets이며, 이미지 생성 서비스나 계정 인증은 게임 실행에 필요하지 않습니다.

초기 배포의 완료 여부와 실제 접속 주소는 저장소의 Actions 및 github-pages 환경에서 확인할 수 있습니다. 현재 로컬 검수 결과 TEST_REPORT.md는 배포 전의 검수 기록이며, 배포 후 검수 증거는 docs/deployment-verification.json에 별도 기록합니다.

일반 수정은 src 및 assets를 수정하고 main에 반영합니다. .github/workflows/pages.yml이 테스트·빌드·배포를 이어서 처리합니다. 자동으로 만들어진 dist는 Git에 올리지 않습니다.

캐릭터 음성은 미제작이며, 실물 모바일와 Safari 검수 범위는 기존 TEST_REPORT.md의 구분을 유지합니다.

