const parseCoachJoiningDate = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** Normalize Flutter / multipart field names before validation & DB save. */
export const normalizeSchoolFormPayload = (body = {}) => {
  const data = { ...body };

  if (data.schoolContact && !data.schoolContactNumber) {
    data.schoolContactNumber = data.schoolContact;
  }

  if (data.coachJoiningDate) {
    const parsed = parseCoachJoiningDate(data.coachJoiningDate);
    if (parsed) {
      data.coachJoiningDate = parsed;
    }
  }

  delete data.schoolContact;
  delete data.documentFile;
  delete data.documentFileName;

  return data;
};
