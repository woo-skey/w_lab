"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface WhiskeyEntry {
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

const CATEGORIES = ["전체", "스카치", "아이리쉬", "버번/라이", "기타"] as const;
type Category = (typeof CATEGORIES)[number];

const STATIC_WHISKEYS: WhiskeyEntry[] = [
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
];

const DIFFICULTY_COLOR: Record<WhiskeyEntry["difficulty"], string> = {
  입문: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  중급: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  상급: "bg-red-500/20 text-red-300 border-red-500/30",
};

const FILTER_OPTIONS = {
  difficulty: ["입문", "중급", "상급"],
  abv: ["~40%", "40~45%", "45%+"],
  price: ["5만 이하", "5~10만", "10만+"],
  age: ["NAS", "~12년", "13년+"],
} as const;

type FilterKey = keyof typeof FILTER_OPTIONS;

const EMPTY_FORM: Omit<WhiskeyEntry, "id"> = {
  name: "", distillery: "", region: "", country: "", category: "스카치",
  age: null, abv: 40, nose: "", palate: "", finish: "", description: "",
  priceRange: "", difficulty: "입문", tags: [],
};

function parseMinPrice(priceRange: string): number {
  return parseInt(priceRange.replace(/[₩,]/g, "").split("–")[0]) || 0;
}
function matchAbv(abv: number, val: string) {
  if (val === "~40%") return abv <= 40;
  if (val === "40~45%") return abv > 40 && abv <= 45;
  if (val === "45%+") return abv > 45;
  return false;
}
function matchPrice(priceRange: string, val: string) {
  const min = parseMinPrice(priceRange);
  if (val === "5만 이하") return min <= 50000;
  if (val === "5~10만") return min > 50000 && min <= 100000;
  if (val === "10만+") return min > 100000;
  return false;
}
function matchAge(age: number | null, val: string) {
  if (val === "NAS") return age === null;
  if (val === "~12년") return age !== null && age <= 12;
  if (val === "13년+") return age !== null && age > 12;
  return false;
}

function dbRowToEntry(row: Record<string, unknown>): WhiskeyEntry {
  return {
    id: row.id as string,
    name: row.name as string,
    distillery: (row.distillery as string) ?? "",
    region: (row.region as string) ?? "",
    country: (row.country as string) ?? "",
    category: (row.category as string) ?? "기타",
    age: (row.age as number | null) ?? null,
    abv: (row.abv as number) ?? 40,
    nose: (row.nose as string) ?? "",
    palate: (row.palate as string) ?? "",
    finish: (row.finish as string) ?? "",
    description: (row.description as string) ?? "",
    priceRange: (row.price_range as string) ?? "",
    difficulty: (row.difficulty as WhiskeyEntry["difficulty"]) ?? "입문",
    tags: (row.tags as string[]) ?? [],
  };
}

export default function EncyclopediaPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<FilterKey, string[]>>({ difficulty: [], abv: [], price: [], age: [] });

  const [isAdmin, setIsAdmin] = useState(false);
  const [dbEntries, setDbEntries] = useState<WhiskeyEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<WhiskeyEntry | null>(null);
  const [formData, setFormData] = useState<Omit<WhiskeyEntry, "id">>(EMPTY_FORM);
  const [formId, setFormId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem("isAdmin") === "true");
    fetchDbEntries();
  }, []);

  const fetchDbEntries = async () => {
    const { data } = await supabase.from("encyclopedia").select("*");
    if (data) setDbEntries(data.map(dbRowToEntry));
  };

  // Merge: DB entries override static by id; new DB entries appended
  const mergedWhiskeys = (() => {
    const dbMap = new Map(dbEntries.map((e) => [e.id, e]));
    const merged = STATIC_WHISKEYS.map((w) => dbMap.get(w.id) ?? w);
    const staticIds = new Set(STATIC_WHISKEYS.map((w) => w.id));
    dbEntries.filter((e) => !staticIds.has(e.id)).forEach((e) => merged.push(e));
    return merged;
  })();

  const toggleFilter = (key: FilterKey, val: string) =>
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter((v) => v !== val) : [...prev[key], val],
    }));

  const clearAll = () => setFilters({ difficulty: [], abv: [], price: [], age: [] });
  const activeCount = Object.values(filters).flat().length;

  const baseList = selectedCategory === "전체"
    ? mergedWhiskeys
    : mergedWhiskeys.filter((w) => w.category === selectedCategory);

  const filtered = baseList.filter((w) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (
        !w.name.toLowerCase().includes(q) &&
        !w.distillery.toLowerCase().includes(q) &&
        !w.region.toLowerCase().includes(q) &&
        !w.tags.some((t) => t.toLowerCase().includes(q))
      ) return false;
    }
    if (filters.difficulty.length && !filters.difficulty.includes(w.difficulty)) return false;
    if (filters.abv.length && !filters.abv.some((v) => matchAbv(w.abv, v))) return false;
    if (filters.price.length && !filters.price.some((v) => matchPrice(w.priceRange, v))) return false;
    if (filters.age.length && !filters.age.some((v) => matchAge(w.age, v))) return false;
    return true;
  });

  const FILTER_LABELS: Record<FilterKey, string> = { difficulty: "난이도", abv: "도수", price: "가격", age: "숙성" };

  const openAdd = () => {
    setEditTarget(null);
    setFormId("");
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (w: WhiskeyEntry) => {
    setEditTarget(w);
    setFormId(w.id);
    setFormData({ name: w.name, distillery: w.distillery, region: w.region, country: w.country, category: w.category, age: w.age, abv: w.abv, nose: w.nose, palate: w.palate, finish: w.finish, description: w.description, priceRange: w.priceRange, difficulty: w.difficulty, tags: w.tags });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const id = editTarget ? editTarget.id : formId.trim() || formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const payload = {
      id, name: formData.name, distillery: formData.distillery, region: formData.region,
      country: formData.country, category: formData.category, age: formData.age,
      abv: formData.abv, nose: formData.nose, palate: formData.palate, finish: formData.finish,
      description: formData.description, price_range: formData.priceRange,
      difficulty: formData.difficulty, tags: formData.tags,
    };
    await supabase.from("encyclopedia").upsert([payload]);
    await fetchDbEntries();
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 항목을 삭제할까요? (기본 항목이라면 수정 내용만 초기화됩니다)")) return;
    await supabase.from("encyclopedia").delete().eq("id", id);
    await fetchDbEntries();
  };

  const F = formData;
  const setF = (patch: Partial<typeof formData>) => setFormData((p) => ({ ...p, ...patch }));

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-4xl font-bold text-white">위스키 백과</h1>
          {isAdmin && (
            <button
              onClick={openAdd}
              className="flex-shrink-0 px-4 py-2 bg-indigo-500/80 text-white text-sm rounded-xl hover:bg-indigo-500 transition"
            >
              + 위스키 추가
            </button>
          )}
        </div>
        <p className="text-white/55 mb-8">카테고리별 대표 위스키 도감. 각 위스키의 특징과 테이스팅 노트를 확인해보세요.</p>

        {/* 검색 */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 증류소, 지역으로 검색..."
          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm mb-4"
        />

        {/* 카테고리 */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                selectedCategory === cat
                  ? "bg-indigo-500/80 text-white border-indigo-500/60"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 상세 필터 */}
        <div className="glass-card rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/60 text-xs font-medium">상세 필터</span>
            {activeCount > 0 && (
              <button onClick={clearAll} className="text-xs text-indigo-400 hover:text-indigo-300 transition">
                초기화 ({activeCount})
              </button>
            )}
          </div>
          {(Object.keys(FILTER_OPTIONS) as FilterKey[]).map((key) => (
            <div key={key} className="flex items-center gap-2 flex-wrap">
              <span className="text-white/40 text-xs w-10 flex-shrink-0">{FILTER_LABELS[key]}</span>
              {FILTER_OPTIONS[key].map((val) => {
                const active = filters[key].includes(val);
                return (
                  <button
                    key={val}
                    onClick={() => toggleFilter(key, val)}
                    className={`px-3 py-1 rounded-lg text-xs transition border ${
                      active
                        ? "bg-indigo-500/70 text-white border-indigo-500/50"
                        : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white/70"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* 결과 수 */}
        <p className="text-white/35 text-xs mb-5">{filtered.length}개의 위스키</p>

        {/* 카드 그리드 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-white/30">검색 결과가 없습니다.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
            {filtered.map((w) => {
              const isOpen = expandedId === w.id;
              return (
                <div key={w.id} className="glass-card rounded-2xl overflow-hidden transition-all duration-200">
                  {/* 카드 헤더 — 클릭으로 토글 */}
                  <button
                    onClick={() => setExpandedId(isOpen ? null : w.id)}
                    className="w-full text-left p-5 hover:bg-white/4 transition"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-base leading-snug">{w.name}</p>
                        <p className="text-white/45 text-xs mt-0.5">{w.distillery} · {w.region}, {w.country}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLOR[w.difficulty]}`}>
                        {w.difficulty}
                      </span>
                    </div>

                    {/* 기본 스펙 */}
                    <div className="flex gap-3 text-xs text-white/50 mb-3 flex-wrap">
                      {w.age && <span className="bg-white/8 px-2 py-1 rounded-lg">{w.age}년산</span>}
                      <span className="bg-white/8 px-2 py-1 rounded-lg">ABV {w.abv}%</span>
                      <span className="bg-indigo-500/15 text-indigo-300 px-2 py-1 rounded-lg">{w.priceRange}</span>
                    </div>

                    {/* 한줄 설명 */}
                    <p className="text-white/55 text-xs leading-relaxed line-clamp-2">{w.description}</p>

                    {/* 펼치기 힌트 */}
                    <p className="text-indigo-400/60 text-xs mt-3 text-right">{isOpen ? "▲ 접기" : "▼ 테이스팅 노트 보기"}</p>
                  </button>

                  {/* 확장 영역 — 테이스팅 노트 */}
                  {isOpen && (
                    <div className="border-t border-white/8 px-5 py-4 space-y-3">
                      <div className="space-y-2">
                        {[
                          { label: "향", value: w.nose },
                          { label: "맛", value: w.palate },
                          { label: "피니쉬", value: w.finish },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex gap-2 text-sm">
                            <span className="text-indigo-400/70 font-medium whitespace-nowrap flex-shrink-0 w-14">
                              <span className="text-indigo-400/70 mr-1">·</span>{label}
                            </span>
                            <span className="text-white/65">{value}</span>
                          </div>
                        ))}
                      </div>

                      {/* 태그 */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {w.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/45">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* 관리자 버튼 */}
                      {isAdmin && (
                        <div className="flex gap-2 pt-1 border-t border-white/8">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(w); }}
                            className="text-xs text-white/40 hover:text-indigo-300 px-2 py-1 rounded hover:bg-indigo-500/10 transition"
                          >
                            편집
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(w.id); }}
                            className="text-xs text-white/40 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 관리자 편집/추가 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">{editTarget ? "위스키 편집" : "위스키 추가"}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {!editTarget && (
                <div>
                  <label className="block text-xs text-white/50 mb-1">ID (선택, 비워두면 자동생성)</label>
                  <input value={formId} onChange={(e) => setFormId(e.target.value)}
                    placeholder="예: glenlivet-12" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-white/50 mb-1">이름 *</label>
                  <input required value={F.name} onChange={(e) => setF({ name: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">증류소</label>
                  <input value={F.distillery} onChange={(e) => setF({ distillery: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">지역</label>
                  <input value={F.region} onChange={(e) => setF({ region: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">국가</label>
                  <input value={F.country} onChange={(e) => setF({ country: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">카테고리</label>
                  <select value={F.category} onChange={(e) => setF({ category: e.target.value })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm">
                    {["스카치", "아이리쉬", "버번/라이", "기타"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">숙성 (년, 빈칸=NAS)</label>
                  <input type="number" value={F.age ?? ""} onChange={(e) => setF({ age: e.target.value ? Number(e.target.value) : null })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">도수 (ABV%)</label>
                  <input type="number" step="0.1" value={F.abv} onChange={(e) => setF({ abv: Number(e.target.value) })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">난이도</label>
                  <select value={F.difficulty} onChange={(e) => setF({ difficulty: e.target.value as WhiskeyEntry["difficulty"] })}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm">
                    {["입문", "중급", "상급"].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">가격대</label>
                  <input value={F.priceRange} onChange={(e) => setF({ priceRange: e.target.value })}
                    placeholder="₩40,000–55,000" className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">향 (Nose)</label>
                <input value={F.nose} onChange={(e) => setF({ nose: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">맛 (Palate)</label>
                <input value={F.palate} onChange={(e) => setF({ palate: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">피니쉬 (Finish)</label>
                <input value={F.finish} onChange={(e) => setF({ finish: e.target.value })}
                  className="glass-input w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">설명</label>
                <textarea value={F.description} onChange={(e) => setF({ description: e.target.value })}
                  rows={3} className="glass-input w-full px-3 py-2 rounded-lg text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">태그 (쉼표로 구분)</label>
                <input
                  value={F.tags.join(", ")}
                  onChange={(e) => setF({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="싱글몰트, Speyside, 달콤함"
                  className="glass-input w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <button type="submit" disabled={saving}
                className="w-full py-2 bg-indigo-500/80 text-white font-medium rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition">
                {saving ? "저장 중..." : "저장"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
