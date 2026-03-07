import React, { useState, useMemo, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Send, Users, AlertCircle, AlertTriangle, Paperclip, CheckCircle2, MessageSquare, Plus, Search, CheckSquare, Square, X, ChevronDown, ChevronLeft, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { SchoolInfo, Teacher, Admin, Student, ClassInfo, Specialization, MessageTemplate } from '../../types';
import { useMessageArchive } from './MessageArchiveContext';
import DatePicker, { DateObject } from "react-multi-date-picker";
import arabic from "react-date-object/calendars/arabic";
import arabic_ar from "react-date-object/locales/arabic_ar";

interface MessageComposerProps {
  schoolInfo: SchoolInfo;
  teachers: Teacher[];
  admins: Admin[];
  students: Student[];
  classes: ClassInfo[];
  specializations: Specialization[];
}

type GroupType = 'none' | 'teachers' | 'admins' | 'staff' | 'parents';

const MessageComposer: React.FC<MessageComposerProps> = ({ schoolInfo, teachers, admins, students, classes, specializations }) => {
  const { sendMessage, templates } = useMessageArchive();
  
  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Form State
  const [selectedGroup, setSelectedGroup] = useState<GroupType>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecId, setSelectedSpecId] = useState<string>('all');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  
  // Selections
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Message Content & Settings
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [messageContent, setMessageContent] = useState('');
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');
  const [fallbackToSms, setFallbackToSms] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<DateObject | null>(null);
  const [scheduleTime, setScheduleTime] = useState('08:00');
  const [isSending, setIsSending] = useState(false);

  // Auto-select staff when 'staff' group is chosen
  useEffect(() => {
    if (selectedGroup === 'staff') {
      const allStaffIds = [...teachers.map(t => t.id), ...admins.map(a => a.id)];
      setSelectedIds(new Set(allStaffIds));
    } else {
      setSelectedIds(new Set());
    }
    setSearchQuery('');
  }, [selectedGroup, teachers, admins]);

  // Derived Data for Display
  const activeSpecs = useMemo(() => {
    const specIds = new Set(teachers.map(t => t.specializationId));
    return specializations.filter(s => specIds.has(s.id));
  }, [teachers, specializations]);

  const activeClasses = useMemo(() => {
    const classIds = new Set(students.map(s => s.classId));
    return classes.filter(c => classIds.has(c.id));
  }, [students, classes]);

  // Available Items based on Group and Filters
  const displayItems = useMemo(() => {
    let items: { id: string, name: string, subtitle?: string, role: 'teacher'|'admin'|'student'|'guardian', phone: string, classId?: string }[] = [];
    
    const q = searchQuery.toLowerCase();
    
    if (selectedGroup === 'teachers' || selectedGroup === 'staff') {
      let filtered = teachers;
      if (selectedGroup === 'teachers' && selectedSpecId !== 'all') {
        filtered = filtered.filter(t => t.specializationId === selectedSpecId);
      }
      if (q) filtered = filtered.filter(t => t.name.toLowerCase().includes(q));
      
      items.push(...filtered.map(t => ({ id: t.id, name: t.name, subtitle: 'معلم', role: 'teacher' as const, phone: t.phone || '' })));
    }

    if (selectedGroup === 'admins' || selectedGroup === 'staff') {
      let filtered = admins;
      if (q) filtered = filtered.filter(a => a.name.toLowerCase().includes(q));
      items.push(...filtered.map(a => ({ id: a.id, name: a.name, subtitle: 'إداري', role: 'admin' as const, phone: a.phone || '' })));
    }

    if (selectedGroup === 'parents') {
        let filtered = students;
        if (selectedClassId !== 'all') {
            filtered = filtered.filter(s => s.classId === selectedClassId);
        }
        if (q) filtered = filtered.filter(s => s.name.toLowerCase().includes(q));
        items.push(...filtered.map(s => ({ id: s.id, name: s.name, subtitle: 'ولي أمر', role: 'guardian' as const, phone: s.parentPhone || '', classId: s.classId })));
    }

    // Sort or group if necessary (parents are grouped by class in render)
    return items;
  }, [selectedGroup, teachers, admins, students, searchQuery, selectedSpecId, selectedClassId]);

  // Selection Handlers
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    const next = new Set(selectedIds);
    displayItems.forEach(item => next.add(item.id));
    setSelectedIds(next);
  };

  const deselectAll = () => {
    const next = new Set(selectedIds);
    displayItems.forEach(item => next.delete(item.id));
    setSelectedIds(next);
  };

  const toggleClassSelection = (classId: string) => {
    const classStudents = displayItems.filter(item => item.classId === classId);
    const allSelected = classStudents.every(s => selectedIds.has(s.id));
    
    const next = new Set(selectedIds);
    if (allSelected) {
        classStudents.forEach(s => next.delete(s.id));
    } else {
        classStudents.forEach(s => next.add(s.id));
    }
    setSelectedIds(next);
  };

  const toggleClassExpand = (classId: string) => {
      const next = new Set(expandedClasses);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      setExpandedClasses(next);
  }

  // Final Recipients
  const recipientsToSend = useMemo(() => {
     return displayItems.filter(item => selectedIds.has(item.id) && item.phone);
  }, [displayItems, selectedIds]);

  // Messaging Logic
  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tId = e.target.value;
    setSelectedTemplate(tId);
    if (tId) {
      const t = templates.find(temp => temp.id === tId);
      if (t) setMessageContent(t.content);
    }
  };

  const insertVariable = (variable: string) => {
      setMessageContent(prev => prev + ` {${variable}}`);
  };

  const handleSend = async () => {
    if (recipientsToSend.length === 0) return alert('يرجى اختيار مستلمين للرسالة');
    if (!messageContent.trim()) return alert('نص الرسالة فارغ');

    setIsSending(true);
    const attachments = attachment ? [{ name: attachment.name, url: URL.createObjectURL(attachment), type: attachment.type }] : [];
    
    const today = new Intl.DateTimeFormat('ar-SA', { weekday: 'long' }).format(new Date());
    const dateFormatted = new Intl.DateTimeFormat('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

    let successCount = 0;
    let failCount = 0;
    
    // Generate a unique batch ID for this sending group
    const batchId = `batch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    for (const rec of recipientsToSend) {
      let personalizedContent = messageContent
        .replace(/{اسم_الطالب}/g, rec.name)
        .replace(/{اسم_المعلم}/g, rec.name)
        .replace(/{اسم_الإداري}/g, rec.name)
        .replace(/{اسم المعلم \/ اسم الإداري}/g, rec.name)
        .replace(/{اليوم}/g, today)
        .replace(/{التاريخ}/g, dateFormatted)
        .replace(/{اسم_المدرسة}/g, schoolInfo.schoolName || '');
        
      if (channel === 'sms' && attachment) {
         personalizedContent += `\nالمرفق: http://t.ly/mock_link`;
      }

      // Hack to pass fallback toggle through content string simulation if needed, or update core contexts
      let finalContent = personalizedContent;
      if (fallbackToSms && channel === 'whatsapp') {
          finalContent += ' [fallbackSms:true]'; // We will just pretend the context handles it or ignore for simulation
      }

      try {
          await sendMessage({
            batchId, /* Link messages together for the archive */
            senderRole: 'مدير النظام', /* Default sender role for now */
            source: 'general',
            recipientId: rec.id,
            recipientName: rec.name,
            recipientPhone: rec.phone,
            recipientRole: rec.role,
            content: personalizedContent,
            channel,
            attachments: channel === 'whatsapp' ? attachments : undefined
          });
          successCount++;
      } catch {
          failCount++;
      }
    }

    setIsSending(false);
    setMessageContent('');
    setSelectedIds(new Set());
    setSelectedGroup('none');
    setAttachment(null);

    if (failCount === 0) {
        alert(`تم إرسال ${successCount} رسالة بنجاح.`);
    } else {
        alert(`تم إرسال ${successCount} رسالة. فشل ${failCount} رسالة. يرجى مراجعة الأرشيف.`);
    }
  };

  // Render Helpers
  const renderRecipientList = () => {
      if (selectedGroup === 'none') {
          return (
              <div className="flex flex-col items-center justify-center p-8 text-slate-400">
                  <Users size={48} className="mb-4 opacity-50" />
                  <p>الرجاء اختيار مجموعة مستلمين للبدء</p>
              </div>
          );
      }

      if (selectedGroup === 'parents') {
          // Group by class
          const parentsByClass = displayItems.reduce((acc, item) => {
              const cId = item.classId || 'unknown';
              if (!acc[cId]) acc[cId] = [];
              acc[cId].push(item);
              return acc;
          }, {} as Record<string, typeof displayItems>);

          return Object.entries(parentsByClass).map(([classId, items]) => {
              const classObj = activeClasses.find(c => c.id === classId);
              const className = classObj ? (classObj.name || `${classObj.grade}/${classObj.section}`) : 'غير محدد';
              const isExpanded = expandedClasses.has(classId);
              const allSelected = items.every(s => selectedIds.has(s.id));
              const someSelected = items.some(s => selectedIds.has(s.id));

              return (
                 <div key={classId} className="border border-slate-100 rounded-xl overflow-hidden mb-3">
                    <div className="bg-slate-50 p-3 flex items-center justify-between cursor-pointer group hover:bg-slate-100 transition-colors" onClick={() => toggleClassExpand(classId)}>
                       <div className="flex items-center gap-3">
                           <button 
                             onClick={(e) => { e.stopPropagation(); toggleClassSelection(classId); }}
                             className={`p-1 rounded transition-colors ${allSelected ? 'text-indigo-600 hover:text-indigo-700' : someSelected ? 'text-indigo-400 hover:text-indigo-500' : 'text-slate-300 hover:text-indigo-500'}`}
                           >
                              {allSelected ? <CheckSquare size={20} /> : someSelected ? <CheckSquare size={20} className="opacity-50" /> : <Square size={20} />}
                           </button>
                           <span className="font-bold text-slate-700 select-none">فصل {className}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">
                             {items.filter(i => selectedIds.has(i.id)).length} / {items.length}
                         </span>
                         {isExpanded ? <ChevronDown size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors"/> : <ChevronLeft size={18} className="text-slate-400 group-hover:text-indigo-500 transition-colors"/>}
                       </div>
                    </div>
                    {isExpanded && (
                        <div className="p-2 space-y-1 bg-white">
                            {items.map(item => (
                                <div 
                                   key={item.id} 
                                   className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer rounded-lg transition-colors select-none group"
                                   onClick={() => toggleSelection(item.id)}
                                >
                                    <div className={`p-1 rounded transition-colors ${selectedIds.has(item.id) ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-500'}`}>
                                       {selectedIds.has(item.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-sm font-bold text-slate-700">{item.name}</div>
                                        {item.phone ? (
                                           <div className="text-xs text-slate-500 font-mono" dir="ltr">{item.phone}</div>
                                        ) : (
                                           <div className="text-xs text-rose-500">لا يوجد رقم</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
              );
          });
      }

      // Teachers, Admins, Staff list
      return (
          <div className="space-y-1">
              {displayItems.map(item => (
                 <div 
                   key={item.id} 
                   className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer rounded-xl border border-transparent hover:border-slate-100 transition-colors select-none group"
                   onClick={() => toggleSelection(item.id)}
                 >
                     <div className={`p-1 rounded transition-colors ${selectedIds.has(item.id) ? 'text-indigo-600' : 'text-slate-300 group-hover:text-indigo-500'}`}>
                        {selectedIds.has(item.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                     </div>
                     <div className="flex-1">
                        <div className="text-sm font-bold text-slate-700">{item.name}</div>
                        <div className="flex gap-3 mt-1">
                           <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">{item.subtitle}</span>
                           {item.phone ? (
                               <span className="text-xs text-slate-500 font-mono" dir="ltr">{item.phone}</span>
                           ) : (
                               <span className="text-xs text-rose-500">جوال مفقود</span>
                           )}
                        </div>
                     </div>
                 </div>
              ))}
              {displayItems.length === 0 && (
                 <div className="flex justify-center p-8 text-slate-400 font-medium text-sm">لا توجد نتائج مطابقة</div>
              )}
          </div>
      );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      
      {/* Right Column: Recipients Selection */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col z-0">
        <h3 className="text-lg font-black shrink-0 text-[#1e293b] mb-6 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Users className="text-[#655ac1]" size={20} />
             اختر المستلمين
           </div>
           {recipientsToSend.length > 0 && (
             <span className="bg-indigo-50 text-indigo-700 text-sm px-3 py-1 rounded-xl shadow-sm border border-indigo-100">
               {recipientsToSend.length} محدد
             </span>
           )}
        </h3>

        <div className="space-y-4 mb-6 shrink-0">
           <select 
             value={selectedGroup} 
             onChange={e => setSelectedGroup(e.target.value as GroupType)}
             className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-[#655ac1] bg-slate-50 font-bold text-slate-700 transition-colors cursor-pointer hover:border-slate-200 appearance-none"
             style={{ backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23131313%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'left 1rem center', backgroundSize: '0.65em auto' }}
           >
             <option value="none">-- اختر الفئة المستهدفة --</option>
             <option value="teachers">المعلمون</option>
             <option value="admins">الإداريون</option>
             <option value="staff">معلمون وإداريون</option>
             <option value="parents">أولياء الأمور</option>
           </select>

           {selectedGroup !== 'none' && (
             <div className="flex gap-2 relative">
                <Search className="absolute right-3 top-3 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="بحث بالاسم..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 border-2 border-slate-100 rounded-xl pr-10 pl-4 py-2.5 outline-none focus:border-[#655ac1] text-sm font-medium"
                />
             </div>
           )}

           {selectedGroup === 'teachers' && (
             <select 
               value={selectedSpecId} 
               onChange={e => setSelectedSpecId(e.target.value)}
               className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-[#655ac1] text-sm bg-slate-50 cursor-pointer font-medium"
             >
               <option value="all">كل التخصصات</option>
               {activeSpecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
           )}

           {selectedGroup === 'parents' && (
             <select 
               value={selectedClassId} 
               onChange={e => setSelectedClassId(e.target.value)}
               className="w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 outline-none focus:border-[#655ac1] text-sm bg-slate-50 cursor-pointer font-medium"
             >
               <option value="all">كل الفصول</option>
               {activeClasses.map(c => <option key={c.id} value={c.id}>{c.name || `${c.grade}/${c.section}`}</option>)}
             </select>
           )}
        </div>

        <div className="flex gap-2 mb-4 border-b border-slate-100 pb-4 shrink-0">
           <button onClick={selectAll} disabled={selectedGroup === 'none'} className="text-xs font-bold text-[#655ac1] bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors">تحديد الكل</button>
           <button onClick={deselectAll} disabled={selectedGroup === 'none'} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors">إلغاء التحديد</button>
        </div>

        <div className="overflow-y-auto max-h-[500px] min-h-[150px] custom-scrollbar pr-2 -mr-2">
           {renderRecipientList()}
        </div>
      </div>

      {/* Left Column: Settings and Composer */}
      <div className="space-y-6">
        
        {/* Channel Settings Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
           <h3 className="text-lg font-black text-[#1e293b] mb-4 flex items-center gap-2">
              <MessageSquare className="text-[#655ac1]" size={20} />
              اختر طريقة الإرسال المفضلة
           </h3>
           
           <div className="space-y-6">
              <div className="flex gap-3">
                 <button 
                   onClick={() => setChannel('whatsapp')}
                   className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                     channel === 'whatsapp' ? 'border-[#25D366] bg-[#25D366]/5 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                   }`}
                 >
                   <svg width="28" height="28" viewBox="0 0 24 24" fill={channel === 'whatsapp' ? "#25D366" : "#cbd5e1"} xmlns="http://www.w3.org/2000/svg" className="mb-2">
                     <path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.197.295-.771.964-.944 1.162-.175.195-.349.21-.646.066-.3-.15-1.265-.467-2.409-1.487-.883-.788-1.48-1.761-1.653-2.059-.173-.3-.018-.465.13-.615.136-.135.301-.345.45-.523.146-.181.194-.301.292-.502.097-.206.05-.386-.025-.534-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.572-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.09 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.36zm-5.496 7.618A9.973 9.973 0 017.1 20.676L3 22l1.353-3.95A9.977 9.977 0 012.002 12 10 10 0 1112.002 22z" fillRule="evenodd" clipRule="evenodd"/>
                   </svg>
                   <span className={`font-black ${channel === 'whatsapp' ? 'text-[#25D366]' : 'text-slate-400'}`}>واتساب</span>
                 </button>
                 
                 <button 
                   onClick={() => setChannel('sms')}
                   className={`flex-1 flex flex-col items-center justify-center p-4 border-2 rounded-xl transition-all ${
                     channel === 'sms' ? 'border-[#007AFF] bg-[#007AFF]/5 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                   }`}
                 >
                   <MessageSquare size={28} className={`mb-2 ${channel === 'sms' ? 'text-[#007AFF]' : 'text-slate-300'}`} />
                   <span className={`font-black ${channel === 'sms' ? 'text-[#007AFF]' : 'text-slate-400'}`}>النصية SMS</span>
                 </button>
              </div>

              {channel === 'whatsapp' && (
                <label className="relative flex items-center gap-3 p-3 border-2 border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                  <input 
                    type="checkbox" 
                    className="sr-only" 
                    checked={fallbackToSms}
                    onChange={(e) => {
                      const isChecked = e.target.checked;
                      setFallbackToSms(isChecked);
                      if (isChecked) {
                        showToast('تنبيه: تم تفعيل خاصية الإرسال الاحتياطي عبر الرسائل النصية بنجاح!', 'success');
                      }
                    }}
                  />
                  <div className={`relative flex items-center w-12 h-6 shrink-0 rounded-full transition-colors ${fallbackToSms ? 'bg-[#655ac1]' : 'bg-slate-200'}`}>
                    <div className={`absolute w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${fallbackToSms ? 'left-1' : 'right-1'}`}></div>
                  </div>
                  <span className="text-sm font-bold text-slate-700 select-none">في حال فشل الإرسال عبر الواتساب يتم الإرسال عبر الرسائل النصية تلقائياً</span>
                </label>
              )}

              {channel === 'whatsapp' && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">المرفقات</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors relative">
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files && setAttachment(e.target.files[0])} />
                   <Paperclip className="mx-auto text-slate-400 mb-2" size={24} />
                   <span className="text-sm font-semibold text-slate-600">
                     {attachment ? attachment.name : 'اسحب أو انقر لإضافة ملف (PDF/صور)'}
                   </span>
                </div>
              </div>
              )}
           </div>
        </div>

        {/* Composer Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <h3 className="text-lg font-black text-[#1e293b] flex items-center gap-2">
              <MessageSquare className="text-[#655ac1]" size={20} />
              نص الرسالة
            </h3>
            <select 
                value={selectedTemplate} 
                onChange={handleTemplateChange}
                className="border-2 border-slate-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#655ac1] bg-slate-50 w-full sm:w-64 font-bold text-slate-600"
              >
              <option value="">استخدام قالب جاهز</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 mb-2">إضافة متغيرات تلقائية للرسالة:</label>
            <div className="flex gap-2 flex-wrap">
               {['اسم_الطالب', 'اسم_المعلم', 'اسم_الإداري', 'اسم المعلم / اسم الإداري', 'اليوم', 'التاريخ', 'اسم_المدرسة'].map(variable => (
                  <button 
                    key={variable}
                    onClick={() => insertVariable(variable)} 
                    className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                  >
                    <Plus size={12} /> {variable.replace(/_/g, ' ')}
                  </button>
               ))}
            </div>
          </div>

          <textarea
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            className="w-full h-40 border-2 border-slate-100 rounded-xl p-4 outline-none focus:border-[#655ac1] resize-none text-sm leading-relaxed"
            placeholder="اكتب نص الرسالة هنا المعاينة ستظهر تلقائياً..."
            dir="rtl"
          />
          
          <div className="mt-6 pt-6 border-t border-slate-100">
            {/* Scheduling Section */}
            <label className="relative flex items-center gap-3 p-3 border-2 border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors mb-4">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
              />
              <div className={`relative flex items-center w-12 h-6 shrink-0 rounded-full transition-colors ${isScheduled ? 'bg-[#655ac1]' : 'bg-slate-200'}`}>
                <div className={`absolute w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${isScheduled ? 'left-1' : 'right-1'}`}></div>
              </div>
              <span className="text-sm font-bold text-slate-700 select-none flex items-center gap-2">
                <Clock size={16} className={isScheduled ? 'text-[#655ac1]' : 'text-slate-400'} />
                جدولة الإرسال لوقت لاحق
              </span>
            </label>

            {isScheduled && (
              <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 mb-2">تاريخ الإرسال</label>
                  <div className="relative">
                    <DatePicker
                      value={scheduleDate}
                      onChange={setScheduleDate}
                      calendar={arabic}
                      locale={arabic_ar}
                      containerClassName="w-full"
                      fixMainPosition={true}
                      zIndex={100}
                      inputClass="w-full px-4 py-3 pl-10 bg-white border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-[#655ac1] font-bold text-slate-700"
                      placeholder="اختر التاريخ..."
                      format="YYYY/MM/DD"
                    />
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <label className="block text-xs font-bold text-slate-500 mb-2">وقت الإرسال</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm outline-none focus:border-[#655ac1] font-bold text-slate-700"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
            
            <button 
              disabled={recipientsToSend.length === 0 || !messageContent.trim() || isSending || (isScheduled && (!scheduleDate || !scheduleTime))}
              onClick={handleSend}
              className="w-full bg-gradient-to-r from-[#8779fb] to-[#655ac1] text-white py-4 rounded-xl font-black text-lg hover:shadow-lg hover:shadow-[#655ac1]/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {isSending ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                  <Send size={20} />
              )}
              {isSending ? 'جاري الإرسال...' : 'إرسال'}
            </button>
          </div>
        </div>

      </div>

      {toast && typeof document !== 'undefined' && ReactDOM.createPortal(
        <div className="fixed z-[9999] pointer-events-none w-full" style={{ top: '82px', left: '50%', transform: 'translateX(-50%)', animation: 'toastIn 0.3s ease-out' }}>
           <style>{`@keyframes toastIn { from { opacity:0; top:64px; } to { opacity:1; top:82px; } }`}</style>
           <div className={`mx-auto max-w-md w-[calc(100%-2rem)] flex items-center gap-3 p-4 rounded-xl shadow-lg border pointer-events-auto transition-all ${
             toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
             toast.type === 'error'   ? 'bg-red-50 border-red-200 text-red-800' :
             'bg-amber-50 border-amber-200 text-amber-800'
           }`}>
             <div className={`p-2 rounded-lg shrink-0 ${
               toast.type === 'success' ? 'bg-emerald-100' :
               toast.type === 'error'   ? 'bg-red-100' : 'bg-amber-100'
             }`}>
               {toast.type === 'success' && <CheckCircle2 size={20} className="text-emerald-600" />}
               {toast.type === 'error'   && <AlertCircle  size={20} className="text-red-600" />}
               {toast.type === 'warning' && <AlertTriangle size={20} className="text-amber-600" />}
             </div>
             <p className="font-bold text-sm flex-1 leading-relaxed">{toast.message}</p>
             <button onClick={() => setToast(null)} className="p-1 rounded-lg hover:bg-black/5 transition-colors shrink-0">
               <X size={16} />
             </button>
           </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default MessageComposer;
