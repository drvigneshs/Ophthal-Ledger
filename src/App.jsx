import React, { useState, useMemo, useEffect } from 'react';
import { Home, PlusCircle, List, Activity, Trash2, Plus, User, FileText, Pill, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { buildNameSuggestions } from './utils/nameMemory';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboardDate, setDashboardDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportType, setExportType] = useState('all');

  const [encounters, setEncounters] = useState(() => {
    const savedData = typeof window !== 'undefined' ? window.localStorage.getItem('ophthalClinicData') : null;
    return savedData ? JSON.parse(savedData) : [];
  });

  const [quickFillMemory, setQuickFillMemory] = useState(() => {
    const savedData = typeof window !== 'undefined' ? window.localStorage.getItem('ophthalQuickFillMemory') : null;
    if (!savedData) {
      return { procedures: [], surgeries: [], medications: [] };
    }

    try {
      return JSON.parse(savedData);
    } catch {
      return { procedures: [], surgeries: [], medications: [] };
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ophthalClinicData', JSON.stringify(encounters));
    }
  }, [encounters]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('ophthalQuickFillMemory', JSON.stringify(quickFillMemory));
    }
  }, [quickFillMemory]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const rememberQuickFill = (newEncounter) => {
    setQuickFillMemory((prev) => {
      const next = {
        procedures: [...prev.procedures],
        surgeries: [...prev.surgeries],
        medications: [...prev.medications],
      };

      newEncounter.procedures.forEach((item) => {
        const trimmedName = item.name?.trim();
        if (!trimmedName) return;

        const target = item.type === 'Procedure' ? next.procedures : next.surgeries;
        if (!target.some((value) => value.toLowerCase() === trimmedName.toLowerCase())) {
          target.push(trimmedName);
        }
      });

      newEncounter.medications.forEach((item) => {
        const trimmedName = item.name?.trim();
        if (!trimmedName) return;

        if (!next.medications.some((value) => value.toLowerCase() === trimmedName.toLowerCase())) {
          next.medications.push(trimmedName);
        }
      });

      return next;
    });
  };

  const stats = useMemo(() => {
    const selectedMonth = dashboardDate.substring(0, 7);
    const selectedYear = dashboardDate.substring(0, 4);

    let monthlyOp = 0;
    let monthlyIp = 0;
    let monthlyProc = 0;
    let monthlySurg = 0;
    let monthlyPharmGross = 0;
    let monthlyPharmCost = 0;
    let annualGross = 0;

    encounters.forEach((e) => {
      const opFee = e.opVisit?.included ? e.opVisit.fee : (e.visit?.included && e.visit?.type === 'OP' ? e.visit.fee : 0);
      const ipFee = e.ipVisit?.included ? e.ipVisit.fee : (e.visit?.included && e.visit?.type === 'IP' ? e.visit.fee : 0);

      let procFee = 0;
      let surgFee = 0;
      e.procedures.forEach((p) => {
        if (p.type === 'Procedure') procFee += p.amount;
        else surgFee += p.amount;
      });

      let pGross = 0;
      let pCost = 0;
      e.medications.forEach((m) => {
        pGross += m.qty * m.sellPrice;
        pCost += m.qty * m.buyPrice;
      });

      const totalBillGross = opFee + ipFee + procFee + surgFee + pGross;

      if (e.date.startsWith(selectedYear)) {
        annualGross += totalBillGross;
      }

      if (e.date.startsWith(selectedMonth)) {
        monthlyOp += opFee;
        monthlyIp += ipFee;
        monthlyProc += procFee;
        monthlySurg += surgFee;
        monthlyPharmGross += pGross;
        monthlyPharmCost += pCost;
      }
    });

    const monthlyGross = monthlyOp + monthlyIp + monthlyProc + monthlySurg + monthlyPharmGross;
    const monthlyNet = monthlyGross - monthlyPharmCost;

    return {
      monthlyOp,
      monthlyIp,
      monthlyProc,
      monthlySurg,
      monthlyPharmGross,
      monthlyPharmCost,
      monthlyGross,
      monthlyNet,
      annualGross,
      selectedMonth,
      selectedYear,
    };
  }, [dashboardDate, encounters]);

  const exportToExcel = () => {
    let filteredEncounters = encounters;

    if (exportType === 'month') {
      filteredEncounters = encounters.filter((e) => e.date.startsWith(stats.selectedMonth));
    } else if (exportType === 'year') {
      filteredEncounters = encounters.filter((e) => e.date.startsWith(stats.selectedYear));
    }

    if (filteredEncounters.length === 0) {
      alert(`No data found for the selected ${exportType} period.`);
      return;
    }

    const headers = ['Date', 'Patient Name', 'OP Fee', 'IP Fee', 'Procedures', 'Pharmacy Rev', 'Pharmacy Cost', 'Total Billed', 'Net Profit'];
    const rows = filteredEncounters.map((e) => {
      const opFee = e.opVisit?.included ? e.opVisit.fee : (e.visit?.included && e.visit?.type === 'OP' ? e.visit.fee : 0);
      const ipFee = e.ipVisit?.included ? e.ipVisit.fee : (e.visit?.included && e.visit?.type === 'IP' ? e.visit.fee : 0);
      const procAmt = e.procedures.reduce((sum, p) => sum + p.amount, 0);
      const pharmRev = e.medications.reduce((sum, m) => sum + (m.qty * m.sellPrice), 0);
      const pharmCost = e.medications.reduce((sum, m) => sum + (m.qty * m.buyPrice), 0);
      const total = opFee + ipFee + procAmt + pharmRev;
      const net = total - pharmCost;
      return [e.date, `"${e.patientName}"`, opFee, ipFee, procAmt, pharmRev, pharmCost, total, net].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    let filename = 'Ophthal_Ledger';
    if (exportType === 'month') filename += `_${stats.selectedMonth}`;
    if (exportType === 'year') filename += `_${stats.selectedYear}`;
    if (exportType === 'all') filename += '_All_Time';

    link.download = `${filename}.csv`;
    link.click();
  };

  const DashboardTab = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthDisplay = `${monthNames[parseInt(stats.selectedMonth.split('-')[1]) - 1]} ${stats.selectedMonth.split('-')[0]}`;

    return (
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <label className="block text-sm font-medium text-slate-500 mb-1">Select Date (Filters Month & Year)</label>
          <input type="date" value={dashboardDate} onChange={(e) => setDashboardDate(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg text-lg focus:outline-none focus:border-blue-500" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-600 text-white p-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-1 opacity-80 mb-1"><TrendingUp size={16} /> <span className="text-xs font-semibold uppercase">{monthDisplay} Income</span></div>
            <p className="text-2xl font-bold">₹{stats.monthlyGross.toLocaleString()}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100">
            <div className="flex items-center gap-1 text-red-600 mb-1"><TrendingDown size={16} /> <span className="text-xs font-semibold uppercase">{monthDisplay} Expense</span></div>
            <p className="text-2xl font-bold text-red-900">₹{stats.monthlyPharmCost.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-emerald-50 p-4 rounded-xl shadow-sm border border-emerald-100 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1 text-emerald-700 mb-1"><DollarSign size={16} /> <span className="text-xs font-semibold uppercase">Total Annual Income ({stats.selectedYear})</span></div>
            <p className="text-xl font-bold text-emerald-900">₹{stats.annualGross.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 font-semibold text-slate-700 flex justify-between items-center">
            <span>Income from All Sources</span>
            <span className="text-xs font-normal text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">{monthDisplay}</span>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="p-4 flex justify-between items-center"><span className="text-slate-600 flex items-center gap-2"><User size={16} className="text-blue-400" /> OP Visits</span><span className="font-medium">₹{stats.monthlyOp.toLocaleString()}</span></div>
            <div className="p-4 flex justify-between items-center"><span className="text-slate-600 flex items-center gap-2"><User size={16} className="text-purple-400" /> IP Visits</span><span className="font-medium">₹{stats.monthlyIp.toLocaleString()}</span></div>
            <div className="p-4 flex justify-between items-center"><span className="text-slate-600 flex items-center gap-2"><Activity size={16} className="text-emerald-400" /> Procedures</span><span className="font-medium">₹{stats.monthlyProc.toLocaleString()}</span></div>
            <div className="p-4 flex justify-between items-center"><span className="text-slate-600 flex items-center gap-2"><Activity size={16} className="text-rose-400" /> Surgeries</span><span className="font-medium">₹{stats.monthlySurg.toLocaleString()}</span></div>
            <div className="p-4 flex justify-between items-center"><span className="text-slate-600 flex items-center gap-2"><Pill size={16} className="text-orange-400" /> Pharmacy (Gross)</span><span className="font-medium">₹{stats.monthlyPharmGross.toLocaleString()}</span></div>
          </div>
        </div>
      </div>
    );
  };

  const NewBillTab = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [patientName, setPatientName] = useState('');
    const [opVisit, setOpVisit] = useState({ included: true, fee: 250 });
    const [ipVisit, setIpVisit] = useState({ included: false, fee: 1000 });
    const [procedures, setProcedures] = useState([]);
    const [medications, setMedications] = useState([]);
    const nameSuggestions = useMemo(() => buildNameSuggestions(encounters), [encounters]);

    const addProcedure = () => setProcedures([...procedures, { id: generateId(), type: 'Procedure', name: '', amount: '' }]);
    const removeProcedure = (id) => setProcedures((prev) => prev.filter((p) => p.id !== id));
    const updateProcedure = (id, field, value) => setProcedures((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));

    const addMedication = () => setMedications([...medications, { id: generateId(), name: '', qty: 1, buyPrice: '', sellPrice: '' }]);
    const removeMedication = (id) => setMedications((prev) => prev.filter((m) => m.id !== id));
    const updateMedication = (id, field, value) => setMedications((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));

    const liveBillTotal =
      (opVisit.included ? Number(opVisit.fee) : 0) +
      (ipVisit.included ? Number(ipVisit.fee) : 0) +
      procedures.reduce((sum, p) => sum + Number(p.amount || 0), 0) +
      medications.reduce((sum, m) => sum + (Number(m.sellPrice || 0) * Number(m.qty || 1)), 0);

    const handleSubmit = (e) => {
      e.preventDefault();
      if (!patientName.trim()) return alert('Patient name is required.');

      const newEncounter = {
        id: generateId(),
        date,
        patientName,
        opVisit: { ...opVisit, fee: Number(opVisit.fee) },
        ipVisit: { ...ipVisit, fee: Number(ipVisit.fee) },
        procedures: procedures.map((p) => ({ ...p, amount: Number(p.amount) })),
        medications: medications.map((m) => ({ ...m, qty: Number(m.qty), buyPrice: Number(m.buyPrice), sellPrice: Number(m.sellPrice) })),
      };

      setEncounters((prev) => [newEncounter, ...prev]);
      setPatientName('');
      setOpVisit({ included: true, fee: 250 });
      setIpVisit({ included: false, fee: 1000 });
      setProcedures([]);
      setMedications([]);
      setActiveTab('history');
    };

    const getSuggestionMatches = (value, options = []) => {
      const query = value?.trim().toLowerCase();
      if (!query) {
        return options.slice(0, 5);
      }

      return options.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 5);
    };

    return (
      <form id="bill-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><User size={18} className="text-blue-500" /> Patient Details</h2>
          <div className="flex gap-3">
            <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-1/3 p-3 border rounded-lg bg-slate-50" />
            <input required type="text" placeholder="Patient Name" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-2/3 p-3 border rounded-lg bg-slate-50" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="font-bold text-slate-800 flex items-center gap-2 pb-1 border-b"><Activity size={18} className="text-emerald-500" /> Consultations & Visits</h2>

          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-700 text-sm">Outpatient (OP) Fee</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={opVisit.included} onChange={(e) => setOpVisit({ ...opVisit, included: e.target.checked })} />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {opVisit.included && (
              <input type="number" min="0" placeholder="OP Fee (₹)" value={opVisit.fee} onChange={(e) => setOpVisit({ ...opVisit, fee: e.target.value })} className="w-full p-2.5 border rounded-md bg-white text-sm" />
            )}
          </div>

          <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="font-medium text-slate-700 text-sm">Inpatient (IP) Fee</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={ipVisit.included} onChange={(e) => setIpVisit({ ...ipVisit, included: e.target.checked })} />
                <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
            {ipVisit.included && (
              <input type="number" min="0" placeholder="IP Fee (₹)" value={ipVisit.fee} onChange={(e) => setIpVisit({ ...ipVisit, fee: e.target.value })} className="w-full p-2.5 border rounded-md bg-white text-sm" />
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText size={18} className="text-purple-500" /> Procedures & Surgeries</h2>
          {procedures.map((proc) => {
            const suggestions = getSuggestionMatches(proc.name, proc.type === 'Procedure' ? nameSuggestions.procedures : nameSuggestions.surgeries);

            return (
              <div key={proc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative space-y-2">
                <button type="button" onClick={() => removeProcedure(proc.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200"><Trash2 size={14} /></button>
                <div className="flex gap-2">
                  <select value={proc.type} onChange={(e) => updateProcedure(proc.id, 'type', e.target.value)} className="w-1/3 p-2 text-sm border rounded-md">
                    <option value="Procedure">Procedure</option>
                    <option value="Surgery">Surgery</option>
                  </select>
                  <div className="w-2/3">
                    <input required type="text" placeholder="Name (e.g. Tonometry)" value={proc.name} onChange={(e) => updateProcedure(proc.id, 'name', e.target.value)} className="w-full p-2 text-sm border rounded-md" />
                    {suggestions.length > 0 && (
                      <div className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
                        {suggestions.map((suggestion) => (
                          <button key={suggestion.name} type="button" onClick={(event) => {
                            event.preventDefault();
                            updateProcedure(proc.id, 'name', suggestion.name);
                            updateProcedure(proc.id, 'amount', suggestion.amount ?? '');
                          }} className="block w-full px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50">
                            {suggestion.name} {suggestion.amount ? `• ₹${suggestion.amount}` : ''}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <input required type="number" min="0" placeholder="Amount Billed (₹)" value={proc.amount} onChange={(e) => updateProcedure(proc.id, 'amount', e.target.value)} className="w-full p-2 text-sm border rounded-md" />
              </div>
            );
          })}
          <button type="button" onClick={addProcedure} className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg flex justify-center items-center gap-2 hover:bg-slate-50 text-sm font-medium"><Plus size={16} /> Add Procedure</button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 space-y-3">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Pill size={18} className="text-orange-500" /> Pharmacy (Medications)</h2>
          {medications.map((med) => {
            const suggestions = getSuggestionMatches(med.name, nameSuggestions.medications);

            return (
              <div key={med.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg relative space-y-2">
                <button type="button" onClick={() => removeMedication(med.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1.5 rounded-full hover:bg-red-200"><Trash2 size={14} /></button>
                <div>
                  <input required type="text" placeholder="Medication Name" value={med.name} onChange={(e) => updateMedication(med.id, 'name', e.target.value)} className="w-full p-2 text-sm border rounded-md" />
                  {suggestions.length > 0 && (
                    <div className="mt-1 rounded-md border border-slate-200 bg-white shadow-sm">
                      {suggestions.map((suggestion) => (
                        <button key={suggestion.name} type="button" onClick={(event) => {
                          event.preventDefault();
                          updateMedication(med.id, 'name', suggestion.name);
                          updateMedication(med.id, 'qty', suggestion.qty ?? 1);
                          updateMedication(med.id, 'buyPrice', suggestion.buyPrice ?? '');
                          updateMedication(med.id, 'sellPrice', suggestion.sellPrice ?? '');
                        }} className="block w-full px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-50">
                          {suggestion.name} {suggestion.buyPrice || suggestion.sellPrice ? `• Buy ₹${suggestion.buyPrice ?? '-'} / Sell ₹${suggestion.sellPrice ?? '-'}` : ''}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-[10px] text-slate-500 font-medium">Qty</label><input required type="number" min="1" value={med.qty} onChange={(e) => updateMedication(med.id, 'qty', e.target.value)} className="w-full p-2 text-sm border rounded-md" /></div>
                  <div><label className="text-[10px] text-slate-500 font-medium">Buy (₹)</label><input required type="number" min="0" value={med.buyPrice} onChange={(e) => updateMedication(med.id, 'buyPrice', e.target.value)} className="w-full p-2 text-sm border rounded-md" /></div>
                  <div><label className="text-[10px] text-slate-500 font-medium">Sell (₹)</label><input required type="number" min="0" value={med.sellPrice} onChange={(e) => updateMedication(med.id, 'sellPrice', e.target.value)} className="w-full p-2 text-sm border rounded-md" /></div>
                </div>
              </div>
            );
          })}
          <button type="button" onClick={addMedication} className="w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg flex justify-center items-center gap-2 hover:bg-slate-50 text-sm font-medium"><Plus size={16} /> Add Medication</button>
        </div>

        <div className="fixed bottom-[72px] left-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20">
          <div className="max-w-md mx-auto p-4">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-slate-500 text-sm font-semibold">Total Bill Amount:</span>
              <span className="text-xl font-bold text-blue-700">₹{liveBillTotal.toLocaleString()}</span>
            </div>
            <button type="submit" form="bill-form" className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl flex justify-center items-center gap-2 hover:bg-blue-700 shadow-sm active:scale-[0.98] transition-transform">
              <PlusCircle size={20} /> Save Complete Patient Bill
            </button>
          </div>
        </div>
      </form>
    );
  };

  const HistoryTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 px-1">
        <h2 className="font-bold text-lg text-slate-800">History Ledger</h2>
        <div className="flex justify-between items-center bg-emerald-50 p-2 rounded-xl border border-emerald-100">
          <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="bg-transparent text-sm font-medium text-emerald-800 outline-none pr-2 py-1">
            <option value="all">Export All Time</option>
            <option value="month">Export Month ({stats.selectedMonth})</option>
            <option value="year">Export Year ({stats.selectedYear})</option>
          </select>

          <button onClick={exportToExcel} className="flex items-center gap-1 text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {encounters.length === 0 ? <p className="text-slate-400 text-sm px-1 mt-4">No patients logged yet.</p> : null}

      {encounters.map((encounter) => {
        const opFee = encounter.opVisit?.included ? encounter.opVisit.fee : (encounter.visit?.included && encounter.visit?.type === 'OP' ? encounter.visit.fee : 0);
        const ipFee = encounter.ipVisit?.included ? encounter.ipVisit.fee : (encounter.visit?.included && encounter.visit?.type === 'IP' ? encounter.visit.fee : 0);

        const encTotal = opFee + ipFee + encounter.procedures.reduce((s, p) => s + p.amount, 0) + encounter.medications.reduce((s, m) => s + (m.sellPrice * m.qty), 0);

        return (
          <div key={encounter.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-4">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">{encounter.patientName}</h3>
                <p className="text-xs text-slate-500">{encounter.date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-700">Total: ₹{encTotal}</p>
              </div>
            </div>

            <div className="p-4 text-sm space-y-2">
              {opFee > 0 && <div className="flex justify-between text-slate-600"><span>OP Visit</span><span className="font-medium text-slate-800">₹{opFee}</span></div>}
              {ipFee > 0 && <div className="flex justify-between text-slate-600"><span>IP Visit</span><span className="font-medium text-slate-800">₹{ipFee}</span></div>}

              {encounter.procedures.map((p) => (
                <div key={p.id} className="flex justify-between text-slate-600">
                  <span>{p.name} <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 ml-1">{p.type}</span></span><span className="font-medium text-slate-800">₹{p.amount}</span>
                </div>
              ))}
              {encounter.medications.map((m) => (
                <div key={m.id} className="flex justify-between text-slate-600">
                  <span>{m.name} <span className="text-[10px] text-slate-400">x{m.qty}</span></span><span className="font-medium text-slate-800">₹{m.sellPrice * m.qty}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {encounters.length > 0 && (
        <div className="pt-6 pb-2 flex justify-center border-t border-slate-200 mt-6">
          <button onClick={() => { if (window.confirm('Are you sure you want to clear all data? You should Export to CSV first!')) { setEncounters([]); } }} className="text-xs text-red-500 hover:text-red-700 font-semibold">
            Clear All Data
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 font-sans text-slate-800 selection:bg-blue-100 overflow-hidden">
      <header className="flex-shrink-0 bg-white shadow-sm border-b border-slate-200 z-30">
        <div className="max-w-md mx-auto p-4 flex items-center justify-center">
          <h1 className="text-xl font-bold text-blue-900 tracking-tight flex items-center gap-2">
            <Activity className="text-blue-600" /> Ophthal Ledger
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto w-full relative z-0">
        <div className="max-w-md mx-auto p-4 pb-[180px]">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'newBill' && <NewBillTab />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </main>

      <nav className="flex-shrink-0 w-full bg-white border-t border-slate-200 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] z-30 pb-safe">
        <div className="max-w-md mx-auto flex justify-around px-2 py-3">
          <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 w-20 ${activeTab === 'dashboard' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <Home size={24} className={activeTab === 'dashboard' ? 'fill-blue-50' : ''} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Dashboard</span>
          </button>

          <button onClick={() => setActiveTab('newBill')} className="relative -top-5 flex flex-col items-center">
            <div className={`p-4 rounded-full shadow-lg text-white transition-colors ${activeTab === 'newBill' ? 'bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              <Plus size={28} />
            </div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${activeTab === 'newBill' ? 'text-blue-600' : 'text-slate-500'}`}>New Bill</span>
          </button>

          <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 w-20 ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
            <List size={24} className={activeTab === 'history' ? 'fill-blue-50' : ''} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Ledger</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
