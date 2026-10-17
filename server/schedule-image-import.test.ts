import { describe, expect, it } from "vitest";
import { parseScheduleImageText } from "../client/src/lib/scheduleImageImport";

describe("parseScheduleImageText", () => {
  it("extracts dated Japanese schedule lines with times and types", () => {
    const rows = parseScheduleImageText(
      "2026年4月3日（金） 16:00-18:00 合奏練習\n4月5日 13:30 16:00 定期演奏会",
      2026,
      4
    );

    expect(rows).toEqual([
      expect.objectContaining({
        scheduleDate: "2026-04-03",
        startTime: "16:00",
        endTime: "18:00",
        type: "practice",
      }),
      expect.objectContaining({
        scheduleDate: "2026-04-05",
        startTime: "13:30",
        endTime: "16:00",
        type: "concert",
      }),
    ]);
  });

  it("uses the selected month when an OCR row supplies only a day", () => {
    const rows = parseScheduleImageText("12日 15:30 パート練習", 2026, 5);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ scheduleDate: "2026-05-12", startTime: "15:30" });
  });

  it("handles spaced numeric dates commonly emitted by OCR", () => {
    const rows = parseScheduleImageText("2026 10 15 16:00 合奏", 2026, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ scheduleDate: "2026-10-15", startTime: "16:00" });
  });

  it("handles Japanese date markers separated by OCR spaces", () => {
    const rows = parseScheduleImageText("2026 年 10 月 15 日 合奏", 2026, 10);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ scheduleDate: "2026-10-15" });
  });

  it("does not create entries for invalid calendar dates", () => {
    expect(parseScheduleImageText("2026年2月31日 合奏", 2026, 2)).toEqual([]);
  });
});
