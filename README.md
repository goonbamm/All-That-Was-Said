# 괴테는 모든 것을 말했다

책 **"괴테는 모든 것을 말했다"** 에서 고른 문장을 아카이브 형태로 정리하는 정적 웹사이트입니다. GitHub Pages에 올려서 홈페이지처럼 운영할 수 있도록 구성했습니다.

## 구조

- `index.html`: 메인 페이지
- `styles.css`: 감각적인 에디토리얼 스타일 UI
- `app.js`: 명언 렌더링, 검색, 태그 필터, 복사 기능
- `data/quotes.json`: 명언 데이터 파일
- `scripts/validate_quotes.py`: 데이터 형식 검증 스크립트
- `.github/workflows/deploy-pages.yml`: GitHub Pages 자동 배포

## 명언 추가/삭제 방법

명언 관리는 `data/quotes.json` 파일만 수정하면 됩니다.

각 항목 형식:

```json
{
  "id": "g007",
  "text": "여기에 명언을 넣습니다.",
  "source": "괴테는 모든 것을 말했다",
  "section": "주제 또는 장 제목",
  "tags": ["태그1", "태그2"]
}
```

- 추가: JSON 배열 안에 객체를 하나 더 넣습니다.
- 삭제: 원하는 객체를 지웁니다.
- 수정: `text`, `section`, `tags` 등을 바꾸면 됩니다.

`id`는 중복되지 않게 유지하는 것이 좋습니다.

## GitHub Pages 배포

1. 이 저장소를 GitHub에 푸시합니다.
2. GitHub 저장소의 `Settings > Pages` 로 이동합니다.
3. Source를 `GitHub Actions`로 선택합니다.
4. `main` 브랜치에 푸시하면 자동 배포됩니다.

배포 주소는 일반적으로 아래 형식입니다.

- 사용자 사이트 저장소 이름이 `<username>.github.io` 인 경우:
  - `https://<username>.github.io`
- 일반 프로젝트 저장소인 경우:
  - `https://<username>.github.io/All-That-Was-Said`

## 로컬 미리보기

Python이 있다면 아래 명령으로 확인할 수 있습니다.

```bash
python -m http.server 4173
```

그 뒤 브라우저에서 `http://localhost:4173` 을 열면 됩니다.

## 데이터 검증

명언 파일을 수정한 뒤 아래 명령으로 형식을 검사할 수 있습니다.

```bash
python scripts/validate_quotes.py
```

검사 항목:

- JSON 문법 오류
- 필수 필드 누락 여부
- `id` 중복 여부
- `tags` 배열 형식 여부
