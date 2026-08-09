# Tiger Demo Fixture

이 폴더는 외부 문화유산 자료가 없는 기능 검증용 창작 BookPack이다. JSON은
`packages/test-book-factory`의 fixture registry와 장면 ID에서 다음 명령으로 생성한다.

```powershell
npm run content:sync
```

JSON을 직접 수정하지 않는다. factory를 바꾸고 동기화한 뒤 `npm run check:content`로 drift가 없는지
검증한다. `assets/`의 SVG는 프로젝트가 직접 만든 base와 detail fixture이며 SHA-256 장부로 검사한다. 이
픽스처는 `published` 콘텐츠가 아니며 실제 작품, 박물관, 문화 사실을 나타내지 않는다.
