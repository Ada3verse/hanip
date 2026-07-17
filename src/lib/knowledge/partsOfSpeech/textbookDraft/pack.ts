import type { AuthoringConcept, AuthoringKnowledgePack } from "@/lib/knowledge/authoring/types";
import { allTextbookSourceIds, fullUnitSourceIds, prerequisiteSourceIds, TEXTBOOK_DRAFT_REVIEWED_AT, textbookDraftProvenance } from "./sourceManifest";

type Level = 1 | 2 | 3 | 4 | 5;
interface ConceptSeed {
  id: string;
  title: string;
  aliases?: string[];
  easy: string;
  standard: string;
  precise: string;
  core: string;
  rule: string;
  prerequisite?: string[];
  related?: string[];
  compare?: string[];
  examples: string[];
  misconception: [string, string, string];
  difficulty?: Level;
  sources?: string[];
}

const seeds: ConceptSeed[] = [
  { id: "morpheme", title: "형태소", easy: "뜻을 가진 가장 작은 말의 단위이다.", standard: "더 나누면 본래 뜻을 잃는 최소 의미 단위이다.", precise: "실질적 또는 문법적 의미를 지니며 더 작은 의미 단위로 분석되지 않는 언어 단위이다.", core: "글자 수가 아니라 의미가 남는지를 기준으로 나눈다.", rule: "나눈 각 부분에 독립된 실질 의미나 문법 의미가 남는지 확인한다.", examples: ["학생들: 학생+들", "먹었다: 먹-+-었-+-다", "책이: 책+이", "예쁘다: 예쁘-+-다", "맨손: 맨-+손", "풋사과: 풋-+사과"], misconception: ["글자 하나를 형태소 하나로 센다.", "홀로 쓰이지 못하면 형태소가 아니라고 생각한다.", "조사와 어미의 문법적 의미를 무시한다."], sources: prerequisiteSourceIds },
  { id: "word", title: "단어", easy: "문장에서 홀로 쓰이거나 홀로 쓰이는 말에 붙는 말의 단위이다.", standard: "자립해서 쓰이거나 자립할 수 있는 말에 붙되 쉽게 분리되는 문법 단위이다.", precise: "문법 기능을 수행하는 최소 자립 단위로, 조사는 자립어에 결합하지만 독립된 단어로 인정된다.", core: "형태소와 단어는 크기와 자립성의 기준이 다르다.", rule: "홀로 쓰일 수 있는지, 또는 자립어에 붙어 쉽게 분리되는 조사인지 확인한다.", prerequisite: ["morpheme"], examples: ["학생", "학교에서: 학교+에서", "책을: 책+을", "매우", "읽었다", "그리고"], misconception: ["띄어쓰기 덩어리는 언제나 단어 하나라고 생각한다.", "조사는 홀로 쓰이지 못하므로 단어가 아니라고 생각한다.", "한 단어에는 형태소가 하나만 있다고 생각한다."], sources: prerequisiteSourceIds },
  { id: "parts-of-speech", title: "품사", easy: "단어를 성질이 비슷한 것끼리 나눈 갈래이다.", standard: "단어를 형태·기능·의미 같은 문법적 성질에 따라 나눈 갈래이다.", precise: "단어의 형태 변화 여부, 문장 안의 주된 기능, 의미 특성을 종합하여 설정한 문법 범주이다.", core: "품사는 뜻 하나만 보지 않고 형태·기능·의미를 함께 살핀다.", rule: "단어인지 확인한 뒤 형태, 기능, 의미의 순서로 근거를 모은다.", prerequisite: ["word"], related: ["parts-of-speech-criteria", "parts-of-speech-vs-sentence-component"], examples: ["사람: 명사", "그: 대명사", "둘: 수사", "달린다: 동사", "예쁘다: 형용사", "매우: 부사"], misconception: ["생김새가 다르면 품사도 다르다고 판단한다.", "뜻이 비슷하면 같은 품사라고 판단한다.", "품사와 문장 성분을 같은 개념으로 본다."], sources: fullUnitSourceIds },
  { id: "parts-of-speech-criteria", title: "품사 판별 기준", aliases: ["형태·기능·의미"], easy: "단어의 변하는 모습, 문장에서 하는 일, 나타내는 뜻을 살피는 기준이다.", standard: "형태는 활용 여부, 기능은 문장 속 관계와 일, 의미는 나타내는 대상·동작·상태 등을 보는 기준이다.", precise: "형태·기능·의미는 상호 보완하는 분류 기준이며 어느 한 기준, 특히 의미만으로 품사를 확정하지 않는다.", core: "형태는 글자 모양이 아니고 기능은 문장 성분 그 자체가 아니다.", rule: "활용 여부를 보고, 주된 기능을 확인한 뒤, 의미를 보조 근거로 사용한다.", prerequisite: ["parts-of-speech"], examples: ["먹다/먹고: 형태 변화", "학생이: 체언 기능", "새 가방: 명사 수식", "아주 빠르다: 용언 수식", "사람: 대상의 이름", "달리다: 동작"], misconception: ["형태를 글자 모양이나 길이로 이해한다.", "문장에서 꾸미면 모두 관형사라고 판단한다.", "의미 하나만으로 품사를 확정한다."], sources: fullUnitSourceIds },
  { id: "variable-word", title: "가변어", easy: "문장에서 쓰일 때 형태가 바뀌는 단어이다.", standard: "활용하여 어미가 바뀌는 용언과 서술격 조사 ‘이다’를 포함하는 갈래이다.", precise: "형태 기준에서 활용 여부에 따라 설정하며, 동사·형용사와 특수하게 활용하는 서술격 조사 ‘이다’가 해당한다.", core: "단어 자체가 다른 단어가 되는 것이 아니라 활용형이 달라진다.", rule: "기본형에 여러 어미를 붙였을 때 자연스럽게 형태가 달라지는지 본다.", prerequisite: ["parts-of-speech-criteria"], related: ["conjugation", "invariable-word"], examples: ["먹다-먹고", "웃다-웃었다", "예쁘다-예쁘니", "좋다-좋아서", "학생이다-학생이었다", "간다-가니"], misconception: ["글자 모양이 조금만 달라지면 모두 가변어라고 본다.", "시제 표현만 활용이라고 생각한다.", "조사는 모두 불변어이므로 ‘이다’도 활용하지 않는다고 생각한다."], sources: fullUnitSourceIds },
  { id: "invariable-word", title: "불변어", easy: "문장에서 쓰여도 형태가 바뀌지 않는 단어이다.", standard: "활용하지 않는 체언·수식언·독립언과 서술격 조사 이외의 관계언이다.", precise: "형태 기준상 어미 교체에 의한 활용이 나타나지 않는 단어군이다.", core: "조사와 결합하거나 위치가 달라지는 것은 그 단어의 활용이 아니다.", rule: "같은 단어에 어미를 바꾸어 붙일 수 있는지 확인한다.", prerequisite: ["parts-of-speech-criteria"], related: ["variable-word"], examples: ["학생", "나", "둘", "새", "매우", "아!"], misconception: ["조사가 붙으면 체언의 형태가 변했다고 본다.", "문장 속 위치가 달라지면 가변어라고 본다.", "모든 조사를 가변어라고 본다."], sources: fullUnitSourceIds },
  { id: "conjugation", title: "활용", easy: "용언이 문장에서 쓰일 때 끝부분이 달라지는 현상이다.", standard: "용언의 어간에 여러 어미가 결합하여 형태가 달라지는 현상이다.", precise: "문법 의미와 문장 관계를 나타내기 위해 용언의 어간과 어미 결합형이 바뀌는 형태론적 현상이다.", core: "활용형 여러 개는 서로 다른 단어가 아니라 한 기본형의 쓰임이다.", rule: "여러 형태에서 공통 부분과 바뀌는 끝부분을 찾아 기본형과 연결한다.", prerequisite: ["morpheme", "variable-word"], related: ["base-form", "predicate"], examples: ["먹다-먹고-먹었다", "가다-가니-가자", "웃다-웃어서-웃는다", "예쁘다-예쁘고-예쁘니", "좋다-좋아서-좋았다", "학생이다-학생이고-학생이었다"], misconception: ["활용형마다 다른 단어라고 생각한다.", "어간까지 언제나 그대로라고 생각한다.", "조사가 붙는 현상을 활용이라고 생각한다."], sources: fullUnitSourceIds },
  { id: "base-form", title: "기본형", easy: "사전에서 찾을 때 쓰는 용언의 기본 모습이다.", standard: "활용하는 말의 어간에 기본형 어미 ‘-다’를 붙인 형태이다.", precise: "여러 활용형을 대표해 사전 표제어로 삼는 형태로, 원칙적으로 어간과 ‘-다’로 구성된다.", core: "문장에 나온 활용형을 기본형으로 되돌려 품사를 판단한다.", rule: "활용형의 어미를 걷어 내고 어간에 ‘-다’를 붙여 사전형을 확인한다.", prerequisite: ["conjugation"], examples: ["먹었다→먹다", "달리는→달리다", "예쁜→예쁘다", "좋아서→좋다", "웃는다→웃다", "학생이었다→학생이다"], misconception: ["문장에 나온 형태 그대로만 사전에서 찾는다.", "모든 ‘다’로 끝난 표현을 기본형으로 본다.", "관형형을 관형사로 오해해 기본형을 찾지 않는다."], sources: fullUnitSourceIds },
  { id: "nominal", title: "체언", easy: "사람이나 사물 등의 이름 자리에 쓰이는 말의 무리이다.", standard: "문장에서 주로 주어·목적어 등의 자리에 놓이고 조사가 결합할 수 있는 명사·대명사·수사의 묶음이다.", precise: "활용하지 않으며 문장에서 명사적 기능을 수행하고 조사가 결합할 수 있는 기능 범주이다.", core: "체언은 문장 성분 이름이 아니라 세 품사를 묶은 기능상 갈래이다.", rule: "조사 결합 가능성과 명사적 자리 점유를 확인한 뒤 의미로 하위 품사를 가른다.", prerequisite: ["parts-of-speech"], related: ["noun", "pronoun", "numeral"], examples: ["학생이", "책을", "그가", "이것은", "둘이", "첫째가"], misconception: ["주어이면 언제나 명사라고 본다.", "조사가 생략되면 체언이 아니라고 본다.", "사람을 나타내는 체언은 모두 명사라고 본다."], sources: fullUnitSourceIds },
  { id: "noun", title: "명사", easy: "사람, 사물, 장소, 개념의 이름을 나타내는 말이다.", standard: "구체적이거나 추상적인 대상의 이름을 나타내는 체언이다.", precise: "대상의 명칭을 직접 나타내며 조사가 결합하고 명사적 문장 자리를 차지할 수 있는 체언이다.", core: "명사는 사람만이 아니라 사물·장소·추상 개념의 이름도 나타낸다.", rule: "다른 명사를 대신하는지보다 대상의 이름을 직접 나타내는지 본다.", prerequisite: ["nominal"], compare: ["pronoun"], examples: ["학생", "나무", "학교", "서울", "우정", "생각"], misconception: ["명사는 사람을 나타내는 말로만 한정한다.", "눈에 보이지 않는 개념은 명사가 아니라고 본다.", "문장에서 주어인 말은 모두 명사라고 본다."], sources: fullUnitSourceIds },
  { id: "pronoun", title: "대명사", easy: "사람이나 사물의 이름을 대신하는 말이다.", standard: "사람·사물·장소 등의 이름을 대신하여 가리키는 체언이다.", precise: "담화 맥락에서 이미 알려졌거나 지시·의문 대상인 명사 표현을 대신하는 체언이다.", core: "무엇을 가리키는지는 문맥에 따라 달라질 수 있다.", rule: "대상의 고유한 이름을 직접 말하는지, 맥락 속 대상을 대신 가리키는지 확인한다.", prerequisite: ["noun"], compare: ["noun"], examples: ["나는 학생이다", "너도 갈래", "그가 웃었다", "이것을 보아라", "누가 왔니", "거기는 학교다"], misconception: ["사람을 나타내면 모두 명사라고 본다.", "‘그’가 언제나 같은 대상을 가리킨다고 본다.", "관형사 ‘그’와 대명사 ‘그’를 문맥 없이 같은 품사로 본다."], sources: fullUnitSourceIds },
  { id: "numeral", title: "수사", easy: "수량이나 순서를 나타내면서 체언 자리에 쓰이는 말이다.", standard: "수량이나 순서를 나타내고 조사와 결합하거나 체언의 자리를 차지하는 체언이다.", precise: "양수사와 서수사로 나뉘며 명사적 기능을 수행하고 조사 결합이 가능한 체언이다.", core: "수량을 나타낸다는 의미만으로 수사라고 확정하지 않는다.", rule: "뒤 명사를 직접 꾸미지 않고 체언 자리를 차지하거나 조사와 결합하는지 확인한다.", prerequisite: ["nominal"], compare: ["numeral-determiner"], examples: ["학생이 둘 왔다", "사과 하나를 먹었다", "둘이 출발했다", "내가 첫째다", "셋부터 시작한다", "하나만 주세요"], misconception: ["수량이나 순서를 나타내면 모두 수사라고 본다.", "‘하나/한’, ‘둘/두’의 모양만 외워 판단한다.", "조사가 생략된 수사를 수 관형사로 본다."], sources: fullUnitSourceIds },
  { id: "predicate", title: "용언", easy: "동작이나 상태를 나타내고 형태가 변하는 말의 무리이다.", standard: "문장에서 주로 서술하는 기능을 하고 활용하는 동사와 형용사의 묶음이다.", precise: "어간과 어미로 활용하며 문장의 서술 기능을 주로 담당하는 기능 범주이다.", core: "문장에 관형형으로 나타나도 기본형이 동사·형용사이면 용언이다.", rule: "기본형을 찾고 활용 여부와 동작·상태 의미를 함께 확인한다.", prerequisite: ["conjugation", "parts-of-speech"], related: ["verb", "adjective"], examples: ["학생이 달린다", "책을 읽었다", "꽃이 예쁘다", "물이 차갑다", "웃는 아이", "예쁜 꽃"], misconception: ["서술어인 말은 모두 용언이라고 본다.", "명사를 꾸미는 활용형을 관형사라고 본다.", "형태가 변하는 사실보다 뜻만으로 판단한다."], sources: fullUnitSourceIds },
  { id: "verb", title: "동사", easy: "사람이나 사물의 움직임을 나타내는 말이다.", standard: "동작이나 작용을 나타내며 활용하는 용언이다.", precise: "주체의 동작·작용을 서술하고 시제·높임·종결 등에 따라 활용하는 용언이다.", core: "명령형·청유형 결합은 유용한 보조 기준이지만 문맥과 의미도 함께 본다.", rule: "기본형의 의미가 동작·작용인지 보고 자연스러운 명령·청유 표현도 보조로 확인한다.", prerequisite: ["predicate"], compare: ["adjective"], examples: ["달리다", "먹다", "읽다", "웃다", "공부하다", "피어나다"], misconception: ["현재 움직임이 눈에 보여야만 동사라고 본다.", "‘-하다’로 끝나면 모두 동사라고 본다.", "명령형 결합 하나만으로 무조건 동사라고 확정한다."], sources: fullUnitSourceIds },
  { id: "adjective", title: "형용사", easy: "사람이나 사물의 상태나 성질을 나타내는 말이다.", standard: "상태나 성질을 나타내며 활용하는 용언이다.", precise: "대상의 상태·성질을 서술하고 활용하지만 일반적으로 동사와 명령형·청유형 제약이 다른 용언이다.", core: "형용사의 관형형은 명사를 꾸미지만 품사는 여전히 형용사이다.", rule: "기본형을 찾고 상태·성질 의미와 활용 양상을 확인한다.", prerequisite: ["predicate"], compare: ["verb", "determiner"], examples: ["예쁘다", "차갑다", "건강하다", "행복하다", "넓다", "조용하다"], misconception: ["명사를 꾸미면 모두 관형사라고 본다.", "‘-하다’로 끝나면 모두 동사라고 본다.", "‘건강하자’처럼 모든 형용사가 청유형으로 자유롭게 쓰인다고 본다."], sources: fullUnitSourceIds },
  { id: "modifier", title: "수식언", easy: "다른 말의 뜻을 더 자세하게 꾸며 주는 말의 무리이다.", standard: "관형사와 부사를 기능에 따라 묶은 불변어 갈래이다.", precise: "문장에서 다른 성분에 의존하여 의미를 한정·수식하는 관형사와 부사의 기능 범주이다.", core: "꾸밈을 받는 대상이 명사인지, 용언·다른 수식언·문장인지가 중요하다.", rule: "수식 대상과 활용 여부를 함께 확인한다.", prerequisite: ["parts-of-speech"], related: ["determiner", "adverb"], examples: ["새 가방", "헌 책", "매우 빠르다", "아주 새롭다", "바로 앞", "과연 그럴까"], misconception: ["다른 말을 꾸미면 모두 관형사라고 본다.", "명사를 꾸미는 용언의 관형형을 수식언으로 본다.", "부사는 용언만 꾸밀 수 있다고 본다."], sources: fullUnitSourceIds },
  { id: "determiner", title: "관형사", easy: "형태가 변하지 않으면서 뒤의 명사를 꾸미는 말이다.", standard: "체언, 주로 명사 앞에서 그 뜻을 꾸며 주고 활용하지 않는 수식언이다.", precise: "조사와 결합하거나 활용하지 않으며 후행 체언을 직접 수식하는 품사이다.", core: "명사를 꾸민다는 기능과 활용하지 않는다는 형태를 함께 확인한다.", rule: "바로 뒤 체언을 직접 꾸미는지와 기본형으로 활용되는 말인지 확인한다.", prerequisite: ["modifier"], compare: ["adjective", "numeral"], examples: ["새 가방", "헌 책", "이 사람", "그 문제", "두 학생", "첫 번째 차례"], misconception: ["명사를 꾸미는 모든 말을 관형사라고 본다.", "형용사의 관형형을 관형사라고 본다.", "수 관형사를 수사 뒤에 오는 말이라고 생각한다."], sources: fullUnitSourceIds },
  { id: "adverb", title: "부사", easy: "주로 동사나 형용사의 뜻을 꾸미는 말이다.", standard: "주로 용언을 꾸미며 관형사·다른 부사·문장 전체도 꾸밀 수 있는 수식언이다.", precise: "활용하지 않고 용언이나 수식언 또는 문장 전체의 의미를 한정하는 품사이다.", core: "부사와 문장 성분인 부사어는 같은 개념이 아니다.", rule: "무엇을 꾸미는지 확인하고 그 말 자체가 활용하는지 본다.", prerequisite: ["modifier"], compare: ["adverbial-component"], examples: ["빨리 달린다", "매우 예쁘다", "아주 새 가방", "훨씬 더 빠르다", "과연 맞을까", "바로 출발했다"], misconception: ["부사어이면 언제나 품사도 부사라고 본다.", "부사는 동사만 꾸민다고 본다.", "‘빠르게’처럼 활용형이 부사어로 쓰이면 부사라고 본다."], sources: fullUnitSourceIds },
  { id: "relational", title: "관계언", easy: "앞말과 다른 말의 관계를 나타내는 말의 무리이다.", standard: "체언 뒤에 붙어 문법 관계나 특별한 뜻을 나타내는 조사로 이루어진 갈래이다.", precise: "자립어에 결합하여 격 관계 또는 보조·접속 의미를 표시하는 조사 품사의 기능 범주이다.", core: "관계언은 조사 하나의 품사 갈래이며 앞말과 쉽게 분리된다.", rule: "체언 뒤에 붙어 다른 말과의 관계나 추가 의미를 표시하는지 본다.", prerequisite: ["word", "parts-of-speech"], related: ["particle"], examples: ["학생이", "책을", "학교에서", "친구와", "나도", "물만"], misconception: ["앞말에 붙여 쓰므로 단어가 아니라고 본다.", "조사가 붙으면 앞말의 일부라고 본다.", "모든 조사가 문장 성분 하나만 표시한다고 본다."], sources: fullUnitSourceIds },
  { id: "particle", title: "조사", easy: "체언 뒤에 붙어 다른 말과의 관계나 특별한 뜻을 나타내는 말이다.", standard: "체언 등에 결합하여 문법 관계를 표시하거나 특별한 의미를 더하는 관계언이다.", precise: "격조사·접속조사·보조사 등으로 나뉘며 자립어에 결합하지만 단어로 인정되는 관계언이다.", core: "조사와 어미는 모두 의존 형태소일 수 있지만 결합 대상과 기능이 다르다.", rule: "체언 뒤에 붙는지, 용언 어간 뒤에 붙는 어미인지 구분하고 의미 기능을 확인한다.", prerequisite: ["relational", "morpheme"], compare: ["ending"], examples: ["학생이 왔다", "책을 읽었다", "학교에서 만났다", "친구와 갔다", "나도 안다", "물만 마셨다"], misconception: ["붙여 쓰는 것은 모두 접사나 어미라고 본다.", "조사는 홀로 쓰이지 못하므로 단어가 아니라고 본다.", "‘이다’를 다른 조사와 똑같이 활용하지 않는 불변어로 본다."], sources: fullUnitSourceIds },
  { id: "independent", title: "독립언", easy: "문장에서 다른 말과 직접 관계없이 비교적 독립적으로 쓰이는 말의 무리이다.", standard: "문장 안의 다른 말과 문법적 관계를 맺지 않고 독립적으로 쓰이는 감탄사의 갈래이다.", precise: "통사적 결합 관계에서 벗어나 화자의 느낌·부름·응답 등을 독립적으로 나타내는 기능 범주이다.", core: "문장에서 떨어져 보인다는 사실만으로 독립언이 되는 것은 아니다.", rule: "다른 말과 직접 문법 관계를 맺는지와 느낌·부름·응답 기능을 확인한다.", prerequisite: ["parts-of-speech"], related: ["interjection"], examples: ["아, 깜짝이야", "어머, 반갑구나", "네, 알겠습니다", "여보세요, 들리나요", "글쎄, 모르겠어", "아니, 그게 아니야"], misconception: ["쉼표 앞의 말은 모두 독립언이라고 본다.", "이름을 부르는 모든 표현을 감탄사라고 본다.", "활용한 용언이 독립적으로 쓰이면 감탄사라고 본다."], sources: fullUnitSourceIds },
  { id: "interjection", title: "감탄사", easy: "느낌, 부름, 대답을 독립적으로 나타내는 말이다.", standard: "화자의 느낌·의지·부름·응답을 나타내며 다른 말과 문법 관계를 맺지 않는 독립언이다.", precise: "담화 상황에 의존해 정서와 의사소통 기능을 독립적으로 수행하고 활용하지 않는 품사이다.", core: "같은 감탄사도 상황과 말투에 따라 뜻과 느낌이 달라질 수 있다.", rule: "문맥에서 느낌·부름·응답을 독립적으로 나타내는지 확인한다.", prerequisite: ["independent"], examples: ["아! 뜨겁다", "어머, 웬일이니", "네, 맞아요", "아니, 괜찮아", "여보세요", "글쎄, 잘 모르겠어"], misconception: ["감정이 담긴 문장 전체를 감탄사라고 본다.", "호격 조사와 결합한 이름을 감탄사라고 본다.", "유행하는 감탄 표현이면 모두 표준적인 감탄사라고 단정한다."], sources: fullUnitSourceIds },
  { id: "numeral-determiner", title: "수사와 수 관형사 구분", aliases: ["수사·수 관형사"], easy: "수 표현이 혼자 체언 자리에 쓰이는지, 뒤 명사를 꾸미는지로 구분한다.", standard: "수사는 체언 자리를 차지하고 조사와 결합할 수 있으며, 수 관형사는 뒤 명사를 직접 꾸미고 조사와 결합하지 않는다.", precise: "수량·순서 의미는 공통이지만 수사의 명사적 기능과 수 관형사의 관형 수식 기능을 문장 구조에서 판별한다.", core: "‘하나/한’, ‘둘/두’의 모양보다 문장에서 하는 일을 기준으로 한다.", rule: "뒤 명사 직접 수식, 조사 결합 가능성, 체언 자리 점유를 차례로 확인한다.", prerequisite: ["numeral", "determiner"], compare: ["numeral", "determiner"], examples: ["학생이 둘 왔다", "두 학생이 왔다", "사과 하나를 먹었다", "한 사람을 만났다", "내가 첫째다", "첫 번째 학생이다"], misconception: ["수량이나 순서를 나타내면 모두 수사라고 본다.", "형태 ‘하나/한’, ‘둘/두’만 외워 판별한다.", "수 관형사를 수사 뒤에 오는 말이라고 생각한다."], sources: fullUnitSourceIds },
  { id: "parts-of-speech-vs-sentence-component", title: "품사와 문장 성분의 차이", aliases: ["품사·문장 성분 비교"], easy: "품사는 단어의 종류이고 문장 성분은 문장에서 맡는 역할이다.", standard: "품사는 단어 자체의 문법적 갈래이며 문장 성분은 특정 문장 안에서 단어 또는 구가 맡는 기능이다.", precise: "형태론적 범주인 품사와 통사론적 기능인 문장 성분은 분석 층위가 다르며 일대일 대응하지 않는다.", core: "같은 품사의 단어도 문장에 따라 다른 문장 성분이 될 수 있다.", rule: "단어의 종류를 묻는지, 해당 문장에서 맡은 역할을 묻는지 먼저 구분한다.", prerequisite: ["parts-of-speech", "nominal", "predicate"], examples: ["학생이 웃는다: 학생=명사·주어", "학생을 만났다: 학생=명사·목적어", "꽃이 예쁘다: 예쁘다=형용사·서술어", "예쁜 꽃: 예쁘다=형용사·관형어", "빨리 달린다: 빨리=부사·부사어", "학교에 간다: 학교=명사·부사어의 중심"], misconception: ["주어이면 품사가 명사라고만 답한다.", "관형어이면 품사가 관형사라고 본다.", "부사어이면 품사가 부사라고 본다."], sources: fullUnitSourceIds },
  { id: "parts-of-speech-procedure", title: "품사 판별 절차", easy: "단어를 확인하고 형태, 기능, 의미를 차례로 살피는 순서이다.", standard: "문맥 속 단어 경계와 기본형을 확인한 뒤 활용 여부, 주된 기능, 의미를 종합하는 절차이다.", precise: "형태론적 단위 확정, 활용 분석, 통사 기능 관찰, 의미 범주 대조, 반례 검증을 거쳐 품사를 판정한다.", core: "하나의 단서로 단정하지 않고 문맥과 반례로 확인한다.", rule: "단어 확인→기본형·활용→문장 기능→의미→헷갈리는 품사 비교의 순서로 판단한다.", prerequisite: ["parts-of-speech-criteria"], related: ["parts-of-speech-comparison"], examples: ["새 가방의 ‘새’", "예쁜 가방의 ‘예쁜’", "둘이 왔다의 ‘둘’", "두 학생의 ‘두’", "빨리 달린다의 ‘빨리’", "학생이의 ‘이’"], misconception: ["사전 뜻만 보고 품사를 정한다.", "표면 형태만 외워 품사를 정한다.", "문장 성분 하나만 보고 품사를 정한다."], sources: allTextbookSourceIds },
  { id: "parts-of-speech-comparison", title: "품사 비교", easy: "헷갈리는 두 품사의 같은 점과 다른 점을 기준으로 구분하는 방법이다.", standard: "공통점, 차이점, 판별 기준, 예문 적용 순으로 두 품사를 비교한다.", precise: "의미적 공통성보다 형태·기능의 대립을 우선해 최소 대조 문맥과 반례로 범주 경계를 확인한다.", core: "비교표를 외우기보다 같은 문장 틀에서 기능 차이를 관찰한다.", rule: "공통점을 확인한 뒤 기능 차이를 찾고 최소 대조 예문에 적용한다.", prerequisite: ["parts-of-speech-procedure"], examples: ["명사↔대명사", "수사↔수 관형사", "동사↔형용사", "관형사↔형용사 관형형", "부사↔부사어", "조사↔어미"], misconception: ["공통 의미가 있으면 같은 품사라고 본다.", "표 하나를 외우면 모든 문맥을 판별할 수 있다고 본다.", "차이점을 하나만 찾아 예외 없이 적용한다."], sources: fullUnitSourceIds },
];

const level = (value: number): Level => Math.min(5, Math.max(1, value)) as Level;
const sourceIds = (seed: ConceptSeed) => seed.sources ?? fullUnitSourceIds;

function makeConcept(seed: ConceptSeed): AuthoringConcept {
  const provenanceIds = sourceIds(seed);
  const examples = seed.examples.slice(0, 6);
  const comparisons = seed.compare ?? seed.related ?? [];
  return {
    conceptId: seed.id,
    title: seed.title,
    aliases: seed.aliases ?? [seed.title],
    summary: `${seed.title}의 개념, 판별 근거, 오개념 교정과 적용 절차를 교사용 자료에 근거해 통합한 초안이다.`,
    definition: { easy: seed.easy, standard: seed.standard, precise: seed.precise },
    coreUnderstanding: [seed.core],
    learningObjectives: [`${seed.title}의 핵심 성질을 설명한다.`, `새 문맥에서 ${seed.title}를 판별하고 근거를 말한다.`],
    scope: "중학교 국어 문법의 품사 단원과 직접 관련된 내용",
    prerequisites: seed.prerequisite ?? [],
    nextConcepts: [],
    relatedConcepts: seed.related ?? [],
    discriminationRules: [seed.rule],
    comparisonTargets: comparisons,
    completionCriteria: [`대표 예에서 ${seed.title}를 판별한다.`, seed.rule, "새 예에 같은 기준을 적용하고 이유를 짧게 설명한다."],
    difficulty: seed.difficulty ?? 2,
    tags: ["품사", "교사용 교과서 통합", seed.title],
    explanations: [
      { id: `${seed.id}-explain-definition`, strategy: "definition", content: seed.standard, difficulty: 2, provenanceIds, status: "draft" },
      { id: `${seed.id}-explain-step`, strategy: "step_by_step", content: `먼저 ${seed.core} 다음으로 ${seed.rule}`, difficulty: 3, provenanceIds, status: "draft" },
      { id: `${seed.id}-explain-feedback`, strategy: "teacher_feedback", content: `학생이 의미만 말하면 그 관찰을 인정한 뒤 ${seed.rule}`, difficulty: 2, provenanceIds, status: "draft" },
    ],
    examples: examples.map((sentence, index) => ({ exampleId: `${seed.id}-example-${index + 1}`, sentence, focus: seed.title, analysis: seed.rule, explanation: `${seed.core} 이 예에서는 ${seed.rule}`, difficulty: level(index < 2 ? 1 : index < 4 ? 2 : 3), strategyTags: ["관찰", index % 2 ? "비교" : "적용"], allowedLevels: [1, 2, 3], sourceStatus: "draft", isOriginal: true, provenanceIds })),
    counterexamples: [
      { counterexampleId: `${seed.id}-counter-1`, sentence: `${examples[0]}만 보고 뜻만으로 품사를 확정한다.`, expectedJudgment: "판별 근거가 부족함", reason: "형태와 기능을 함께 확인해야 한다.", confusionTarget: comparisons[0] ?? "의미 중심 판단", provenanceIds },
      { counterexampleId: `${seed.id}-counter-2`, sentence: `${examples[1]}의 문장 성분을 품사 이름으로 답한다.`, expectedJudgment: "분석 층위가 다름", reason: "품사와 문장 성분을 구분해야 한다.", confusionTarget: "문장 성분", provenanceIds },
    ],
    misconceptions: seed.misconception.map((description, index) => ({ misconceptionId: `${seed.id}-misconception-${index + 1}`, description, likelyResponses: [description.replace(/다\.$/, "요.")], correctionStrategy: index === 0 ? `학생이 본 단서를 인정하고 ${seed.rule}` : "공통점 뒤에 기능 차이를 제시하고 최소 대조 예로 확인한다.", correctiveExamples: [examples[index], examples[(index + 1) % examples.length]], prerequisiteHint: seed.prerequisite?.[0] ?? "단어", severity: level(index + 1) as 1 | 2 | 3, provenanceIds })),
    checks: [0, 1, 2, 3, 4].map((index) => ({ checkId: `${seed.id}-check-${index + 1}`, type: index < 2 ? "choice" : index < 4 ? "application" : "explanation", prompt: index < 2 ? `${examples[index]}에서 ${seed.title}의 판단에 가장 필요한 근거는 무엇일까?` : `${examples[index + 1]}를 ${seed.title}의 기준으로 판단하고 근거를 하나 말해 보자.`, options: index < 2 ? ["문장에서 하는 일", "글자 수", "소리의 길이"] : [], correctAnswer: index < 2 ? "문장에서 하는 일" : seed.rule, acceptedPatterns: index < 2 ? ["문장에서 하는 일|기능"] : [], explanation: seed.rule, difficulty: level(index + 1), evidenceRequired: true, provenanceIds })),
    workedExamples: [0, 2].map((index, workedIndex) => ({ workedExampleId: `${seed.id}-worked-${workedIndex + 1}`, question: `${examples[index]}를 살펴 ${seed.title}인지 판단해 보자.`, steps: ["문맥에서 분석할 단어를 정확히 찾는다.", "형태가 활용하는지 확인한다.", "문장에서 하는 기능을 확인한다.", "의미를 보조 근거로 확인한다.", "헷갈리는 품사와 비교해 이유를 말한다."], answer: seed.rule, explanation: seed.core, transferableRule: seed.rule, provenanceIds })),
    provenanceIds,
    decisionProcedure: ["분석할 단어의 경계를 확인한다.", "활용형이면 기본형을 찾는다.", "형태 변화 여부를 확인한다.", "문장에서 하는 기능과 관계를 확인한다.", "의미를 보조 근거로 확인한다.", "헷갈리는 품사와 반례로 최종 확인한다."],
    faq: [
      { question: `${seed.title}는 뜻만 보고 판단해도 되나요?`, answer: `아니요. ${seed.rule}`, provenanceIds },
      { question: `문장 성분과 ${seed.title}는 같은 개념인가요?`, answer: "품사는 단어의 종류이고 문장 성분은 그 문장에서 맡는 역할이므로 구분해야 한다.", provenanceIds },
    ],
    teacherStrategies: [
      { purpose: "진단", strategy: `정의를 먼저 말하지 말고 ${examples[0]}와 ${examples[1]}를 관찰하게 한다.`, caution: "한 번에 질문 하나만 제시한다.", provenanceIds },
      { purpose: "오개념 교정", strategy: `학생이 본 단서를 먼저 인정한 뒤 ${seed.rule}`, caution: "틀렸다고 낙인찍거나 긴 정의를 나열하지 않는다.", provenanceIds },
      { purpose: "전이", strategy: `대표 예를 판별한 뒤 ${examples[5]}에 같은 기준을 적용하게 한다.`, caution: "선택지 정답만으로 완료 처리하지 않고 이유를 확인한다.", provenanceIds },
    ],
    studentQuestions: [`${seed.title}가 뭐예요?`, `${seed.title}는 어떻게 구분해요?`, `${examples[0]}에서는 왜 그렇게 판단해요?`],
    evaluationPoints: [
      { criterion: "개념 이해", evidence: seed.core, commonError: seed.misconception[0], provenanceIds },
      { criterion: "판별 적용", evidence: seed.rule, commonError: seed.misconception[1], provenanceIds },
      { criterion: "근거 설명", evidence: "새 예문에서도 형태·기능·의미 중 적절한 근거를 말한다.", commonError: seed.misconception[2], provenanceIds },
    ],
  };
}

export const partsOfSpeechTextbookDraftPack: AuthoringKnowledgePack = {
  packId: "hanip-parts-of-speech-textbook-draft",
  title: "한잎 품사 Knowledge Pack Draft",
  subject: "국어",
  domain: "문법",
  curriculumYear: "2022",
  schoolLevel: "middle",
  gradeRange: [1, 2, 3],
  semester: "공통",
  version: "0.9.0-draft",
  schemaVersion: 2,
  status: "draft",
  createdAt: TEXTBOOK_DRAFT_REVIEWED_AT,
  updatedAt: TEXTBOOK_DRAFT_REVIEWED_AT,
  note: "사용자 제공 교사용 교과서 8종에서 품사 관련 근거만 검토·통합한 검토용 초안이다. Release 또는 Publish 대상이 아니다. 예문과 설명은 저작권 위험을 줄이기 위해 문법 사실을 바탕으로 한잎 문장으로 재구성했다.",
  provenance: textbookDraftProvenance,
  concepts: seeds.map(makeConcept),
};
