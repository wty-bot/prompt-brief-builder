export type TemperaturePreset = "low" | "medium" | "high" | "xhigh";

export const temperaturePresets: Array<{
  id: TemperaturePreset;
  label: string;
  value: number;
  hint: string;
}> = [
  {
    id: "low",
    label: "Low",
    value: 0.1,
    hint: "更稳，更贴近原始输入",
  },
  {
    id: "medium",
    label: "Medium",
    value: 0.4,
    hint: "默认档位，平衡稳定和发散",
  },
  {
    id: "high",
    label: "High",
    value: 0.7,
    hint: "更发散，适合要更多改写空间",
  },
  {
    id: "xhigh",
    label: "XHigh",
    value: 1,
    hint: "最发散，适合强探索场景",
  },
];

export function getTemperatureValue(preset: TemperaturePreset) {
  return temperaturePresets.find((item) => item.id === preset)?.value ?? 0.4;
}

export function getTemperaturePreset(value: number): TemperaturePreset {
  if (value <= 0.2) return "low";
  if (value <= 0.55) return "medium";
  if (value <= 0.85) return "high";
  return "xhigh";
}
