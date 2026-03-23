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
    return `${y}-${m}-${d}`;
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
module.exports = {
    now,
    toISO,
    formatDate,
    formatTime,
    formatDateTime,
    diffInMinutes,
    timeAgo,
};
