"use client";

import { CalendarDays } from "lucide-react";
import DatePicker, { type DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persianFa from "react-date-object/locales/persian_fa";

export function JalaliDatePicker({
  value,
  onChange,
  name,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  name?: string;
  id?: string;
}) {
  return (
    <div className="relative">
      <DatePicker
        id={id}
        name={name}
        value={value}
        onChange={(date: DateObject | null) =>
          onChange(date?.format("YYYY/MM/DD") ?? "")
        }
        calendar={persian}
        locale={persianFa}
        format="YYYY/MM/DD"
        calendarPosition="bottom-right"
        className="orange mobile"
        inputClass="focus-ring h-11 w-full rounded-xl border bg-white px-3 pl-10 text-sm text-slate-900"
        containerClassName="w-full"
        placeholder="۱۴۰۵/۰۶/۰۱"
      />
      <CalendarDays className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}
