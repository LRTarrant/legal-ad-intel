"use client";

interface TortPreset {
  label: string;
  value: string;
}

interface TortQuickStartProps {
  presets: TortPreset[];
  activeTort: string;
  onSelect: (value: string) => void;
}

export function TortQuickStart({
  presets,
  activeTort,
  onSelect,
}: TortQuickStartProps) {
  const allPresets: TortPreset[] = [...presets, { label: "View All", value: "" }];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-gray mb-1.5">
        Quick Start
      </p>
      <div className="flex gap-2 flex-wrap">
        {allPresets.map((preset) => {
          const isActive = activeTort === preset.value;
          return (
            <button
              key={preset.label}
              onClick={() => onSelect(preset.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-intelligence-teal text-white shadow-sm"
                  : "bg-white text-charcoal hover:bg-cloud border border-cloud"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
