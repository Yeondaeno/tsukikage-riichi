# 제작 소재

이번 작업에서 image_gen으로 고정 등장인물 4명의 실제 이미지를 제작했습니다. 히나는 달빛·민트, 아카네는 태양·코럴, 시즈쿠는 물·파랑, 코하루는 봄바람·분홍을 사용합니다. 밝은 캐주얼 일본 애니메이션 분위기로 기존 녹색 마작탁에 통합했습니다.

| 소재 | 실제 파일 |
|---|---|
| 기본 전신 이미지 | 각 캐릭터의 base.webp, 4개 |
| 표정·초상 | neutral / smile / thinking / surprise / riichi / win / loss.webp, 총 28개 |
| 별도 승리 컷인 | 각 캐릭터의 cutin.webp, 4개 |
| 특수 연출 포즈 | 각 캐릭터의 special.webp, 4개 |
| 편집·재패킹 원본 | 각 캐릭터의 base-original.png / expressions-original.png / cutin-original.png, 총 12개 |
| 패 앞면 | tiles/00.svg부터33.svg, 적패16·52·88 SVG, 총 37개 |
| 테이블 소재 | table/felt.svg, tile-back.svg, riichi-stick.svg |
| 효과음 | audio/select / tile / call / riichi / win / draw / rank.wav, 총 7개 |

게임에 사용하는 WebP는 총 40개입니다. 7종 표정에는 기본 초상도 포함되므로 초상 파일을 별도 추가 제작한 수로 중복 계산하지 않았습니다. 표정 시트의 여덟 번째 패널이 특수 포즈이며 승리 컷인은 별도의 생성 이미지입니다.

효과음은 로컬 PCM 합성 WAV입니다. 캐릭터 음성은 제작하지 않았고 manifest의 voice는 null입니다. 대사는 src/characters.js의 실제 한국어 여러 변형을 사용합니다. 생성 이미지의 글자나 빈 마작패에 규칙 정보가 의존하지 않습니다.

원본 PNG는 소스 패키지에, 실행용 WebP·SVG·WAV는 배포 패키지에 포함합니다. PNG에서 WebP를 다시 패킹하려면 Pillow를 설치한 Python으로 tools/create_assets.py를 실행하세요. tools/art-inputs.json의 경로는 프로젝트 상대 경로입니다. 이미지 자체를 재생성하는 유료 서비스 호출은 실행하지 않습니다.

게임 코드의 기존 MIT LICENSE를 유지했습니다. 생성 이미지는 이번 프로젝트를 위해 제작했으며 제3자 브랜드·유명 작품 캐릭터나 성우 음성을 사용하지 않았습니다.

