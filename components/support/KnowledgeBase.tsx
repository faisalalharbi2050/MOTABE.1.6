import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, ChevronDown, ChevronUp, ArrowRight, HelpCircle, Tag,
  Play, PlayCircle, Clock, Maximize2, Minimize2,
  BookOpen, LayoutDashboard, School, CalendarCheck, Layers, LayoutGrid, Users, GraduationCap, UserCog,
  ClipboardList, CalendarDays, Eye, ShieldCheck, Lock, MessageSquare, CreditCard, UserX,
} from 'lucide-react';
import { SUPPORT_SECTIONS, VideoTutorial, FAQItem } from './supportData';

// ─── Section Icons Map — مطابقة لأيقونات القائمة الجانبية ─────────────────────
const SECTION_ICONS: Record<string, React.ElementType> = {
  dashboard:          LayoutDashboard,
  settings_basic:     School,
  settings_calendar:  CalendarCheck,
  settings_timing:    Clock,
  settings_subjects:  Layers,
  settings_classes:   LayoutGrid,
  settings_teachers:  Users,
  settings_admins:    UserCog,
  settings_students:  GraduationCap,
  assignment:         ClipboardList,
  schedule:           CalendarCheck,
  supervision:        Eye,
  duty:               ShieldCheck,
  daily_waiting:      UserX,
  messages:           MessageSquare,
  permissions:        Lock,
  subscription:       CreditCard,
};

// ─── مجموعات الأقسام — مطابقة لبنية القائمة الجانبية تماماً ───────────────────
const SECTION_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'الرئيسية',            ids: ['dashboard'] },
  { label: 'الإعدادات والبيانات', ids: ['settings_basic', 'settings_calendar', 'settings_timing', 'settings_subjects', 'settings_classes', 'settings_teachers', 'settings_admins', 'settings_students'] },
  { label: 'الجدول المدرسي',      ids: ['assignment', 'schedule'] },
  { label: 'الإشراف والمناوبة',   ids: ['supervision', 'duty'] },
  { label: 'الانتظار اليومي',     ids: ['daily_waiting'] },
  { label: 'الرسائل',             ids: ['messages'] },
  { label: 'الصلاحيات والتفويض',  ids: ['permissions'] },
  { label: 'الاشتراك والفوترة',   ids: ['subscription'] },
];

const SECTION_BY_ID = Object.fromEntries(SUPPORT_SECTIONS.map(s => [s.id, s]));

// ─── قواعد العدد والمعدود في العربية ──────────────────────────────────────────
// forms = [مفرد، مثنى، جمع (3–10)، تمييز مفرد منصوب (11+)]
const FAQ_FORMS:   [string, string, string, string] = ['سؤال', 'سؤالان', 'أسئلة', 'سؤالاً'];
const RESULT_FORMS:[string, string, string, string] = ['نتيجة', 'نتيجتان', 'نتائج', 'نتيجة'];

const arCount = (n: number, f: [string, string, string, string]): string => {
  if (n === 1) return f[0];
  if (n === 2) return f[1];
  if (n >= 3 && n <= 10) return `${n} ${f[2]}`;
  return `${n} ${f[3]}`;
};

// «فيديو» كلمة أجنبية لا تُثنّى ولا تُجمع — تبقى كما هي مع الرقم: 1 فيديو، 2 فيديو…
const videoCount = (n: number): string => `${n} فيديو`;

// ─── Count label helper ───────────────────────────────────────────────────────
const countLabel = (faqs: number, videos: number): string => {
  const parts: string[] = [];
  if (faqs > 0)   parts.push(arCount(faqs, FAQ_FORMS));
  if (videos > 0) parts.push(videoCount(videos));
  return parts.join(' · ') || 'قريباً';
};

// ─── FAQ Row ──────────────────────────────────────────────────────────────────
const FaqRow: React.FC<{
  item: FAQItem & { categoryLabel?: string };
  isOpen: boolean;
  onToggle: () => void;
  showTag?: boolean;
}> = ({ item, isOpen, onToggle, showTag }) => (
  <div
    className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden ${
      isOpen ? 'border-[#8779fb]/40' : 'border-slate-200 hover:border-slate-300'
    }`}
  >
    <button
      onClick={onToggle}
      className="w-full flex items-start justify-between px-5 py-4 text-right gap-3"
    >
      <div className="flex-1 min-w-0">
        {showTag && item.categoryLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#655ac1] border border-[#655ac1]/25 px-2.5 py-1 rounded-full mb-2">
            <Tag size={9} />
            {item.categoryLabel}
          </span>
        )}
        <p className={`font-bold text-sm leading-relaxed ${isOpen ? 'text-[#655ac1]' : 'text-slate-700'}`}>
          {item.q}
        </p>
      </div>
      <div className="shrink-0 w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-400 flex items-center justify-center transition-all mt-0.5">
        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
    </button>
    {isOpen && (
      <div className="px-5 pb-5">
        <div className="h-px bg-slate-100 mb-3" />
        <p className="text-sm text-slate-600 font-medium leading-relaxed whitespace-pre-line">
          {item.a}
        </p>
      </div>
    )}
  </div>
);

// ─── Section heading ──────────────────────────────────────────────────────────
const SectionHeading: React.FC<{ icon: React.ElementType; label: string; countText: string }> = ({ icon: Icon, label, countText }) => (
  <div className="flex items-center gap-2.5 mb-3 pr-1">
    <Icon size={17} className="text-[#655ac1]" />
    <h3 className="font-black text-slate-800 text-base">{label}</h3>
    <span className="text-[11px] font-black px-2.5 py-1 rounded-full border border-slate-200 text-slate-400">
      {countText}
    </span>
  </div>
);

// ─── Video Thumbnail Component ────────────────────────────────────────────────
const VideoCard: React.FC<{ video: VideoTutorial; onPlay: (v: VideoTutorial) => void }> = ({ video, onPlay }) => (
  <div
    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#655ac1]/30 transition-all duration-300 overflow-hidden group cursor-pointer"
    onClick={() => onPlay(video)}
  >
    {/* Thumbnail — هادئ بلا تدرّجات */}
    <div className="relative h-28 bg-slate-50 border-b border-slate-100 flex items-center justify-center overflow-hidden">
      <div className="relative z-10 w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200 group-hover:scale-110 group-hover:border-[#655ac1]/40 transition-all duration-300">
        <Play size={22} className="text-[#655ac1] fill-[#655ac1] mr-[-2px]" />
      </div>
      <div className="absolute bottom-2 left-2 bg-white text-slate-500 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 border border-slate-200">
        <Clock size={11} />
        {video.duration}
      </div>
      {!video.youtubeId && (
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-white text-[#655ac1] text-[10px] font-black px-2.5 py-1 rounded-full border border-[#655ac1]/25">
          <span className="w-1.5 h-1.5 rounded-full bg-[#655ac1]" />
          قريباً
        </div>
      )}
    </div>
    <div className="p-4">
      <h4 className="font-black text-slate-800 text-sm leading-snug mb-1 group-hover:text-[#655ac1] transition-colors">
        {video.title}
      </h4>
      <p className="text-slate-500 text-xs leading-relaxed font-medium line-clamp-2">
        {video.description}
      </p>
    </div>
  </div>
);

// ─── Video List Item — نمط قائمة مدمج للعمود الجانبي ─────────────────────────
const VideoListItem: React.FC<{ video: VideoTutorial; onPlay: (v: VideoTutorial) => void }> = ({ video, onPlay }) => (
  <button
    onClick={() => onPlay(video)}
    className="w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-2.5 flex items-center gap-3 text-right hover:border-[#655ac1]/30 hover:shadow-md transition-all duration-300 group"
  >
    {/* Thumbnail — بعرض ثابت ونسبة متناسقة */}
    <div className="relative w-24 h-16 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
      <div className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200 group-hover:border-[#655ac1]/40 transition-all">
        <Play size={15} className="text-[#655ac1] fill-[#655ac1] mr-[-1px]" />
      </div>
    </div>
    {/* Text */}
    <div className="min-w-0 flex-1">
      <h4 className="font-black text-slate-800 text-sm leading-snug truncate group-hover:text-[#655ac1] transition-colors">
        {video.title}
      </h4>
      <p className="text-xs text-slate-400 font-medium truncate mt-0.5">{video.description}</p>
      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-slate-400">
        <Clock size={11} />
        {video.duration}
        {!video.youtubeId && (
          <span className="flex items-center gap-1 text-[#655ac1]">
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            قريباً
          </span>
        )}
      </div>
    </div>
  </button>
);

// ─── Video Player Modal ───────────────────────────────────────────────────────
const VideoModal: React.FC<{ video: VideoTutorial | null; onClose: () => void }> = ({ video, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  if (!video) return null;

  const catLabel = SUPPORT_SECTIONS.find(c => c.id === video.category)?.label ?? '';

  return createPortal((
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-3xl shadow-2xl w-full overflow-hidden animate-fade-in transition-all duration-300 ${isExpanded ? 'max-w-5xl' : 'max-w-2xl'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-14 bg-white border-b border-slate-100 flex items-center px-5">
          <span className="text-[#655ac1] font-black text-sm">{catLabel}</span>
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all"
              title={isExpanded ? 'تصغير' : 'تكبير'}
            >
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-all"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="relative bg-slate-50 aspect-video flex items-center justify-center border-b border-slate-100">
          {video.youtubeId ? (
            <iframe
              src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-200">
                <PlayCircle size={40} className="text-[#655ac1] opacity-80" />
              </div>
              <div className="text-center">
                <p className="text-xl font-black mb-1 text-slate-700">قريباً</p>
                <p className="text-sm font-medium text-slate-500">جارٍ تجهيز هذا الشرح</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-800 text-base leading-snug">{video.title}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1 leading-relaxed">{video.description}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-lg">
              <Clock size={13} />
              {video.duration}
            </div>
          </div>
        </div>
      </div>
    </div>
  ), document.body);
};

// ─── Empty box ────────────────────────────────────────────────────────────────
const EmptyBox: React.FC<{ icon: React.ElementType; title: string; hint: string }> = ({ icon: Icon, title, hint }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
    <Icon size={38} className="mx-auto mb-3 text-slate-200" />
    <p className="font-bold text-slate-400">{title}</p>
    <p className="text-xs text-slate-300 mt-1 font-medium">{hint}</p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const KnowledgeBase: React.FC = () => {
  const [selectedCat,  setSelectedCat]  = useState<string | null>(null);
  const [openItem,     setOpenItem]     = useState<string | null>(null);
  const [searchQuery,  setSearchQuery]  = useState('');
  const [playingVideo, setPlayingVideo] = useState<VideoTutorial | null>(null);

  const query       = searchQuery.trim();
  const isSearching = query.length > 0;

  // ── Search results ──────────────────────────────────────────────────────────
  const searchFaqs = useMemo(() => {
    if (!isSearching) return [];
    return SUPPORT_SECTIONS.flatMap(cat =>
      cat.faqs
        .filter(item => item.q.includes(query) || item.a.includes(query))
        .map(item => ({ ...item, categoryLabel: cat.label, catId: cat.id })),
    );
  }, [query, isSearching]);

  const searchVideos = useMemo(() => {
    if (!isSearching) return [];
    return SUPPORT_SECTIONS.flatMap(c => c.videos).filter(
      v => v.title.includes(query) || v.description.includes(query),
    );
  }, [query, isSearching]);

  const activeSection = SUPPORT_SECTIONS.find(c => c.id === selectedCat) ?? null;

  const handleSearchChange = (v: string) => {
    setSearchQuery(v);
    setOpenItem(null);
  };

  const openCategory = (id: string) => {
    setSelectedCat(id);
    setOpenItem(null);
    setSearchQuery('');
  };

  const backToAll = () => {
    setSelectedCat(null);
    setOpenItem(null);
  };

  return (
    <div className="space-y-4">

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="ابحث في الأسئلة والشروحات… مثل: إنشاء الجدول، الانتظار، التذاكر"
          className="w-full bg-white border border-slate-200 rounded-2xl shadow-sm py-3.5 pr-12 pl-12 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-[#655ac1] focus:ring-2 focus:ring-[#655ac1]/15 transition-all"
        />
        {isSearching && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
            title="مسح البحث"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ════════════════ SEARCH RESULTS ════════════════ */}
      {isSearching ? (
        <div className="space-y-5">
          <div className="flex items-center gap-2 pr-1">
            <Search size={14} className="text-slate-400" />
            <span className="text-sm text-slate-500 font-bold">
              {arCount(searchFaqs.length + searchVideos.length, RESULT_FORMS)} لـ «{query}»
            </span>
          </div>

          {searchFaqs.length === 0 && searchVideos.length === 0 && (
            <EmptyBox icon={HelpCircle} title="لا توجد نتائج" hint="جرّب كلمات بحث مختلفة" />
          )}

          {searchFaqs.length > 0 && (
            <div>
              <SectionHeading icon={HelpCircle} label="الأسئلة" countText={arCount(searchFaqs.length, FAQ_FORMS)} />
              <div className="space-y-2.5">
                {searchFaqs.map((item, idx) => {
                  const key = `s-${item.catId}-${idx}`;
                  return (
                    <FaqRow
                      key={key}
                      item={item}
                      isOpen={openItem === key}
                      onToggle={() => setOpenItem(openItem === key ? null : key)}
                      showTag
                    />
                  );
                })}
              </div>
            </div>
          )}

          {searchVideos.length > 0 && (
            <div>
              <SectionHeading icon={PlayCircle} label="الشروحات المرئية" countText={videoCount(searchVideos.length)} />
              <div className="grid grid-cols-2 gap-3">
                {searchVideos.map(video => (
                  <VideoCard key={video.id} video={video} onPlay={setPlayingVideo} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : activeSection ? (
        /* ════════════════ CATEGORY DETAIL ════════════════ */
        <div className="max-w-2xl space-y-5">
          {/* Back row */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-3.5 flex items-center gap-3">
            <button
              onClick={backToAll}
              className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-100 hover:border-slate-300 transition-all group shrink-0"
            >
              <ArrowRight size={17} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>
            <div className="w-px h-5 bg-slate-200" />
            {(() => { const Icon = SECTION_ICONS[activeSection.id]; return Icon ? <Icon size={19} className="text-[#655ac1] shrink-0" /> : null; })()}
            <h3 className="font-black text-slate-800 text-base">{activeSection.label}</h3>
            <span className="text-xs font-bold text-slate-400 mr-auto">
              {countLabel(activeSection.faqs.length, activeSection.videos.length)}
            </span>
          </div>

          {/* الأسئلة الشائعة والفيديو */}
          <div className="space-y-5">
            {(activeSection.faqs.length === 0 && activeSection.videos.length === 0) && (
              <EmptyBox icon={HelpCircle} title="لا يوجد محتوى في هذا القسم بعد" hint="نعمل على إضافته قريباً" />
            )}

            {/* الأسئلة الشائعة */}
            {activeSection.faqs.length > 0 && (
              <div>
                <SectionHeading icon={HelpCircle} label="الأسئلة الشائعة" countText={arCount(activeSection.faqs.length, FAQ_FORMS)} />
                <div className="space-y-2.5">
                  {activeSection.faqs.map((item, idx) => {
                    const key = `${activeSection.id}-${idx}`;
                    return (
                      <FaqRow
                        key={key}
                        item={item}
                        isOpen={openItem === key}
                        onToggle={() => setOpenItem(openItem === key ? null : key)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* شروحات الفيديو — تحت الأسئلة، كل مقطع في سطر بنفس العرض */}
            {activeSection.videos.length > 0 && (
              <div>
                <SectionHeading icon={PlayCircle} label="شروحات الفيديو" countText={videoCount(activeSection.videos.length)} />
                <div className="space-y-2.5">
                  {activeSection.videos.map(video => (
                    <VideoListItem key={video.id} video={video} onPlay={setPlayingVideo} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ════════════════ CATEGORY GRID — مجمّعة حسب بنية المنصة ════════════════ */
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 pr-1">
            <BookOpen size={17} className="text-[#655ac1]" />
            <h3 className="font-black text-slate-800 text-base">تصفّح حسب القسم</h3>
            <span className="text-xs font-medium text-slate-400">اختر القسم لعرض أسئلته وشروحاته</span>
          </div>

          {SECTION_GROUPS.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-2.5 pr-1">
                <span className="w-1 h-4 rounded-full bg-[#655ac1]/30" />
                <span className="text-sm font-black text-slate-600">{group.label}</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {group.ids.map(id => {
                  const cat = SECTION_BY_ID[id];
                  if (!cat) return null;
                  const Icon = SECTION_ICONS[id];
                  const faqCount = cat.faqs.length;
                  const vidCount = cat.videos.length;
                  return (
                    <button
                      key={id}
                      onClick={() => openCategory(id)}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 text-right hover:border-[#655ac1]/30 hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {Icon ? <Icon size={20} className="text-[#655ac1] shrink-0" /> : null}
                        <h4 className="font-black text-slate-800 text-sm leading-tight truncate group-hover:text-[#655ac1] transition-colors">
                          {cat.label}
                        </h4>
                      </div>
                      {(faqCount > 0 || vidCount > 0) ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {faqCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                              <HelpCircle size={11} className="text-[#655ac1]" />
                              {arCount(faqCount, FAQ_FORMS)}
                            </span>
                          )}
                          {vidCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                              <PlayCircle size={11} className="text-[#655ac1]" />
                              {videoCount(vidCount)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">قريباً</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Video Player Modal ──────────────────────────────────────────── */}
      <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
    </div>
  );
};

export default KnowledgeBase;
