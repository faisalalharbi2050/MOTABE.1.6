import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Upload, Trash2, Plus, User, UserPlus, Save, Edit, X, Check, Shield, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Search, Filter, SortAsc, LayoutGrid, List, Printer, Users, MoreHorizontal, Copy } from "lucide-react";
import { parseTeachersExcel, TeacherData } from "../utils/excelTeachers";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { PageHeader } from "./ui/PageHeader";

// Constants
const SPECIALIZATIONS = [
  "الدراسات الإسلامية", "اللغة العربية", "الرياضيات", "العلوم", "اللغة الإنجليزية",
  "الاجتماعيات", "الحاسب الآلي", "التربية الفنية", "التربية البدنية", "المهارات الحياتية",
  "التفكير الناقد", "الدراسات النفسية", "علم الأرض والفضاء", "الإدارة المالية", 
  "صناعة القرار", "علوم وهندسة", "تقنية رقمية", "المكتبات", "تربية فكرية", 
  "صعوبات تعلم", "توحد", "أخرى"
];

// Force print background colors
const printStyles = `
  @media print {
    @page {
        size: auto;
        margin: 5mm;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      background-color: white !important;
    }
    .print\\:bg-white {
        background-color: white !important;
    }
    .print\\:text-black {
        color: black !important;
    }
    .print\\:block {
        display: block !important;
    }
    .print\\:hidden {
        display: none !important;
    }
    /* Table specific print styles */
    table {
        width: 100% !important;
        border-collapse: collapse !important;
        page-break-inside: auto;
    }
    tr {
        page-break-inside: avoid;
        page-break-after: auto;
    }
    thead {
        display: table-header-group;
    }
    /* Hide card lists explicitly if tailwind fails */
    .card-list-view {
        display: none !important;
    }
  }
`;

const ADMIN_ROLES = [
  "محضر مختبر", "الموجه الطلابي", "رائد النشاط", "الوكيل"
];

const normalizeSpecialization = (input: string): string => {
  const s = input.trim();
  if (SPECIALIZATIONS.includes(s)) return s;

  // Fuzzy Mapping Rules
  if (/اسلام|دين|قرآن|توحيد|فقه|حديث|تفسير/.test(s)) return "الدراسات الإسلامية";
  if (/عرب|لغتي/.test(s)) return "اللغة العربية";
  if (/نجليز|English|E/.test(s)) return "اللغة الإنجليزية";
  if (/اجتماع|تاريخ|جغرافيا|وطنية/.test(s)) return "الاجتماعيات";
  if (/حاسب|رقمي|تقنية/.test(s)) return "الحاسب الآلي"; 
  if (/فنية|فني/.test(s)) return "التربية الفنية";
  if (/بدني|رياضة/.test(s)) return "التربية البدنية";
  if (/كيمياء|فيزياء|أحياء|علوم/.test(s)) return "العلوم"; 
  
  if (/رياضيات|جبر|هندسة/.test(s)) return "الرياضيات";
  if (/علوم إدارية|إدارة/.test(s)) return "الإدارة المالية"; 
  if (/مكتب|مصادر/.test(s)) return "المكتبات";
  if (/فكر/.test(s)) return "تربية فكرية";
  if (/صعوب/.test(s)) return "صعوبات تعلم";
  if (/توحد/.test(s)) return "توحد";
  if (/مهار/.test(s)) return "المهارات الحياتية";
  if (/تفكر/.test(s)) return "التفكير الناقد";
  if (/نفس/.test(s)) return "الدراسات النفسية";
  if (/أرض/.test(s)) return "علم الأرض والفضاء";
  
  // If specifically "علوم", match "العلوم"
  if (s === "علوم") return "العلوم";

  return "أخرى"; 
};

export default function TeachersAndStaff() {
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  
  // UI State
  const [sortBy, setSortBy] = useState<'alpha' | 'specialization'>('specialization');
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'admin'>('all');
  const [filterSpecialization, setFilterSpecialization] = useState<string | null>(null);
  const [specializationOrder, setSpecializationOrder] = useState<string[]>(SPECIALIZATIONS);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'add_admin'>('add');
  const [currentTeacher, setCurrentTeacher] = useState<Partial<TeacherData>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

    const [printMenuOpen, setPrintMenuOpen] = useState(false);
    const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
    const deleteMenuRef = useRef<HTMLDivElement>(null);
  const [isBulkEdit, setIsBulkEdit] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  // Close print menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setPrintMenuOpen(false);
      }
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target as Node)) {
        setDeleteMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrint = (type: 'all' | 'teachers' | 'admins' | 'specialization', spec?: string) => {
    setPrintMenuOpen(false);
    
    // Reset other filters
    setSearchTerm('');
    setFilterSpecialization(null);

    // Set filters based on print type
    if (type === 'all') {
        setFilterType('all');
    } else if (type === 'teachers') {
        setFilterType('teacher');
    } else if (type === 'admins') {
        setFilterType('admin');
    } else if (type === 'specialization' && spec) {
        setFilterType('teacher');
        setFilterSpecialization(spec);
    }

    // Wait for state update and render then print
    setTimeout(() => {
        window.print();
    }, 500);
  };

  const toggleBulkEdit = () => {
      setIsBulkEdit(!isBulkEdit);
  };

  // Get unique specializations from actual data
  const usedSpecializations = Array.from(new Set(teachers.filter(t => !t.isAdmin).map(t => t.specialization))).sort();

  useEffect(() => {
    const saved = localStorage.getItem("injazi_teachers");
    if (saved) {
      try {
        const loadedTeachers: TeacherData[] = JSON.parse(saved);
        // Normalize existing data on load to fix "Other" grouping for valid specs
        const normalizedTeachers = loadedTeachers.map(t => ({
            ...t,
            specialization: normalizeSpecialization(t.specialization)
        }));
        setTeachers(normalizedTeachers);
      } catch (e) {
        console.error("Failed to load teachers", e);
      }
    }
    
    // Load Order
    const savedOrder = localStorage.getItem("injazi_spec_order");
    if (savedOrder) {
        try {
            const parsed = JSON.parse(savedOrder);
            // Merge with current SPECIALIZATIONS to ensure new ones appear even if not in saved order
            // We want to keep saved order for existing ones, and append new ones at the end
            const merged = Array.from(new Set([...parsed, ...SPECIALIZATIONS]));
            setSpecializationOrder(merged);
        } catch (e) {
            console.error("Failed to load spec order", e);
            setSpecializationOrder(SPECIALIZATIONS);
        }
    }
  }, []);




  const handleSaveToStorage = (dataToSave?: TeacherData[]) => {
    const data = dataToSave || teachers;
    localStorage.setItem("injazi_teachers", JSON.stringify(data));
    localStorage.setItem("injazi_spec_order", JSON.stringify(specializationOrder));
    setIsDirty(false);
    if (!dataToSave) alert("تم حفظ البيانات بنجاح ✅");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLoading(true);
      try {
        const newTeachers = await parseTeachersExcel(e.target.files[0]);
        const START_INDEX = teachers.length;
        
        // Filter out duplicates (by Name)
        const uniqueNewTeachers = newTeachers.filter(nt => 
            !teachers.some(et => et.name.trim() === nt.name.trim())
        );

        if(uniqueNewTeachers.length === 0) {
            alert("لم يتم إضافة أي معلم - جميع الأسماء موجودة مسبقاً!");
        } else {
             const teachersWithIndex = uniqueNewTeachers.map((t, idx) => ({ 
                 ...t, 
                 sortIndex: START_INDEX + idx,
                 // Normalize Specialization
                 specialization: normalizeSpecialization(t.specialization) || "أخرى"
             }));
             
             const merged = [...teachers, ...teachersWithIndex];
             // De-duplicate, prioritizing existing teachers
             const seen = new Set<string>();
             const unique: TeacherData[] = [];
             
             // First add existing teachers
             for (const t of merged) {
                 const name = t.name.trim();
                 if (!seen.has(name)) {
                     seen.add(name);
                     unique.push(t);
                 }
             }

             setTeachers(unique);
             handleSaveToStorage(unique);

             if(uniqueNewTeachers.length < newTeachers.length) {
                 alert(`تم إضافة ${uniqueNewTeachers.length} معلم وتجاهل ${newTeachers.length - uniqueNewTeachers.length} للتكرار.`);
             }
        }

      } catch (error) {
        alert("حدث خطأ أثناء قراءة الملف");
        console.error(error);
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    }
  };

  const removeTeacher = (id: string) => {
    if(confirm("هل أنت متأكد من حذف هذا السجل؟")) {
        const newTeachers = teachers.filter(t => t.id !== id);
        setTeachers(newTeachers);
        handleSaveToStorage(newTeachers);
    }
  };

  const deleteTeachersByType = (type: 'all_teachers' | 'all_admins') => {
      const isTargetAdmins = type === 'all_admins';
      // Count safely by coercing isAdmin to boolean
      const count = teachers.filter(t => !!t.isAdmin === isTargetAdmins).length;
      
      if (count === 0) return alert("لا يوجد سجلات لحذفها");

      if (confirm(`هل أنت متأكد من حذف جميع ${isTargetAdmins ? 'الإداريين' : 'المعلمين'}؟ (${count} سجل)\nلا يمكن التراجع عن هذا الإجراء.`)) {
          // Keep only those that DO NOT match the target type
          const newTeachers = teachers.filter(t => !!t.isAdmin !== isTargetAdmins);
          setTeachers(newTeachers);
          handleSaveToStorage(newTeachers);
          alert("تم الحذف بنجاح");
      }
  };

  const deleteSpecializationGroup = (spec: string) => {
      const count = teachers.filter(t => !t.isAdmin && t.specialization === spec).length;
      if (confirm(`هل أنت متأكد من حذف جميع معلمي تخصص "${spec}"؟ (${count} معلم)\nلا يمكن التراجع عن هذا الإجراء.`)) {
          const newTeachers = teachers.filter(t => t.isAdmin || t.specialization !== spec);
          setTeachers(newTeachers);
          handleSaveToStorage(newTeachers);
          alert("تم حذف المجموعة بنجاح");
      }
  };

  // --- Sorting & Moving Logic ---

  const getTeachersBySpecialization = () => {
      let filtered = teachers.filter(t => !t.isAdmin);
      
      // Apply Search
      if(searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(t => 
              t.name.toLowerCase().includes(term) || 
              t.mobile.includes(term) ||
              t.specialization.includes(term)
          );
      }

      // Apply Specialization Filter
      if(filterSpecialization) {
          filtered = filtered.filter(t => t.specialization === filterSpecialization);
      }

      const groups: Record<string, TeacherData[]> = {};
      
      // Only show groups that have teachers if filtering
      const specsToShow = filterSpecialization ? [filterSpecialization] : SPECIALIZATIONS;
      
      specsToShow.forEach(spec => groups[spec] = []);
      if(!groups['أخرى'] && !filterSpecialization) groups['أخرى'] = []; 

      filtered.forEach(t => {
          // Normalize on read as well (in case old data is present)
          const spec = normalizeSpecialization(t.specialization);
          const key = SPECIALIZATIONS.includes(spec) ? spec : 'أخرى';
          
          if(groups[key]) {
             groups[key].push(t);
          } else {
             // Handle case where spec might be filtered out or "Other" logic needs care
             if (!filterSpecialization) {
                if(!groups['أخرى']) groups['أخرى'] = [];
                groups['أخرى'].push(t);
             }
          }
      });

      Object.keys(groups).forEach(key => {
          groups[key].sort((a,b) => (a.sortIndex || 0) - (b.sortIndex || 0));
      });

      return groups;
  };

  const getSortedFlatList = () => {
      let filtered = teachers.filter(t => !t.isAdmin);
      
      if(searchTerm) {
          const term = searchTerm.toLowerCase();
          filtered = filtered.filter(t => 
              t.name.toLowerCase().includes(term) || 
              t.mobile.includes(term) ||
              t.specialization.includes(term)
          );
      }

      if(filterSpecialization) {
          filtered = filtered.filter(t => t.specialization === filterSpecialization);
      }
      
      return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };


  const moveTeacher = (id: string, direction: 'up' | 'down') => {
    // Determine which list we are moving within
    const movingTeacher = teachers.find(t => t.id === id);
    if (!movingTeacher) return;

    let listToMoveIn: TeacherData[] = [];
    
    if (movingTeacher.isAdmin) {
        // Moving within Admins
        listToMoveIn = teachers.filter(t => t.isAdmin).sort((a,b) => (a.sortIndex || 0) - (b.sortIndex || 0));
    } else {
        // Moving within Teachers (Specific Specialization or General)
        // Assuming sortBy is a state variable or prop, if not, this needs adjustment.
        // For now, we'll use the existing logic for teachers which is based on specialization.
        listToMoveIn = teachers.filter(t => !t.isAdmin && t.specialization === movingTeacher.specialization).sort((a,b) => (a.sortIndex || 0) - (b.sortIndex || 0));
    }

    const currentIndex = listToMoveIn.findIndex(t => t.id === id);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= listToMoveIn.length) return;

    const targetTeacher = listToMoveIn[targetIndex];

    // Swap sortIndexes
    const newTeachers = teachers.map(t => {
      if (t.id === id) return { ...t, sortIndex: targetTeacher.sortIndex };
      if (t.id === targetTeacher.id) return { ...t, sortIndex: movingTeacher.sortIndex };
      return t;
    });

    setTeachers(newTeachers);
    setIsDirty(true);
    handleSaveToStorage(newTeachers); // Save changes immediately
  };


  const moveSection = (spec: string, direction: 'up' | 'down') => {
    // Get currently visible specializations
    const teachersBySpec = getTeachersBySpecialization();
    const visibleSpecs = specializationOrder.filter(s => (teachersBySpec[s] || []).length > 0);
    
    const currentIndexVisible = visibleSpecs.indexOf(spec);
    if (currentIndexVisible === -1) return;

    const targetIndexVisible = direction === 'up' ? currentIndexVisible - 1 : currentIndexVisible + 1;
    if (targetIndexVisible < 0 || targetIndexVisible >= visibleSpecs.length) return;
    
    const targetSpec = visibleSpecs[targetIndexVisible];

    // Find actual indices in the full list
    const currentIndexFull = specializationOrder.indexOf(spec);
    const targetIndexFull = specializationOrder.indexOf(targetSpec);

    if (currentIndexFull === -1 || targetIndexFull === -1) return;

    const newOrder = [...specializationOrder];
    // Swap
    newOrder[currentIndexFull] = targetSpec;
    newOrder[targetIndexFull] = spec; 
    
    setSpecializationOrder(newOrder);
    setIsDirty(true);
  };

  // ... Modal Handlers
  const openAddModal = (isAdmin: boolean = false) => {
    setModalMode(isAdmin ? 'add_admin' : 'add');
    const maxSort = Math.max(...teachers.map(t => t.sortIndex || 0), 0);
    
    setCurrentTeacher({
        id: `m-${Date.now()}`,
        name: "",
        mobile: "",
        specialization: isAdmin ? "" : SPECIALIZATIONS[0],
        weeklyQuota: 24,
        waitingQuota: 0,
        isAdmin: isAdmin,
        adminRole: isAdmin ? ADMIN_ROLES[0] : undefined,
        sortIndex: maxSort + 10
    });
    setShowModal(true);
  };

  const openEditModal = (teacher: TeacherData) => {
    setModalMode('edit');
    setCurrentTeacher({ ...teacher });
    setShowModal(true);
  };

  const saveTeacherFromModal = () => {
    if(!currentTeacher.name) return alert("الرجاء إدخال الاسم");
    if((currentTeacher.weeklyQuota || 0) >= 24 && (currentTeacher.waitingQuota || 0) > 0) {
        return alert("عذراً، المعلم الذي لديه 24 حصة لا يمكن إسناد حصص انتظار له.");
    }
    const newTeacher = currentTeacher as TeacherData;
    let newTeachersList: TeacherData[];
    
    if(modalMode === 'edit') {
        newTeachersList = teachers.map(t => t.id === newTeacher.id ? newTeacher : t);
    } else {
        newTeachersList = [...teachers, newTeacher];
    }
    
    setTeachers(newTeachersList);
    handleSaveToStorage(newTeachersList);
    setShowModal(false);
  };

  return (
    <div className="p-8">
        <div className="animate-fade-in">
            {/* Print Styles */}
            <style dangerouslySetInnerHTML={{ __html: printStyles }} />

            {/* Header Section */}
            <PageHeader
                title="إدارة المعلمون"
                subtitle="إدارة بيانات الكادر التعليمي والإداري ومتابعة الأنصبة"
            >
                {/* Toolbar Content - New Layout */}
                <div className="flex flex-col gap-4 w-full mt-4 relative z-[60]">
                    
                    {/* Row 1: Actions */}
                    <div className="flex flex-col sm:flex-row gap-2 w-full relative z-[50]">
                         {/* Hidden File Input */}
                         <div className="hidden">
                             <input 
                                 type="file" 
                                 ref={fileInputRef} 
                                 accept=".xlsx, .xls"
                                 onChange={handleFileUpload}
                             />
                         </div>

                        <Button onClick={() => openAddModal(true)} className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 border-transparent">
                            <Shield className="w-5 h-5 ml-2" />
                            إضافة إداري
                        </Button>

                        <Button onClick={() => openAddModal(false)} className="flex-1 sm:flex-none shadow-lg shadow-primary/20">
                            <UserPlus className="w-5 h-5 ml-2" />
                            إضافة معلم
                        </Button>

                        <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => fileInputRef.current?.click()} disabled={loading}>
                            {loading ? '...' : (
                                <>
                                    <Upload className="w-4 h-4 ml-2" />
                                    استيراد
                                </>
                            )}
                        </Button>

                        <Button 
                            variant={isBulkEdit ? "primary" : "outline"}
                            className={`flex-1 sm:flex-none gap-2 ${isBulkEdit ? 'bg-green-600 hover:bg-green-700 text-white border-transparent ring-2 ring-green-600 ring-offset-2' : ''}`}
                            onClick={toggleBulkEdit}
                        >
                            {isBulkEdit ? <Check className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                            {isBulkEdit ? 'حفظ التعديلات' : 'تعديل'}
                        </Button>
                        
                        {/* More Actions Dropdown */}
                        <div className="relative group/menu flex-1 sm:flex-none" ref={deleteMenuRef}>
                            <Button variant="outline" className={`w-full gap-2 px-3 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors ${deleteMenuOpen ? 'bg-red-50 ring-2 ring-red-100' : ''}`} onClick={() => setDeleteMenuOpen(!deleteMenuOpen)}>
                                <Trash2 className="w-4 h-4" />
                                <span className="hidden sm:inline">حذف</span>
                                <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${deleteMenuOpen ? 'rotate-180' : ''}`} />
                            </Button>
                            
                            {deleteMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
                                        <span className="text-xs font-bold text-gray-500">خيارات الحذف</span>
                                    </div>
                                    <div className="p-1">
                                        <button onClick={() => { deleteTeachersByType('all_teachers'); setDeleteMenuOpen(false); }} className="w-full text-right px-3 py-2.5 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors">
                                            <Users className="w-4 h-4" />
                                            <span>حذف كل المعلمين</span>
                                        </button>
                                        <button onClick={() => { deleteTeachersByType('all_admins'); setDeleteMenuOpen(false); }} className="w-full text-right px-3 py-2.5 text-sm text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors">
                                            <Shield className="w-4 h-4" />
                                            <span>حذف كل الإداريين</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>



                         {/* Print Menu */}
                         <div className="relative group/print flex-1 sm:flex-none" ref={printMenuRef}>
                            <Button 
                                variant="outline" 
                                className={`w-full gap-2 px-3 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all ${printMenuOpen ? 'bg-indigo-50 text-indigo-600 border-indigo-200 ring-2 ring-indigo-100' : ''}`} 
                                onClick={() => setPrintMenuOpen(!printMenuOpen)}
                            >
                                <Printer className="w-4 h-4" />
                                <span className="hidden sm:inline">طباعة</span>
                                <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-200 ${printMenuOpen ? 'rotate-180' : ''}`} />
                            </Button>
                            
                            {printMenuOpen && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-[9999] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                    {/* Main Print Options */}
                                    <div className="p-2 border-b border-gray-50">
                                        <div className="px-2 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">تقارير عامة</div>
                                        <button onClick={() => handlePrint('all')} className="w-full text-right px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-3 transition-colors group">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                                <List className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">طباعة الكل</span>
                                                <span className="text-xs text-gray-400">جميع المعلمين والإداريين</span>
                                            </div>
                                        </button>
                                        <button onClick={() => handlePrint('teachers')} className="w-full text-right px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-3 transition-colors group mt-1">
                                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">المعلمون فقط</span>
                                                <span className="text-xs text-gray-400">قائمة المعلمين وحصصهم</span>
                                            </div>
                                        </button>
                                        <button onClick={() => handlePrint('admins')} className="w-full text-right px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg flex items-center gap-3 transition-colors group mt-1">
                                            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                                                <Shield className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold">الإداريون فقط</span>
                                                <span className="text-xs text-gray-400">الكادر الإداري والمهام</span>
                                            </div>
                                        </button>
                                    </div>

                                    {/* Specializations Options */}
                                    <div className="bg-gray-50/50 p-2">
                                        <div className="px-2 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between items-center">
                                            <span>حسب التخصص</span>
                                            <span className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px]">{usedSpecializations.length}</span>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                            {usedSpecializations.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-1">
                                                    {usedSpecializations.map(spec => (
                                                        <button 
                                                            key={spec}
                                                            onClick={() => handlePrint('specialization', spec)} 
                                                            className="w-full text-right px-3 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm hover:text-primary rounded-lg transition-all flex items-center justify-between group"
                                                        >
                                                            <span>{spec}</span>
                                                            <Printer className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-300" />
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="px-3 py-4 text-xs text-gray-400 text-center border-2 border-dashed border-gray-100 rounded-lg">لا توجد تخصصات مضافة</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Row 2: Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-3 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input 
                                type="text"
                                placeholder="بحث بالاسم، التخصص، أو رقم الجوال..."
                                className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        {/* Specialization Filter (Separated) */}
                        <div className="relative min-w-[180px]">
                            <select
                                value={filterSpecialization || ''}
                                onChange={(e) => setFilterSpecialization(e.target.value || null)}
                                className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 pr-4 pl-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all font-medium text-sm"
                            >
                                <option value="">كل التخصصات</option>
                                {usedSpecializations.map(spec => (
                                    <option key={spec} value={spec}>{spec}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                        </div>
                         {/* Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                            <button 
                                onClick={() => {
                                    setFilterType('all');
                                    setSearchTerm('');
                                    setFilterSpecialization(null);
                                }}
                                className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterType === 'all' ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                الكل
                            </button>
                            <button 
                                onClick={() => setFilterType('teacher')}
                                className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterType === 'teacher' ? 'bg-indigo-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                معلمون
                            </button>
                            <button 
                                onClick={() => setFilterType('admin')}
                                className={`px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterType === 'admin' ? 'bg-purple-500 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                            >
                                إداريون
                            </button>
                        </div>
                    </div>
                </div>
            </PageHeader>
                
                <div className="text-sm text-gray-400 font-medium mt-4">
                    {teachers.filter(t => !t.isAdmin).length} معلم • {teachers.filter(t => t.isAdmin).length} إداري
                    {filterSpecialization && <span className="mr-2 text-primary font-bold">(تصفية حسب: {filterSpecialization})</span>}
                </div>
            </div>

            {/* --- TEACHERS SECTION --- */}
            {(filterType === 'all' || filterType === 'teacher') && (
            <div className="space-y-8">
                {sortBy === 'specialization' ? (
                    // Grouped View (Tables)
                    (() => {
                        const teachersBySpec = getTeachersBySpecialization();
                        // Filter to show only specs that have teachers
                        const visibleSpecs = specializationOrder.filter(spec => (teachersBySpec[spec] || []).length > 0);

                        return visibleSpecs.map((spec, specIdx) => {
                            const group = teachersBySpec[spec];
                            
                            return (
                                <div key={spec} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                    <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center group/header">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-6 bg-primary rounded-full" />
                                            <h3 className="font-bold text-gray-800 text-lg">{spec} <span className="text-sm font-normal text-gray-500">({group.length})</span></h3>
                                        </div>
                                        <div className="flex gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm">
                                            <button onClick={() => moveSection(spec, 'up')} className="p-1 hover:bg-indigo-50 rounded text-indigo-600 border border-gray-200 hover:border-indigo-300 transition-all font-bold text-xs flex items-center gap-1 active:scale-95 z-50 pointer-events-auto" title="نقل القسم للأعلى">
                                                <ArrowUp className="w-4 h-4" />
                                            </button>
                                            <div className="w-px bg-gray-200"></div>
                                            <button onClick={() => moveSection(spec, 'down')} className="p-1 hover:bg-indigo-50 rounded text-indigo-600 border border-gray-200 hover:border-indigo-300 transition-all font-bold text-xs flex items-center gap-1 active:scale-95 z-50 pointer-events-auto" title="نقل القسم للأسفل">
                                                <ArrowDown className="w-4 h-4" />
                                            </button>
                                            <div className="w-px bg-gray-200"></div>
                                            <button onClick={() => deleteSpecializationGroup(spec)} className="p-1 hover:bg-red-50 rounded text-red-500 border border-transparent hover:border-red-200 transition-all font-bold text-xs flex items-center gap-1 active:scale-95 z-50 pointer-events-auto" title="حذف المجموعة">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="hidden md:block print:block">
                                        <TeacherTable 
                                            teachers={group} 
                                            showSortControls={true}
                                            onMoveUp={moveTeacher}
                                            onMoveDown={moveTeacher}
                                            onEdit={openEditModal}
                                            onDelete={removeTeacher}
                                            isBulkEdit={isBulkEdit}
                                            onUpdateTeacher={(updated: TeacherData) => {
                                                setTeachers(teachers.map(t => t.id === updated.id ? updated : t));
                                                setIsDirty(true);
                                            }}
                                        />
                                    </div>
                                    <div className="md:hidden print:hidden card-list-view">
                                         <TeacherCardList 
                                            teachers={group}
                                            onEdit={openEditModal}
                                            onDelete={removeTeacher}
                                         />
                                    </div>
                                </div>
                            );
                        });
                    })()
                ) : (
                    // Alphabetical List View (Table)
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="hidden md:block print:block">
                            <TeacherTable 
                                teachers={getSortedFlatList()} 
                                showSortControls={false}
                                onEdit={openEditModal}
                                onDelete={removeTeacher}
                                isBulkEdit={isBulkEdit}
                                onUpdateTeacher={(updated: TeacherData) => {
                                    setTeachers(teachers.map(t => t.id === updated.id ? updated : t));
                                    setIsDirty(true);
                                }}
                            />
                        </div>
                        <div className="md:hidden print:hidden card-list-view">
                             <TeacherCardList 
                                teachers={getSortedFlatList()}
                                onEdit={openEditModal}
                                onDelete={removeTeacher}
                            />
                        </div>
                    </div>
                )}
            </div>
            )}

            {/* --- ADMINS SECTION --- */}
            {(filterType === 'all' || filterType === 'admin') && !filterSpecialization && teachers.some(t => t.isAdmin) && (
                <div className="mt-16 border-t pt-10 print:mt-8 print:pt-4">
                    <header className="mb-6">
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                            <Shield className="w-8 h-8 text-blue-600" />
                            الكادر الإداري
                        </h2>
                    </header>
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="hidden md:block print:block">
                            <AdminTable 
                                admins={teachers.filter(t => t.isAdmin).sort((a,b) => (a.sortIndex || 0) - (b.sortIndex || 0))}
                                onEdit={openEditModal}
                                onDelete={removeTeacher}
                                isBulkEdit={isBulkEdit}
                                onUpdateTeacher={(updated: TeacherData) => {
                                    setTeachers(teachers.map(t => t.id === updated.id ? updated : t));
                                    setIsDirty(true);
                                }}
                                onMoveUp={(id: string) => moveTeacher(id, 'up')}
                                onMoveDown={(id: string) => moveTeacher(id, 'down')}
                            />
                        </div>
                        <div className="md:hidden print:hidden p-4 bg-gray-50">
                             <AdminCardList 
                                admins={teachers.filter(t => t.isAdmin)}
                                onEdit={openEditModal}
                                onDelete={removeTeacher}
                             />
                        </div>
                    </div>
                </div>
            )}
        
        {/* Modal */}
        {showModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
                <Card className="w-full max-w-lg shadow-2xl relative" noHover>
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            {modalMode === 'edit' ? <Edit className="w-5 h-5 text-primary"/> : modalMode === 'add_admin' ? <Shield className="w-5 h-5 text-blue-500"/> : <Plus className="w-5 h-5 text-green-500"/>}
                            {modalMode === 'edit' ? 'تعديل بيانات' : modalMode === 'add_admin' ? 'إضافة إداري' : 'إضافة معلم جديد'}
                        </h2>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold mb-1">الاسم الثلاثي</label>
                            <input type="text" value={currentTeacher.name} onChange={e => setCurrentTeacher({...currentTeacher, name: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold mb-1">رقم الجوال</label>
                            <input type="text" value={currentTeacher.mobile} onChange={e => setCurrentTeacher({...currentTeacher, mobile: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" />
                        </div>

                        {currentTeacher.isAdmin ? (
                            <div>
                                <label className="block text-sm font-bold mb-1">الدور الوظيفي</label>
                                <select value={currentTeacher.adminRole} onChange={e => setCurrentTeacher({...currentTeacher, adminRole: e.target.value})} className="w-full p-2 border rounded-lg">
                                    {ADMIN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-bold mb-1">التخصص</label>
                                <select value={currentTeacher.specialization} onChange={e => setCurrentTeacher({...currentTeacher, specialization: e.target.value})} className="w-full p-2 border rounded-lg">
                                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border">
                             {!currentTeacher.isAdmin && (
                                 <div>
                                    <label className="block text-sm font-bold mb-1 text-gray-700">نصاب الحصص</label>
                                    <input type="number" value={currentTeacher.weeklyQuota} onChange={e => {
                                            const val = Number(e.target.value);
                                            setCurrentTeacher({...currentTeacher, weeklyQuota: val, waitingQuota: val >= 24 ? 0 : currentTeacher.waitingQuota});
                                        }} className="w-full p-2 border rounded-lg text-center font-bold" min={0} max={24} />
                                </div>
                             )}
                             <div className={currentTeacher.isAdmin ? "col-span-2" : ""}>
                                <label className="block text-sm font-bold mb-1 text-gray-700">نصاب الانتظار</label>
                                <input type="number" value={currentTeacher.waitingQuota} onChange={e => setCurrentTeacher({...currentTeacher, waitingQuota: Number(e.target.value)})} className="w-full p-2 border rounded-lg text-center font-bold" disabled={currentTeacher.weeklyQuota === 24 && !currentTeacher.isAdmin} />
                             </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <Button variant="ghost" onClick={() => setShowModal(false)}>إلغاء</Button>
                            <Button onClick={saveTeacherFromModal}>حفظ</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )}
    </div>
  );
}

// Teacher Table Component
function TeacherTable({ teachers, showSortControls, onMoveUp, onMoveDown, onEdit, onDelete, isBulkEdit, onUpdateTeacher }: any) {
    const [dropdown, setDropdown] = useState<{ teacherId: string; top: number; right: number } | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const openDropdown = (e: React.MouseEvent, teacherId: string) => {
        e.stopPropagation();
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDeleteConfirm(null);
        setDropdown({ teacherId, top: rect.bottom + 4, right: window.innerWidth - rect.right });
    };

    useEffect(() => {
        if (!dropdown) return;
        const close = () => setDropdown(null);
        document.addEventListener('click', close);
        document.addEventListener('scroll', close, true);
        return () => {
            document.removeEventListener('click', close);
            document.removeEventListener('scroll', close, true);
        };
    }, [dropdown]);

    return (
        <>
        <table className="w-full text-right">
            <thead className="bg-white border-b text-sm text-gray-500">
                <tr>
                    <th className="px-6 py-4 font-medium w-16">#</th>
                    <th className="px-6 py-4 font-medium min-w-[200px]">الاسم</th>
                    <th className="px-6 py-4 font-medium">الجوال</th>
                    {!showSortControls && <th className="px-6 py-4 font-medium">التخصص</th>}
                    <th className="px-6 py-4 font-medium text-center w-32">نصاب الحصص</th>
                    <th className="px-6 py-4 font-medium text-center w-32">نصاب الانتظار</th>
                    <th className="px-6 py-4 font-medium text-center">الإجمالي</th>
                    <th className="px-6 py-4 font-medium w-32 print:hidden">إجراءات</th>
                </tr>
            </thead>
            <tbody className="divide-y relative">
                {teachers.map((t: TeacherData, idx: number) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors group relative z-0">
                        <td className="px-6 py-4 text-gray-400 text-sm">
                            {showSortControls && !isBulkEdit ? (
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                        <button onClick={() => onMoveUp(t.id, 'up')} disabled={idx === 0} className="hover:text-primary disabled:opacity-20"><ChevronUp className="w-4 h-4"/></button>
                                        <button onClick={() => onMoveDown(t.id, 'down')} disabled={idx === teachers.length - 1} className="hover:text-primary disabled:opacity-20"><ChevronDown className="w-4 h-4"/></button>
                                    </div>
                                    <span>{idx + 1}</span>
                                </div>
                            ) : idx + 1}
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-800">
                            {isBulkEdit ? (
                                <input 
                                    type="text" 
                                    value={t.name} 
                                    onChange={(e) => onUpdateTeacher({ ...t, name: e.target.value })}
                                    className="w-full p-1 border rounded focus:ring-2 focus:ring-primary outline-none"
                                />
                            ) : t.name}
                        </td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-600">
                            {isBulkEdit ? (
                                <input 
                                    type="text" 
                                    value={t.mobile} 
                                    onChange={(e) => onUpdateTeacher({ ...t, mobile: e.target.value })}
                                    className="w-full p-1 border rounded focus:ring-2 focus:ring-primary outline-none dir-ltr text-right"
                                />
                            ) : t.mobile}
                        </td>
                        {!showSortControls && <td className="px-6 py-4 text-sm"><Badge variant="neutral">{t.specialization}</Badge></td>}
                        
                        <td className="px-6 py-4 text-center font-bold text-gray-700">
                            {isBulkEdit ? (
                                <input 
                                    type="number" 
                                    value={t.weeklyQuota} 
                                    onChange={(e) => onUpdateTeacher({ ...t, weeklyQuota: Number(e.target.value) })}
                                    className="w-20 p-1 border rounded focus:ring-2 focus:ring-primary outline-none text-center"
                                />
                            ) : t.weeklyQuota}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-orange-600">
                            {isBulkEdit ? (
                                <input 
                                    type="number" 
                                    value={t.waitingQuota} 
                                    onChange={(e) => onUpdateTeacher({ ...t, waitingQuota: Number(e.target.value) })}
                                    className="w-20 p-1 border rounded focus:ring-2 focus:ring-primary outline-none text-center"
                                />
                            ) : t.waitingQuota}
                        </td>
                        <td className="px-6 py-4 text-center font-black text-primary">{(t.weeklyQuota || 0) + (t.waitingQuota || 0)}</td>
                        
                        <td className="px-6 py-4 print:hidden">
                            {!isBulkEdit && (
                                <button
                                    onClick={e => openDropdown(e, t.id)}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-all"
                                >
                                    <MoreHorizontal size={16} />
                                </button>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* Dropdown Portal */}
        {dropdown && createPortal(
            <div
                className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5"
                style={{ top: dropdown.top, right: dropdown.right, minWidth: 175 }}
                onClick={e => e.stopPropagation()}
            >
                {/* تعديل */}
                <button
                    onClick={() => {
                        const t = teachers.find((x: any) => x.id === dropdown.teacherId);
                        if (t) { onEdit(t); setDropdown(null); }
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                >
                    <Edit size={15} className="text-primary" /> تعديل
                </button>

                {/* نسخ النصاب */}
                <button
                    onClick={() => {
                        const t = teachers.find((x: any) => x.id === dropdown.teacherId);
                        if (t && onUpdateTeacher) {
                            teachers.forEach((other: any) => {
                                if (other.id !== t.id) {
                                    onUpdateTeacher({ ...other, weeklyQuota: t.weeklyQuota, waitingQuota: t.waitingQuota });
                                }
                            });
                        }
                        setDropdown(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-colors"
                >
                    <Copy size={15} className="text-primary" /> نسخ النصاب
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* حذف */}
                {deleteConfirm === dropdown.teacherId ? (
                    <div className="px-4 py-2.5">
                        <p className="text-xs text-rose-600 font-bold mb-2">تأكيد الحذف؟</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { onDelete(dropdown.teacherId); setDropdown(null); setDeleteConfirm(null); }}
                                className="flex-1 py-1.5 bg-rose-500 text-white text-xs rounded-lg font-black"
                            >حذف</button>
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="flex-1 py-1.5 bg-slate-100 text-slate-600 text-xs rounded-lg font-black"
                            >إلغاء</button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setDeleteConfirm(dropdown.teacherId)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 font-bold transition-colors"
                    >
                        <Trash2 size={15} /> حذف المعلم
                    </button>
                )}
            </div>,
            document.body
        )}
        </>
    );
}

function TeacherCardList({ teachers, onEdit, onDelete }: any) {
    return (
        <div className="grid grid-cols-1 gap-4 p-4">
            {teachers.map((t: TeacherData) => (
                <div key={t.id} className="bg-white rounded-xl border shadow-sm p-4 relative">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">{t.name}</h3>
                            <p className="text-gray-500 text-sm font-mono mt-1">{t.mobile}</p>
                        </div>
                        <Badge variant="neutral">{t.specialization}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <span className="text-xs text-gray-500 block mb-1">حصص</span>
                            <span className="font-bold text-gray-800">{t.weeklyQuota}</span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                            <span className="text-xs text-gray-500 block mb-1">انتظار</span>
                            <span className="font-bold text-orange-600">{t.waitingQuota}</span>
                        </div>
                        <div className="bg-primary/5 rounded-lg p-2 text-center">
                            <span className="text-xs text-primary block mb-1">المجموع</span>
                            <span className="font-black text-primary">{(t.weeklyQuota || 0) + (t.waitingQuota || 0)}</span>
                        </div>
                    </div>

                    <div className="flex gap-2 border-t pt-3">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1" 
                            onClick={() => onEdit(t)}
                            icon={Edit}
                        >
                            تعديل
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-1" 
                            onClick={() => onDelete(t.id)}
                            icon={Trash2}
                        >
                            حذف
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AdminCardList({ admins, onEdit, onDelete }: any) {
    return (
        <div className="grid grid-cols-1 gap-4">
            {admins.map((admin: TeacherData) => (
                <div key={admin.id} className="bg-white rounded-xl border shadow-sm p-4 relative">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                {admin.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{admin.name}</h3>
                                <p className="text-gray-500 text-sm font-mono mt-1">{admin.mobile}</p>
                            </div>
                        </div>
                        <Badge variant="neutral" className="bg-white border shadow-sm">{admin.adminRole}</Badge>
                    </div>
                     <div className="bg-blue-50/50 rounded-lg p-3 text-center mb-4 border border-blue-100">
                        <span className="text-xs text-blue-500 block mb-1 font-bold">نصاب الانتظار</span>
                        <span className="font-black text-blue-700 text-lg">{admin.waitingQuota}</span>
                    </div>

                    <div className="flex gap-2 border-t pt-3">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-blue-500 hover:text-blue-600 hover:bg-blue-50 flex-1" 
                            onClick={() => onEdit(admin)}
                            icon={Edit}
                        >
                            تعديل
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 flex-1" 
                            onClick={() => onDelete(admin.id)}
                            icon={Trash2}
                        >
                            حذف
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function AdminTable({ admins, onEdit, onDelete, isBulkEdit, onUpdateTeacher, onMoveUp, onMoveDown }: any) {
    return (
        <table className="w-full text-right">
            <thead className="bg-[#f8fafc] text-gray-500 font-medium">
            <tr>
                    <th className="p-4 w-16">#</th>
                    <th className="p-4 min-w-[200px]">الاسم</th>
                    <th className="p-4">الدور الوظيفي</th>
                    <th className="p-4">رقم الجوال</th>
                    <th className="p-4 text-center w-32">نصاب الانتظار</th>
                    <th className="p-4 w-32 print:hidden">إجراءات</th>
            </tr>
            </thead>
            <tbody className="divide-y text-gray-700">
                {admins.map((admin: TeacherData, idx: number) => (
                    <tr key={admin.id} className="hover:bg-blue-50/30 transition-colors group">
                        <td className="p-4 text-gray-400">
                             {!isBulkEdit ? (
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
                                        <button onClick={() => onMoveUp(admin.id)} disabled={idx === 0} className="hover:text-primary disabled:opacity-20"><ChevronUp className="w-4 h-4"/></button>
                                        <button onClick={() => onMoveDown(admin.id)} disabled={idx === admins.length - 1} className="hover:text-primary disabled:opacity-20"><ChevronDown className="w-4 h-4"/></button>
                                    </div>
                                    <span>{idx + 1}</span>
                                </div>
                            ) : idx + 1}
                        </td>
                        <td className="p-4 font-bold flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs print:hidden">
                                {admin.name.charAt(0)}
                            </div>
                            {isBulkEdit ? (
                                <input 
                                    type="text" 
                                    value={admin.name} 
                                    onChange={(e) => onUpdateTeacher({ ...admin, name: e.target.value })}
                                    className="w-full p-1 border rounded focus:ring-2 focus:ring-primary outline-none"
                                />
                            ) : admin.name}
                        </td>
                        <td className="p-4">
                            {isBulkEdit ? (
                                <select 
                                    value={admin.adminRole} 
                                    onChange={(e) => onUpdateTeacher({ ...admin, adminRole: e.target.value })}
                                    className="w-full p-1 border rounded focus:ring-2 focus:ring-primary outline-none"
                                >
                                    {ADMIN_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            ) : <Badge variant="neutral" className="bg-white border shadow-sm">{admin.adminRole}</Badge>}
                        </td>
                        <td className="p-4 font-mono text-sm">
                             {isBulkEdit ? (
                                <input 
                                    type="text" 
                                    value={admin.mobile} 
                                    onChange={(e) => onUpdateTeacher({ ...admin, mobile: e.target.value })}
                                    className="w-full p-1 border rounded focus:ring-2 focus:ring-primary outline-none dir-ltr text-right"
                                />
                            ) : admin.mobile}
                        </td>
                        <td className="p-4 text-center font-bold text-blue-600">
                            {isBulkEdit ? (
                                <input 
                                    type="number" 
                                    value={admin.waitingQuota} 
                                    onChange={(e) => onUpdateTeacher({ ...admin, waitingQuota: Number(e.target.value) })}
                                    className="w-20 p-1 border rounded focus:ring-2 focus:ring-primary outline-none text-center"
                                />
                            ) : admin.waitingQuota}
                        </td>
                        <td className="p-4 flex gap-2 print:hidden">
                            {!isBulkEdit && (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => onEdit(admin)}><Edit className="w-4 h-4 text-blue-400"/></Button>
                                    <Button size="sm" variant="ghost" onClick={() => onDelete(admin.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
                                </>
                            )}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
