"use client";

import GlassPanel from "@/components/ui/GlassPanel";
import GlowButton from "@/components/ui/GlowButton";
import MatrixText from "@/components/ui/MatrixText";
import { formatDate } from "@/lib/utils";
import { TIME_CONFIG } from "@/lib/constants";

interface TimeSliderProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  stepDays: number;
  onStepChange: (days: number) => void;
  minDate: string;
  maxDate: string;
  dateToValue: (date: string) => number;
  valueToDate: (value: number) => string;
  isActive: boolean;
}

/**
 * Bottom-of-screen time-machine slider for historical satellite data.
 */
export default function TimeSlider({
  selectedDate,
  onDateChange,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBackward,
  stepDays,
  onStepChange,
  minDate,
  maxDate,
  dateToValue,
  valueToDate,
  isActive,
}: TimeSliderProps) {
  if (!isActive) return null;

  const minVal = dateToValue(minDate);
  const maxVal = dateToValue(maxDate);
  const currentVal = dateToValue(selectedDate);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 w-full h-12" id="time-slider">
      <GlassPanel className="slide-in-up w-full h-full rounded-none border-b-0 border-x-0 !py-1.5 px-6 flex items-center" padding="sm">
        <div className="flex items-center gap-4 w-full">
          {/* Transport controls */}
          <div className="flex items-center gap-1">
            <GlowButton onClick={onStepBackward} size="sm" id="time-step-back">
              ◀◀
            </GlowButton>
            <GlowButton
              onClick={onTogglePlay}
              size="sm"
              active={isPlaying}
              id="time-play-toggle"
              className="min-w-[60px]"
            >
              {isPlaying ? "⏸ STOP" : "▶ PLAY"}
            </GlowButton>
            <GlowButton onClick={onStepForward} size="sm" id="time-step-fwd">
              ▶▶
            </GlowButton>
          </div>

          {/* Slider */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
                Time Machine
              </span>
              <div className="text-xs font-mono">
                <MatrixText
                  text={formatDate(selectedDate)}
                  speed={5}
                  color="cyan"
                  key={selectedDate}
                />
              </div>
            </div>
            <input
              type="range"
              min={minVal}
              max={maxVal}
              value={currentVal}
              onChange={(e) =>
                onDateChange(valueToDate(Number(e.target.value)))
              }
              className="cyber-slider w-full"
              id="time-range-slider"
            />
            <div className="flex justify-between mt-0.5">
              <span className="text-[8px] font-mono text-neutral-600">
                {TIME_CONFIG.minYear}
              </span>
              <span className="text-[8px] font-mono text-neutral-600">
                PRESENT
              </span>
            </div>
          </div>

          {/* Step interval */}
          <div className="flex flex-col gap-1">
            <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-wider text-center">
              Step
            </span>
            <div className="flex gap-0.5">
              {TIME_CONFIG.stepOptions.map((opt) => (
                <GlowButton
                  key={opt.days}
                  onClick={() => onStepChange(opt.days)}
                  size="sm"
                  active={stepDays === opt.days}
                  className="!text-[8px] !px-1.5 !py-0.5"
                >
                  {opt.label.charAt(0)}
                </GlowButton>
              ))}
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
