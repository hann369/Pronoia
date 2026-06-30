"use client";

import * as React from "react";
import { Settings, Plus, Edit2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  isSameDay,
  isToday,
  getDate,
  getDaysInMonth,
  startOfMonth,
} from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
interface Day {
  date: Date;
  isToday: boolean;
  isSelected: boolean;
  hasProto: boolean;
}

interface CalendarBlock {
  title: string;
  [key: string]: any;
}

interface GlassCalendarProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedDate?: Date;
  currentMonth?: Date;
  onDateSelect?: (date: Date) => void;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onNewEvent?: () => void;
  onAddNote?: () => void;
  calendar?: Record<string, { blocks?: CalendarBlock[]; note?: string }>;
  backgroundImage?: string;
  className?: string;
}

// --- HELPER TO HIDE SCROLLBAR ---
const ScrollbarHide = () => (
  <style>{`
    .scrollbar-hide::-webkit-scrollbar {
      display: none;
    }
    .scrollbar-hide {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `}</style>
);

// --- MAIN COMPONENT ---
export const GlassCalendar = React.forwardRef<HTMLDivElement, GlassCalendarProps>(
  (
    {
      className,
      selectedDate: propSelectedDate,
      currentMonth: propCurrentMonth,
      onDateSelect,
      onPrevMonth,
      onNextMonth,
      onNewEvent,
      onAddNote,
      calendar = {},
      backgroundImage = "/graphic%20assets/calendar-bg.jpg",
      ...props
    },
    ref
  ) => {
    const [currentMonth, setCurrentMonth] = React.useState(propCurrentMonth || propSelectedDate || new Date());
    const [selectedDate, setSelectedDate] = React.useState(propSelectedDate || new Date());

    // Sync state when props change
    React.useEffect(() => {
      if (propSelectedDate) {
        setSelectedDate(propSelectedDate);
      }
    }, [propSelectedDate]);

    React.useEffect(() => {
      if (propCurrentMonth) {
        setCurrentMonth(propCurrentMonth);
      } else if (propSelectedDate) {
        setCurrentMonth(propSelectedDate);
      }
    }, [propCurrentMonth, propSelectedDate]);

    // Generate all days for the current month (horizontal scroll like original)
    const monthDays = React.useMemo(() => {
      const start = startOfMonth(currentMonth);
      const totalDays = getDaysInMonth(currentMonth);
      const days: Day[] = [];
      for (let i = 0; i < totalDays; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), i + 1);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;
        const hasProto = !!calendar[dateStr]?.blocks?.length;

        days.push({
          date,
          isToday: isToday(date),
          isSelected: isSameDay(date, selectedDate),
          hasProto,
        });
      }
      return days;
    }, [currentMonth, selectedDate, calendar]);

    const handleDateClick = (date: Date) => {
      setSelectedDate(date);
      onDateSelect?.(date);
    };

    const handlePrevMonth = () => {
      if (onPrevMonth) {
        onPrevMonth();
      } else {
        setCurrentMonth(subMonths(currentMonth, 1));
      }
    };

    const handleNextMonth = () => {
      if (onNextMonth) {
        onNextMonth();
      } else {
        setCurrentMonth(addMonths(currentMonth, 1));
      }
    };

    const selectedDateStr = format(selectedDate, "yyyy-MM-dd");
    const activeNote = calendar[selectedDateStr]?.note;

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-[360px] rounded-3xl p-5 shadow-2xl overflow-hidden",
          "bg-black/20 backdrop-blur-xl border border-white/10",
          "text-white font-sans",
          className
        )}
        {...props}
      >
        <ScrollbarHide />
        {/* Header: Tabs and Settings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 rounded-lg bg-black/20 p-1">
            <button className="rounded-md bg-white px-4 py-1 text-xs font-bold text-black shadow-md">
              Weekly
            </button>
            <button className="rounded-md px-4 py-1 text-xs font-semibold text-white/60 transition-colors hover:text-white">
              Monthly
            </button>
          </div>
          <button className="p-2 text-white/70 transition-colors hover:bg-black/20 rounded-full">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Date Display and Navigation */}
        <div className="my-6 flex items-center justify-between">
          <motion.p
            key={format(currentMonth, "MMMM", { locale: de })}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-4xl font-bold tracking-tight first-letter:uppercase"
          >
            {format(currentMonth, "MMMM", { locale: de })}
          </motion.p>
          <div className="flex items-center space-x-2">
            <button onClick={handlePrevMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={handleNextMonth} className="p-1 rounded-full text-white/70 transition-colors hover:bg-black/20">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Monthly Calendar Grid */}
        <div className="overflow-x-auto scrollbar-hide -mx-5 px-5">
          <div className="flex space-x-4">
            {monthDays.map((day) => (
              <div key={format(day.date, "yyyy-MM-dd")} className="flex flex-col items-center space-y-2 flex-shrink-0">
                <span className="text-xs font-bold text-white/50">
                  {format(day.date, "E", { locale: de }).charAt(0)}
                </span>
                <button
                  onClick={() => handleDateClick(day.date)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 relative",
                    {
                      "bg-gradient-to-br from-pink-500 to-orange-400 text-white shadow-lg": day.isSelected,
                      "hover:bg-white/20": !day.isSelected,
                      "text-white": !day.isSelected,
                    }
                  )}
                >
                  {day.isToday && !day.isSelected && (
                    <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pink-400"></span>
                  )}
                  {day.hasProto && (
                    <span
                      className={cn(
                        "absolute top-0.5 right-0.5 h-1 w-1 rounded-full",
                        day.isSelected ? "bg-white" : "bg-sky-400"
                      )}
                    />
                  )}
                  {getDate(day.date)}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Note Display */}
        {activeNote && (
          <div className="mt-4 p-3 bg-white/10 rounded-xl text-xs border border-white/5">
            <span className="font-bold block mb-1 text-white/70">Notiz:</span>
            <span className="text-white/90 italic">&ldquo;{activeNote}&rdquo;</span>
          </div>
        )}

        {/* Divider */}
        <div className="mt-6 h-px bg-white/20" />

        {/* Footer Actions */}
        <div className="mt-4 flex items-center justify-between space-x-4">
          <button onClick={onAddNote} className="flex items-center space-x-2 text-sm font-medium text-white/70 transition-colors hover:text-white">
            <Edit2 className="h-4 w-4" />
            <span>Notiz hinzufügen...</span>
          </button>
          <button onClick={onNewEvent} className="flex items-center space-x-2 rounded-lg bg-black/20 px-3 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-black/30">
            <Plus className="h-4 w-4" />
            <span>Neuer Block</span>
          </button>
        </div>
      </div>
    );
  }
);

GlassCalendar.displayName = "GlassCalendar";
export default GlassCalendar;
