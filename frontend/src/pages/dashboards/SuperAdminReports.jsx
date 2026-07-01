import React, { useState, useEffect } from 'react';
import api from '../../api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, UserCheck, BookOpen, UserPlus, Building2, Award, Star, Wallet, Calendar, Download, Search
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const ROLE_COLORS = {
  'LEARNER': '#3b82f6',
  'ORGANIZATION_ADMIN': '#10b981',
  'INSTRUCTOR': '#f97316',
  'ADMIN': '#eab308'
};

export default function SuperAdminReports() {
  const [dashboardData, setDashboardData] = useState(null);
  const [usersData, setUsersData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date Range Filters
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultStartDate.getDate() - 14);
  
  const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);
  
  // Filters for User Data
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [learnerTypeFilter, setLearnerTypeFilter] = useState('ALL');
  const [orgFilter, setOrgFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Newest');

  // User Profile Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfileData, setUserProfileData] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes] = await Promise.all([
        api.get(`/api/admin/reports/dashboard?startDate=${startDate}&endDate=${endDate}`),
        api.get('/api/admin/reports/users')
      ]);
      setDashboardData(dashRes.data);
      setUsersData(usersRes.data);
    } catch (error) {
      console.error('Failed to fetch reports data', error);
    } finally {
      setLoading(false);
    }
  };

  const openUserProfile = async (userId) => {
    setSelectedUser(userId);
    setLoadingProfile(true);
    try {
      const res = await api.get(`/api/admin/reports/users/${userId}`);
      setUserProfileData(res.data);
    } catch (error) {
      console.error('Failed to fetch user profile', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const closeUserProfile = () => {
    setSelectedUser(null);
    setUserProfileData(null);
  };

  const handleRevokeAccess = async () => {
    if (!window.confirm("Are you sure you want to revoke this user's subscription and deactivate their account?")) return;
    try {
      if (userProfileData.user.role === 'ORGANIZATION_ADMIN' && userProfileData.user.organization_id) {
        await api.put(`/api/admin/reports/organizations/${userProfileData.user.organization_id}/revoke-subscription`);
      } else {
        await api.put(`/api/admin/reports/users/${userProfileData.user.id}/revoke-subscription`);
      }
      alert('Access revoked and account deactivated successfully.');
      closeUserProfile();
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to revoke access', error);
      alert(error.response?.data?.error || 'Failed to revoke access');
    }
  };

  const handleRestoreAccess = async () => {
    if (!window.confirm("Are you sure you want to restore access for this user/organization?")) return;
    try {
      if (userProfileData.user.role === 'ORGANIZATION_ADMIN' && userProfileData.user.organization_id) {
        await api.put(`/api/admin/reports/organizations/${userProfileData.user.organization_id}/restore-access`);
      } else {
        await api.put(`/api/admin/reports/users/${userProfileData.user.id}/restore-access`);
      }
      alert('Access restored successfully.');
      closeUserProfile();
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to restore access', error);
      alert(error.response?.data?.error || 'Failed to restore access');
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm("CRITICAL ACTION: Are you sure you want to permanently delete this user? This action cannot be undone.")) return;
    try {
      await api.delete(`/api/admin/reports/users/${userProfileData.user.id}`);
      alert('User permanently deleted.');
      closeUserProfile();
      fetchData(); // Refresh the list
    } catch (error) {
      console.error('Failed to delete user', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(30, 58, 138); // blue-950
    doc.setFont("helvetica", "bold");
    doc.text('SHNOOR LMS', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont("helvetica", "normal");
    doc.text('Official User Directory Report', 14, 28);
    
    // Metadata
    doc.setFontSize(9);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 34);
    doc.text(`Total Records: ${filteredUsers.length}`, 14, 39);

    if (roleFilter !== 'ALL') doc.text(`Role Filter: ${roleFilter}`, 80, 34);
    if (orgFilter !== 'ALL') doc.text(`Org Filter: ${orgFilter}`, 80, 39);
    
    // Line separator
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 43, pageWidth - 14, 43);

    // Table Data
    const tableColumn = ["Name", "Email", "System Role", "Learner Type", "Organization", "Activity Stats", "Joined Date"];
    const tableRows = [];

    filteredUsers.forEach(user => {
      let stats = "N/A";
      if (user.role === 'LEARNER') {
        stats = `Enrolled: ${user.courses_enrolled || 0} | Certs: ${user.certificates_received || 0}`;
      } else if (user.role === 'INSTRUCTOR') {
        stats = `Published: ${user.courses_published || 0}`;
      }

      const userData = [
        user.full_name,
        user.email,
        user.role,
        user.learner_type ? user.learner_type.toUpperCase() : '-',
        user.organization_name || '-',
        stats,
        new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      ];
      tableRows.push(userData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 48,
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica', cellPadding: 3 },
      headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didDrawPage: function (data) {
        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${doc.internal.getNumberOfPages()}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        doc.text('© 2026 SHNOOR International LLC', 14, doc.internal.pageSize.height - 10);
      }
    });
    
    doc.save(`Shnoor_LMS_Users_Report_${new Date().getTime()}.pdf`);
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users Report');

    // Title Row
    worksheet.mergeCells('A1:I1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'SHNOOR LMS - OFFICIAL USER DIRECTORY REPORT';
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
    worksheet.getCell('B4').value = filteredUsers.length;
    worksheet.getCell('B4').alignment = { horizontal: 'left' };

    // Table Headers
    const headers = [
      "Full Name", "Email Address", "System Role", "Learner Type", 
      "Organization", "Courses Enrolled", "Certificates", "Courses Published", "Joined Date"
    ];
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
      { width: 25 }, { width: 30 }, { width: 20 }, { width: 15 },
      { width: 25 }, { width: 18 }, { width: 15 }, { width: 18 }, { width: 15 }
    ];

    // Data Rows
    filteredUsers.forEach((user, index) => {
      const row = worksheet.addRow([
        user.full_name || '',
        user.email || '',
        user.role || '',
        user.learner_type ? user.learner_type.toUpperCase() : '-',
        user.organization_name || '-',
        user.courses_enrolled || 0,
        user.certificates_received || 0,
        user.courses_published || 0,
        new Date(user.created_at).toLocaleDateString('en-GB')
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
        if (colNumber >= 6 && colNumber <= 8) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    // Save File
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Shnoor_LMS_Users_Report_${new Date().getTime()}.xlsx`);
  };

  const organizationsList = Array.from(new Set(usersData.map(u => u.organization_name).filter(Boolean))).sort();

  const filteredUsers = usersData.filter(u => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    
    let matchesLearnerType = true;
    if (roleFilter === 'LEARNER' && learnerTypeFilter !== 'ALL') {
      matchesLearnerType = (u.learner_type?.toLowerCase() === learnerTypeFilter.toLowerCase());
    }
    
    let matchesOrg = true;
    const isOrgApplicable = roleFilter === 'INSTRUCTOR' || 
                            (roleFilter === 'LEARNER' && (learnerTypeFilter === 'student' || learnerTypeFilter === 'employee'));
                            
    if (isOrgApplicable && orgFilter !== 'ALL') {
      matchesOrg = u.organization_name === orgFilter;
    }

    const matchesSearch = (u.full_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (u.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
                          
    return matchesRole && matchesSearch && matchesLearnerType && matchesOrg;
  });

  const sortedUsers = React.useMemo(() => {
    let dataCopy = [...filteredUsers];
    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === "Name A-Z") return dataCopy.sort((a,b) => (a.full_name||'').localeCompare(b.full_name||''));
    if (sortOption === "Name Z-A") return dataCopy.sort((a,b) => (b.full_name||'').localeCompare(a.full_name||''));
    return dataCopy;
  }, [filteredUsers, sortOption]);

  if (loading || !dashboardData) return <div className="p-8 text-center text-slate-500 font-bold">Loading dashboard...</div>;

  const { summaryCards, userGrowthTrend, roleDistribution, topOrganizations, enrollmentsTrend, completionTrend, revenueTrend, recentActivity, popularCourses, learnerEngagement } = dashboardData;

  const summaryWidgets = [
    { label: "Total Users", value: summaryCards.totalUsers.toLocaleString(), icon: <Users className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-sky-500", iconShadow: "shadow-sky-500/20", text: "text-blue-200" },
    { label: "Active Learners", value: summaryCards.activeLearners.toLocaleString(), icon: <UserCheck className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-emerald-500", iconShadow: "shadow-emerald-500/20", text: "text-blue-200" },
    { label: "Courses Published", value: summaryCards.coursesPublished.toLocaleString(), icon: <BookOpen className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-purple-500", iconShadow: "shadow-purple-500/20", text: "text-blue-200" },
    { label: "Instructors", value: summaryCards.instructors.toLocaleString(), icon: <UserPlus className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-indigo-500", iconShadow: "shadow-indigo-500/20", text: "text-blue-200" },
    { label: "Organizations", value: summaryCards.organizations.toLocaleString(), icon: <Building2 className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-rose-500", iconShadow: "shadow-rose-500/20", text: "text-blue-200" },
    { label: "Certificates Issued", value: summaryCards.certificatesIssued.toLocaleString(), icon: <Award className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-teal-500", iconShadow: "shadow-teal-500/20", text: "text-blue-200" },
    { label: "Completion Rate", value: `${summaryCards.completionRate}%`, icon: <Star className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-amber-500", iconShadow: "shadow-amber-500/20", text: "text-blue-200" },
    { label: "Revenue This Month", value: `₹${summaryCards.revenueThisMonth.toLocaleString()}`, icon: <Wallet className="w-5 h-5" />, bg: "bg-blue-950", border: "border-blue-900", iconBg: "bg-green-500", iconShadow: "shadow-green-500/20", text: "text-blue-200" },
  ];

  const scrollToUsers = () => {
    document.getElementById('users-directory')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      {!selectedUser ? (
        <div className="space-y-6 animate-fade-in-up">
      {/* Top Header Actions */}
      <div className="flex items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-slate-50">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              className="bg-transparent border-none outline-none text-slate-700 font-medium"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-400">-</span>
            <input 
              type="date" 
              className="bg-transparent border-none outline-none text-slate-700 font-medium"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryWidgets.map((widget, idx) => (
          <div key={idx} className={`${widget.bg} p-6 rounded-2xl border ${widget.border} shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1`}>
            <div className={`p-3 rounded-xl ${widget.iconBg} text-white shadow-lg ${widget.iconShadow} flex items-center justify-center`}>
              {widget.icon}
            </div>
            <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${widget.text} mb-1`}>{widget.label}</p>
              <h3 className="text-2xl font-black text-white">{widget.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* User Growth Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">User Growth Trend</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">Daily ▾</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date_str" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Role Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">User Role Distribution</h3>
            <button onClick={scrollToUsers} className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">View Details</button>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={roleDistribution}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="role"
                    stroke="none"
                  >
                    {roleDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={ROLE_COLORS[entry.role] || '#cbd5e1'} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-800">{summaryCards.totalUsers.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-slate-400">Total</span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {roleDistribution.map((role, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ROLE_COLORS[role.role] || '#cbd5e1' }}></span>
                    <span className="font-semibold text-slate-600 capitalize">{role.role.toLowerCase().replace('_', ' ')}</span>
                  </div>
                  <div className="font-bold text-slate-800">
                    {Math.round((role.count / summaryCards.totalUsers) * 100)}% <span className="text-slate-400 font-medium">({role.count})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Top Organizations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Top Organizations by Users</h3>
            <button onClick={scrollToUsers} className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">View All</button>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topOrganizations} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis dataKey="org_name" type="category" tick={{fontSize: 10, fill: '#475569', fontWeight: 'bold'}} axisLine={false} tickLine={false} width={80} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="total_users" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                  {topOrganizations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#6366f1" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Enrollments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Course Enrollments</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">Daily ▾</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={enrollmentsTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnrolls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date_str" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorEnrolls)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course Completion Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Course Completion Rate</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">Daily ▾</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date_str" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="completions" fill="#10b981" radius={[2, 2, 0, 0]} minPointSize={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Widgets */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Growth */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-80">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-800">Revenue Growth</h3>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">Daily ▾</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date_str" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(value) => `₹${value}`} axisLine={false} tickLine={false} />
                <RechartsTooltip formatter={(value) => [`₹${value}`, 'Revenue']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="revenue" stroke="#eab308" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Popular Courses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-800">Popular Courses</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-5 custom-scrollbar">
            {popularCourses.map((course, i) => {
              const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-orange-500'];
              const maxEnroll = popularCourses[0]?.enrollment_count || 1;
              const width = Math.max(10, (course.enrollment_count / maxEnroll) * 100);
              return (
                <div key={i} className="flex gap-3 items-center">
                  <div className={`w-8 h-8 rounded-lg ${colors[i % colors.length]} bg-opacity-10 text-${colors[i % colors.length].replace('bg-', '')} flex items-center justify-center font-bold text-xs shrink-0`}>
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-slate-800">{course.title}</p>
                    <p className="text-[10px] text-slate-500 mb-1">{course.enrollment_count} Enrollments</p>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${colors[i % colors.length]} rounded-full`} style={{ width: `${width}%` }}></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Learner Engagement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-80">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-800">Learner Engagement</h3>
            <button onClick={scrollToUsers} className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">View Details</button>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center relative">
            <div className="w-full h-40 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: learnerEngagement.engagementPercentage },
                      { name: 'Inactive', value: 100 - learnerEngagement.engagementPercentage }
                    ]}
                    cx="50%" cy="100%"
                    startAngle={180} endAngle={0}
                    innerRadius={70} outerRadius={90}
                    paddingAngle={0}
                    dataKey="value"
                    stroke="none"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2 pointer-events-none">
              <span className="text-3xl font-black text-slate-800">{learnerEngagement.engagementPercentage}%</span>
              <span className="text-xs font-bold text-slate-500">High Engagement</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-center">
            <div>
              <p className="text-sm font-extrabold text-slate-800">{learnerEngagement.activeLearners}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Active Learners</p>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-800">{learnerEngagement.coursesInProgress}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Courses In Progress</p>
            </div>
            <div>
              <p className="text-sm font-extrabold text-slate-800">{learnerEngagement.completedCourses}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Completed Courses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Directory */}
      <div id="users-directory" className="mt-8 pt-4">
        <h2 className="text-xl font-extrabold text-slate-800 mb-6">Users Directory</h2>
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-slate-50">
            <div className="flex items-center gap-3 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="text"
                placeholder="Search users..."
                className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 w-64 shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm font-medium"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setLearnerTypeFilter('ALL');
                  setOrgFilter('ALL');
                }}
              >
                <option value="ALL">All Roles</option>
                <option value="LEARNER">Learners</option>
                <option value="INSTRUCTOR">Instructors</option>
                <option value="ORGANIZATION_ADMIN">Org Admins</option>
              </select>

              {roleFilter === 'LEARNER' && (
                <select
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm font-medium"
                  value={learnerTypeFilter}
                  onChange={(e) => {
                    setLearnerTypeFilter(e.target.value);
                    setOrgFilter('ALL');
                  }}
                >
                  <option value="ALL">All Learner Types</option>
                  <option value="independent">Independent</option>
                  <option value="student">Student</option>
                  <option value="employee">Employee</option>
                </select>
              )}

              {((roleFilter === 'LEARNER' && (learnerTypeFilter === 'student' || learnerTypeFilter === 'employee')) || 
                 roleFilter === 'INSTRUCTOR') && (
                <select
                  className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm font-medium"
                  value={orgFilter}
                  onChange={(e) => setOrgFilter(e.target.value)}
                >
                  <option value="ALL">All Organizations</option>
                  {organizationsList.map((org, i) => (
                    <option key={i} value={org}>{org}</option>
                  ))}
                </select>
              )}

              <select
                className="px-4 py-2 text-sm border border-slate-300 rounded-lg bg-white shadow-sm font-medium"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="Newest">Sort by: Newest</option>
                <option value="Oldest">Sort by: Oldest</option>
                <option value="Name A-Z">Name A-Z</option>
                <option value="Name Z-A">Name Z-A</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportExcel} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-emerald-600 border border-emerald-700 text-white rounded-lg hover:bg-emerald-700 transition shadow-sm">
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
              <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow-sm border border-transparent">
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100/70 border-y border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">User Details</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">System Role</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Activity Stats</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Joined Date</th>
                  <th className="px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {sortedUsers.map((user, idx) => {
                  const avatarColors = ['bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-emerald-100 text-emerald-700', 'bg-orange-100 text-orange-700'];
                  const avatarColor = avatarColors[user.full_name?.charCodeAt(0) % avatarColors.length] || avatarColors[0];
                  
                  return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-5 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ring-1 ring-black/5 ${avatarColor}`}>
                          {user.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{user.full_name}</p>
                            {user.is_revoked && (
                              <span className="bg-rose-100 text-rose-700 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Revoked</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-md tracking-wide ${
                        user.role === 'LEARNER' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        user.role === 'INSTRUCTOR' ? 'bg-orange-50 text-orange-700 border border-orange-100' :
                        user.role === 'ORGANIZATION_ADMIN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        'bg-purple-50 text-purple-700 border border-purple-100'
                      }`}>
                        {user.role}
                        {user.learner_type && user.learner_type !== 'independent' && (
                          <span className="opacity-70 font-semibold lowercase">({user.learner_type})</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      {user.organization_name ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {user.organization_name}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-slate-600">
                      {user.role === 'LEARNER' ? (
                        <div className="flex flex-col gap-1 text-[11px] font-medium">
                          <div className="flex justify-between items-center w-24"><span className="text-slate-400">Courses:</span><span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{user.courses_enrolled}</span></div>
                          <div className="flex justify-between items-center w-24"><span className="text-slate-400">Certs:</span><span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{user.certificates_received}</span></div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 text-[11px] font-medium">
                          <div className="flex justify-between items-center w-24"><span className="text-slate-400">Published:</span><span className="font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{user.courses_published}</span></div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs font-semibold text-slate-500">
                      {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right">
                      <button onClick={() => openUserProfile(user.id)} className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all px-3 py-1.5 rounded-lg shadow-sm">
                        View Profile
                      </button>
                    </td>
                  </tr>
                  );
                })}
                {sortedUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 font-medium">
                      No users found matching the filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="bg-white rounded-3xl w-full min-h-[80vh] overflow-hidden flex flex-col shadow-sm border border-slate-200 animate-fade-in-up">
          {loadingProfile ? (
              <div className="p-12 text-center text-slate-500 font-bold">Loading profile...</div>
            ) : userProfileData && (
              <>
                <div className="bg-blue-950 px-8 py-6 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black shadow-inner">
                      {userProfileData.user.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{userProfileData.user.full_name}</h2>
                      <p className="text-white/80 font-medium text-sm mt-0.5">{userProfileData.user.email} • {userProfileData.user.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!userProfileData.user.is_revoked ? (
                      <button onClick={handleRevokeAccess} className="text-sm font-bold bg-amber-500 hover:bg-amber-600 text-amber-950 px-4 py-2 rounded-xl transition shadow-sm">
                        Revoke Access
                      </button>
                    ) : (
                      <button onClick={handleRestoreAccess} className="text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl transition shadow-sm">
                        Restore Access
                      </button>
                    )}
                    <button onClick={handleDeleteUser} className="text-sm font-bold bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-xl transition shadow-sm">
                      Delete User
                    </button>
                    <div className="w-px h-8 bg-white/20 mx-1"></div>
                    <button onClick={closeUserProfile} className="text-white/70 hover:text-white transition bg-white/10 hover:bg-white/20 p-2 rounded-full">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar space-y-8">
                  {/* Personal Info */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Personal Details</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Joined</span><span className="font-bold text-slate-800">{new Date(userProfileData.user.created_at).toLocaleDateString()}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-bold text-slate-800">{userProfileData.user.phone_number || '-'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Status</span><span className={`font-bold ${!userProfileData.user.is_revoked ? 'text-emerald-600' : 'text-rose-600'}`}>{!userProfileData.user.is_revoked ? 'Active' : 'Revoked (Access Suspended)'}</span></div>
                      </div>
                    </div>
                    
                    {(userProfileData.user.role === 'LEARNER' || userProfileData.user.role === 'ORGANIZATION_ADMIN') && (
                      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Organizational Info</h3>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between"><span className="text-slate-500">Organization</span><span className="font-bold text-slate-800">{userProfileData.user.organization_name || 'Independent'}</span></div>
                          {userProfileData.user.learner_type && (
                            <div className="flex justify-between"><span className="text-slate-500">Learner Type</span><span className="font-bold text-slate-800 capitalize">{userProfileData.user.learner_type}</span></div>
                          )}
                          {userProfileData.user.department && (
                            <div className="flex justify-between"><span className="text-slate-500">Department</span><span className="font-bold text-slate-800 capitalize">{userProfileData.user.department}</span></div>
                          )}
                        </div>
                      </div>
                    )}

                    {userProfileData.subscriptionData && (
                      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm md:col-span-2">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Subscription Info</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="block text-slate-500 text-xs mb-1">Plan Name</span>
                            <span className="font-bold text-slate-800">{userProfileData.subscriptionData.plan_name}</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-xs mb-1">Billing Price</span>
                            <span className="font-bold text-slate-800">₹{userProfileData.subscriptionData.price}/{userProfileData.subscriptionData.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-xs mb-1">Current Status</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${userProfileData.subscriptionData.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                              {userProfileData.subscriptionData.status.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="block text-slate-500 text-xs mb-1">Expiration Date</span>
                            <span className="font-bold text-slate-800">{new Date(userProfileData.subscriptionData.end_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Enrollments / Courses */}
                  {userProfileData.user.role === 'LEARNER' && (
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 mb-4">Enrolled Courses & Performance</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Enrolled On</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Lessons Done</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latest Quiz Score</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Certificate</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {userProfileData.enrollments.map(e => (
                              <tr key={e.enrollment_id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-800">{e.course_title}</td>
                                <td className="px-6 py-4 text-slate-500">{new Date(e.enrolled_at).toLocaleDateString()}</td>
                                <td className="px-6 py-4 font-bold text-slate-700">{e.lessons_completed || 0}</td>
                                <td className="px-6 py-4 font-bold text-blue-600">{e.latest_quiz_score !== null ? e.latest_quiz_score : '-'}</td>
                                <td className="px-6 py-4 text-right">
                                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                                    e.certificate_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                                    e.certificate_status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    {e.certificate_status || 'NONE'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {userProfileData.enrollments.length === 0 && (
                              <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500 font-medium">No courses enrolled yet.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {userProfileData.user.role === 'INSTRUCTOR' && (
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 mb-4">Published Courses</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {userProfileData.publishedCourses.map(c => (
                          <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center hover:border-blue-200 transition-colors">
                            <div>
                              <h5 className="font-bold text-slate-800">{c.title}</h5>
                              <p className="text-xs text-slate-500 mt-1">Created: {new Date(c.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                              <span className="block text-2xl font-black text-blue-600">{c.total_enrollments}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</span>
                            </div>
                          </div>
                        ))}
                        {userProfileData.publishedCourses.length === 0 && (
                          <div className="col-span-2 text-center text-slate-500 py-8 bg-white rounded-2xl border border-slate-200 font-medium">No courses published yet.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {userProfileData.user.role === 'ORGANIZATION_ADMIN' && userProfileData.orgStats && (
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-800 mb-4">Organization Overview</h4>
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex flex-col items-center justify-center text-center">
                          <span className="text-3xl font-black text-blue-600">{userProfileData.orgStats.totalStudents}</span>
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mt-1">Total Students</span>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex flex-col items-center justify-center text-center">
                          <span className="text-3xl font-black text-blue-600">{userProfileData.orgStats.totalInstructors}</span>
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mt-1">Instructors</span>
                        </div>
                        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex flex-col items-center justify-center text-center">
                          <span className="text-3xl font-black text-blue-600">{userProfileData.orgStats.totalCourses}</span>
                          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mt-1">Courses</span>
                        </div>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-800 mb-4">Instructors Directory</h4>
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Instructor</th>
                              <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Published Courses</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {userProfileData.orgStats.instructorsList.map(inst => (
                              <tr key={inst.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800">{inst.full_name}</p>
                                  <p className="text-xs text-slate-500">{inst.email}</p>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <span className="font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">{inst.published_courses}</span>
                                </td>
                              </tr>
                            ))}
                            {userProfileData.orgStats.instructorsList.length === 0 && (
                              <tr><td colSpan="2" className="px-6 py-8 text-center text-slate-500 font-medium">No instructors found in this organization.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
        </div>
      )}
    </>
  );
}
