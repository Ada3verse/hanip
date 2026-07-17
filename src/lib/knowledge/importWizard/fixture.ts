import type { SourceFileInput } from "@/lib/knowledge/ingestion/types";

const body = `형태소
형태소는 뜻을 가진 가장 작은 말의 단위이다.

단어
단어는 문장에서 홀로 쓰일 수 있는 말의 단위이다.
명사와 대명사
명사는 이름을 직접 나타내고 대명사는 명사를 대신한다.
오개념: 둘 다 사람을 나타내면 같은 품사라고 생각한다.

조사 예문
학생이 책을 읽는다. 조사 '이'는 앞말과 다른 말의 관계를 나타낸다.
확인 문제
'그'가 대명사인 이유는 무엇일까?

Worked Example
1. '민수'와 '그'를 비교한다. 2. 이름을 직접 나타내는지 대신하는지 확인한다.

품사는 글자 모양만으로 나눈 갈래이다.`;
export function createImportFixtureFile(): SourceFileInput { return { fileName: "hanip-parts-of-speech.fixture.pdf", mimeType: "application/pdf", bytes: new TextEncoder().encode(`%PDF-1.7\n${body}\n%%EOF`), claimedPageCount: 3 }; }
