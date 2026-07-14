"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const DAYS = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"];

interface HomeworkTrackerProps {
  semesterSubjects: string[];
  vacationSubjects: string[];
}

interface HomeworkRecord {
  week_start_date: string;
  subject: string;
  day: string;
  status: string;
}

export default function HomeworkTracker({ semesterSubjects, vacationSubjects }: HomeworkTrackerProps) {
  const [mode, setMode] = useState<"semester" | "vacation">("vacation");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekCache, setWeekCache] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<"checking" | "pending" | "approved" | "rejected">("checking");
  const [deviceId, setDeviceId] = useState<string>("");

  const [debugMsg, setDebugMsg] = useState("");

  const fetchedWeeksRef = useRef<Set<string>>(new Set());
  const weekCacheRef = useRef(weekCache);
  const initialLoadedRef = useRef(false);

  // Load cache from localStorage and sync settings from DB on mount
  useEffect(() => {
    setIsClient(true);
    
    // --- Device Management Logic ---
    async function checkDeviceRegistration() {
      try {
        let id = localStorage.getItem("homeworkTrackerDeviceId");
        if (!id || id.length > 20) {
          id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'dev-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          id = id.substring(0, 20); // Truncate to ensure it fits in varchar
          localStorage.setItem("homeworkTrackerDeviceId", id);
        }
        setDeviceId(id);

        const { data, error } = await supabase
          .from("homework_records")
          .select("status")
          .eq("week_start_date", "devices")
          .eq("subject", id)
          .maybeSingle();

        if (error) {
          console.error("Device check error:", error);
          setDeviceStatus("pending");
          return;
        }

        if (data) {
          setDeviceStatus(data.status as any);
        } else {
          // Register device
          const userAgent = window.navigator.userAgent;
          const shortAgent = userAgent.substring(0, 20); // Keep it short to avoid varchar limits
          const { error: insertError } = await supabase
            .from("homework_records")
            .insert({
              week_start_date: "devices",
              subject: id,
              day: shortAgent,
              status: "pending"
            });
            
          if (insertError) {
             console.error("Device Insert Error:", insertError);
             setDeviceStatus("pending"); // Still show pending, but we know it failed
             // Force showing the error in deviceId for debugging if it failed
             setDeviceId(id + " (Error: " + insertError.message + ")");
          } else {
             setDeviceStatus("pending");
          }
        }
      } catch (err) {
        console.error("Failed device check", err);
        setDeviceStatus("pending");
      }
    }
    
    checkDeviceRegistration();
    // --- End Device Management Logic ---
    
    // 1. Fast restore from localStorage cache for instant UI
    const cached = localStorage.getItem("homeworkTrackerCache");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setWeekCache(parsed);
        weekCacheRef.current = parsed;
      } catch (e) {}
    }
    const savedMode = localStorage.getItem("homeworkTrackerMode");
    if (savedMode === "semester" || savedMode === "vacation") {
      setMode(savedMode);
    }
    
    // 2. Fetch the global active tab mode from DB to sync across all devices
    async function loadGlobalSettings() {
      try {
        const { data, error } = await supabase
          .from("homework_records")
          .select("status")
          .eq("week_start_date", "settings")
          .eq("subject", "active_mode")
          .eq("day", "global")
          .maybeSingle();
        
        if (data && (data.status === "semester" || data.status === "vacation")) {
          setMode(data.status as "semester" | "vacation");
          localStorage.setItem("homeworkTrackerMode", data.status);
        }
      } catch (e) {
        console.error("Failed to load global settings:", e);
      }
    }
    
    loadGlobalSettings();
    
    setTimeout(() => {
      initialLoadedRef.current = true;
    }, 0);
  }, []);

  // Save cache to localStorage
  useEffect(() => {
    weekCacheRef.current = weekCache;
    if (isClient && initialLoadedRef.current) {
      localStorage.setItem("homeworkTrackerCache", JSON.stringify(weekCache));
      localStorage.setItem("homeworkTrackerMode", mode);
    }
  }, [weekCache, mode, isClient]);

  const subjects = mode === "semester" ? semesterSubjects : vacationSubjects;
  const title = mode === "semester" ? "Raon Kwon's Homework" : "Raon's Vacation Homework";

  // Derive the start of the week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  
  const formattedWeekStart = format(weekStart, "yyyy-MM-dd");
  const displayDateRange = `${format(weekStart, "MMM d, yyyy")} - ${format(weekEnd, "MMM d, yyyy")}`;

  // Use a stable reference for all subjects
  const allSubjects = useMemo(() => [...semesterSubjects, ...vacationSubjects], [semesterSubjects, vacationSubjects]);

  const currentWeekRecords = useMemo(() => {
    if (weekCache[formattedWeekStart]) {
      return weekCache[formattedWeekStart];
    }
    const defaults: Record<string, Record<string, string>> = {};
    allSubjects.forEach(sub => {
      defaults[sub] = {};
      DAYS.forEach(day => defaults[sub][day] = "");
    });
    return defaults;
  }, [weekCache, formattedWeekStart, allSubjects]);

  useEffect(() => {
    if (!isClient) return;
    let mounted = true;

    const fetchAndCacheWeek = async (weekStr: string, isBackground: boolean = false) => {
      if (fetchedWeeksRef.current.has(weekStr)) {
        if (!isBackground) setIsLoading(false);
        return;
      }
      
      fetchedWeeksRef.current.add(weekStr);
      
      const hasLocalCache = !!weekCacheRef.current[weekStr];
      if (!isBackground && !hasLocalCache) {
        setIsLoading(true);
      } else if (!isBackground) {
        setIsLoading(false);
      }

      try {
        const { data, error } = await supabase
          .from("homework_records")
          .select("*")
          .eq("week_start_date", weekStr);

        if (error) throw error;
        if (!mounted) return;
        
        if (!isBackground) setDebugMsg(`Loaded ${data.length} records for ${weekStr}.`);
        
        const newRecords: Record<string, Record<string, string>> = {};
        allSubjects.forEach((subject) => {
          newRecords[subject] = {};
          DAYS.forEach((day) => { newRecords[subject][day] = ""; });
        });

        (data as HomeworkRecord[]).forEach((record) => {
          if (newRecords[record.subject]) {
            newRecords[record.subject][record.day] = record.status;
          }
        });

        setWeekCache(prev => {
          const existing = prev[weekStr];
          if (existing) {
            const merged = { ...newRecords };
            for (const sub of Object.keys(existing)) {
              if (!merged[sub]) merged[sub] = {};
              for (const day of Object.keys(existing[sub])) {
                if (existing[sub][day] !== "") merged[sub][day] = existing[sub][day];
              }
            }
            return { ...prev, [weekStr]: merged };
          }
          return { ...prev, [weekStr]: newRecords };
        });
      } catch (err) {
        console.error("Fetch error:", err);
        fetchedWeeksRef.current.delete(weekStr);
      } finally {
        if (!isBackground && mounted) {
          setIsLoading(false);
        }
      }
    };

    // Load current week
    fetchAndCacheWeek(formattedWeekStart, false).then(() => {
      if (!mounted) return;
      // Prefetch adjacent weeks
      const currentParsed = parseISO(formattedWeekStart);
      const nextW = format(addWeeks(currentParsed, 1), "yyyy-MM-dd");
      const prevW = format(subWeeks(currentParsed, 1), "yyyy-MM-dd");
      
      fetchAndCacheWeek(nextW, true);
      fetchAndCacheWeek(prevW, true);
    });

    return () => {
      mounted = false;
    };
  }, [formattedWeekStart, allSubjects, isClient]);

  const handlePrevWeek = () => setCurrentDate((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate((prev) => addWeeks(prev, 1));

  // Change tab mode and sync globally to database
  const handleModeChange = async (newMode: "semester" | "vacation") => {
    setMode(newMode);
    localStorage.setItem("homeworkTrackerMode", newMode);

    try {
      const { data: existing } = await supabase
        .from("homework_records")
        .select("status")
        .eq("week_start_date", "settings")
        .eq("subject", "active_mode")
        .eq("day", "global");

      if (existing && existing.length > 0) {
        await supabase
          .from("homework_records")
          .update({ status: newMode })
          .eq("week_start_date", "settings")
          .eq("subject", "active_mode")
          .eq("day", "global");
      } else {
        await supabase
          .from("homework_records")
          .insert({
            week_start_date: "settings",
            subject: "active_mode",
            day: "global",
            status: newMode
          });
      }
    } catch (e) {
      console.error("Failed to save global active mode:", e);
    }
  };

  const handleCellClick = async (subject: string, day: string) => {
    const currentState = currentWeekRecords[subject][day] ?? "";
    let nextState = "-";
    if (currentState === "") nextState = "-";
    else if (currentState === "-") nextState = "△";
    else if (currentState === "△") nextState = "O";
    else if (currentState === "O") nextState = "X";
    else if (currentState === "X") nextState = "";

    // Optimistic UI update
    setWeekCache((prev) => {
      const weekData = prev[formattedWeekStart] || currentWeekRecords;
      return {
        ...prev,
        [formattedWeekStart]: {
          ...weekData,
          [subject]: {
            ...weekData[subject],
            [day]: nextState,
          },
        },
      };
    });

    // Auto-save to DB directly from client
    try {
      const { data: existing, error: selectError } = await supabase
        .from("homework_records")
        .select("status")
        .eq("week_start_date", formattedWeekStart)
        .eq("subject", subject)
        .eq("day", day);

      if (selectError) throw selectError;

      if (existing && existing.length > 0) {
        const { error: updateError } = await supabase
          .from("homework_records")
          .update({ status: nextState })
          .eq("week_start_date", formattedWeekStart)
          .eq("subject", subject)
          .eq("day", day);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("homework_records")
          .insert({
            week_start_date: formattedWeekStart,
            subject,
            day,
            status: nextState
          });
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.error("Direct save error:", err);
    }
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

  if (deviceStatus === "checking" || !isClient) {
    return (
      <div className={`min-h-screen bg-slate-50 flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-300 border-t-slate-800"></div>
      </div>
    );
  }

  if (deviceStatus === "pending") {
    return (
      <div className={`min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4`}>
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <h2 className="text-2xl font-bold text-amber-600 mb-4">승인 대기 중</h2>
          <p className="text-slate-600 mb-6">
            이 기기는 아직 승인되지 않았습니다.<br />
            관리자의 승인을 기다려주세요.
          </p>
          <div className="text-sm text-slate-400 bg-slate-50 p-3 rounded-md overflow-hidden text-ellipsis whitespace-nowrap mb-4">
            기기 ID: {deviceId}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  if (deviceStatus === "rejected") {
    return (
      <div className={`min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4`}>
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-slate-100">
          <h2 className="text-2xl font-bold text-red-600 mb-4">접근 거부됨</h2>
          <p className="text-slate-600 mb-6">
            이 기기는 접근이 차단되었습니다.
          </p>
          <div className="text-sm text-slate-400 bg-slate-50 p-3 rounded-md overflow-hidden text-ellipsis whitespace-nowrap mb-4">
            기기 ID: {deviceId}
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className={`min-h-screen ${themeClasses.bgLight} p-2 md:p-3 font-sans transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto mb-2 flex justify-center gap-4">
        <button 
          onClick={() => handleModeChange("semester")}
          className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${
            mode === 'semester' ? themeClasses.activeTab : themeClasses.inactiveTab
          }`}
        >
          학기 중
        </button>
        <button 
          onClick={() => handleModeChange("vacation")}
          className={`px-6 py-2 rounded-full font-bold transition-all duration-300 ${
            mode === 'vacation' ? themeClasses.activeTab : themeClasses.inactiveTab
          }`}
        >
          방학
        </button>
      </div>

      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100">
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
            <span className="px-3 md:px-4 font-medium text-sm md:text-base min-w-[220px] text-center flex items-center justify-center gap-2">
              {displayDateRange}
              {isLoading && (
                <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block"></span>
              )}
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
            <tbody>
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
                        className={getCellClasses(currentWeekRecords[subject]?.[day] ?? "")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleCellClick(subject, day);
                          }
                        }}
                      >
                        {currentWeekRecords[subject]?.[day] ?? ""}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {debugMsg && (
          <div className="p-2 text-xs text-slate-400 border-t border-slate-100 bg-slate-50 text-center font-mono">
            {debugMsg}
          </div>
        )}
      </div>
    </main>
  );
}
