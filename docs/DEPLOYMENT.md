# GitHub Pages 배포 완료

- [게임 플레이](https://yeondaeno.github.io/tsukikage-riichi/)
- [GitHub 저장소](https://github.com/Yeondaeno/tsukikage-riichi)
- [성공한 테스트·배포 실행](https://github.com/Yeondaeno/tsukikage-riichi/actions/runs/36965939451)
- [배포 후 실제 검수 기록](deployment-verification.json)

소스·캐릭터 제작 원본·게임용 소재·테스트·설명서를 공개 저장소에 업로드했습니다. 배포한 게임 커밋은 4aaeda73728d7f93823f79ab06c7d475a6dc8935입니다.

배포 서버에서 npm test와 정적 빌드·Pages 배포가 성공했습니다. 공개 주소에서 실제 시작 버튼, 첫 클릭 선택·900ms 뒤 재클릭 버림, 캐릭터 이미지40개, 효과음7개, 공개 정보 스냅샷, 가로844×390 화면, 컷인 건너뛰기 등 9개 검사를 통과했습니다.

배포 파일90개 모두 HTTP200으로 응답하고 내용이 검수한 빌드와 일치합니다. 그중88개는 바이트까지 동일하고, HTML·소재 목록JSON은 Windows/Linux의 CRLF/LF 줄바꿈 차이를 제외한 내용이 동일합니다. 원시 해시와 비교 방식도 기록했습니다.

일반 수정은 src 및 assets를 수정하고 main에 반영합니다. .github/workflows/pages.yml이 검사·빌드·배포를 이어서 처리합니다. 자동으로 만들어진 dist는 Git에 올리지 않습니다. 배포 후 결과 기록만 추가한 문서 커밋은 게임을 변경하지 않으므로 배포를 반복하지 않았습니다.

캐릭터 음성은 미제작이고, 실물 모바일·Safari는 미검증입니다. TEST_REPORT.md는 배포 전 로컬 검사 기록이며 이 문서와 JSON이 배포 후 검사를 보충합니다.
