"use client";

import { useState, useEffect, useMemo } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getWeekRecords, updateRecord, HomeworkRecord } from "@/app/actions";

const DAYS = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"];

interface HomeworkTrackerProps {
  semesterSubjects: string[];
  vacationSubjects: string[];
}

export default function HomeworkTracker({ semesterSubjects, vacationSubjects }: HomeworkTrackerProps) {
  const [mode, setMode] = useState<"semester" | "vacation">("semester");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);

  const subjects = mode === "semester" ? semesterSubjects : vacationSubjects;
  const title = mode === "semester" ? "Raon Kwon's Homework" : "Raon's Vacation Homework";

  // Derive the start of the week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const formattedWeekStart = format(weekStart, "yyyy-MM-dd");
  const displayDateRange = `${format(weekStart, "MMM d, yyyy")} - ${format(weekEnd, "MMM d, yyyy")}`;

  // Use a stable reference for all subjects to avoid unnecessary effect re-runs
  const allSubjects = useMemo(() => [...semesterSubjects, ...vacationSubjects], [semesterSubjects, vacationSubjects]);

  // Fetch data for the current week for ALL subjects at once
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const data = await getWeekRecords(formattedWeekStart);
      
      const newRecords: Record<string, Record<string, string>> = {};
      
      // Initialize default empty strings for ALL subjects
      allSubjects.forEach((subject) => {
        if (!newRecords[subject]) {
          newRecords[subject] = {};
          DAYS.forEach((day) => {
            newRecords[subject][day] = ""; // Default
          });
        }
      });

      data.forEach((record: HomeworkRecord) => {
        if (newRecords[record.subject]) {
          newRecords[record.subject][record.day] = record.status;
        }
      });

      setRecords(newRecords);
      setIsLoading(false);
    }

    loadData();
  }, [formattedWeekStart, allSubjects]);

  const handlePrevWeek = () => setCurrentDate((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate((prev) => addWeeks(prev, 1));

  const handleCellClick = async (subject: string, day: string) => {
    if (isLoading) return;

    const currentState = records[subject][day] ?? "";
    let nextState = "-";
    if (currentState === "") nextState = "-";
    else if (currentState === "-") nextState = "△";
    else if (currentState === "△") nextState = "O";
    else if (currentState === "O") nextState = "X";
    else if (currentState === "X") nextState = "";

    // Optimistic UI update
    setRecords((prev) => ({
      ...prev,
      [subject]: {
        ...prev[subject],
        [day]: nextState,
      },
    }));

    // Auto-save to DB
    await updateRecord({
      week_start_date: formattedWeekStart,
      subject,
      day,
      status: nextState,
    });
  };

  const getCellClasses = (status: string) => {
    const base = "w-full h-full min-h-[36px] md:min-h-[40px] flex items-center justify-center text-sm md:text-base cursor-pointer select-none rounded-md transition-colors";
    if (status === "O") return `${base} bg-green-100 text-green-600 font-bold border-2 border-green-500 shadow-sm`;
    if (status === "X") return `${base} bg-red-100 text-red-600 font-bold border-2 border-red-500 shadow-sm`;
    if (status === "△") return `${base} bg-amber-100 text-amber-600 font-bold border-2 border-amber-500 shadow-sm`;
    if (status === "-") return `${base} bg-slate-200 text-slate-500 font-bold border-2 border-slate-300 shadow-sm`;
    return `${base} bg-transparent hover:bg-slate-50 border border-slate-100`;
  };

  const themeClasses = mode === "semester" 
    ? {
        header: "bg-slate-800",
        controls: "bg-slate-700",
        controlHover: "hover:bg-slate-600",
        bgLight: "bg-slate-50",
        activeTab: "bg-slate-800 text-white shadow-md transform scale-105",
        inactiveTab: "bg-white text-slate-600 hover:bg-slate-100 shadow-sm border border-slate-200",
        spinner: "border-slate-800"
      }
    : {
        header: "bg-teal-600",
        controls: "bg-teal-500",
        controlHover: "hover:bg-teal-400",
        bgLight: "bg-teal-50",
        activeTab: "bg-teal-600 text-white shadow-md transform scale-105",
        inactiveTab: "bg-white text-teal-600 hover:bg-teal-50 shadow-sm border border-teal-200",
        spinner: "border-teal-600"
      };

  return (
    <main className={`min-h-screen ${themeClasses.bgLight} p-2 md:p-3 font-sans transition-colors duration-300`}>
      {/* Navigation Tabs - No Link for instant mode switch */}
      <div className="max-w-7xl mx-auto mb-2 flex justify-center gap-4">
        <button 
          onClick={() => setMode("semester")}
          className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${
            mode === 'semester' ? themeClasses.activeTab : themeClasses.inactiveTab
          }`}
        >
          학기 중
        </button>
        <button 
          onClick={() => setMode("vacation")}
          className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${
            mode === 'vacation' ? themeClasses.activeTab : themeClasses.inactiveTab
          }`}
        >
          방학
        </button>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100">
        {/* Header */}
        <header className={`${themeClasses.header} text-white p-3 md:p-4 flex flex-col md:flex-row justify-between items-center gap-3 transition-colors duration-300`}>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h1>
          
          <div className={`flex items-center ${themeClasses.controls} rounded-full px-2 py-1 shadow-inner transition-colors duration-300`}>
            <button 
              onClick={handlePrevWeek}
              className={`p-1.5 md:p-2 ${themeClasses.controlHover} rounded-full transition-colors`}
              aria-label="Previous week"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-3 md:px-4 font-medium text-sm md:text-base min-w-[200px] text-center">
              {displayDateRange}
            </span>
            <button 
              onClick={handleNextWeek}
              className={`p-1.5 md:p-2 ${themeClasses.controlHover} rounded-full transition-colors`}
              aria-label="Next week"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        {/* Main Table Container */}
        <div className="p-2 md:p-4 overflow-x-auto">
          <table className="w-full border-collapse min-w-[600px] md:min-w-[800px]">
            <thead>
              <tr>
                <th className="p-2 md:p-3 border-b-2 border-slate-200 text-left text-slate-500 font-semibold w-1/4 text-sm md:text-base">
                  Subject
                </th>
                {DAYS.map((day) => (
                  <th key={day} className="p-2 md:p-3 border-b-2 border-slate-200 text-center text-slate-500 font-semibold w-[10%] text-sm md:text-base">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="relative">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center min-h-[400px]">
                    <div className={`animate-spin rounded-full h-10 w-10 border-b-2 ${themeClasses.spinner}`}></div>
                  </td>
                </tr>
              )}
              {subjects.map((subject, index) => (
                <tr 
                  key={subject} 
                  className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}
                >
                  <td className="p-2 md:p-3 font-medium text-slate-700 text-sm md:text-base">
                    {subject}
                  </td>
                  {DAYS.map((day) => (
                    <td key={day} className="p-1 md:p-2 h-10 md:h-12">
                      <div 
                        onClick={() => handleCellClick(subject, day)}
                        className={getCellClasses(records[subject]?.[day] ?? "")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleCellClick(subject, day);
                          }
                        }}
                      >
                        {records[subject]?.[day] ?? ""}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
