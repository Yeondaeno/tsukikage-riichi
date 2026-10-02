# GitHub Pages v3.2 배포 완료

- [게임 플레이](https://yeondaeno.github.io/tsukikage-riichi/)
- [GitHub 저장소](https://github.com/Yeondaeno/tsukikage-riichi)
- [성공한 테스트·배포 실행](https://github.com/Yeondaeno/tsukikage-riichi/actions/runs/36988938534)
- [배포 후 검수 요약](deployment-verification.json)
- [92개 파일 HTTP·해시 대조 기록](deployment-files-v3.2.json)
- [공개 사이트 브라우저 검사 원문](../tests/results/deployment-v3.2/deployment-browser.json)

Three.js 0.186.1의 실제 WebGL 테이블을 적용한 v3.2를 배포했습니다. 게임 커밋은 93d221792bc435429f704484e99ac572f91edd96이고, Pages 배포는 2026-10-02 18:19:37 KST에 성공했습니다. 소스, 고정 여성 캐릭터 4명의 제작 원본과 게임용 소재, 테스트, 실행·배포 설명서를 공개 저장소에 포함했습니다.

배포 서버의 npm ci, npm test, 정적 빌드와 Pages 배포가 모두 성공했습니다. 공개 주소에서 시작 버튼, 플레이어 1명·CPU 3명, 실제 Three.js/WebGL2 테이블, 첫 클릭 선택·900ms 뒤 재클릭 버림, 이미지 40개 로드, 효과음 WAV 7개 디코딩, 공개 정보 스냅샷, 844×390 가로 화면, 컷인 건너뛰기·잠금 해제 등 브라우저 검사 10개를 통과했습니다.

배포 파일 92개 모두 HTTP 200으로 응답하고 검수한 빌드와 내용이 일치합니다. 90개는 바이트까지 동일하고, index.html과 assets/manifest.json은 Windows/Linux의 CRLF/LF 줄바꿈을 정규화하면 동일합니다. 원시 해시, MIME, 비교 방식은 파일 대조 기록에 있습니다.

일반 수정은 src 및 assets를 수정하고 main에 반영합니다. .github/workflows/pages.yml이 검사·빌드·배포를 처리합니다. 자동 생성된 dist는 Git에 올리지 않습니다. 배포 후 결과만 추가한 문서 커밋은 게임 파일을 변경하지 않으며 [skip ci]로 중복 배포를 피합니다.

로컬 검수는 기존 브라우저 91개·Three.js 58개, 규칙·v3 검사 46개, 100국 시뮬레이션과 동풍전·반장전 총 6경기를 포함합니다. 상세 조건은 [TEST_REPORT.md](../TEST_REPORT.md), [THREE-REPORT.md](THREE-REPORT.md), [독립 코드 리뷰](REVIEW-V3.2.md)를 확인하세요. 긴 국면 화면은 통제된 테스트 상태로 촬영했으며 자연 대국 진행의 증거와 구분합니다.

실물 휴대폰·Safari·지속 FPS·실제 스피커 출력은 검증하지 않았습니다. 모바일 검사는 Windows Chromium의 화면 크기·터치 에뮬레이션입니다. 캐릭터 음성은 미제작이며 WAV 7개는 효과음입니다. 대전 모드 분리·리플레이·패보·전적 통계는 [향후 설계](FUTURE-DESIGN.md)만 제공하며 구현 완료로 보고하지 않습니다.
