export interface EncyclopediaEntry {
  id: string;
  name: string;
  distillery: string;
  region: string;
  country: string;
  category: string;
  age: number | null;
  abv: number;
  nose: string;
  palate: string;
  finish: string;
  description: string;
  priceRange: string;
  difficulty: "입문" | "중급" | "상급";
  tags: string[];
}

export const ENCYCLOPEDIA_WHISKEYS: EncyclopediaEntry[] = [
  {
    id: "glenlivet-12", name: "The Glenlivet 12", distillery: "The Glenlivet",
    region: "Speyside", country: "Scotland", category: "스카치", age: 12, abv: 40,
    nose: "꽃향, 바닐라, 열대과일", palate: "부드러운 오크, 파인애플, 복숭아", finish: "가볍고 달콤한 여운",
    description: "스피사이드를 대표하는 입문용 싱글몰트. 깔끔하고 달콤한 풍미로 위스키 입문자에게 추천.",
    priceRange: "₩40,000–55,000", difficulty: "입문", tags: ["싱글몰트", "Speyside", "달콤함", "입문추천"],
  },
  {
    id: "glenfiddich-12", name: "Glenfiddich 12", distillery: "Glenfiddich",
    region: "Speyside", country: "Scotland", category: "스카치", age: 12, abv: 40,
    nose: "신선한 배, 크리미한 토피", palate: "배, 오크, 은은한 스파이스", finish: "부드럽고 짧은 여운",
    description: "세계에서 가장 많이 팔리는 싱글몰트. 접근성이 좋고 균형 잡힌 맛.",
    priceRange: "₩45,000–60,000", difficulty: "입문", tags: ["싱글몰트", "Speyside", "과일향", "입문추천"],
  },
  {
    id: "macallan-12", name: "The Macallan 12 Sherry Oak", distillery: "The Macallan",
    region: "Speyside", country: "Scotland", category: "스카치", age: 12, abv: 40,
    nose: "건포도, 무화과, 진저", palate: "풍부한 셰리, 초콜릿, 오렌지 껍질", finish: "길고 따뜻한 스파이시 여운",
    description: "셰리 오크 캐스크의 정수. 달콤하고 과일향 풍부한 스피사이드 대표작.",
    priceRange: "₩90,000–120,000", difficulty: "입문", tags: ["싱글몰트", "Speyside", "셰리캐스크", "초콜릿"],
  },
  {
    id: "lagavulin-16", name: "Lagavulin 16", distillery: "Lagavulin",
    region: "Islay", country: "Scotland", category: "스카치", age: 16, abv: 43,
    nose: "강렬한 피트, 바다소금, 스모키", palate: "두꺼운 피트, 스위트몰트, 아이오딘", finish: "매우 길고 드라이한 스모키 여운",
    description: "아일라 피트 위스키의 교과서. 강렬하고 복잡한 스모키 풍미의 정점.",
    priceRange: "₩100,000–140,000", difficulty: "상급", tags: ["싱글몰트", "Islay", "피트", "스모키", "강렬함"],
  },
  {
    id: "laphroaig-10", name: "Laphroaig 10", distillery: "Laphroaig",
    region: "Islay", country: "Scotland", category: "스카치", age: 10, abv: 40,
    nose: "병원 소독약, 해초, 피트", palate: "스모키, 달콤함, 소금기", finish: "길고 드라이, 약품향 여운",
    description: "좋아하거나 싫어하거나. 아이오딘과 피트의 극단적 조합으로 독보적 개성.",
    priceRange: "₩55,000–75,000", difficulty: "상급", tags: ["싱글몰트", "Islay", "피트", "아이오딘", "개성강함"],
  },
  {
    id: "highland-park-12", name: "Highland Park 12", distillery: "Highland Park",
    region: "Highland (Orkney)", country: "Scotland", category: "스카치", age: 12, abv: 40,
    nose: "꿀, 헤더, 은은한 피트", palate: "과일, 스파이스, 부드러운 스모키", finish: "균형 잡힌 달콤함과 피트 여운",
    description: "피트와 달콤함의 완벽한 균형. 오크니 섬의 바이킹 정신을 담은 위스키.",
    priceRange: "₩55,000–70,000", difficulty: "중급", tags: ["싱글몰트", "Highland", "밸런스", "꿀향"],
  },
  {
    id: "oban-14", name: "Oban 14", distillery: "Oban",
    region: "West Highland", country: "Scotland", category: "스카치", age: 14, abv: 43,
    nose: "바다소금, 꿀, 은은한 피트", palate: "드라이한 오크, 견과류, 과일향", finish: "따뜻하고 긴 스파이시 여운",
    description: "하이랜드와 아일라의 중간 지점. 해양성과 달콤함이 조화로운 명작.",
    priceRange: "₩80,000–105,000", difficulty: "중급", tags: ["싱글몰트", "Highland", "해양성", "균형"],
  },
  {
    id: "glenmorangie-10", name: "Glenmorangie The Original 10", distillery: "Glenmorangie",
    region: "Highland", country: "Scotland", category: "스카치", age: 10, abv: 40,
    nose: "복숭아, 오렌지, 레몬그라스", palate: "바닐라, 크림, 복숭아", finish: "길고 부드러운 달콤한 여운",
    description: "높은 증류기에서 나오는 섬세한 풍미. 화사한 꽃향과 과일향의 하이랜드 입문작.",
    priceRange: "₩55,000–70,000", difficulty: "입문", tags: ["싱글몰트", "Highland", "꽃향", "과일향"],
  },
  {
    id: "jameson", name: "Jameson Original", distillery: "Midleton",
    region: "County Cork", country: "Ireland", category: "아이리쉬", age: null, abv: 40,
    nose: "가벼운 스파이스, 맥아, 나무향", palate: "부드러운 그레인, 바닐라, 견과류", finish: "깔끔하고 짧은 여운",
    description: "세계에서 가장 많이 팔리는 아이리쉬 위스키. 트리플 디스틸드의 부드러움.",
    priceRange: "₩35,000–50,000", difficulty: "입문", tags: ["블렌디드", "아이리쉬", "부드러움", "입문추천"],
  },
  {
    id: "redbreast-12", name: "Redbreast 12", distillery: "Midleton",
    region: "County Cork", country: "Ireland", category: "아이리쉬", age: 12, abv: 40,
    nose: "셰리, 건포도, 향신료", palate: "풍부한 과일, 스파이스, 초콜릿", finish: "길고 따뜻한 스파이시 여운",
    description: "아이리쉬 팟 스틸의 정수. 풍부하고 복잡한 풍미로 아이리쉬 프리미엄 대표작.",
    priceRange: "₩65,000–85,000", difficulty: "중급", tags: ["팟스틸", "아이리쉬", "셰리캐스크", "프리미엄"],
  },
  {
    id: "green-spot", name: "Green Spot", distillery: "Midleton",
    region: "County Cork", country: "Ireland", category: "아이리쉬", age: null, abv: 40,
    nose: "신선한 사과, 보리, 스파이스", palate: "크리미, 사과, 허브", finish: "부드럽고 스파이시한 여운",
    description: "전통 팟 스틸 스타일의 희귀 아이리쉬. 과거 와인 상인들이 비축했던 스타일 재현.",
    priceRange: "₩60,000–80,000", difficulty: "중급", tags: ["팟스틸", "아이리쉬", "희귀", "전통"],
  },
  {
    id: "bushmills-original", name: "Bushmills Original", distillery: "Old Bushmills",
    region: "County Antrim", country: "Northern Ireland", category: "아이리쉬", age: null, abv: 40,
    nose: "꿀, 사과, 가벼운 바닐라", palate: "달콤한 과일, 몰트, 가벼운 스파이스", finish: "부드럽고 짧은 여운",
    description: "세계에서 가장 오래된 면허 증류소. 가볍고 달콤한 블렌디드 입문작.",
    priceRange: "₩30,000–45,000", difficulty: "입문", tags: ["블렌디드", "아이리쉬", "달콤함", "역사"],
  },
  {
    id: "buffalo-trace", name: "Buffalo Trace", distillery: "Buffalo Trace",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 45,
    nose: "바닐라, 민트, 갈색설탕", palate: "카라멜, 바닐라, 오크", finish: "오래 지속되는 달콤한 여운",
    description: "가격 대비 품질이 뛰어난 켄터키 버번의 기준점. 부드럽고 균형 잡힌 클래식.",
    priceRange: "₩40,000–55,000", difficulty: "입문", tags: ["버번", "Kentucky", "바닐라", "입문추천"],
  },
  {
    id: "makers-mark", name: "Maker's Mark", distillery: "Maker's Mark",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 45,
    nose: "달콤한 맥아, 바닐라, 꿀", palate: "카라멜, 버터, 부드러운 스파이스", finish: "달콤하고 따뜻한 여운",
    description: "밀 매시빌로 만든 부드러운 버번. 빨간 왁스 인장으로 유명한 아이콘.",
    priceRange: "₩45,000–60,000", difficulty: "입문", tags: ["버번", "Kentucky", "부드러움", "밀매시빌"],
  },
  {
    id: "woodford-reserve", name: "Woodford Reserve", distillery: "Woodford Reserve",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 43.2,
    nose: "초콜릿, 건과일, 오렌지", palate: "풍부한 과일, 스파이스, 오크", finish: "길고 따뜻한 스파이시 여운",
    description: "트리플 디스틸드 켄터키 버번. 복잡하고 세련된 풍미로 프리미엄 버번 대표작.",
    priceRange: "₩55,000–75,000", difficulty: "중급", tags: ["버번", "Kentucky", "트리플디스틸드", "프리미엄"],
  },
  {
    id: "wild-turkey-101", name: "Wild Turkey 101", distillery: "Wild Turkey",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 50.5,
    nose: "카라멜, 바닐라, 오크", palate: "진한 캐러멜, 스파이스, 오렌지", finish: "강렬하고 긴 스파이시 여운",
    description: "101 프루프의 강렬한 버번. 오크통 풍미가 진하고 개성 넘치는 하이프루프 스탠다드.",
    priceRange: "₩40,000–55,000", difficulty: "중급", tags: ["버번", "Kentucky", "하이프루프", "강렬함"],
  },
  {
    id: "rittenhouse-rye", name: "Rittenhouse Rye", distillery: "Heaven Hill",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 50,
    nose: "호밀빵, 민트, 스파이스", palate: "진한 스파이스, 후추, 달콤함", finish: "드라이하고 긴 스파이시 여운",
    description: "가성비 최고의 라이 위스키. 칵테일 베이스로도, 스트레이트로도 탁월.",
    priceRange: "₩35,000–50,000", difficulty: "중급", tags: ["라이", "Pennsylvania", "스파이시", "칵테일"],
  },
  {
    id: "bulleit-bourbon", name: "Bulleit Bourbon", distillery: "Four Roses",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 45,
    nose: "오크, 메이플시럽, 향신료", palate: "매운 호밀향, 바닐라, 오렌지껍질", finish: "드라이하고 길게 지속되는 스파이시",
    description: "높은 라이 함량으로 스파이시한 개성. 심플한 병 디자인과 탄탄한 맛.",
    priceRange: "₩40,000–55,000", difficulty: "입문", tags: ["버번", "Kentucky", "하이라이", "스파이시"],
  },
  {
    id: "yamazaki-12", name: "Yamazaki 12", distillery: "Yamazaki",
    region: "Osaka", country: "Japan", category: "기타", age: 12, abv: 43,
    nose: "복숭아, 파인애플, 생강", palate: "달콤한 오크, 코코넛, 미즈나라", finish: "길고 드라이하며 스파이시",
    description: "일본 위스키의 상징. 미즈나라 오크의 독특한 향과 동양적 감성의 정점.",
    priceRange: "₩150,000–250,000", difficulty: "중급", tags: ["싱글몰트", "Japanese", "미즈나라", "프리미엄"],
  },
  {
    id: "nikka-from-barrel", name: "Nikka From The Barrel", distillery: "Nikka",
    region: "Hokkaido / Miyagi", country: "Japan", category: "기타", age: null, abv: 51.4,
    nose: "캐러멜, 건포도, 바닐라", palate: "풍부한 오크, 과일, 스파이스", finish: "길고 복잡한 따뜻한 여운",
    description: "가성비 최고의 일본 블렌디드. 고도수에서 오는 묵직함과 복잡함이 특징.",
    priceRange: "₩60,000–85,000", difficulty: "중급", tags: ["블렌디드", "Japanese", "하이프루프", "가성비"],
  },
  {
    id: "kavalan-classic", name: "Kavalan Classic", distillery: "Kavalan",
    region: "Yilan", country: "Taiwan", category: "기타", age: null, abv: 40,
    nose: "트로피컬 과일, 바닐라, 복숭아", palate: "달콤한 오크, 망고, 코코넛", finish: "부드럽고 달콤한 여운",
    description: "대만의 아열대 기후가 만들어내는 빠른 숙성의 트로피컬 싱글몰트.",
    priceRange: "₩70,000–95,000", difficulty: "입문", tags: ["싱글몰트", "Taiwanese", "트로피컬", "달콤함"],
  },
  {
    id: "hibiki-harmony", name: "Hibiki Japanese Harmony", distillery: "Suntory",
    region: "Multiple", country: "Japan", category: "기타", age: null, abv: 43,
    nose: "로즈우드, 감귤, 꿀", palate: "오렌지껍질, 달콤한 오크, 화이트초콜릿", finish: "길고 향기로운 여운",
    description: "산토리의 블렌딩 철학 집대성. 24개 면의 병처럼 24절기를 담은 하모니.",
    priceRange: "₩90,000–130,000", difficulty: "중급", tags: ["블렌디드", "Japanese", "꽃향", "프리미엄"],
  },
  {
    id: "talisker-10", name: "Talisker 10", distillery: "Talisker",
    region: "Isle of Skye", country: "Scotland", category: "스카치", age: 10, abv: 45.8,
    nose: "후추, 해풍, 스모키", palate: "몰트 단맛, 바다소금, 페퍼", finish: "따뜻하고 후추가 남는 긴 여운",
    description: "스카이 섬 특유의 해양성과 페퍼 스파이스가 선명한 싱글몰트.",
    priceRange: "₩75,000–95,000", difficulty: "중급", tags: ["싱글몰트", "Island", "해양성", "페퍼"],
  },
  {
    id: "glendronach-12", name: "The GlenDronach 12", distillery: "The GlenDronach",
    region: "Highland", country: "Scotland", category: "스카치", age: 12, abv: 43,
    nose: "셰리, 건과일, 오렌지", palate: "건포도, 토피, 다크초콜릿", finish: "달콤하고 묵직한 셰리 여운",
    description: "올로로소/페드로 히메네즈 셰리 캐스크 숙성의 클래식한 하이랜드 스타일.",
    priceRange: "₩85,000–110,000", difficulty: "중급", tags: ["싱글몰트", "Highland", "셰리캐스크", "건과일"],
  },
  {
    id: "balvenie-doublewood-12", name: "The Balvenie DoubleWood 12", distillery: "The Balvenie",
    region: "Speyside", country: "Scotland", category: "스카치", age: 12, abv: 40,
    nose: "꿀, 견과류, 말린과일", palate: "바닐라, 오크, 은은한 시나몬", finish: "부드럽고 달콤한 오크 여운",
    description: "버번 캐스크 후 셰리 캐스크 피니시로 균형감이 뛰어난 스페이사이드 대표작.",
    priceRange: "₩95,000–120,000", difficulty: "입문", tags: ["싱글몰트", "Speyside", "더블우드", "밸런스"],
  },
  {
    id: "monkey-shoulder", name: "Monkey Shoulder", distillery: "William Grant & Sons",
    region: "Speyside", country: "Scotland", category: "스카치", age: null, abv: 40,
    nose: "바닐라, 오렌지, 몰트", palate: "크리미한 토피, 꿀, 스파이스", finish: "가볍고 산뜻한 달콤함",
    description: "칵테일과 스트레이트 모두 부담 없이 즐기기 좋은 블렌디드 몰트.",
    priceRange: "₩45,000–65,000", difficulty: "입문", tags: ["블렌디드몰트", "Speyside", "칵테일", "입문추천"],
  },
  {
    id: "ardbeg-10", name: "Ardbeg 10", distillery: "Ardbeg",
    region: "Islay", country: "Scotland", category: "스카치", age: 10, abv: 46,
    nose: "강한 피트, 레몬, 해초", palate: "스모키, 바닐라, 블랙페퍼", finish: "길고 드라이한 피트 여운",
    description: "아일라 피트의 개성을 또렷하게 보여주는 강렬한 싱글몰트.",
    priceRange: "₩80,000–105,000", difficulty: "중급", tags: ["싱글몰트", "Islay", "피트", "스모키"],
  },
  {
    id: "teeling-small-batch", name: "Teeling Small Batch", distillery: "Teeling",
    region: "Dublin", country: "Ireland", category: "아이리쉬", age: null, abv: 46,
    nose: "런던드라이 과일, 바닐라, 향신료", palate: "럼 캐스크의 달콤함, 오크, 후추", finish: "달콤하고 스파이시한 여운",
    description: "럼 캐스크 피니시가 개성을 더하는 현대적인 더블린 스타일 아이리쉬.",
    priceRange: "₩55,000–75,000", difficulty: "중급", tags: ["블렌디드", "아이리쉬", "럼캐스크", "스파이시"],
  },
  {
    id: "writers-tears-copper-pot", name: "Writers' Tears Copper Pot", distillery: "Walsh Whiskey",
    region: "County Carlow", country: "Ireland", category: "아이리쉬", age: null, abv: 40,
    nose: "배, 사과, 꿀", palate: "부드러운 몰트, 바닐라, 은은한 오크", finish: "깔끔하고 고소한 여운",
    description: "싱글몰트와 싱글팟스틸 조합으로 부드럽고 우아한 과일향이 돋보인다.",
    priceRange: "₩50,000–70,000", difficulty: "입문", tags: ["블렌디드", "아이리쉬", "과일향", "부드러움"],
  },
  {
    id: "tullamore-dew", name: "Tullamore D.E.W.", distillery: "Tullamore",
    region: "County Offaly", country: "Ireland", category: "아이리쉬", age: null, abv: 40,
    nose: "레몬 제스트, 바닐라, 시리얼", palate: "가벼운 몰트, 꿀, 스파이스", finish: "짧고 깔끔한 곡물 여운",
    description: "가볍고 산뜻한 스타일로 하이볼이나 데일리 드링크에 잘 맞는 아이리쉬.",
    priceRange: "₩35,000–50,000", difficulty: "입문", tags: ["블렌디드", "아이리쉬", "하이볼", "데일리"],
  },
  {
    id: "powers-gold-label", name: "Powers Gold Label", distillery: "Midleton",
    region: "County Cork", country: "Ireland", category: "아이리쉬", age: null, abv: 43.2,
    nose: "시나몬, 꿀, 곡물", palate: "오일리한 질감, 스파이스, 토피", finish: "따뜻하고 드라이한 향신료 여운",
    description: "전통적인 아이리쉬 스파이스가 살아있는 클래식 블렌드.",
    priceRange: "₩45,000–65,000", difficulty: "중급", tags: ["블렌디드", "아이리쉬", "스파이시", "클래식"],
  },
  {
    id: "bushmills-10", name: "Bushmills 10 Year Old", distillery: "Old Bushmills",
    region: "County Antrim", country: "Northern Ireland", category: "아이리쉬", age: 10, abv: 40,
    nose: "꿀, 바닐라, 잘 익은 과일", palate: "밀크초콜릿, 몰트, 사과", finish: "부드럽고 은은한 단맛",
    description: "셰리/버번 캐스크의 균형으로 입문자에게 편안한 10년 숙성 싱글몰트.",
    priceRange: "₩60,000–80,000", difficulty: "입문", tags: ["싱글몰트", "아이리쉬", "10년", "입문추천"],
  },
  {
    id: "four-roses-single-barrel", name: "Four Roses Single Barrel", distillery: "Four Roses",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 50,
    nose: "체리, 바닐라, 오크", palate: "카라멜, 후추, 잘 익은 과일", finish: "길고 스파이시한 버번 여운",
    description: "싱글 배럴 특유의 농도와 향신료감이 살아있는 프리미엄 버번.",
    priceRange: "₩70,000–95,000", difficulty: "중급", tags: ["버번", "Kentucky", "싱글배럴", "스파이시"],
  },
  {
    id: "knob-creek-9", name: "Knob Creek 9", distillery: "Jim Beam",
    region: "Kentucky", country: "USA", category: "버번/라이", age: 9, abv: 50,
    nose: "바닐라, 구운오크, 땅콩", palate: "묵직한 캐러멜, 시나몬, 오크", finish: "길고 따뜻한 오크 스파이스",
    description: "9년 숙성과 100프루프 바디감으로 클래식한 풀바디 버번을 보여준다.",
    priceRange: "₩60,000–85,000", difficulty: "중급", tags: ["버번", "Kentucky", "100프루프", "풀바디"],
  },
  {
    id: "elijah-craig-small-batch", name: "Elijah Craig Small Batch", distillery: "Heaven Hill",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 47,
    nose: "토피, 오렌지, 오크", palate: "바닐라, 넛맥, 캐러멜", finish: "중간 길이의 달콤한 스파이스",
    description: "버번의 밸런스를 잘 보여주는 스몰 배치 스타일의 스테디셀러.",
    priceRange: "₩55,000–75,000", difficulty: "입문", tags: ["버번", "Kentucky", "스몰배치", "밸런스"],
  },
  {
    id: "evan-williams-single-barrel", name: "Evan Williams Single Barrel", distillery: "Heaven Hill",
    region: "Kentucky", country: "USA", category: "버번/라이", age: null, abv: 43.3,
    nose: "사과, 토피, 바닐라", palate: "오크, 시나몬, 라이트 초콜릿", finish: "부드럽고 은은한 단맛",
    description: "부담 없는 가격대에서 싱글 배럴 개성을 체험하기 좋은 버번.",
    priceRange: "₩45,000–65,000", difficulty: "입문", tags: ["버번", "Kentucky", "싱글배럴", "가성비"],
  },
  {
    id: "bulleit-rye", name: "Bulleit Rye", distillery: "MGP",
    region: "Indiana", country: "USA", category: "버번/라이", age: null, abv: 45,
    nose: "민트, 딜, 시트러스", palate: "라이 스파이스, 꿀, 오크", finish: "드라이하고 선명한 허브 여운",
    description: "칵테일 베이스로 특히 인기가 높은 스파이시한 라이 위스키.",
    priceRange: "₩45,000–65,000", difficulty: "입문", tags: ["라이", "Indiana", "칵테일", "스파이시"],
  },
  {
    id: "hakushu-12", name: "Hakushu 12", distillery: "Hakushu",
    region: "Yamanashi", country: "Japan", category: "기타", age: 12, abv: 43,
    nose: "허브, 청사과, 은은한 스모크", palate: "민트, 배, 가벼운 오크", finish: "맑고 시원한 허벌 여운",
    description: "산림 증류소의 청량한 스타일을 보여주는 일본 싱글몰트 대표작.",
    priceRange: "₩200,000–320,000", difficulty: "중급", tags: ["싱글몰트", "Japanese", "허브", "프리미엄"],
  },
  {
    id: "suntory-toki", name: "Suntory Toki", distillery: "Suntory",
    region: "Multiple", country: "Japan", category: "기타", age: null, abv: 43,
    nose: "바질, 청사과, 꿀", palate: "가벼운 바닐라, 시트러스, 곡물", finish: "짧고 깨끗한 여운",
    description: "하이볼 친화적인 라이트 블렌드로 일본 위스키 입문에 적합하다.",
    priceRange: "₩45,000–65,000", difficulty: "입문", tags: ["블렌디드", "Japanese", "하이볼", "입문추천"],
  },
  {
    id: "nikka-days", name: "Nikka Days", distillery: "Nikka",
    region: "Hokkaido / Miyagi", country: "Japan", category: "기타", age: null, abv: 40,
    nose: "시리얼, 바닐라, 가벼운 과일", palate: "부드러운 몰트, 배, 토피", finish: "은은하고 매끈한 여운",
    description: "데일리 음용을 겨냥한 가벼운 스타일의 일본 블렌디드 위스키.",
    priceRange: "₩55,000–75,000", difficulty: "입문", tags: ["블렌디드", "Japanese", "데일리", "부드러움"],
  },
  {
    id: "paul-john-brilliance", name: "Paul John Brilliance", distillery: "Paul John",
    region: "Goa", country: "India", category: "기타", age: null, abv: 46,
    nose: "꿀, 오렌지 필, 바닐라", palate: "보리 단맛, 시나몬, 견과류", finish: "따뜻하고 스파이시한 여운",
    description: "인도 싱글몰트의 대표 레이블로, 향신료와 단맛의 조화가 또렷하다.",
    priceRange: "₩75,000–100,000", difficulty: "중급", tags: ["싱글몰트", "Indian", "스파이스", "신흥지역"],
  },
  {
    id: "crown-royal-deluxe", name: "Crown Royal Deluxe", distillery: "Crown Royal",
    region: "Manitoba", country: "Canada", category: "기타", age: null, abv: 40,
    nose: "바닐라, 캐러멜, 가벼운 오크", palate: "부드러운 곡물, 토피, 말린과일", finish: "짧고 고소한 여운",
    description: "캐나다 블렌드 특유의 부드러운 질감으로 편하게 즐기기 좋은 위스키.",
    priceRange: "₩45,000–65,000", difficulty: "입문", tags: ["블렌디드", "Canadian", "부드러움", "데일리"],
  },
];

export const CATEGORY_TO_TYPE: Record<string, string> = {
  "스카치": "Scotch",
  "아이리쉬": "Irish",
  "버번/라이": "Bourbon/Rye",
  "기타": "Etc",
};
