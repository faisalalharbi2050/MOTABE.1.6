import React from "react";
import {
  Home,
  Settings,
  Users,
  Calendar,
  Clock,
  UserX,
  FileText,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Building,
  Bell,
  MessageSquare,
  CreditCard,
  LogOut,
  Menu,
  X,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  Send,
  Smartphone,
  Shield,
  LayoutDashboard,
  ClipboardList,
  Eye,
  ShieldCheck,
  CircleHelp,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  School,
  BookOpen,
  Layers,
  LayoutGrid,
  UserCog,
  Lock,
  CalendarCheck,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isScheduleExpanded, setIsScheduleExpanded] = React.useState(false);
  const [isSettingsExpanded, setIsSettingsExpanded] = React.useState(false);
  const [isSupervisionExpanded, setIsSupervisionExpanded] = React.useState(false);

  // Auto-expand if a sub-item is active
  React.useEffect(() => {
    const scheduleTabs = ['manual', 'schedule_v2'];
    if (scheduleTabs.includes(activeTab)) {
      setIsScheduleExpanded(true);
      if (isCollapsed) setIsCollapsed(false); // Auto-open sidebar if a sub-item is active (e.g. on load)
    }
    const settingsTabs = ['settings_basic', 'settings_timing', 'settings_subjects', 'settings_classes', 'settings_teachers', 'settings_admins', 'settings_students'];
    if (settingsTabs.includes(activeTab)) {
      setIsSettingsExpanded(true);
      if (isCollapsed) setIsCollapsed(false);
    }
    const supervisionTabs = ['supervision', 'duty'];
    if (supervisionTabs.includes(activeTab)) {
      setIsSupervisionExpanded(true);
      if (isCollapsed) setIsCollapsed(false);
    }
  }, [activeTab]);

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    // If collapsing, close the schedule menu to avoid popup confusion, or keep it? 
    // UX decision: Close sub-menus when collapsing for cleaner look.
    if (!isCollapsed) {
        setIsScheduleExpanded(false);
        setIsSettingsExpanded(false);
        setIsSupervisionExpanded(false);
    }
  };

  const handleScheduleClick = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setTimeout(() => setIsScheduleExpanded(true), 150); // slight delay for smooth expansion
    } else {
      setIsScheduleExpanded(!isScheduleExpanded);
    }
  };

  const toggleSettings = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setTimeout(() => setIsSettingsExpanded(true), 150);
    } else {
      setIsSettingsExpanded(!isSettingsExpanded);
    }
  };

  const toggleSupervision = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setTimeout(() => setIsSupervisionExpanded(true), 150);
    } else {
      setIsSupervisionExpanded(!isSupervisionExpanded);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
        fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto
        h-full bg-[#655ac1] shadow-2xl
        transform transition-all duration-300 ease-in-out
        ${isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "w-24 px-2" : "w-72 lg:w-[18rem]"}
        flex flex-col shrink-0 font-sans rounded-none overflow-hidden
      `}
      >
        {/* Header / Logo Area */}
        <div className={`
             flex items-center shrink-0 transition-all duration-300 relative
             ${isCollapsed ? "h-24 justify-center" : "h-28 justify-between px-6"}
        `}>
           
           {/* Logo Content */}
           <div className={`flex items-center transition-opacity duration-300 ${isCollapsed ? "hidden" : "flex"}`}>
             <img
               src="/logo-white.png"
               alt="متابع"
               className="h-12 w-auto select-none drop-shadow-sm"
               draggable={false}
             />
           </div>

           {/* Collapsed Logo (Shown when collapsed) */}
            <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${isCollapsed ? "opacity-100" : "opacity-0"}`}>
               <img
                 src="/logo-white.png"
                 alt="متابع"
                 className="h-9 w-auto select-none drop-shadow-sm"
                 draggable={false}
               />
            </div>

           {/* Toggle Button */}
            <button 
               onClick={toggleCollapse}
               className={`
                  p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors z-20
                  ${isCollapsed ? "mt-16" : ""} 
               `}
               title={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
            >
               {isCollapsed ? <Menu size={24} /> : <Menu size={24} />}
            </button>
        </div>

        {/* Divider if not collapsed */}
        {!isCollapsed && <div className="mx-6 h-px bg-white/10 w-auto opacity-50 mb-2"></div>}
        {isCollapsed && <div className="mx-4 h-px bg-white/10 w-full opacity-50 my-2"></div>}


        {/* Navigation Scroll Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar-white py-2 pl-0 pr-0 space-y-2"> {/* Increased gap for better hit targets */}
          
          <NavItem
            active={activeTab === "dashboard"}
            onClick={() => handleTabClick("dashboard")}
            icon={<LayoutDashboard size={22} />}
            label="الرئيسية"
            collapsed={isCollapsed}
          />
          
          {/* Settings Section */}
           {/* Parent Button */}
           <button
              onClick={toggleSettings}
              className={`
                 w-full flex items-center transition-all duration-300 group relative
                 ${isCollapsed ? "justify-center px-0 py-3" : "justify-between px-6 py-4"}
                 ${isSettingsExpanded && !isCollapsed
                   ? 'bg-white text-[#655ac1] rounded-r-3xl rounded-l-none ml-0 shadow-lg z-30' 
                   : 'text-white/80 hover:bg-white/5 hover:text-white rounded-r-3xl mx-0'}
              `}
           >
              {/* Tooltip for Collapsed */}
              {isCollapsed && (
                 <div className="absolute left-full ml-4 px-3 py-2 bg-[#483d8b] text-white text-sm font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                    الإعدادات
                    {/* Arrow */}
                    <div className="absolute top-1/2 right-full -mt-1 -mr-1 border-4 border-transparent border-r-[#483d8b]"></div>
                 </div>
              )}

              <div className={`flex items-center gap-4 ${isCollapsed ? "" : ""}`}>
                 <Settings size={22} className={isSettingsExpanded && !isCollapsed ? "text-[#655ac1]" : "text-white/70 group-hover:text-white"} />
                 {!isCollapsed && (
                     <span className={`text-base font-bold ${isSettingsExpanded ? "text-[#655ac1]" : ""}`}>الإعدادات</span>
                 )}
              </div>
              
              {!isCollapsed && (
                  <ChevronDown
                     size={18}
                     className={`transition-transform duration-300 ${isSettingsExpanded ? "rotate-180 text-[#655ac1]" : "text-white/60"}`}
                  />
              )}
           </button>
          
          {/* Settings Sub-sections */}
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed || !isSettingsExpanded ? 'max-h-0' : 'max-h-[600px]'}`}>
             <div className="flex flex-col gap-1 pb-2">
                <SubNavItem
                   active={activeTab === "settings_basic"}
                   onClick={() => handleTabClick("settings_basic")}
                   label="معلومات عامة"
                   icon={<School size={18} />}
                   inverted={true}
                />
                <SubNavItem
                   active={activeTab === "settings_timing"}
                   onClick={() => handleTabClick("settings_timing")}
                   label="التوقيت"
                   icon={<Clock size={18} />}
                   inverted={true}
                />
                <SubNavItem
                   active={activeTab === "settings_subjects"}
                   onClick={() => handleTabClick("settings_subjects")}
                   label="المواد"
                   icon={<Layers size={18} />}
                   inverted={true}
                />
                <SubNavItem
                   active={activeTab === "settings_classes"}
                   onClick={() => handleTabClick("settings_classes")}
                   label="الفصول"
                   icon={<LayoutGrid size={18} />}
                   inverted={true}
                />
                <SubNavItem
                   active={activeTab === "settings_teachers"}
                   onClick={() => handleTabClick("settings_teachers")}
                   label="المعلمون"
                   icon={<Users size={18} />}
                   inverted={true}
                />
                <SubNavItem
                   active={activeTab === "settings_admins"}
                   onClick={() => handleTabClick("settings_admins")}
                   label="الإداريون"
                   icon={<UserCog size={18} />}
                   inverted={true}
                />
                <SubNavItem
                   active={activeTab === "settings_students"}
                   onClick={() => handleTabClick("settings_students")}
                   label="الطلاب"
                   icon={<GraduationCap size={18} />}
                   inverted={true}
                />
             </div>
          </div>
          
          {/* Schedule Section */}
           <div className="mt-2">
            
            {/* Parent Button */}
            <button
               onClick={handleScheduleClick}
               className={`
                  w-full flex items-center transition-all duration-300 group relative
                  ${isCollapsed ? "justify-center px-0 py-3" : "justify-between px-6 py-4"}
                  ${isScheduleExpanded && !isCollapsed
                    ? 'bg-white text-[#655ac1] rounded-r-3xl rounded-l-none ml-0 shadow-lg z-30' 
                    : 'text-white/80 hover:bg-white/5 hover:text-white rounded-r-3xl mx-0'}
               `}
            >
               {/* Tooltip for Collapsed */}
               {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-[#483d8b] text-white text-sm font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                     الجدول المدرسي
                     {/* Arrow */}
                     <div className="absolute top-1/2 right-full -mt-1 -mr-1 border-4 border-transparent border-r-[#483d8b]"></div>
                  </div>
               )}

               <div className={`flex items-center gap-4 ${isCollapsed ? "" : ""}`}>
                  <Calendar size={22} className={isScheduleExpanded && !isCollapsed ? "text-[#655ac1]" : "text-white/70 group-hover:text-white"} />
                  {!isCollapsed && (
                      <span className={`text-base font-bold ${isScheduleExpanded ? "text-[#655ac1]" : ""}`}>الجدول المدرسي</span>
                  )}
               </div>
               
               {!isCollapsed && (
                   <ChevronDown
                      size={18}
                      className={`transition-transform duration-300 ${isScheduleExpanded ? "rotate-180 text-[#655ac1]" : "text-white/60"}`}
                   />
               )}
            </button>

            {/* Sub-menu */}
            <div 
               className={`overflow-hidden transition-all duration-500 ease-in-out bg-[#655ac1] 
                  ${isScheduleExpanded && !isCollapsed ? 'max-h-[600px] opacity-100 pb-2' : 'max-h-0 opacity-0'}
               `}
            >
               <div className="flex flex-col pt-2 gap-2">

                  <SubNavItem
                     active={activeTab === "manual"}
                     onClick={() => handleTabClick("manual")}
                     label="إسناد المواد"
                     icon={<ClipboardList size={18} />}
                     inverted={true}
                  />
                  <SubNavItem
                     active={activeTab === "schedule_v2"}
                     onClick={() => handleTabClick("schedule_v2")}
                     label="إدارة الحصص والانتظار"
                     icon={<CalendarCheck size={18} />}
                     inverted={true}
                  />
               </div>
            </div>
           </div>

          {/* Supervision and Duty Section */}
           <div className="mt-2">
            
            {/* Parent Button */}
            <button
               onClick={toggleSupervision}
               className={`
                  w-full flex items-center transition-all duration-300 group relative
                  ${isCollapsed ? "justify-center px-0 py-3" : "justify-between px-6 py-4"}
                  ${isSupervisionExpanded && !isCollapsed
                    ? 'bg-white text-[#655ac1] rounded-r-3xl rounded-l-none ml-0 shadow-lg z-30' 
                    : 'text-white/80 hover:bg-white/5 hover:text-white rounded-r-3xl mx-0'}
               `}
            >
               {/* Tooltip for Collapsed */}
               {isCollapsed && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-[#483d8b] text-white text-sm font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                     الإشراف والمناوبة
                     {/* Arrow */}
                     <div className="absolute top-1/2 right-full -mt-1 -mr-1 border-4 border-transparent border-r-[#483d8b]"></div>
                  </div>
               )}

               <div className={`flex items-center gap-4 ${isCollapsed ? "" : ""}`}>
                  <ShieldCheck size={22} className={isSupervisionExpanded && !isCollapsed ? "text-[#655ac1]" : "text-white/70 group-hover:text-white"} />
                  {!isCollapsed && (
                      <span className={`text-base font-bold ${isSupervisionExpanded ? "text-[#655ac1]" : ""}`}>الإشراف والمناوبة</span>
                  )}
               </div>
               
               {!isCollapsed && (
                   <ChevronDown
                      size={18}
                      className={`transition-transform duration-300 ${isSupervisionExpanded ? "rotate-180 text-[#655ac1]" : "text-white/60"}`}
                   />
               )}
            </button>

            {/* Sub-menu */}
            <div 
               className={`overflow-hidden transition-all duration-500 ease-in-out bg-[#655ac1] 
                  ${isSupervisionExpanded && !isCollapsed ? 'max-h-[600px] opacity-100 pb-2' : 'max-h-0 opacity-0'}
               `}
            >
               <div className="flex flex-col pt-2 gap-2">

                  <SubNavItem
                     active={activeTab === "supervision"}
                     onClick={() => handleTabClick("supervision")}
                     label="الإشراف اليومي"
                     icon={<Eye size={18} />}
                     inverted={true}
                  />
                  <SubNavItem
                     active={activeTab === "duty"}
                     onClick={() => handleTabClick("duty")}
                     label="المناوبة اليومية"
                     icon={<ShieldCheck size={18} />}
                     inverted={true}
                  />
               </div>
            </div>
           </div>


          <div className={`${isCollapsed ? "px-2" : "px-6"} mt-4 mb-2 transition-all`}>
             <div className="h-px bg-white/10 w-full opacity-50"></div>
          </div>

          <NavItem
            active={activeTab === "daily_waiting"}
            onClick={() => handleTabClick("daily_waiting")}
            icon={<UserX size={22} />}
            label="الانتظار اليومي"
            collapsed={isCollapsed}
          />
          <NavItem
            active={activeTab === "permissions"}
            onClick={() => handleTabClick("permissions")}
            icon={<Lock size={22} />}
            label="الصلاحيات"
            collapsed={isCollapsed}
          />
          <NavItem
            active={activeTab === "messages"}
            onClick={() => handleTabClick("messages")}
            icon={<MessageSquare size={22} />}
            label="الرسائل"
            collapsed={isCollapsed}
          />

           <div className={`${isCollapsed ? "px-2" : "px-6"} mt-4 mb-2 transition-all`}>
             <div className="h-px bg-white/10 w-full opacity-50"></div>
          </div>

          <NavItem
            active={activeTab === "subscription"}
            onClick={() => handleTabClick("subscription")}
            icon={<CreditCard size={22} />}
            label="الاشتراك والفوترة"
            collapsed={isCollapsed}
          />
          <NavItem
            active={activeTab === "support"}
            onClick={() => handleTabClick("support")}
            icon={<CircleHelp size={22} />}
            label="الدعم والمساعدة"
            collapsed={isCollapsed}
          />
        </div>

        {/* Footer */}
        <div className={`p-6 text-center shrink-0 transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100"}`}>
          <p className="text-[10px] font-medium text-white/40">
           v1.5.0 © 2024 Motabe System
          </p>
        </div>
      </aside>
    </>
  );
};

// --- Sub Components ---

interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label, collapsed }) => (
  <div className={`relative my-1 group ${collapsed ? "flex justify-center" : "pl-0 pr-0"}`}>
    
    {/* Tooltip for Collapsed Mode */}
    {collapsed && (
       <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-4 px-3 py-2 bg-[#483d8b] text-white text-sm font-bold rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
          {label}
          {/* Arrow */}
          <div className="absolute top-1/2 right-full -mt-1 -mr-1 border-4 border-transparent border-r-[#483d8b]"></div>
       </div>
    )}

    <button
      onClick={onClick}
      className={`
        flex items-center transition-all duration-300 relative z-20 group
        ${
          collapsed 
            ? `justify-center p-3 rounded-xl hover:bg-white/10 ${active ? "bg-white text-[#655ac1] shadow-lg" : "text-white/70"}`
            : `w-full gap-4 px-6 py-4 rounded-r-3xl rounded-l-none mx-0 ${active ? "bg-[#fcfbff] text-[#655ac1] shadow-sm ring-0" : "text-white/80 hover:bg-white/10 hover:text-white"}`
        }
      `}
    >
      <div
        className={`transform transition-transform duration-300 ${
          active ? (collapsed ? "" : "scale-110") : "group-hover:scale-110"
        }`}
      >
        {icon}
      </div>
      
      {!collapsed && (
        <span className={`text-base font-bold tracking-wide transition-colors ${active ? "text-[#655ac1]" : ""}`}>
          {label}
        </span>
      )}
    </button>
  </div>
);

const SubNavItem: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
  inverted?: boolean;
}> = ({ active, onClick, label, icon, inverted }) => (
  <button
    onClick={onClick}
    className={`
        w-[85%] mr-auto ml-4 flex items-center gap-3 px-4 py-3 text-sm font-bold transition-all relative rounded-xl border
        ${
          active
            ? inverted 
                ? "text-white bg-[#655ac1] border-white/30 shadow-md ring-1 ring-white/20" 
                : "text-white bg-[#655ac1] border-white/30 shadow-sm ring-1 ring-white/20"
            : inverted
                ? "text-white/80 hover:text-white hover:bg-[#655ac1]/50 border-transparent hover:border-white/30"
                : "text-white/70 hover:text-white hover:bg-white/5 border-transparent"
        }
    `}
  >
    <div className={`${active ? "text-white scale-110" : "text-white/80 group-hover:text-white"}`}>
        {icon}
    </div>
    <span className="truncate">{label}</span>
  </button>
);

export default Sidebar;

