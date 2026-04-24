# All That Was Said

책에서 건져 올린 문장, 지인들의 좌우명, 주변 사람들이 오래 붙들고 사는 말을 함께 기록하는 정적 웹사이트입니다. GitHub Pages에 올려서 홈페이지처럼 운영할 수 있도록 구성했습니다.

## 구조

- `index.html`: 메인 페이지
- `styles.css`: 감각적인 에디토리얼 스타일 UI
- `app.js`: 문장 렌더링, 검색, 연결 탐색, 복사 기능
- `data/quotes.json`: 문장/좌우명/지인 기록 데이터 파일
- `scripts/validate_quotes.py`: 데이터 형식 검증 스크립트
- `.nojekyll`: GitHub Pages가 정적 파일을 그대로 배포하도록 지정

## 기록 추가/삭제 방법

기록 관리는 `data/quotes.json` 파일만 수정하면 됩니다.

각 항목 형식:

```json
{
  "id": "g007",
  "quote": "여기에 문장을 넣습니다.",
  "author_name": "저자 또는 말한 사람 이름",
  "source": "책 제목, 대화 출처, 장면",
  "section": "장 제목 또는 세부 위치",
  "original": "원문 또는 원래 표현(선택)",
  "entry_type": "quote",
  "subject_name": "기록의 중심이 되는 사람 이름(선택)",
  "subject_relation": "친구, 선배, 동료 등(선택)",
  "context": "언제 어떤 맥락에서 만난 말인지(선택)",
  "recorded_on": "2026-04-24",
  "tags": ["태그1", "태그2"]
}
```

- `entry_type`은 `quote`, `motto`, `shared` 중 하나를 권장합니다.
- `subject_name`과 `subject_relation`을 쓰면 "누구의 말/누구의 좌우명인지"를 화면과 검색에 함께 반영할 수 있습니다.
- `context`, `recorded_on`을 쓰면 나중에 문장을 다시 볼 때 만난 장면까지 같이 남길 수 있습니다.
- 추가: JSON 배열 안에 객체를 하나 더 넣습니다.
- 삭제: 원하는 객체를 지웁니다.
- 수정: `quote`, `author_name`, `source`, `tags`와 선택 필드들을 바꾸면 됩니다.

`id`는 중복되지 않게 유지하는 것이 좋습니다.

예시:

```json
{
  "id": "p001",
  "quote": "이게 너무 오랫동안 닫혀 있어서 벽인 줄 알았지만 사실은 문이다.",
  "author_name": "윤상원",
  "source": "설국열차의 송강호 대사",
  "entry_type": "shared",
  "subject_name": "윤상원",
  "subject_relation": "지인",
  "context": "만나서 서로 오래 남는 문장을 이야기하던 날",
  "recorded_on": "2026-04-24",
  "tags": ["문", "인식", "전환"]
}
```

## GitHub Pages 배포

1. 이 저장소를 GitHub에 푸시합니다.
2. GitHub 저장소의 `Settings > Pages` 로 이동합니다.
3. `Build and deployment`의 `Source`를 `Deploy from a branch`로 선택합니다.
4. Branch를 `main`으로, 폴더를 `/(root)`로 선택한 뒤 저장합니다.
5. 이후 `main` 브랜치에 푸시하면 자동 배포됩니다.

이 프로젝트는 빌드 과정이 없는 순수 정적 사이트라서 `GitHub Actions`보다 브랜치 배포가 더 단순하고 문제도 적습니다.

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

기록 파일을 수정한 뒤 아래 명령으로 형식을 검사할 수 있습니다.

```bash
python scripts/validate_quotes.py
```

검사 항목:

- JSON 문법 오류
- 필수 필드 누락 여부
- `id` 중복 여부
- `tags` 배열 형식 여부
- `quote`/`author_name`/`source` 공백 여부
- 선택 필드 문자열 형식 여부
- `entry_type` 허용값 여부
