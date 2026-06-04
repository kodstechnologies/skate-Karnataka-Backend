// Get current date-time (ISO)
const now = () => {
    return new Date();
};

// =============== example ======================
// ** if i call now() it will return current date-time in ISO format **

// const { now } = require("../utils/timeUtil");

// exports.createUser = async (req, res) => {
//   res.json({
//     message: "User created",
//     createdAt: now(),
//   });
// };


// -------------------------------------
// {
//     "message": "User created",
//         "createdAt": "2026-02-10T07:10:30.456Z"
// }

// =====================================

// Convert to ISO string (for DB)
const toISO = (value = new Date()) => {
    return new Date(value).toISOString();
};

// =============== example ======================

// ** if i pass "2026-02-10" it will convert to "2026-02-10T00:00:00.000Z" in ISO format **
// if i pass nothing it will return current date-time in ISO format

// console.log(toISO("2026-02-10"));
// -------------------------------------
// 2026-02-10T00:00:00.000Z
// =====================================
// Format date → YYYY-MM-DD

const formatDate = (value = new Date()) => {
    const date = new Date(value);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${d}-${m}-${y}`;
};

/** Display DOB as dd/mm/yyyy */
const formatDob = (value = new Date()) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
};

/**
 * Parse DOB from dd/mm/yyyy, dd-mm-yyyy, d/m/yyyy, or ISO date string → Date (UTC midnight local parts).
 */
const parseDobInput = (value) => {
    if (value === undefined || value === null || value === "") {
        return undefined;
    }

    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw new Error("Invalid date of birth");
        }
        return value;
    }

    const raw = String(value).trim();
    if (!raw) return undefined;

    const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmy) {
        const day = Number(dmy[1]);
        const month = Number(dmy[2]);
        const year = Number(dmy[3]);
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            throw new Error("Invalid date of birth");
        }
        const date = new Date(year, month - 1, day);
        if (
            date.getFullYear() !== year ||
            date.getMonth() !== month - 1 ||
            date.getDate() !== day
        ) {
            throw new Error("Invalid date of birth");
        }
        return date;
    }

    const iso = new Date(raw);
    if (!Number.isNaN(iso.getTime())) {
        return iso;
    }

    throw new Error('Date of birth must be dd/mm/yyyy (e.g. "15/08/2001")');
};

// =============== example ======================
// ** if i call formatDate("2026-03-25") it will return "2026-03-25" in YYYY-MM-DD format **
// ** if i call formatDate() it will return current date in YYYY-MM-DD format **

// console.log(formatDate("2026-03-25"));
// -------------------------------------
// 2026-03-25

// =====================================
// Format time → HH:MM:SS
const formatTime = (value = new Date()) => {
    const date = new Date(value);
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${h}:${m}:${s}`;
};

// =============== example ======================
//**  if i call formatTime() it will return current time in HH:MM:SS format **

// const date = new Date();
// console.log(formatTime(date));

// -------------------------------------
// 12:35:40
// =====================================

// Format date + time
const formatDateTime = (value = new Date()) => {
    return `${formatDate(value)} ${formatTime(value)}`;
};
// =============== example ======================

// ** if i call formatDateTime() it will return current date and time in "YYYY-MM-DD HH:MM:SS" format **
// ** if i call formatDateTime("2026-02-10T12:40:30Z") it will return "2026-02-10 12:40:30" in "YYYY-MM-DD HH:MM:SS" format **

// const date = new Date();
// console.log(formatDateTime(date));
// -------------------------------------
// 2026-02-10 12:40:30

// =====================================
// Time difference in minutes
const diffInMinutes = (start, end = new Date()) => {
    return Math.floor((new Date(end) - new Date(start)) / (1000 * 60));
};
// =============== example ======================
// ** if i call diffInMinutes("2026-02-10T10:00:00") it will return difference in minutes from that time to now **

// const startTime = "2026-02-10T10:00:00";
// console.log(diffInMinutes(startTime));

// -------------------------------------
// 150
// =====================================
// =============== example 2 ======================
// ** if i call diffInMinutes("2026-02-10T10:00:00", "2026-02-10T12:30:00") it will return 150 minutes **

// const start = "2026-02-10T10:00:00";
// const end = "2026-02-10T12:30:00";

// console.log(diffInMinutes(start, end));

// -------------------------------------
// 150
// =====================================
// Time ago (for APIs)
const timeAgo = (value) => {
    const diff = Math.floor((Date.now() - new Date(value)) / 1000);

    if (diff < 60) return `${diff} sec ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} day ago`;
};
// =============== example 1 ======================
//** if i call timeAgo("2026-02-10T10:00:00") it will return "2 hr ago" **

// console.log(timeAgo("2026-02-10T10:00:00"));

// -------------------------------------
// 2 hr ago
// =============== example 2 ======================
// ** if i call timeAgo("2026-02-10T12:55:00") it will return "5 min ago" **
// const date = new Date(Date.now() - 5 * 60 * 1000);
// console.log(timeAgo(date));

// -------------------------------------
// 5 min ago

// =====================================

const pad2TimePart = (value) => String(Math.max(0, Number(value) || 0)).padStart(2, "0");

/**
 * Parse competition time to total seconds (stored in DB).
 * Accepts a number (already seconds) or "minutes:seconds:milliseconds" string, e.g. "4:21:30".
 */
const parseCompetitionTimeTakenToSeconds = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value === "number") {
        if (Number.isNaN(value)) {
            throw new Error("timeTaken must be a valid number");
        }
        return value;
    }

    if (typeof value !== "string") {
        throw new Error('timeTaken must be a number or "minutes:seconds:milliseconds" string');
    }

    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error("timeTaken cannot be empty");
    }

    if (/^\d+(\.\d+)?$/.test(trimmed)) {
        return Number(trimmed);
    }

    const parts = trimmed.split(":").map((part) => part.trim());
    if (parts.length !== 3) {
        throw new Error('timeTaken must be in "minutes:seconds:milliseconds" format (e.g. "4:21:30")');
    }

    const minutes = Number(parts[0]);
    const seconds = Number(parts[1]);
    const milliseconds = Number(parts[2]);

    if ([minutes, seconds, milliseconds].some((n) => Number.isNaN(n) || n < 0)) {
        throw new Error("timeTaken minutes, seconds, and milliseconds must be non-negative numbers");
    }

    return minutes * 60 + seconds + milliseconds / 1000;
};

/**
 * Format stored seconds as "minutes:seconds:milliseconds" (e.g. 480 → "08:00:00").
 */
const formatCompetitionTimeTakenFromSeconds = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined) {
        return null;
    }

    if (typeof totalSeconds !== "number" || Number.isNaN(totalSeconds)) {
        return null;
    }

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.round((totalSeconds % 1) * 1000);

    const pad2 = (value) => String(value).padStart(2, "0");
    const minutePart = minutes < 100 ? pad2(minutes) : String(minutes);

    return `${minutePart}:${pad2(seconds)}:${pad2(milliseconds)}`;
};

/**
 * Normalize API time input for storage as MM:SS:00 (e.g. "1.03" → "01:03:00").
 */
const normalizeCompetitionTimeForStorage = (value) => {
    if (value === null || value === undefined) {
        return "";
    }

    const trimmed = String(value).trim();
    if (!trimmed) {
        return "";
    }

    // Decimal minutes.seconds — e.g. 1.03 → 01:03:00
    if (/^\d+\.\d+$/.test(trimmed)) {
        const [minutePart, secondPart] = trimmed.split(".");
        const seconds = secondPart.padEnd(2, "0").slice(0, 2);
        const minutes = Number(minutePart);
        const minuteStr = minutes < 100 ? pad2TimePart(minutes) : String(minutes);
        return `${minuteStr}:${pad2TimePart(seconds)}:00`;
    }

    if (trimmed.includes(":")) {
        const parts = trimmed.split(":").map((part) => part.trim());
        if (parts.length === 2) {
            return `${pad2TimePart(parts[0])}:${pad2TimePart(parts[1])}:00`;
        }
        if (parts.length === 3) {
            const minutes = Number(parts[0]);
            const minuteStr = minutes < 100 ? pad2TimePart(minutes) : String(minutes);
            return `${minuteStr}:${pad2TimePart(parts[1])}:${pad2TimePart(parts[2])}`;
        }
    }

    if (/^\d+$/.test(trimmed)) {
        const totalSeconds = Number(trimmed);
        if (!Number.isNaN(totalSeconds)) {
            return formatCompetitionTimeTakenFromSeconds(totalSeconds) || trimmed;
        }
    }

    return trimmed;
};

export {
    now,
    toISO,
    formatDate,
    formatDob,
    parseDobInput,
    formatTime,
    formatDateTime,
    diffInMinutes,
    timeAgo,
    normalizeCompetitionTimeForStorage,
    parseCompetitionTimeTakenToSeconds,
    formatCompetitionTimeTakenFromSeconds,
};
