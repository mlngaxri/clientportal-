"use client";
import { useState } from "react";
import Dialog from "./Dialog";
export default function TextEntryDialog({ title, label, placeholder, type = "text", onClose, onSubmit }: { title: string; label: string; placeholder?: string; type?: "text" | "url"; onClose: () => void; onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return <Dialog title={title} onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }}><label>{label}<input type={type} value={value} onChange={e => setValue(e.target.value)} maxLength={type === "url" ? 2000 : 500} placeholder={placeholder} required autoFocus /></label><div className="connected-actions"><button type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">Add</button></div></form></Dialog>;
}
