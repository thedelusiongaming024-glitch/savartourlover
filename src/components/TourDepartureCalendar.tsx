"use client";

import { useState, useMemo, useEffect } from "react";
import type { TourDeparture } from "@/lib/types";
import { useLanguage } from "@/context/LanguageContext";

interface TourDepartureCalendarProps {
  departures: TourDeparture[];
  selectedDepartureId?: string;
  onSelectDeparture: (departureId: string) => void;
  onClose?: () => void;
  className?: string;
}

function normalizeDateStr(dateStr: string): string {
  if (!dateStr) return "";
  const m = String(dateStr).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = m[1];
    const mo = m[2].padStart(2, "0");
    const d = m[3].padStart(2, "0");
    return `${y}-${mo}-${d}`;
  }
  const dt = new Date(dateStr);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }
  return dateStr;
}

const MONTH_NAMES_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_NAMES_BN = [
  "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
];

const WEEKDAY_NAMES_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_NAMES_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

export function TourDepartureCalendar({
  departures = [],
  selectedDepartureId,
  onSelectDeparture,
  onClose,
  className = "",
}: TourDepartureCalendarProps) {
  const { isBn, formatNumber } = useLanguage();

  // Map departures by YYYY-MM-DD
  const departuresByDate = useMemo(() => {
    const map = new Map<string, TourDeparture>();
    departures.forEach((dep) => {
      if (!dep.date) return;
      const key = normalizeDateStr(dep.date);
      if (key) {
        map.set(key, dep);
      }
    });
    return map;
  }, [departures]);

  // Determine initial view year & month based on selected or earliest departure
  const initialDate = useMemo(() => {
    if (selectedDepartureId) {
      const selected = departures.find((d) => d.id === selectedDepartureId);
      if (selected?.date) {
        const key = normalizeDateStr(selected.date);
        const [y, m] = key.split("-").map(Number);
        if (y && m) return new Date(y, m - 1, 1);
      }
    }
    if (departures.length > 0 && departures[0]?.date) {
      const key = normalizeDateStr(departures[0].date);
      const [y, m] = key.split("-").map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date();
  }, [departures, selectedDepartureId]);

  const [viewYear, setViewYear] = useState<number>(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialDate.getMonth()); // 0-indexed

  // Keep view aligned if selected departure changes externally
  useEffect(() => {
    if (!selectedDepartureId) return;
    const selected = departures.find((d) => d.id === selectedDepartureId);
    if (selected?.date) {
      const key = normalizeDateStr(selected.date);
      const [y, m] = key.split("-").map(Number);
      if (y && m && (y !== viewYear || m - 1 !== viewMonth)) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [selectedDepartureId, departures]);

  function prevMonth() {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function nextMonth() {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  // Days in current view month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  // Month & Year title
  const monthName = isBn ? MONTH_NAMES_BN[viewMonth] : MONTH_NAMES_EN[viewMonth];
  const yearText = isBn ? formatNumber(viewYear) : String(viewYear);

  // Selected departure object
  const currentSelectedDeparture = useMemo(() => {
    return departures.find((d) => d.id === selectedDepartureId) || departures[0];
  }, [departures, selectedDepartureId]);

  return (
    <div className={`rounded-xl border border-slate-200/90 bg-white/95 p-3 sm:p-3.5 shadow-2xs backdrop-blur-md ${className}`}>
      {/* Calendar Header with Navigation */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">📅</span>
          <h4 className="text-xs sm:text-sm font-bold text-slate-800">
            {monthName} {yearText}
          </h4>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            aria-label="Previous month"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            aria-label="Next month"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-1 w-6 h-6 flex items-center justify-center rounded-md border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-400 transition cursor-pointer text-xs font-bold"
              aria-label="Close calendar"
              title={isBn ? "বন্ধ করুন" : "Close"}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Weekday Labels (Sun - Sat) */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {(isBn ? WEEKDAY_NAMES_BN : WEEKDAY_NAMES_EN).map((dayName, idx) => (
          <div key={idx} className="py-0.5">
            {dayName}
          </div>
        ))}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Leading Empty Cells */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-8 sm:h-8.5 rounded-lg bg-transparent" />
        ))}

        {/* Days of the Month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
          const matchingDep = departuresByDate.get(dateKey);
          const isOpen = Boolean(matchingDep && (matchingDep.seatsRemaining > 0 || matchingDep.totalSeats));
          const isSelected = matchingDep ? matchingDep.id === selectedDepartureId : false;

          // If day has a scheduled departure: OPEN DAY
          if (isOpen && matchingDep) {
            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDeparture(matchingDep.id)}
                className={`relative flex flex-col items-center justify-center h-8 sm:h-8.5 rounded-lg transition-all cursor-pointer text-center group ${
                  isSelected
                    ? "bg-emerald-600 text-white font-extrabold shadow-sm ring-1 ring-emerald-500 scale-[1.05] z-10"
                    : "bg-emerald-50 border border-emerald-500 text-emerald-950 font-bold hover:bg-emerald-100 hover:border-emerald-600 shadow-2xs"
                }`}
                title={`Open Departure: ${dateKey} (${matchingDep.seatsRemaining} seats available)`}
              >
                {/* Day Number */}
                <span className="text-xs leading-none font-bold">
                  {isBn ? formatNumber(dayNum) : dayNum}
                </span>

                {/* Subtle indicator dot */}
                <span
                  className={`w-1 h-1 rounded-full mt-0.5 ${
                    isSelected ? "bg-white" : "bg-emerald-600"
                  }`}
                />
              </button>
            );
          }

          // If day has NO scheduled departure: CROSSED OUT WITH ASH COLOUR
          return (
            <div
              key={dateKey}
              className="relative flex items-center justify-center h-8 sm:h-8.5 rounded-lg bg-slate-50/80 border border-slate-200/50 text-slate-400 select-none cursor-not-allowed overflow-hidden"
              title="No tour departure scheduled on this date"
            >
              {/* Day Number in Ash Color */}
              <span className="text-[11px] font-semibold z-10 opacity-80">
                {isBn ? formatNumber(dayNum) : dayNum}
              </span>

              {/* Ash Color Diagonal Cross Mark (✕) */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 w-full h-full text-slate-200 pointer-events-none stroke-current"
                viewBox="0 0 24 24"
              >
                <line x1="5" y1="5" x2="19" y2="19" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="19" y1="5" x2="5" y2="19" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          );
        })}
      </div>

      {/* Compact Legend */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-50 border border-emerald-500 inline-block" />
          <span className="font-semibold text-emerald-900">{isBn ? "ওপেন" : "Open"}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
          <span className="font-bold text-slate-700">{isBn ? "সিলেক্টেড" : "Selected"}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative w-2.5 h-2.5 rounded-sm bg-slate-50 border border-slate-200 inline-flex items-center justify-center">
            <span className="text-[7px] text-slate-300 leading-none">✕</span>
          </div>
          <span className="text-slate-400">{isBn ? "বন্ধ (অ্যাশ ক্রস)" : "No Tour"}</span>
        </div>
      </div>

      {/* Selected Departure Highlight Strip */}
      {currentSelectedDeparture && (
        <div className="mt-2 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1.5 flex items-center justify-between text-xs text-slate-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <span className="text-emerald-700 font-bold">✓ {isBn ? "তারিখ:" : "Selected:"}</span>
            <span className="font-bold text-slate-900">{currentSelectedDeparture.date}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-md font-mono shrink-0">
              {isBn
                ? `${formatNumber(currentSelectedDeparture.seatsRemaining)} সীট খালি`
                : `${currentSelectedDeparture.seatsRemaining} seats left`}
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 text-[11px] shadow-2xs transition cursor-pointer"
              >
                {isBn ? "সম্পন্ন" : "Done"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
