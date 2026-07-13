import React, { useState, useEffect } from 'react';
import { Award, Search, TrendingUp, Users, CheckCircle, XCircle, Download, ShieldAlert, X } from 'lucide-react';
import api from '../../../api';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import ProctoringReports from '../../../components/proctoring/ProctoringReports';

function InstituteExams() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortOption, setSortOption] = useState('Newest');

  // Proctoring Modal State
  const [showProctoringModal, setShowProctoringModal] = useState(false);
  const [proctoringExamId, setProctoringExamId] = useState(null);
  const [proctoringStudentEmail, setProctoringStudentEmail] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/api/org-admin/exams/analytics');
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const sortedAttempts = React.useMemo(() => {
    if (!stats?.recentAttempts) return [];
    let dataCopy = [...stats.recentAttempts];
    
    if (search) {
      dataCopy = dataCopy.filter(a => 
        (a.student_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.exam_title || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.course_title || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    
    if (sortOption === 'Newest') return dataCopy.sort((a,b) => new Date(b.submitted_at || b.started_at) - new Date(a.submitted_at || a.started_at));
    if (sortOption === 'Oldest') return dataCopy.sort((a,b) => new Date(a.submitted_at || a.started_at) - new Date(b.submitted_at || b.started_at));
    if (sortOption === 'Highest Score') return dataCopy.sort((a,b) => parseFloat(b.total_score || 0) - parseFloat(a.total_score || 0));
    if (sortOption === 'Lowest Score') return dataCopy.sort((a,b) => parseFloat(a.total_score || 0) - parseFloat(b.total_score || 0));
    
    return dataCopy;
  }, [stats, search, sortOption]);

  const exportExcel = async () => {
    if (!sortedAttempts || sortedAttempts.length === 0) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Exam Attempts');

    // Title Row
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SHNOOR LMS - EXAM ATTEMPTS REPORT';
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // blue-950
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

    // Metadata
    worksheet.getCell('A3').value = 'Generated On:';
    worksheet.getCell('A3').font = { bold: true };
    worksheet.getCell('B3').value = new Date().toLocaleString();
    worksheet.getCell('B3').alignment = { horizontal: 'left' };

    worksheet.getCell('A4').value = 'Total Records:';
    worksheet.getCell('A4').font = { bold: true };
    worksheet.getCell('B4').value = sortedAttempts.length;
    worksheet.getCell('B4').alignment = { horizontal: 'left' };

    // Table Headers
    const headers = ['Student', 'Exam', 'Course', 'Score', 'Status', 'Date'];
    worksheet.getRow(6).values = headers;
    worksheet.getRow(6).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(6).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Header styling
    headers.forEach((_, index) => {
      const cell = worksheet.getCell(6, index + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }; // blue-500
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };
    });

    // Column widths
    worksheet.columns = [
      { width: 25 }, { width: 35 }, { width: 35 }, { width: 15 }, { width: 15 }, { width: 15 }
    ];

    // Data Rows
    sortedAttempts.forEach((attempt, index) => {
      const row = worksheet.addRow([
        attempt.student_name || '',
        attempt.exam_title || '',
        attempt.course_title || '',
        `${Math.round(parseFloat(attempt.total_score || 0))}%`,
        attempt.status || '',
        new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString()
      ]);

      // Alternating row colors
      const fillColor = index % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF'; // slate-50
      
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
        if (colNumber >= 4 && colNumber <= 6) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Shnoor_LMS_Exam_Attempts_${new Date().getTime()}.xlsx`);
  };

  if (loading) {
    return <div className="p-12 text-center">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Exam Analytics</h2>
          <p className="text-slate-500 text-sm mt-1">Monitor organization-wide exam performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Award size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Unique Exams Taken</p>
            <h3 className="text-2xl font-bold text-white">{stats?.totalExamsConducted || 0}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Average Pass Rate</p>
            <h3 className="text-2xl font-bold text-white">{stats?.averagePassRate || 0}%</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Users size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Total Attempts</p>
            <h3 className="text-2xl font-bold text-white">{stats?.totalAttempts || 0}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-6 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium">Average Score</p>
            <h3 className="text-2xl font-bold text-white">{Math.round(stats?.averageScore || 0)}%</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 w-full sm:w-auto">
            <span className="px-4 py-1.5 text-sm font-semibold text-blue-950">Recent Attempts</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={exportExcel}
              className="px-4 py-2 bg-emerald-600 text-white border-emerald-600 border rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Download size={16} /> Export
            </button>
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all bg-white"
              />
            </div>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="Newest">Newest</option>
              <option value="Oldest">Oldest</option>
              <option value="Highest Score">Highest Score</option>
              <option value="Lowest Score">Lowest Score</option>
            </select>
          </div>
        </div>

        {sortedAttempts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                  <th className="p-4">Student</th>
                  <th className="p-4">Exam</th>
                  <th className="p-4">Course</th>
                  <th className="p-4">Score</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {sortedAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 font-bold text-slate-800">{attempt.student_name}</td>
                    <td className="p-4">{attempt.exam_title}</td>
                    <td className="p-4 text-slate-500">{attempt.course_title}</td>
                    <td className="p-4 font-black text-blue-950">{Math.round(parseFloat(attempt.total_score || 0))}%</td>
                    <td className="p-4">
                      {attempt.status === 'PASSED' ? (
                        <span className="flex items-center gap-1 text-green-600 font-bold bg-green-50 px-2 py-1 rounded-md w-fit"><CheckCircle size={14} /> PASSED</span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-md w-fit"><XCircle size={14} /> FAILED</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">{new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => { 
                          setProctoringExamId(attempt.exam_id); 
                          setProctoringStudentEmail(attempt.student_email);
                          setShowProctoringModal(true); 
                        }}
                        className="bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <ShieldAlert size={14} /> Proctoring
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">No recent exam attempts found.</div>
        )}
      </div>

      {showProctoringModal && proctoringExamId && (
        <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col overflow-hidden animate-in fade-in duration-200">
          <div className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">Proctoring Violations Report</h3>
                <p className="text-sm text-slate-500 font-medium">Live monitoring logs and historical records</p>
              </div>
            </div>
            <button 
              onClick={() => setShowProctoringModal(false)} 
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors flex items-center gap-2"
            >
              <X size={18} /> Close Reports
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            <div className="w-full">
              <ProctoringReports targetType="ASSESSMENT" targetId={proctoringExamId} studentEmail={proctoringStudentEmail} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default InstituteExams;
