"use client";

import { useEffect, useState } from "react";
import { ENCYCLOPEDIA_WHISKEYS, type EncyclopediaEntry } from "@/lib/encyclopediaData";
import { supabase } from "@/lib/supabase";

type WhiskeyEntry = EncyclopediaEntry;

const CATEGORIES = ["전체", "스카치", "아이리쉬", "버번/라이", "기타"] as const;
type Category = (typeof CATEGORIES)[number];

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

  const [userId, setUserId] = useState("");
  const [dbEntries, setDbEntries] = useState<WhiskeyEntry[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<WhiskeyEntry | null>(null);
  const [formData, setFormData] = useState<Omit<WhiskeyEntry, "id">>(EMPTY_FORM);
  const [formId, setFormId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUserId(localStorage.getItem("userId") || "");
    fetchDbEntries();
  }, []);

  const [deletedStaticIds, setDeletedStaticIds] = useState<Set<string>>(new Set());

  const fetchDbEntries = async () => {
    const { data } = await supabase.from("encyclopedia").select("*");
    if (data) {
      const deleted = new Set(data.filter((r) => r.deleted).map((r) => r.id as string));
      setDeletedStaticIds(deleted);
      setDbEntries(data.filter((r) => !r.deleted).map(dbRowToEntry));
    }
  };

  // Merge: DB entries override static by id; new DB entries appended; deleted static entries hidden
  const mergedWhiskeys = (() => {
    const dbMap = new Map(dbEntries.map((e) => [e.id, e]));
    const merged = ENCYCLOPEDIA_WHISKEYS
      .filter((w) => !deletedStaticIds.has(w.id))
      .map((w) => dbMap.get(w.id) ?? w);
    const staticIds = new Set(ENCYCLOPEDIA_WHISKEYS.map((w) => w.id));
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
    const { error } = await supabase.from("encyclopedia").upsert([payload], { onConflict: "id" });
    if (error) { console.error("encyclopedia upsert error:", error); alert("저장 실패: " + error.message); setSaving(false); return; }
    await fetchDbEntries();
    setShowModal(false);
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 항목을 삭제할까요?")) return;
    const staticEntry = ENCYCLOPEDIA_WHISKEYS.find((w) => w.id === id);
    if (staticEntry) {
      // 정적 항목: 전체 데이터 + deleted=true로 upsert (NOT NULL 컬럼 충족)
      await supabase.from("encyclopedia").upsert([{
        id,
        name: staticEntry.name,
        distillery: staticEntry.distillery,
        region: staticEntry.region,
        country: staticEntry.country,
        category: staticEntry.category,
        age: staticEntry.age,
        abv: staticEntry.abv,
        nose: staticEntry.nose,
        palate: staticEntry.palate,
        finish: staticEntry.finish,
        description: staticEntry.description,
        price_range: staticEntry.priceRange,
        difficulty: staticEntry.difficulty,
        tags: staticEntry.tags,
        deleted: true,
      }], { onConflict: "id" });
    } else {
      await supabase.from("encyclopedia").delete().eq("id", id);
    }
    await fetchDbEntries();
  };

  const F = formData;
  const setF = (patch: Partial<typeof formData>) => setFormData((p) => ({ ...p, ...patch }));

  return (
    <div className="tone min-h-screen">
      <div className="tone-wrap max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="section-title text-3xl md:text-4xl font-bold text-white">위스키 백과</h1>
          {userId && (
            <button
              onClick={openAdd}
              className="cta flex-shrink-0 px-4 py-2 bg-indigo-500/80 text-white text-sm rounded-xl hover:bg-indigo-500 transition"
            >
              + 위스키 추가
            </button>
          )}
        </div>
        <p className="meta text-white/55 mb-8">카테고리별 대표 위스키 도감. 각 위스키의 특징과 테이스팅 노트를 확인해보세요.</p>

        {/* 검색 */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="이름, 증류소, 지역으로 검색..."
          className="glass-input surface w-full px-4 py-2.5 rounded-xl text-sm mb-4"
        />

        {/* 카테고리 */}
        <div className="flex gap-2 flex-wrap mb-5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition border ${
                selectedCategory === cat
                  ? "chip bg-indigo-500/80 text-white border-indigo-500/60"
                  : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10 hover:text-white/80"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 상세 필터 */}
        <div className="glass-card card rounded-2xl p-4 mb-6 space-y-3">
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
                        ? "chip bg-indigo-500/70 text-white border-indigo-500/50"
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
        <p className="meta text-white/35 text-xs mb-5">{filtered.length}개의 위스키</p>

        {/* 카드 그리드 */}
        {filtered.length === 0 ? (
          <div className="empty text-center py-20 text-white/30">검색 결과가 없습니다.</div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 items-start">
            {filtered.map((w) => {
              const isOpen = expandedId === w.id;
              return (
                <div key={w.id} className="glass-card card rounded-2xl overflow-hidden transition-all duration-200">
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
                      {w.age && <span className="bg-white/8 px-2 py-1 rounded-lg">{w.age}년</span>}
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
                          <span key={tag} className="chip text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/45">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* 편집/삭제 버튼 */}
                      {userId && (
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
          <div className="glass-card card rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-white">{editTarget ? "위스키 편집" : "위스키 추가"}</h2>
              <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white text-2xl leading-none">×</button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              {!editTarget && (
                <div>
                  <label className="block text-xs text-white/50 mb-1">ID (선택, 비워두면 자동생성)</label>
                  <input value={formId} onChange={(e) => setFormId(e.target.value)}
                    placeholder="예: glenlivet-12" className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-white/50 mb-1">이름 *</label>
                  <input required value={F.name} onChange={(e) => setF({ name: e.target.value })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">증류소</label>
                  <input value={F.distillery} onChange={(e) => setF({ distillery: e.target.value })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">지역</label>
                  <input value={F.region} onChange={(e) => setF({ region: e.target.value })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">국가</label>
                  <input value={F.country} onChange={(e) => setF({ country: e.target.value })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">카테고리</label>
                  <select value={F.category} onChange={(e) => setF({ category: e.target.value })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm">
                    {["스카치", "아이리쉬", "버번/라이", "기타"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">숙성 (년, 빈칸=NAS)</label>
                  <input type="number" value={F.age ?? ""} onChange={(e) => setF({ age: e.target.value ? Number(e.target.value) : null })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">도수 (ABV%)</label>
                  <input type="number" step="0.1" value={F.abv} onChange={(e) => setF({ abv: Number(e.target.value) })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">난이도</label>
                  <select value={F.difficulty} onChange={(e) => setF({ difficulty: e.target.value as WhiskeyEntry["difficulty"] })}
                    className="glass-input surface w-full px-3 py-2 rounded-lg text-sm">
                    {["입문", "중급", "상급"].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-white/50 mb-1">가격대</label>
                  <input value={F.priceRange} onChange={(e) => setF({ priceRange: e.target.value })}
                    placeholder="₩40,000–55,000" className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">향 (Nose)</label>
                <input value={F.nose} onChange={(e) => setF({ nose: e.target.value })}
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">맛 (Palate)</label>
                <input value={F.palate} onChange={(e) => setF({ palate: e.target.value })}
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">피니쉬 (Finish)</label>
                <input value={F.finish} onChange={(e) => setF({ finish: e.target.value })}
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">설명</label>
                <textarea value={F.description} onChange={(e) => setF({ description: e.target.value })}
                  rows={3} className="glass-input surface w-full px-3 py-2 rounded-lg text-sm resize-none" />
              </div>
              <div>
                <label className="block text-xs text-white/50 mb-1">태그 (쉼표로 구분)</label>
                <input
                  value={F.tags.join(", ")}
                  onChange={(e) => setF({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                  placeholder="싱글몰트, Speyside, 달콤함"
                  className="glass-input surface w-full px-3 py-2 rounded-lg text-sm"
                />
              </div>
              <button type="submit" disabled={saving}
                className="cta w-full py-2 bg-indigo-500/80 text-white font-medium rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition">
                {saving ? "저장 중..." : "저장"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

