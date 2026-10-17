export type ScheduleType = "practice" | "event" | "lesson" | "concert" | "holiday";

export type ImportedSchedule = {
  id: string;
  title: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  type: ScheduleType;
};

const dayOfWeekPattern = /[（(]?[月火水木金土日][曜]?[日）)]?/g;
const timePattern = /(\d{1,2})\s*[:：時]\s*(\d{2})/g;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeTime(hour: string, minute: string) {
  const parsedHour = Number(hour);
  const parsedMinute = Number(minute);
  if (parsedHour > 23 || parsedMinute > 59) return "";
  return `${pad(parsedHour)}:${pad(parsedMinute)}`;
}

function getType(text: string): ScheduleType {
  const source = text.toLowerCase();
  if (/休日|休み|祝日/.test(source)) return "holiday";
  if (/演奏会|コンサート|本番|concert/.test(source)) return "concert";
  if (/レッスン|lesson|講師/.test(source)) return "lesson";
  if (/行事|イベント|event|会議/.test(source)) return "event";
  return "practice";
}

function dateFromLine(line: string, fallbackYear: number, fallbackMonth: number) {
  const iso = line.match(/(20\d{2})\s*[./年-]\s*(\d{1,2})\s*[./月-]\s*(\d{1,2})/);
  if (iso) {
    return { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]), token: iso[0] };
  }

  // OCR frequently drops 年/月/日 and returns a spaced numeric date, e.g. "2026 10 15".
  const spaced = line.match(/\b(20\d{2})\s+(\d{1,2})\s+(\d{1,2})\b/);
  if (spaced) {
    return { year: Number(spaced[1]), month: Number(spaced[2]), day: Number(spaced[3]), token: spaced[0] };
  }

  const japanese = line.match(/(?:20(\d{2})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (japanese) {
    return {
      year: japanese[1] ? Number(`20${japanese[1]}`) : fallbackYear,
      month: Number(japanese[2]),
      day: Number(japanese[3]),
      token: japanese[0],
    };
  }

  const compact = line.match(/(?:^|\s)(\d{1,2})\s*[日][\s:：-]+/);
  if (compact) {
    return { year: fallbackYear, month: fallbackMonth, day: Number(compact[1]), token: compact[0] };
  }

  return null;
}

function validDate(year: number, month: number, day: number) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Converts OCR text into schedule rows. The result is intentionally a draft:
 * organizers review or amend each row before saving it to the shared calendar.
 */
export function parseScheduleImageText(
  sourceText: string,
  fallbackYear: number,
  fallbackMonth: number
): ImportedSchedule[] {
  const lines = sourceText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const parsed: ImportedSchedule[] = [];
  const seen = new Set<string>();

  for (const line of lines) {
    const date = dateFromLine(line, fallbackYear, fallbackMonth);
    if (!date || !validDate(date.year, date.month, date.day)) continue;

    const dateValue = `${date.year}-${pad(date.month)}-${pad(date.day)}`;
    const times = Array.from(line.matchAll(timePattern))
      .map((match) => normalizeTime(match[1], match[2]))
      .filter(Boolean);

    const title = line
      .replace(date.token, " ")
      .replace(dayOfWeekPattern, " ")
      .replace(timePattern, " ")
      .replace(/[|｜•・,，;；]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[-:：]+|[-:：]+$/g, "") || "予定";

    const key = `${dateValue}|${title}`;
    if (seen.has(key)) continue;
    seen.add(key);

    parsed.push({
      id: `${dateValue}-${parsed.length}`,
      title,
      scheduleDate: dateValue,
      startTime: times[0] ?? "",
      endTime: times[1] ?? "",
      location: "",
      description: "画像から読み取り（保存前に内容を確認してください）",
      type: getType(line),
    });
  }

  return parsed.sort((a, b) => a.scheduleDate.localeCompare(b.scheduleDate) || a.startTime.localeCompare(b.startTime));
}
