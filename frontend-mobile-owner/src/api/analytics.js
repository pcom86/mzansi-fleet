import client from './client';

export async function getVehiclesByTenant(tenantId) {
  if (!tenantId) return [];
  const resp = await client.get(`/Vehicles/tenant/${tenantId}`);
  return resp.data || [];
}

export async function getVehicleEarningsByPeriod(vehicleId, startDate, endDate) {
  const resp = await client.get(`/VehicleEarnings/vehicle/${vehicleId}/period`, {
    params: { startDate, endDate },
  });
  return resp.data;
}

export async function getVehicleExpensesByPeriod(vehicleId, startDate, endDate) {
  const resp = await client.get(`/VehicleExpenses/vehicle/${vehicleId}/period`, {
    params: { startDate, endDate },
  });
  return resp.data;
}

export async function getServiceHistory(vehicleId) {
  const resp = await client.get(`/ServiceHistory/vehicle/${vehicleId}`);
  return resp.data || [];
}

function asArray(val) {
  if (!val) return [];
  // Handle common API collection wrapper shapes (e.g. .NET serialization)
  if (Array.isArray(val?.$values)) return val.$values;
  if (Array.isArray(val?.values)) return val.values;
  if (Array.isArray(val?.items)) return val.items;
  if (Array.isArray(val?.data)) return val.data;
  if (Array.isArray(val?.result)) return val.result;
  // Sometimes the collection is nested under a wrapper object
  if (val?.data) return asArray(val.data);
  if (val?.result) return asArray(val.result);
  return Array.isArray(val) ? val : [val];
}

function toNumber(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const s = String(val).replace(/[^0-9.-]+/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function sumAmounts(items) {
  return (items || []).reduce((sum, x) => sum + toNumber(x?.amount ?? x?.Amount ?? x?.totalAmount ?? x?.TotalAmount ?? x?.value ?? x?.Value), 0);
}

function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

function parseDateSafe(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    const dNum = new Date(val);
    return Number.isNaN(dNum.getTime()) ? null : dNum;
  }
  if (typeof val === 'object') {
    const nested = val?.date || val?.Date || val?.value || val?.Value || val?.$date || null;
    if (nested) return parseDateSafe(nested);
  }
  if (typeof val === 'string') {
    const m = val.match(/\/Date\((\d+)\)\//);
    if (m?.[1]) {
      const ms = Number(m[1]);
      const dDotNet = new Date(ms);
      return Number.isNaN(dDotNet.getTime()) ? null : dDotNet;
    }
  }
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfLocalDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfUTCDayFromISO(dateStr) {
  // Use UTC boundaries to avoid timezone shifting transactions out of buckets.
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function endOfUTCDayFromISO(dateStr) {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

function formatWeekLabel(start, end) {
  const s = start.toISOString().slice(5, 10);
  const e = end.toISOString().slice(5, 10);
  return `${s}-${e}`;
}

function isDateWithinDays(date, days) {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
}

export function calculateHealthScore(vehicle) {
  let score = 100;

  if (vehicle?.lastServiceDate) {
    const daysSince = Math.floor((Date.now() - new Date(vehicle.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 180) score -= 30;
    else if (daysSince > 120) score -= 20;
    else if (daysSince > 90) score -= 10;
  } else {
    score -= 40;
  }

  if (vehicle?.nextServiceDate) {
    const daysUntil = Math.floor((new Date(vehicle.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntil < 0) score -= 25;
    else if (daysUntil < 7) score -= 15;
  }

  if (Number(vehicle?.mileage) > 200000) score -= 20;
  else if (Number(vehicle?.mileage) > 150000) score -= 10;

  return Math.max(0, Math.min(100, score));
}

export async function getVehicleWeeklyPerformance(vehicleId, startDate, endDate) {
  // fetch raw earnings and expenses for the vehicle and group them into 7-day buckets starting from startDate
  const [earningsRaw, expensesRaw] = await Promise.all([
    getVehicleEarningsByPeriod(vehicleId, startDate, endDate),
    getVehicleExpensesByPeriod(vehicleId, startDate, endDate),
  ]);

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const eArr = asArray(earningsRaw);
    const xArr = asArray(expensesRaw);
    console.log('[weekly] raw earnings type', typeof earningsRaw, 'keys', earningsRaw && typeof earningsRaw === 'object' ? Object.keys(earningsRaw) : null, 'count', eArr.length);
    console.log('[weekly] raw expenses type', typeof expensesRaw, 'keys', expensesRaw && typeof expensesRaw === 'object' ? Object.keys(expensesRaw) : null, 'count', xArr.length);
    console.log('[weekly] sample earning item', eArr[0]);
    console.log('[weekly] sample expense item', xArr[0]);
  }

  function extractAmount(x) {
    return toNumber(
      x?.amount ??
      x?.Amount ??
      x?.totalAmount ??
      x?.TotalAmount ??
      x?.value ??
      x?.Value ??
      x?.cost ??
      x?.Cost ??
      x?.fare ??
      x?.Fare ??
      x?.price ??
      x?.Price ??
      x?.total ??
      x?.Total
    );
  }

  function extractDate(x) {
    return (
      x?.date ||
      x?.Date ||
      x?.transactionDate ||
      x?.TransactionDate ||
      x?.transaction_date ||
      x?.Transaction_Date ||
      x?.createdAt ||
      x?.CreatedAt ||
      x?.dateCreated ||
      x?.DateCreated ||
      x?.createdOn ||
      x?.CreatedOn ||
      x?.earningDate ||
      x?.EarningDate ||
      x?.expenseDate ||
      x?.ExpenseDate ||
      x?.serviceDate ||
      x?.ServiceDate ||
      x?.timestamp ||
      x?.Timestamp ||
      null
    );
  }

  const earningsList = asArray(earningsRaw).map(x => ({
    amount: extractAmount(x),
    date: parseDateSafe(extractDate(x)),
  }));
  const expensesList = asArray(expensesRaw).map(x => ({
    amount: extractAmount(x),
    date: parseDateSafe(extractDate(x)),
  }));

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const eValidDates = earningsList.filter(i => !!i.date).length;
    const xValidDates = expensesList.filter(i => !!i.date).length;
    const eTotal = earningsList.reduce((s, i) => s + toNumber(i.amount), 0);
    const xTotal = expensesList.reduce((s, i) => s + toNumber(i.amount), 0);
    console.log('[weekly] parsed earnings', earningsList.length, 'validDates', eValidDates, 'total', eTotal);
    console.log('[weekly] parsed expenses', expensesList.length, 'validDates', xValidDates, 'total', xTotal);
  }

  const weeks = [];
  let current = startOfUTCDayFromISO(startDate);
  const last = endOfUTCDayFromISO(endDate);
  while (current <= last) {
    const startOfWeek = new Date(current);
    const endOfWeek = new Date(current);
    endOfWeek.setUTCDate(endOfWeek.getUTCDate() + 6);
    endOfWeek.setUTCHours(23, 59, 59, 999);
    if (endOfWeek > last) endOfWeek.setTime(last.getTime());
    weeks.push({
      start: new Date(startOfWeek),
      end: new Date(endOfWeek),
      earnings: 0,
      expenses: 0,
    });
    current.setUTCDate(current.getUTCDate() + 7);
  }

  function addToWeek(item, field) {
    if (!item?.date) return;
    const t = item.date.getTime();
    for (const w of weeks) {
      if (t >= w.start.getTime() && t <= w.end.getTime()) {
        w[field] += toNumber(item.amount);
        break;
      }
    }
  }

  earningsList.forEach(e => addToWeek(e, 'earnings'));
  expensesList.forEach(e => addToWeek(e, 'expenses'));

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const sumE = weeks.reduce((s, w) => s + toNumber(w.earnings), 0);
    const sumX = weeks.reduce((s, w) => s + toNumber(w.expenses), 0);
    console.log('[weekly] bucket totals earnings', sumE, 'expenses', sumX, 'weeks', weeks.length);
  }

  return weeks.map(w => {
    const label = formatWeekLabel(w.start, w.end);
    return {
      ...w,
      label,
      profit: w.earnings - w.expenses,
    };
  });
}

export async function getOwnerAnalyticsDashboard(tenantId, startDate, endDate) {
  const vehicles = await getVehiclesByTenant(tenantId);

  const vehiclePerformance = await Promise.all(
    (vehicles || []).map(async (v) => {
      try {
        const [earningsRaw, expensesRaw, serviceHistory] = await Promise.all([
          getVehicleEarningsByPeriod(v.id, startDate, endDate),
          getVehicleExpensesByPeriod(v.id, startDate, endDate),
          getServiceHistory(v.id),
        ]);

        const earnings = sumAmounts(asArray(earningsRaw));
        const expenses = sumAmounts(asArray(expensesRaw));

        const latestService = (serviceHistory || [])
          .slice()
          .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];

        const isInService =
          !!latestService &&
          isDateWithinDays(new Date(latestService.serviceDate), 7) &&
          latestService.serviceType !== 'Completed';

        return {
          ...v,
          earnings,
          expenses,
          profit: earnings - expenses,
          healthScore: calculateHealthScore(v),
          isInService,
          serviceType: latestService?.serviceType || '',
          serviceMessage: latestService ? `${latestService.serviceType} - ${latestService.description || 'In progress'}` : '',
        };
      } catch {
        return {
          ...v,
          earnings: 0,
          expenses: 0,
          profit: 0,
          healthScore: 50,
          isInService: false,
          serviceType: '',
          serviceMessage: '',
        };
      }
    })
  );

  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter((v) => v.status === 'Active').length;
  const inactiveVehicles = totalVehicles - activeVehicles;

  const totalEarnings = vehiclePerformance.reduce((s, v) => s + (v.earnings || 0), 0);
  const totalExpenses = vehiclePerformance.reduce((s, v) => s + (v.expenses || 0), 0);
  const totalProfit = totalEarnings - totalExpenses;
  const avgProfitPerVehicle = totalVehicles > 0 ? totalProfit / totalVehicles : 0;
  const vehiclesInService = vehiclePerformance.filter((v) => v.isInService).length;

  const mostProfitableVehicle = vehiclePerformance.reduce(
    (max, v) => (!max || v.profit > max.profit ? v : max),
    null
  );

  return {
    periodStartDate: startDate,
    periodEndDate: endDate,
    vehicles,
    vehiclePerformance,
    totalVehicles,
    activeVehicles,
    inactiveVehicles,
    vehiclesInService,
    totalEarnings,
    totalExpenses,
    totalProfit,
    avgProfitPerVehicle,
    mostProfitableVehicle,
  };
}

export function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: formatDateISO(start), endDate: formatDateISO(end), start, end };
}
