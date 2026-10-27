"use client";

import React, { useMemo } from "react";

interface BusSeatSelectorProps {
  totalSeats?: number;
  bookedSeats?: string[];
  selectedSeats: string[];
  onSeatsChange: (seats: string[]) => void;
  maxSelectable?: number;
  disabled?: boolean;
}

const ROW_LETTERS = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
];

export function BusSeatSelector({
  totalSeats = 40,
  bookedSeats = [],
  selectedSeats,
  onSeatsChange,
  maxSelectable = 10,
  disabled = false,
}: BusSeatSelectorProps) {
  // Normalize booked seats set (uppercase trimmed)
  const bookedSet = useMemo(() => {
    return new Set(bookedSeats.map((s) => String(s).trim().toUpperCase()));
  }, [bookedSeats]);

  const selectedSet = useMemo(() => {
    return new Set(selectedSeats.map((s) => String(s).trim().toUpperCase()));
  }, [selectedSeats]);

  // Compute grid rows: 4 seats per row (2 on left, aisle, 2 on right)
  const capacity = Math.max(4, totalSeats);
  const rowCount = Math.ceil(capacity / 4);

  const gridRows = useMemo(() => {
    const rows = [];
    let seatIndex = 0;
    for (let r = 0; r < rowCount; r++) {
      const letter = ROW_LETTERS[r] || `R${r + 1}`;
      const leftSeats: string[] = [];
      const rightSeats: string[] = [];

      // Left seats (1, 2)
      for (let pos = 1; pos <= 2; pos++) {
        if (seatIndex < capacity) {
          leftSeats.push(`${letter}${pos}`);
          seatIndex++;
        }
      }

      // Right seats (3, 4)
      for (let pos = 3; pos <= 4; pos++) {
        if (seatIndex < capacity) {
          rightSeats.push(`${letter}${pos}`);
          seatIndex++;
        }
      }

      rows.push({
        letter,
        leftSeats,
        rightSeats,
      });
    }
    return rows;
  }, [capacity, rowCount]);

  function handleToggleSeat(seatCode: string) {
    if (disabled) return;
    const upper = seatCode.toUpperCase();
    if (bookedSet.has(upper)) return;

    if (selectedSet.has(upper)) {
      onSeatsChange(selectedSeats.filter((s) => s.toUpperCase() !== upper));
    } else {
      if (selectedSeats.length >= maxSelectable) {
        alert(`You can select up to ${maxSelectable} seats per booking.`);
        return;
      }
      onSeatsChange([...selectedSeats, upper].sort());
    }
  }

  function handleClearAll() {
    if (disabled) return;
    onSeatsChange([]);
  }

  return (
    <div className="w-full flex flex-col items-center py-2 select-none overflow-x-hidden">
      {/* Container wrapper matching the reference layout */}
      <div className="flex flex-col items-center max-w-sm w-full px-1">
        {/* "Front" and Deck Label */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] sm:hidden font-medium text-slate-400 tracking-wide uppercase">
            Lower Deck •
          </span>
          <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
            Front (Cabin)
          </span>
        </div>

        {/* Outer Deck layout with vertical label */}
        <div className="relative flex items-center justify-center w-full">
          {/* Vertical "Lower Deck" label (Desktop only to prevent mobile overflow) */}
          <div className="hidden sm:block absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-medium text-slate-400 tracking-wider whitespace-nowrap pointer-events-none">
            Lower Deck
          </div>

          {/* Bus Cabin Box with dashed border */}
          <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50/40 p-2.5 sm:p-5 shadow-xs w-full max-w-[260px] sm:max-w-[280px]">
            <div className="flex flex-col gap-2 sm:gap-2.5">
              {gridRows.map((row) => (
                <div key={row.letter} className="flex items-center justify-between gap-1">
                  {/* Left pair (1, 2) */}
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {[1, 2].map((pos) => {
                      const seatCode = `${row.letter}${pos}`;
                      const exists = row.leftSeats.includes(seatCode);

                      if (!exists) {
                        return <div key={pos} className="w-8 h-8 sm:w-10 sm:h-10 invisible" />;
                      }

                      const isBooked = bookedSet.has(seatCode);
                      const isSelected = selectedSet.has(seatCode);

                      if (isBooked) {
                        return (
                          <button
                            key={seatCode}
                            type="button"
                            disabled
                            title={`Seat ${seatCode} (Unavailable)`}
                            aria-label={`Seat ${seatCode} unavailable`}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-slate-200 text-slate-400 flex items-center justify-center font-medium cursor-not-allowed transition-all"
                          >
                            <svg
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        );
                      }

                      if (isSelected) {
                        return (
                          <button
                            key={seatCode}
                            type="button"
                            onClick={() => handleToggleSeat(seatCode)}
                            title={`Seat ${seatCode} (Selected - click to remove)`}
                            aria-label={`Seat ${seatCode} selected`}
                            aria-pressed="true"
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm transition-all hover:bg-emerald-700 active:scale-95 text-xs sm:text-sm"
                          >
                            <svg
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={seatCode}
                          type="button"
                          onClick={() => handleToggleSeat(seatCode)}
                          title={`Seat ${seatCode} (Available)`}
                          aria-label={`Select seat ${seatCode}`}
                          aria-pressed="false"
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md border border-slate-300 bg-white hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/60 text-slate-700 flex items-center justify-center text-[11px] sm:text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                        >
                          {seatCode}
                        </button>
                      );
                    })}
                  </div>

                  {/* Central Aisle */}
                  <div className="w-4 sm:w-6 h-8 sm:h-10 rounded bg-slate-100/60 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                  </div>

                  {/* Right pair (3, 4) */}
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {[3, 4].map((pos) => {
                      const seatCode = `${row.letter}${pos}`;
                      const exists = row.rightSeats.includes(seatCode);

                      if (!exists) {
                        return <div key={pos} className="w-8 h-8 sm:w-10 sm:h-10 invisible" />;
                      }

                      const isBooked = bookedSet.has(seatCode);
                      const isSelected = selectedSet.has(seatCode);

                      if (isBooked) {
                        return (
                          <button
                            key={seatCode}
                            type="button"
                            disabled
                            title={`Seat ${seatCode} (Unavailable)`}
                            aria-label={`Seat ${seatCode} unavailable`}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-slate-200 text-slate-400 flex items-center justify-center font-medium cursor-not-allowed transition-all"
                          >
                            <svg
                              className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        );
                      }

                      if (isSelected) {
                        return (
                          <button
                            key={seatCode}
                            type="button"
                            onClick={() => handleToggleSeat(seatCode)}
                            title={`Seat ${seatCode} (Selected - click to remove)`}
                            aria-label={`Seat ${seatCode} selected`}
                            aria-pressed="true"
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm transition-all hover:bg-emerald-700 active:scale-95 text-xs sm:text-sm"
                          >
                            <svg
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={seatCode}
                          type="button"
                          onClick={() => handleToggleSeat(seatCode)}
                          title={`Seat ${seatCode} (Available)`}
                          aria-label={`Select seat ${seatCode}`}
                          aria-pressed="false"
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-md border border-slate-300 bg-white hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/60 text-slate-700 flex items-center justify-center text-[11px] sm:text-xs font-semibold transition-all active:scale-95 shadow-2xs"
                        >
                          {seatCode}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legend row matching the reference layout */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mt-3 sm:mt-4 text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded border border-slate-300 bg-white flex items-center justify-center text-[10px] text-slate-600 font-semibold shadow-2xs">
              A1
            </div>
            <span>Available</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-slate-200 text-slate-400 flex items-center justify-center">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span>Unavailable</span>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-emerald-600 text-white flex items-center justify-center">
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <span>Selected</span>
          </div>
        </div>

        {/* Selected Seats summary badge */}
        <div className="mt-3 w-full flex items-center justify-between text-xs bg-emerald-50/70 border border-emerald-200/80 rounded-lg px-3 py-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-emerald-900 font-medium">Seats:</span>
            {selectedSeats.length > 0 ? (
              <span className="font-semibold text-emerald-800 tracking-wide">
                {selectedSeats.join(", ")} ({selectedSeats.length}{" "}
                {selectedSeats.length === 1 ? "seat" : "seats"})
              </span>
            ) : (
              <span className="text-emerald-700/70 italic">Please select your seat(s)</span>
            )}
          </div>
          {selectedSeats.length > 0 && !disabled && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-emerald-700 hover:text-emerald-900 underline font-medium text-[11px]"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
