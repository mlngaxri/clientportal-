"use client";
import { useId } from "react";
const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : ["Australia/Brisbane", "Australia/Sydney", "Australia/Perth", "Pacific/Auckland", "Europe/London", "America/New_York", "UTC"];
export default function TimezonePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return <label>Business timezone<input list={id} value={value} onChange={e => onChange(e.target.value)} autoComplete="off" placeholder="Search, for example Australia/Sydney" /><datalist id={id}>{[...new Set(["UTC", "Australia/Brisbane", value, ...zones])].map(zone => <option key={zone} value={zone} />)}</datalist><small>Use a city timezone. Schedules follow its local clock and daylight saving rules.</small></label>;
}
