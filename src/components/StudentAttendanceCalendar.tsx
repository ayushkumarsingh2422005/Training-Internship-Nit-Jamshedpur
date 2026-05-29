"use client";

import {
  COURSE_CALENDAR_MONTHS,
  type DayAttendance,
  type StudentAttendanceEntry,
  buildAttendanceByDate,
  dayAttendanceTitle,
  dayAttendanceTooltipLines,
  formatCalendarDayKey,
  getMonthWeeks,
  isWithinCourseCalendar,
} from "@/lib/attendance";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

type Props = {
  entries: StudentAttendanceEntry[];
};

function SessionMarker({
  label,
  status,
}: {
  label: "T" | "L";
  status: "present" | "absent";
}) {
  return (
    <span
      className={`student-attendance-cal-marker student-attendance-cal-marker-${status}`}
      aria-hidden="true"
    >
      {label}
    </span>
  );
}

function CalendarDay({
  day,
  inCourse,
  attendance,
}: {
  day: number;
  inCourse: boolean;
  attendance?: DayAttendance;
}) {
  const hasTheory = Boolean(attendance?.theory);
  const hasLab = Boolean(attendance?.lab);
  const hasAny = hasTheory || hasLab;
  const tooltipLines = attendance ? dayAttendanceTooltipLines(attendance) : [];

  let cellClass = "student-attendance-cal-day";
  if (!inCourse) {
    cellClass += " student-attendance-cal-day-outside";
  } else if (hasAny) {
    const allPresent =
      (!hasTheory || attendance?.theory === "present") &&
      (!hasLab || attendance?.lab === "present");
    const anyAbsent =
      attendance?.theory === "absent" || attendance?.lab === "absent";
    if (anyAbsent) cellClass += " student-attendance-cal-day-absent";
    else if (allPresent) cellClass += " student-attendance-cal-day-present";
  } else {
    cellClass += " student-attendance-cal-day-empty";
  }

  return (
    <div
      className={cellClass}
      tabIndex={hasAny ? 0 : undefined}
      aria-label={hasAny && attendance ? dayAttendanceTitle(attendance) : undefined}
    >
      <span className="student-attendance-cal-day-num">{day}</span>
      {hasAny ? (
        <>
          <div className="student-attendance-cal-markers">
            {hasTheory && attendance?.theory ? (
              <SessionMarker label="T" status={attendance.theory} />
            ) : null}
            {hasLab && attendance?.lab ? (
              <SessionMarker label="L" status={attendance.lab} />
            ) : null}
          </div>
          <div className="student-attendance-cal-tooltip" role="tooltip">
            {tooltipLines.map((line) => (
              <div key={line.label} className="student-attendance-cal-tooltip-row">
                <span className="student-attendance-cal-tooltip-label">
                  {line.label} · {line.status === "present" ? "Present" : "Absent"}
                </span>
                <span className="student-attendance-cal-tooltip-topic">{line.topic}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function MonthCalendar({
  year,
  month,
  label,
  byDate,
}: {
  year: number;
  month: number;
  label: string;
  byDate: Map<string, DayAttendance>;
}) {
  const weeks = getMonthWeeks(year, month);

  return (
    <div className="student-attendance-cal-month">
      <h5 className="student-attendance-cal-month-title">{label}</h5>
      <div className="student-attendance-cal-weekdays">
        {WEEKDAY_LABELS.map((weekday) => (
          <span key={weekday} className="student-attendance-cal-weekday">
            {weekday}
          </span>
        ))}
      </div>
      <div className="student-attendance-cal-grid">
        {weeks.map((week, weekIndex) =>
          week.map((day, dayIndex) => {
            if (day === null) {
              return (
                <div
                  key={`${weekIndex}-${dayIndex}-empty`}
                  className="student-attendance-cal-day student-attendance-cal-day-padding"
                  aria-hidden="true"
                />
              );
            }

            const dateKey = formatCalendarDayKey(year, month, day);
            return (
              <CalendarDay
                key={dateKey}
                day={day}
                inCourse={isWithinCourseCalendar(dateKey)}
                attendance={byDate.get(dateKey)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

export function StudentAttendanceCalendar({ entries }: Props) {
  const byDate = buildAttendanceByDate(entries);
  const hasEntries = entries.length > 0;

  return (
    <section className="student-attendance-calendar" aria-label="Course attendance calendar">
      <div className="student-attendance-cal-header">
        <h4 className="accommodation-title">Course calendar</h4>
        <p className="accommodation-lead">
          Course period: May – July 2026 · Hover a marked day to see topics taught
        </p>
      </div>

      {!hasEntries ? (
        <p className="accommodation-lead">No attendance has been marked for your module yet.</p>
      ) : null}

      <div className="student-attendance-cal-legend">
        <span className="student-attendance-cal-legend-item">
          <span className="student-attendance-cal-marker student-attendance-cal-marker-present">T</span>
          Theory present
        </span>
        <span className="student-attendance-cal-legend-item">
          <span className="student-attendance-cal-marker student-attendance-cal-marker-absent">T</span>
          Theory absent
        </span>
        <span className="student-attendance-cal-legend-item">
          <span className="student-attendance-cal-marker student-attendance-cal-marker-present">L</span>
          Lab present
        </span>
        <span className="student-attendance-cal-legend-item">
          <span className="student-attendance-cal-marker student-attendance-cal-marker-absent">L</span>
          Lab absent
        </span>
      </div>

      <div className="student-attendance-cal-months">
        {COURSE_CALENDAR_MONTHS.map(({ year, month, label }) => (
          <MonthCalendar key={label} year={year} month={month} label={label} byDate={byDate} />
        ))}
      </div>
    </section>
  );
}
