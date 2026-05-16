import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string | React.ReactNode;
  children?: React.ReactNode; // The Action Bar content
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500 space-y-4 sticky top-0 z-[9999]">
      
      {/* 1. Title Bar */}
      <div className="bg-white rounded-[2rem] p-8 shadow-lg shadow-slate-200/60 border border-slate-200 hover:shadow-xl hover:shadow-slate-200/70 transition-all duration-300">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                   <span className="bg-primary/10 w-2 h-8 rounded-full inline-block"></span>
                   {title}
                </h1>
                {subtitle && (
                  <div className="text-gray-500 font-medium text-sm md:text-base mt-2 mr-5">
                    {subtitle}
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* 2. Actions Bar (Only if actions exist) */}
      {children && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/60 flex flex-col lg:flex-row lg:items-center gap-4 transition-all relative z-50">
          {children}
        </div>
      )}
    </div>
  );
}
