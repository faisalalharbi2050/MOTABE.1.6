import React from 'react';
import { SchoolInfo } from '../../types';

interface PrintHeaderProps {
  schoolInfo: SchoolInfo;
  title: string;
}

/** يُعرض فقط عند الطباعة — استخدم داخل div.hidden.print:block */
const PrintHeader: React.FC<PrintHeaderProps> = ({ schoolInfo, title }) => {
  const now = new Date();

  const dayName = now.toLocaleDateString('ar-SA', { weekday: 'long' });

  const hijriDate = now.toLocaleDateString('ar-SA-u-ca-islamic', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const gregorianDate = now.toLocaleDateString('ar-SA', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const currentSemester =
    schoolInfo.semesters?.find(s => s.id === schoolInfo.currentSemesterId) ??
    schoolInfo.semesters?.[0];

  const semesterName = currentSemester?.name ?? '—';
  const academicYear = schoolInfo.academicYear ?? '—';
  const region       = schoolInfo.region ?? '—';
  const schoolName   = schoolInfo.schoolName ?? '—';

  const cell: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, lineHeight: 1.9, color: '#111',
  };

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', width: '100%', marginBottom: 6 }}>

      {/* ── three-column header ─────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 80px 1fr',
        alignItems: 'center',
        paddingBottom: 5,
        borderBottom: '1.5px solid #444',
      }}>

        {/* RIGHT */}
        <div>
          <div style={{ ...cell, fontWeight: 900, fontSize: 11 }}>المملكة العربية السعودية</div>
          <div style={cell}>وزارة التعليم</div>
          <div style={cell}>إدارة التعليم بمنطقة {region}</div>
          <div style={cell}>المدرسة: {schoolName}</div>
        </div>

        {/* CENTER — emblem */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <svg width="62" height="62" viewBox="0 0 120 130">
            <rect x="56" y="62" width="8" height="46" rx="2" fill="#1a6b30"/>
            <path d="M60 60 Q40 45 22 50" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M60 60 Q38 38 35 18" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M60 60 Q58 35 50 14" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M60 60 Q62 35 70 14" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M60 60 Q82 38 85 18" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <path d="M60 60 Q82 45 98 50" stroke="#1a6b30" strokeWidth="4" fill="none" strokeLinecap="round"/>
            <line x1="32" y1="108" x2="55" y2="68" stroke="#1a6b30" strokeWidth="3" strokeLinecap="round"/>
            <polygon points="55,65 51,60 60,64" fill="#1a6b30"/>
            <rect x="28" y="105" width="12" height="4" rx="1" fill="#1a6b30" transform="rotate(-58 34 107)"/>
            <line x1="88" y1="108" x2="65" y2="68" stroke="#1a6b30" strokeWidth="3" strokeLinecap="round"/>
            <polygon points="65,65 69,60 60,64" fill="#1a6b30"/>
            <rect x="80" y="105" width="12" height="4" rx="1" fill="#1a6b30" transform="rotate(58 86 107)"/>
          </svg>
        </div>

        {/* LEFT */}
        <div style={{ textAlign: 'left' }}>
          <div style={cell}>العام الدراسي: {academicYear}</div>
          <div style={cell}>الفصل الدراسي: {semesterName}</div>
          <div style={cell}>اليوم: {dayName}</div>
          <div style={{ ...cell, lineHeight: 1.6 }}>
            التاريخ: {hijriDate} هـ<br/>
            <span style={{ paddingRight: 30 }}>{gregorianDate} م</span>
          </div>
        </div>
      </div>

      {/* ── title — separate below header ──────────────── */}
      <div style={{ textAlign: 'center', padding: '5px 0 3px', borderBottom: '1px solid #aaa' }}>
        <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.5, color: '#111' }}>
          {title}
        </span>
      </div>
    </div>
  );
};

export default PrintHeader;
