function getISOWeek(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return { year: 0, week: 0, key: '0000-W00' };
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const week = 1 + Math.round((target - firstThursday) / (7 * 24 * 3600 * 1000));
  const year = target.getUTCFullYear();
  return { year, week, key: `${year}-W${String(week).padStart(2, '0')}` };
}

function getMonthKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return '0000-00';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function summarize(records) {
  const weekly = {};
  const monthly = {};
  let totalCost = 0;
  let totalLiters = 0;
  let totalDistance = 0;

  for (const r of records) {
    totalCost += Number(r.totalCost) || 0;
    totalLiters += Number(r.liters) || 0;
    totalDistance += Number(r.distance) || 0;

    const w = getISOWeek(r.date);
    if (!weekly[w.key]) weekly[w.key] = { key: w.key, totalCost: 0, totalLiters: 0, totalDistance: 0, count: 0 };
    weekly[w.key].totalCost += Number(r.totalCost) || 0;
    weekly[w.key].totalLiters += Number(r.liters) || 0;
    weekly[w.key].totalDistance += Number(r.distance) || 0;
    weekly[w.key].count += 1;

    const mKey = getMonthKey(r.date);
    if (!monthly[mKey]) monthly[mKey] = { key: mKey, totalCost: 0, totalLiters: 0, totalDistance: 0, count: 0 };
    monthly[mKey].totalCost += Number(r.totalCost) || 0;
    monthly[mKey].totalLiters += Number(r.liters) || 0;
    monthly[mKey].totalDistance += Number(r.distance) || 0;
    monthly[mKey].count += 1;
  }

  const finalize = (group) => Object.values(group)
    .map(g => ({
      ...g,
      totalCost: round2(g.totalCost),
      totalLiters: round2(g.totalLiters),
      totalDistance: round2(g.totalDistance),
      avgKmPerLiter: g.totalLiters > 0 ? round2(g.totalDistance / g.totalLiters) : 0
    }))
    .sort((a, b) => (a.key < b.key ? 1 : -1));

  return {
    totals: {
      totalCost: round2(totalCost),
      totalLiters: round2(totalLiters),
      totalDistance: round2(totalDistance),
      avgKmPerLiter: totalLiters > 0 ? round2(totalDistance / totalLiters) : 0,
      recordCount: records.length
    },
    weekly: finalize(weekly),
    monthly: finalize(monthly)
  };
}

module.exports = { summarize, getISOWeek, getMonthKey, round2 };
