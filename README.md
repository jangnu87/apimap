# 사이의 거리

OpenStreetMap의 Nominatim으로 장소를 검색하고 OSRM의 자동차 경로를 이용해 두 지점 사이의 거리와 예상 운전 시간을 보여주는 정적 웹앱입니다.

## 실행

`index.html`을 브라우저에서 열거나, 로컬 정적 파일 서버로 폴더를 실행하세요. 외부 서비스 요청은 브라우저에서 직접 이루어집니다.

## Vercel 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Vercel에서 **Add New → Project**를 선택하고 해당 저장소를 Import합니다.
3. Framework Preset은 **Other**를 선택합니다. Build Command는 비워 두고 Output Directory를 `.`으로 설정해 Deploy 합니다.

별도의 서버, Redis, API 키 또는 환경변수는 필요하지 않습니다.

## 데이터 제공자 및 이용 안내

- 장소 검색: [Nominatim](https://nominatim.org/), 공개 OSM 검색 서버
- 자동차 경로: [OSRM](https://project-osrm.org/), 공개 데모 서버
- 지도 타일: [OpenStreetMap](https://www.openstreetmap.org/copyright)

공개 서버는 사용량과 공정 이용 정책에 제한이 있습니다. 앱은 Nominatim 요청을 한 번에 하나씩 보내고 검색 간격을 최소 1.1초로 유지합니다. 사용량이 커지는 서비스에는 각 제공자의 최신 정책에 맞는 전용 또는 상용 서비스를 사용하세요. 지도 데이터를 사용할 때는 지도에 표시되는 OpenStreetMap 저작자 표시를 유지해야 합니다.
