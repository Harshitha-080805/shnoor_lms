import React, { useState, useEffect } from 'react';
import api from "../../api";
import { ShieldAlert, User, Clock, AlertTriangle, Image as ImageIcon, CheckCircle, Camera, Download, FileText, FileSpreadsheet, PlaySquare, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ALL_VIOLATION_TYPES = [
  'Voice Detected (Noise Level High)',
  'Tab Switching Detected',
  'Window Lost Focus (Blur)',
  'Copy/Paste Attempt',
  'Multiple Faces Detected',
  'No Face Detected',
  'Mobile Device Detected'
];

const SHORT_HEADERS = {
  'Voice Detected (Noise Level High)': 'Voice',
  'Tab Switching Detected': 'Tab Switch',
  'Window Lost Focus (Blur)': 'Blur',
  'Fullscreen Exited': 'No Fullscreen',
  'Copy/Paste Attempt': 'Copy/Paste',
  'Right Click Attempt': 'Right Click',
  'Multiple Faces Detected': 'Multi-Face',
  'No Face Detected': 'No Face',
  'Mobile Device Detected': 'Mobile'
};

export default function ProctoringReports({ targetType = 'ASSESSMENT', targetId, studentEmail }) {
  const [reports, setReports] = useState([]);
  const [groupedReports, setGroupedReports] = useState([]);
  const [violationTypes, setViolationTypes] = useState(ALL_VIOLATION_TYPES);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('LOGS'); // 'LOGS' or 'GRID'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [playingVideoUrl, setPlayingVideoUrl] = useState(null);

  useEffect(() => {
    if (targetId) {
      fetchReports();
    }
  }, [targetId, fromDate, toDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      let url = `/api/proctoring/report/${targetType}/${targetId}`;
      const params = new URLSearchParams();
      if (fromDate) params.append('startDate', fromDate);
      if (toDate) params.append('endDate', toDate);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await api.get(url);
      setReports(res.data);
      
      let grouped = Object.values(res.data.reduce((acc, curr) => {
        if (!acc[curr.session_id]) {
          acc[curr.session_id] = {
            session_id: curr.session_id,
            full_name: curr.full_name,
            email: curr.email,
            video_url: curr.video_url,
            violations: {}, // type -> count
            total_violations: 0,
            latest_time: curr.timestamp || curr.start_time
          };
        }
        if (curr.violation_type) {
          if (!acc[curr.session_id].violations[curr.violation_type]) {
            acc[curr.session_id].violations[curr.violation_type] = 0;
          }
          acc[curr.session_id].violations[curr.violation_type]++;
          acc[curr.session_id].total_violations++;
        }
        return acc;
      }, {}));
      
      if (studentEmail) {
        grouped = grouped.filter(g => g.email === studentEmail);
      }
      
      setGroupedReports(grouped);
      // setViolationTypes is initialized with ALL_VIOLATION_TYPES
    } catch (err) {
      console.error("Failed to fetch proctoring reports", err);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138);
    doc.text('SHNOOR LMS - PROCTORING VIOLATIONS REPORT', 14, 22);
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated On: ${new Date().toLocaleString()}`, 14, 34);
    doc.text(`Total Records: ${groupedReports.length}`, 14, 39);
    
    // Line separator
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 43, pageWidth - 14, 43);
    
    const head = [['Student Name', 'Email Address', 'Total', ...violationTypes.map(t => SHORT_HEADERS[t] || t)]];
    const body = groupedReports.map(r => [
      r.full_name,
      r.email,
      r.total_violations,
      ...violationTypes.map(type => r.violations[type] || 0)
    ]);
    
    autoTable(doc, {
      startY: 48,
      head: head,
      body: body,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: 'left' }, // Student Name
        1: { halign: 'left' }  // Email
      },
      didDrawPage: function (data) {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('© 2026 SHNOOR International LLC', 14, doc.internal.pageSize.height - 10);
      }
    });
    doc.save(`Shnoor_LMS_Proctoring_Report_${targetId}.pdf`);
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Violations');
    
    const lastColLetter = String.fromCharCode(65 + 2 + violationTypes.length); // C + violationTypes.length
    
    // Title Row
    worksheet.mergeCells(`A1:${lastColLetter}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SHNOOR LMS - PROCTORING VIOLATIONS REPORT';
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
    worksheet.getCell('B4').value = groupedReports.length;
    worksheet.getCell('B4').alignment = { horizontal: 'left' };

    // Table Headers
    const headers = ['Student Name', 'Email Address', 'Total Violations', ...violationTypes.map(t => SHORT_HEADERS[t] || t)];
    worksheet.getRow(7).values = headers;
    worksheet.getRow(7).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(7).alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Header styling
    headers.forEach((_, index) => {
      const cell = worksheet.getCell(7, index + 1);
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
      { width: 25 }, // Student Name
      { width: 30 }, // Email Address
      { width: 15 }, // Total Violations
      ...violationTypes.map(() => ({ width: 14 }))
    ];

    groupedReports.forEach(r => {
      const rowData = [
        r.full_name,
        r.email,
        r.total_violations,
        ...violationTypes.map(type => r.violations[type] || 0)
      ];
      const row = worksheet.addRow(rowData);
      
      row.eachCell((cell, colNumber) => {
        cell.alignment = colNumber > 2 ? { horizontal: 'center' } : { horizontal: 'left' };
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Shnoor_LMS_Proctoring_Report_${targetId}.xlsx`);
  };

  if (!targetId) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">From Date</label>
              <input type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">To Date</label>
              <input type="date" value={toDate} onChange={e=>setToDate(e.target.value)} className="p-2 border border-slate-200 rounded-lg outline-none text-sm bg-white" />
            </div>
          </div>
          {reports.length > 0 && (
            <div className="flex gap-2">
              <button onClick={exportPDF} className="flex items-center gap-2 bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition">
                <FileText size={16} /> PDF
              </button>
              <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold transition">
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          )}
        </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
          <CheckCircle className="mx-auto text-emerald-500 mb-2" size={32} />
          <p className="text-slate-600 font-medium">No violations detected</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold whitespace-nowrap">
                <th className="p-4">Student</th>
                <th className="p-4 text-center">Total Violations</th>
                {violationTypes.map(type => (
                  <th key={type} className="p-4 text-center">{SHORT_HEADERS[type] || type}</th>
                ))}
                <th className="p-4">Latest Event Time</th>
                <th className="p-4 text-center">Session Video</th>
              </tr>
            </thead>
            <tbody>
              {groupedReports.map((report) => (
                <tr key={report.session_id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-slate-400" />
                      <span className="font-medium text-slate-800">{report.full_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 ml-6">{report.email}</div>
                  </td>
                  <td className="p-4 text-center font-bold text-red-600">
                    <span className="bg-red-100 px-3 py-1 rounded-full">{report.total_violations}</span>
                  </td>
                  {violationTypes.map(type => (
                    <td key={type} className="p-4 text-center font-medium">
                      {report.violations[type] ? (
                        <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{report.violations[type]}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  ))}
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(report.latest_time).toLocaleString()}
                  </td>
                  <td className="p-4 text-center">
                    {report.video_url ? (
                      <button 
                        onClick={() => setPlayingVideoUrl(`http://localhost:5000${report.video_url}`)}
                        className="inline-flex items-center gap-1.5 text-white bg-slate-800 hover:bg-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <PlaySquare size={14} /> Watch Session
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Not recorded</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {playingVideoUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PlaySquare className="text-blue-500" /> Session Playback
              </h3>
              <button onClick={() => setPlayingVideoUrl(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="bg-black flex items-center justify-center relative">
              <video 
                src={playingVideoUrl} 
                controls 
                autoPlay 
                className="w-full max-h-[70vh]"
                onError={(e) => console.error("Error playing video", e)}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
