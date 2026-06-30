import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/shnoor-logo.jpeg";
import api from '../../api';
import SubscriptionPlansView from "./SubscriptionPlansView";
import GlobalSearch from "../../components/GlobalSearch";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
const isTokenValid = (t) => {
  if (!t) return false;
  try {
    const p = JSON.parse(atob(t.split(".")[1]));
    return p.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};
import InstituteAnnouncements from "./institute/InstituteAnnouncements";
import ChatLayout from "../chat/ChatLayout";
import { chatService } from "../../services/chatService";
import SuperAdminReports from "./SuperAdminReports";
function AdminDashboard() {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState("Overview");
  const [approvedAccountsSort, setApprovedAccountsSort] = useState("Newest");
  const [manageCoursesSort, setManageCoursesSort] = useState("Newest");
  const [userManagementSort, setUserManagementSort] = useState("Newest");
  const [paymentsSort, setPaymentsSort] = useState("Newest");
  const [certificatesSort, setCertificatesSort] = useState("Newest");
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [approvedCourses, setApprovedCourses] = useState([]);
  const [pendingCertificates, setPendingCertificates] = useState([]);
  const [payments, setPayments] = useState([]);
  const [contactQueries, setContactQueries] = useState([]);
  const [selectedQueryGroup, setSelectedQueryGroup] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [contactSort, setContactSort] = useState('Newest');
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePic, setProfilePic] = useState(sessionStorage.getItem("profile_pic"));
  const location = useLocation();

  useEffect(() => {
    if (location.state && location.state.activePage) {
      setActivePage(location.state.activePage);
      // clear state so it doesn't get stuck
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const count = await chatService.getUnreadCount();
        setUnreadCount(count);
      } catch (err) { }
    };
    const token = sessionStorage.getItem("access");
    if (isTokenValid(token)) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      setProfilePic(sessionStorage.getItem("profile_pic"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const loadUsers = () => {
    api.get(`/api/auth/admin/users`)
      .then(res => {
        if (res.status >= 200 && res.status < 300) {
          const data = res.data;
          const mapped = data.map(u => ({
            id: u.id,
            name: u.full_name,
            email: u.email,
            role: (u.role || "").toLowerCase() === "learner" ? "Learner" : (u.role || "").toLowerCase() === "instructor" ? "Instructor" : (u.role || "").toLowerCase() === "admin" ? "Super Admin" : "Organization Admin",
            learnerType: (u.learner_type || "").toLowerCase() === "independent" ? "Independent Learner" : (u.learner_type || "").toLowerCase() === "student" ? "Student" : (u.learner_type || "").toLowerCase() === "employee" ? "Employee" : "",
            organizationCode: u.org_code,
            organizationName: u.org_name,
            organizationType: u.org_type,
            rollNumber: u.roll_number,
            employeeId: u.employee_id,
            location: u.org_location,
            website: u.org_website,
            created_at: u.created_at,
            is_approved: u.is_approved
          }));
          setPendingUsers(mapped.filter(u => !u.is_approved));
          setApprovedUsers(mapped.filter(u => u.is_approved));
        }
      })
      .catch(() => { });
  };
  const loadPendingCourses = () => {
    api.get(`/api/admin/pending-courses`)
      .then(res => {
        if (res.status >= 200 && res.status < 300) setPendingCourses(res.data);
      })
      .catch(() => { });
  };
  const loadApprovedCourses = () => {
    api.get(`/api/courses/`)
      .then(res => {
        if (res.status >= 200 && res.status < 300) setApprovedCourses(res.data);
      })
      .catch(() => { });
  };
  const loadPendingCertificates = () => {
    api.get(`/api/admin/pending-certificates`)
      .then(res => {
        if (res.status >= 200 && res.status < 300) setPendingCertificates(res.data);
      })
      .catch(() => { });
  };
  const loadPayments = () => {
    api.get(`/api/admin/reports/payments`)
      .then(res => {
        if (res.status >= 200 && res.status < 300) setPayments(res.data);
      })
      .catch(() => { });
  };
  const fetchContactQueries = () => {
    api.get('/api/contact')
      .then(res => setContactQueries(res.data))
      .catch(() => {});
  };
  const handleReplySubmit = async (queryId) => {
    if (!replyText.trim()) return;
    setIsReplying(true);
    try {
      await api.post(`/api/contact/${queryId}/reply`, { replyMessage: replyText });
      setReplyText('');
      setReplyingTo(null);
      fetchContactQueries();
      alert('Reply sent successfully!');
    } catch (err) {
      alert('Failed to send reply. Please try again.');
    } finally {
      setIsReplying(false);
    }
  };
  useEffect(() => {
    const token = sessionStorage.getItem("access");
    const role = sessionStorage.getItem("role");
    if (!isTokenValid(token)) {
      sessionStorage.clear();
      navigate("/login");
    } else if (role?.toLowerCase() !== "admin") {
      if (role?.toLowerCase() === "learner") {
        navigate("/student-dashboard");
      } else if (role?.toLowerCase() === "organization_admin" || role?.toLowerCase() === "manager") {
        navigate("/institute-dashboard");
      } else if (role?.toLowerCase() === "instructor") {
        navigate("/instructor-dashboard");
      }
    } else {
      loadUsers();
      loadPendingCourses();
      loadApprovedCourses();
      loadPendingCertificates();
      loadPayments();
      fetchContactQueries();
    }
  }, [navigate, activePage]);
  const approveUser = (email) => {
    const user = [...pendingUsers, ...approvedUsers].find(u => u.email === email);
    if (!user) return;
    api.post(`/api/auth/admin/users/${user.id}/approve`)
      .then(res => {
        if ((res.status >= 200 && res.status < 300)) {
          alert("User approved successfully");
          loadUsers();
        }
      })
      .catch(() => { });
  };
  const rejectUser = (email) => {
    const user = [...pendingUsers, ...approvedUsers].find(u => u.email === email);
    if (!user) return;
    api.delete(`/api/auth/admin/users/${user.id}/delete`)
      .then(res => {
        if ((res.status >= 200 && res.status < 300)) {
          alert("User rejected and deleted");
          loadUsers();
        }
      })
      .catch(() => { });
  };
  const handleCourseAction = (id, action) => {
    api.post(`/api/admin/courses/${id}/review`, { action: action })
      .then(res => {
        if ((res.status >= 200 && res.status < 300)) {
          alert(`Course ${action}d successfully`);
          loadPendingCourses();
          loadApprovedCourses();
        }
      })
      .catch(() => { });
  };
  const handleCertificateAction = (id, action) => {
    api.post(`/api/admin/certificates/${id}/review`, { action: action })
      .then(res => {
        if ((res.status >= 200 && res.status < 300)) {
          alert(`Certificate ${action}d successfully`);
          loadPendingCertificates();
        }
      })
      .catch(() => { });
  };

  const exportPaymentsExcel = async () => {
    if (!payments || payments.length === 0) return;
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payment History');
    
    // Define column widths and keys first
    worksheet.columns = [
      { key: 'txnId', width: 28 },
      { key: 'user', width: 25 },
      { key: 'amount', width: 15 },
      { key: 'date', width: 22 },
      { key: 'status', width: 15 },
    ];
    
    // 1. Add company title row (Row 1)
    const titleRow = worksheet.addRow(['Shnoor LMS - Official Payment Records']);
    worksheet.mergeCells('A1:E1');
    titleRow.height = 40;
    const titleCell = worksheet.getCell('A1');
    titleCell.font = { name: 'Arial', family: 4, size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Blue-950
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // 2. Add headers row (Row 2)
    const headerRow = worksheet.addRow({
      txnId: 'Transaction ID',
      user: 'User/Organization',
      amount: 'Amount (₹)',
      date: 'Date & Time',
      status: 'Status'
    });
    headerRow.height = 25;
    headerRow.font = { bold: true, color: { argb: 'FF172554' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    ['A', 'B', 'C', 'D', 'E'].forEach(col => {
      worksheet.getCell(`${col}2`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEAB308' } }; // Yellow-500
    });
    
    // Add data
    payments.forEach(payment => {
      const row = worksheet.addRow({
        txnId: payment.transaction_id,
        user: payment.user_name || 'N/A',
        amount: parseFloat(payment.amount),
        date: new Date(payment.created_at).toLocaleString(),
        status: payment.status
      });
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('amount').numFmt = '₹#,##0.00';
      
      // Status color coding
      const statusCell = row.getCell('status');
      statusCell.font = { bold: true };
      if (payment.status === 'SUCCESS' || payment.status === 'COMPLETED') {
        statusCell.font = { color: { argb: 'FF166534' }, bold: true }; // Green
      } else {
        statusCell.font = { color: { argb: 'FF991B1B' }, bold: true }; // Red
      }
    });
    
    // Generate buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, 'Shnoor_LMS_Payments_Export.xlsx');
  };
  const renderCoursesView = () => {
    return (
      <TabbedSection
        activeTitle="Approved Courses"
        pendingTitle="Pending Courses"
        activeData={sortedApprovedCourses}
        pendingData={sortedPendingCourses}
        sortOption={manageCoursesSort}
        setSortOption={setManageCoursesSort}
        typeName="Courses"
        renderActiveTable={(data) => (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Enrollments</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((c, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-950 flex items-center justify-center font-bold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                          <span className="text-sm font-bold text-slate-800">{c.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm border border-slate-200">
                            {(c.instructor?.full_name || c.instructor?.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{c.instructor?.full_name || c.instructor?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 text-slate-700 font-bold border border-slate-100">{c.enrollments_count || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Approved
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        renderPendingTable={(data) => (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Instructor</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((c, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-950 flex items-center justify-center font-bold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                          </div>
                          <span className="text-sm font-bold text-slate-800">{c.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-slate-600">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500 shadow-sm border border-slate-200">
                            {(c.instructor?.full_name || c.instructor?.email || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{c.instructor?.full_name || c.instructor?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs text-slate-500 truncate max-w-xs">{c.description}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleCourseAction(c.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                            Approve
                          </button>
                          <button onClick={() => handleCourseAction(c.id, "reject")} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      />
    );
  };
  const renderCertificatesView = () => {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white gap-4">
          <h3 className="text-lg font-extrabold text-slate-800 tracking-tight whitespace-nowrap">Certificate Requests</h3>
          <select
            value={certificatesSort}
            onChange={(e) => setCertificatesSort(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="Newest">Sort by: Newest</option>
            <option value="Oldest">Sort by: Oldest</option>
            <option value="Student A-Z">Student A-Z</option>
            <option value="Student Z-A">Student Z-A</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedCertificates.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center py-16">
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">No pending certificate requests</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCertificates.map((c, index) => (
                  <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shadow-sm">
                          {c.student_name ? c.student_name.charAt(0).toUpperCase() : "-"}
                        </div>
                        <span className="text-sm font-bold text-slate-800">{c.student_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span className="text-sm font-medium">{c.student_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-blue-950">{c.course_title}</span>
                        <span className="text-[10px] text-slate-400 font-medium">Verification Pending</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleCertificateAction(c.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                          Approve
                        </button>
                        <button onClick={() => handleCertificateAction(c.id, "reject")} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };
  const menuItems = [
    "Overview",
    "User Approvals",
    "Approved Accounts",
    "Manage Courses",
    "Certificate Approvals",
    "Subscription Plans",
    "Payments",
    "Reports",
    "Contact Queries",
    "Announcements",
    "Messages"
  ];
  const learners = approvedUsers.filter(
    (user) => user.role === "Learner" && user.learnerType !== "Employee"
  );
  const learnerRequests = pendingUsers.filter(
    (user) => user.role === "Learner" && user.learnerType !== "Employee"
  );
  const employeeRequests = pendingUsers.filter(
    (user) =>
      user.role === "Learner" &&
      user.learnerType === "Employee"
  );
  const instructorRequests = pendingUsers.filter(
    (user) => user.role === "Instructor"
  );
  const organizationRequests = pendingUsers.filter(
    (user) => user.role === "Organization Admin"
  );
  const approvedEmployees = approvedUsers.filter(
    (user) =>
      user.role === "Learner" &&
      user.learnerType === "Employee"
  );
  const allApprovedAccounts = approvedUsers.filter(
    (user) => user.role !== "Super Admin"
  );
  
  const sortedApprovedAccounts = React.useMemo(() => {
    let dataCopy = [...(allApprovedAccounts || [])].filter(Boolean);
    if (approvedAccountsSort === "Newest") return dataCopy.sort((a,b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    if (approvedAccountsSort === "Oldest") return dataCopy.sort((a,b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0));
    if (approvedAccountsSort === "Title A-Z") return dataCopy.sort((a,b) => ((a?.name || a?.full_name || '').localeCompare(b?.name || b?.full_name || '')));
    if (approvedAccountsSort === "Title Z-A") return dataCopy.sort((a,b) => ((b?.name || b?.full_name || '').localeCompare(a?.name || a?.full_name || '')));
    return dataCopy;
  }, [allApprovedAccounts, approvedAccountsSort]);

  const sortedApprovedCourses = React.useMemo(() => {
    let dataCopy = [...(approvedCourses || [])].filter(Boolean);
    if (manageCoursesSort === "Newest") return dataCopy.sort((a,b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    if (manageCoursesSort === "Oldest") return dataCopy.sort((a,b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0));
    if (manageCoursesSort === "Title A-Z") return dataCopy.sort((a,b) => ((a?.title || '').localeCompare(b?.title || '')));
    if (manageCoursesSort === "Title Z-A") return dataCopy.sort((a,b) => ((b?.title || '').localeCompare(a?.title || '')));
    return dataCopy;
  }, [approvedCourses, manageCoursesSort]);

  const sortedPendingCourses = React.useMemo(() => {
    let dataCopy = [...(pendingCourses || [])].filter(Boolean);
    if (manageCoursesSort === "Newest") return dataCopy.sort((a,b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    if (manageCoursesSort === "Oldest") return dataCopy.sort((a,b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0));
    if (manageCoursesSort === "Title A-Z") return dataCopy.sort((a,b) => ((a?.title || '').localeCompare(b?.title || '')));
    if (manageCoursesSort === "Title Z-A") return dataCopy.sort((a,b) => ((b?.title || '').localeCompare(a?.title || '')));
    return dataCopy;
  }, [pendingCourses, manageCoursesSort]);

  const sortedCertificates = React.useMemo(() => {
    let dataCopy = [...(pendingCertificates || [])].filter(Boolean);
    if (certificatesSort === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (certificatesSort === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (certificatesSort === "Student A-Z") return dataCopy.sort((a,b) => (a.student_name||'').localeCompare(b.student_name||''));
    if (certificatesSort === "Student Z-A") return dataCopy.sort((a,b) => (b.student_name||'').localeCompare(a.student_name||''));
    return dataCopy;
  }, [pendingCertificates, certificatesSort]);

  const sortedPayments = React.useMemo(() => {
    let dataCopy = [...payments];
    if (paymentsSort === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (paymentsSort === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (paymentsSort === "Highest Amount") return dataCopy.sort((a,b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));
    if (paymentsSort === "Lowest Amount") return dataCopy.sort((a,b) => parseFloat(a.amount || 0) - parseFloat(b.amount || 0));
    return dataCopy;
  }, [payments, paymentsSort]);

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-60 bg-blue-950 text-white h-screen fixed left-0 top-0 flex flex-col justify-between z-20">
        <div>
          <div className="px-4 py-4">
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Logo"
                className="h-10 w-10 rounded-lg bg-white p-1"
              />
              <div>
                <h1 className="text-sm font-extrabold tracking-tight">SHNOOR LMS</h1>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">Super Admin</p>
              </div>
            </div>
          </div>
          <nav className="px-3 py-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] custom-scrollbar">
            {menuItems.map((item) => (
              <button
                key={item}
                onClick={() => setActivePage(item)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[12px] font-semibold transition ${activePage === item
                  ? "bg-yellow-500 text-blue-950 font-bold shadow-[0_4px_15px_-3px_rgba(234,179,8,0.5)]"
                  : "text-blue-50 hover:bg-blue-900"
                  }`}
              >
                <span>{item}</span>
                {item === "Messages" && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800 shrink-0">
          <button
            onClick={() => { sessionStorage.clear(); navigate('/login'); }}
            className="w-full bg-blue-900 hover:bg-yellow-500 text-blue-50 hover:text-blue-950 py-2.5 px-4 rounded-xl text-[12px] font-bold transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            Logout
          </button>
        </div>
      </aside>
      <main className="ml-60 flex-1 w-[calc(100%-15rem)] min-w-0">
        <header className="bg-white px-8 py-3 border-b border-slate-200 flex justify-between items-center sticky top-0 z-50 shadow-sm">
          <div className="flex flex-col">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {activePage}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Manage your {activePage.toLowerCase()} and view statistics.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <GlobalSearch />
            <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-sm overflow-hidden">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (sessionStorage.getItem("username") || "Admin")[0].toUpperCase()
                )}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{sessionStorage.getItem("username") || "Admin User"}</p>
                <p className="text-xs text-slate-500">Super Admin</p>
              </div>
            </div>
          </div>
        </header>
        <section className="p-8">
          {activePage === "Overview" && (() => {
            const totalLearnerRequests = pendingUsers.filter(u => u.role === "Learner" && u.learnerType !== "Employee").length + learners.length;
            const totalEmployeeRequests = employeeRequests.length + approvedEmployees.length;
            const totalInstructorRequests = instructorRequests.length + allApprovedAccounts.filter(u => u.role === "Instructor").length;
            const totalOrgRequests = organizationRequests.length + allApprovedAccounts.filter(u => u.role === "Organization Admin").length;
            const totalRequests = totalLearnerRequests + totalEmployeeRequests + totalInstructorRequests + totalOrgRequests;

            const learnerPct = totalRequests > 0 ? Math.round((totalLearnerRequests / Math.max(totalRequests, 1)) * 100) : 0;
            const employeePct = totalRequests > 0 ? Math.round((totalEmployeeRequests / Math.max(totalRequests, 1)) * 100) : 0;
            const instructorPct = totalRequests > 0 ? Math.round((totalInstructorRequests / Math.max(totalRequests, 1)) * 100) : 0;
            const orgPct = totalRequests > 0 ? Math.round((totalOrgRequests / Math.max(totalRequests, 1)) * 100) : 0;

            const segments = [
              { label: "Learner Requests", count: totalLearnerRequests, pct: learnerPct, color: "#3b82f6" },
              { label: "Employee Requests", count: totalEmployeeRequests, pct: employeePct, color: "#22c55e" },
              { label: "Instructor Requests", count: totalInstructorRequests, pct: instructorPct, color: "#8b5cf6" },
              { label: "Organization Requests", count: totalOrgRequests, pct: orgPct, color: "#ef4444" },
            ];
            const radius = 70, cx = 90, cy = 90, strokeWidth = 18;
            const circumference = 2 * Math.PI * radius;
            let cumulativeOffset = 0;

            return (
              <div className="animate-fade-in-up space-y-6">
                {/* 4 Stat Cards */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { title: "TOTAL LEARNERS", value: learners.length, iconBg: "bg-sky-500", iconShadow: "shadow-sky-500/20", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                    { title: "TOTAL EMPLOYEES", value: employeeRequests.length + approvedEmployees.length, iconBg: "bg-teal-500", iconShadow: "shadow-teal-500/20", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
                    { title: "TOTAL INSTRUCTORS", value: instructorRequests.length + allApprovedAccounts.filter(u => u.role === "Instructor").length, iconBg: "bg-purple-500", iconShadow: "shadow-purple-500/20", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14" /></svg> },
                    { title: "TOTAL ORGANIZATIONS", value: organizationRequests.length + allApprovedAccounts.filter(u => u.role === "Organization Admin").length, iconBg: "bg-amber-500", iconShadow: "shadow-amber-500/20", icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                  ].map((card, idx) => (
                    <div key={idx} className="bg-blue-950 rounded-2xl p-5 border border-blue-900 flex items-start justify-between shadow-sm">
                      <div>
                        <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1">{card.title}</p>
                        <h3 className="text-3xl font-extrabold text-white">{card.value}</h3>
                      </div>
                      <div className={`w-10 h-10 rounded-xl ${card.iconBg} text-white shadow-lg ${card.iconShadow} flex items-center justify-center`}>
                        {card.icon}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-5 gap-6">
                  {/* Recent Approvals (Left 3 columns) */}
                  <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-extrabold text-slate-800">Recent Approvals</h3>
                      <button onClick={() => setActivePage("Approved Accounts")} className="text-sm font-bold text-blue-950 hover:text-blue-700 transition">View All</button>
                    </div>
                    <div className="space-y-4 flex-1">
                      {allApprovedAccounts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center pb-8">
                          <p className="text-sm font-semibold text-slate-500">No recent approvals</p>
                        </div>
                      ) : (
                        allApprovedAccounts.slice(0, 4).map((user, i) => {
                          const bgColors = ["bg-blue-950", "bg-violet-600", "bg-emerald-600", "bg-rose-600"];
                          return (
                            <div key={i} className="flex items-center gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                              <div className={`w-10 h-10 rounded-full ${bgColors[i % 4]} text-white flex items-center justify-center font-bold text-sm shadow-sm`}>
                                {(user.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                                <p className="text-xs font-medium text-slate-500">{user.role}</p>
                              </div>
                              <div className="ml-auto flex items-center gap-4">
                                <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">Approved</span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {/* Bottom Stats Row */}
                    <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>TOTAL APPROVALS</p>
                        <p className="text-xl font-extrabold text-slate-800 mt-1 text-center">{allApprovedAccounts.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>PENDING REQUESTS</p>
                        <p className="text-xl font-extrabold text-slate-800 mt-1 text-center">{pendingUsers.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>REJECTED</p>
                        <p className="text-xl font-extrabold text-slate-800 mt-1 text-center">0</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>THIS MONTH</p>
                        <p className="text-xl font-extrabold text-slate-800 mt-1 text-center">{allApprovedAccounts.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Request Overview (Right 2 columns) */}
                  <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-extrabold text-slate-800">Request Overview</h3>
                      <span className="text-xs font-semibold text-slate-400">This Month ▾</span>
                    </div>
                    <div className="flex justify-center mb-8 relative">
                      <svg width="180" height="180" className="-rotate-90">
                        {segments.map((seg, idx) => {
                          if (totalRequests === 0) return null;
                          const strokeDasharray = `${(seg.count / Math.max(totalRequests, 1)) * circumference} ${circumference}`;
                          const strokeDashoffset = -cumulativeOffset;
                          cumulativeOffset += (seg.count / Math.max(totalRequests, 1)) * circumference;
                          return (
                            <circle key={idx} cx={cx} cy={cy} r={radius} fill="transparent" stroke={seg.color} strokeWidth={strokeWidth} strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                          );
                        })}
                        {totalRequests === 0 && (
                          <circle cx={cx} cy={cy} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
                        )}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xs font-bold text-slate-500">Total</span>
                        <span className="text-3xl font-black text-slate-800">{totalRequests}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Requests</span>
                      </div>
                    </div>
                    <div className="space-y-3 flex-1">
                      {segments.map((seg, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }}></span>
                            <span className="text-sm font-semibold text-slate-600">{seg.label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-extrabold text-slate-800">{seg.count}</span>
                            <span className="text-xs font-medium text-slate-400 w-6 text-right">{seg.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">All clear! Keep up the great work.</h4>
                        <p className="text-xs text-slate-500 mt-0.5">There are no pending requests at the moment.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                      { title: "Add Learner", sub: "Create new learner", icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z", color: "text-blue-950", bg: "bg-blue-50", click: "Learner Management" },
                      { title: "Add Employee", sub: "Create new employee", icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z", color: "text-emerald-600", bg: "bg-emerald-50", click: "Employee Approvals" },
                      { title: "Add Instructor", sub: "Create new instructor", icon: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2.5 2.5 0 00-2.5-2.5H14", color: "text-violet-600", bg: "bg-violet-50", click: "Instructor Approvals" },
                      { title: "Add Organization", sub: "Create new organization", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", color: "text-rose-600", bg: "bg-rose-50", click: "Organization Approvals" },
                      { title: "Manage Courses", sub: "View all courses", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", color: "text-cyan-600", bg: "bg-cyan-50", click: "Manage Courses" },
                      { title: "Generate Report", sub: "View analytics", icon: "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "text-fuchsia-600", bg: "bg-fuchsia-50", click: "Reports" },
                    ].map((btn, idx) => (
                      <button key={idx} onClick={() => setActivePage(btn.click)} className="bg-white rounded-xl p-4 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all text-left flex flex-col group">
                        <div className={`w-8 h-8 rounded-lg ${btn.bg} ${btn.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={btn.icon} /></svg>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800">{btn.title}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{btn.sub}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
          {activePage === "User Approvals" && (
            <TabbedSection
              activeTitle="Active Users"
              pendingTitle="Pending Approvals"
              activeData={allApprovedAccounts}
              pendingData={pendingUsers}
              typeName="Users"
              sortOption={userManagementSort}
              setSortOption={setUserManagementSort}
              renderActiveTable={(data) => (
                <UserTable
                  users={data}
                  type="all"
                  pendingCertificates={pendingCertificates}
                  handleCertificateAction={handleCertificateAction}
                />
              )}
              renderPendingTable={(data) => (
                <ApprovalTable
                  users={data.map(u => ({ ...u, _status: 'pending' }))}
                  approveUser={approveUser}
                  rejectUser={rejectUser}
                  type="all"
                />
              )}
            />
          )}
          {activePage === "Approved Accounts" && (
            <div className="space-y-4 animate-fade-in-up">
              <UserTable
                title="Approved Accounts"
                headerAction={
                  <select
                    value={approvedAccountsSort}
                    onChange={(e) => setApprovedAccountsSort(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="Newest">Sort by: Newest</option>
                    <option value="Oldest">Sort by: Oldest</option>
                    <option value="Title A-Z">Name A-Z</option>
                    <option value="Title Z-A">Name Z-A</option>
                  </select>
                }
                users={sortedApprovedAccounts}
                type="all"
                pendingCertificates={pendingCertificates}
                handleCertificateAction={handleCertificateAction}
              />
            </div>
          )}
          {activePage === "Manage Courses" && renderCoursesView()}
          {activePage === "Certificate Approvals" && renderCertificatesView()}
          {activePage === "Subscription Plans" && (
            <SubscriptionPlansView />
          )}
          {activePage === "Payments" && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white gap-4">
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight whitespace-nowrap">Payment History</h3>
                <div className="flex items-center gap-3">
                  <select
                    value={paymentsSort}
                    onChange={(e) => setPaymentsSort(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <option value="Newest">Sort by: Newest</option>
                    <option value="Oldest">Sort by: Oldest</option>
                    <option value="Highest Amount">Highest Amount</option>
                    <option value="Lowest Amount">Lowest Amount</option>
                  </select>
                  <button 
                    onClick={exportPaymentsExcel}
                  disabled={payments.length === 0}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-blue-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] px-4 py-2 rounded-xl text-xs transition">
                  Export Excel
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Transaction ID</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-20 bg-white">
                          <div className="flex flex-col items-center justify-center text-center">
                            <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </div>
                            <h4 className="text-base font-bold text-slate-800 mb-1">No payment transactions recorded</h4>
                            <p className="text-xs font-medium text-slate-500 max-w-sm">No data is currently available in this section. Records will appear here automatically.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedPayments.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-700">{p.transaction_id}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{p.user_name || "Unknown"}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-blue-950">₹{parseFloat(p.amount).toLocaleString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">{new Date(p.created_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {activePage === "Reports" && (
            <SuperAdminReports />
          )}
          {activePage === "Contact Queries" && (() => {
            const groups = Object.values(
              contactQueries.reduce((acc, q) => {
                if (!acc[q.email]) {
                  acc[q.email] = { email: q.email, name: q.name, latest_date: q.created_at, messages: [] };
                }
                acc[q.email].messages.push(q);
                if (new Date(q.created_at) > new Date(acc[q.email].latest_date)) {
                  acc[q.email].latest_date = q.created_at;
                }
                return acc;
              }, {})
            ).sort((a, b) => {
              if (contactSort === 'Newest') return new Date(b.latest_date) - new Date(a.latest_date);
              if (contactSort === 'Oldest') return new Date(a.latest_date) - new Date(b.latest_date);
              if (contactSort === 'A-Z') return a.name.localeCompare(b.name);
              if (contactSort === 'Z-A') return b.name.localeCompare(a.name);
              return 0;
            }).filter(g =>
              !contactSearch ||
              g.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
              g.email.toLowerCase().includes(contactSearch.toLowerCase())
            );

            // Auto-select first group if none selected
            const activeGroup = selectedQueryGroup 
              ? (groups.find(g => g.email === selectedQueryGroup.email) || (groups.length > 0 ? groups[0] : null))
              : (groups.length > 0 ? groups[0] : null);

            return (
              <div className="animate-fade-in-up bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 160px)', display: 'flex' }}>
                {/* LEFT: INBOX PANEL */}
                <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
                  <div className="p-4 border-b border-slate-200 bg-white">
                    <h3 className="text-sm font-extrabold text-slate-800 mb-3">Inbox</h3>
                    {/* Search */}
                    <div className="relative mb-2">
                      <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input
                        type="text"
                        placeholder="Search inquiries..."
                        value={contactSearch}
                        onChange={e => setContactSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {/* Sort */}
                    <select
                      value={contactSort}
                      onChange={e => setContactSort(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Newest">Sort: Newest First</option>
                      <option value="Oldest">Sort: Oldest First</option>
                      <option value="A-Z">Sort: A-Z</option>
                      <option value="Z-A">Sort: Z-A</option>
                    </select>
                  </div>
                  {/* Contact List */}
                  <div className="flex-1 overflow-y-auto">
                    {groups.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center p-6">
                        <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <p className="text-xs font-semibold text-slate-400">No inquiries found</p>
                      </div>
                    ) : (
                      groups.map((group, idx) => {
                        const isActive = activeGroup && activeGroup.email === group.email;
                        const pending = group.messages.filter(m => m.status === 'PENDING').length;
                        return (
                          <div
                            key={idx}
                            onClick={() => { setSelectedQueryGroup(group); setReplyingTo(null); setReplyText(''); }}
                            className={`px-4 py-3 cursor-pointer border-b border-slate-100 transition-colors ${
                              isActive ? 'bg-blue-600 text-white' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>{group.name}</p>
                              <p className={`text-[10px] shrink-0 ml-2 ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                                {new Date(group.latest_date).toLocaleDateString()}
                              </p>
                            </div>
                            <p className={`text-[11px] truncate mb-1.5 ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>{group.email}</p>
                            <div className="flex items-center gap-2">
                              {pending > 0 ? (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-blue-500 text-white' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                  PENDING
                                </span>
                              ) : (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-blue-500 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                                  REPLIED
                                </span>
                              )}
                              <span className={`text-[10px] ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>{group.messages.length} msg{group.messages.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* RIGHT: CONVERSATION PANEL */}
                <div className="flex-1 flex flex-col min-w-0">
                  {!activeGroup ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                      <p className="text-sm font-semibold text-slate-500">Select a conversation</p>
                      <p className="text-xs text-slate-400 mt-1">Choose an inquiry from the inbox to view messages</p>
                    </div>
                  ) : (
                    <>
                      {/* Conversation Header */}
                      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
                        <p className="text-sm font-extrabold text-slate-800">{activeGroup.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{activeGroup.email}</p>
                      </div>

                      {/* Messages Area */}
                      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50">
                        {[...activeGroup.messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).map((msg, idx) => (
                          <div key={idx} className="space-y-3">
                            {/* User bubble (left) */}
                            <div className="flex gap-3 items-start">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 border border-blue-200 flex items-center justify-center font-bold text-xs shrink-0">
                                {(activeGroup.name || "?").charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="bg-white border border-slate-200 rounded-xl rounded-tl-none px-4 py-3 max-w-lg shadow-sm">
                                  <p className="text-sm text-slate-700 leading-relaxed">{msg.message}</p>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1 ml-1">{new Date(msg.created_at).toLocaleString()}</p>
                              </div>
                            </div>

                            {/* Admin reply (right) */}
                            {msg.reply_message && (
                              <div className="flex gap-3 items-start justify-end">
                                <div className="flex flex-col items-end">
                                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl rounded-tr-none px-4 py-3 max-w-lg shadow-sm">
                                    <p className="text-sm text-slate-700 leading-relaxed">{msg.reply_message}</p>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1 mr-1">
                                    Replied on {msg.updated_at ? new Date(msg.updated_at).toLocaleString() : ''}
                                  </p>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                                  A
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Reply Box — always visible at bottom */}
                      {(() => {
                        const unrepliedMsg = activeGroup.messages.find(m => m.status === 'PENDING' && !m.reply_message);
                        if (!unrepliedMsg) {
                          return (
                            <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
                              <div className="flex items-center gap-2 text-sm text-emerald-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="font-semibold">All messages replied</span>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <div className="px-6 py-4 border-t border-slate-200 bg-white shrink-0">
                            <div className="flex gap-3 items-end">
                              <textarea
                                rows={2}
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReplySubmit(unrepliedMsg.id); } }}
                                placeholder="Type your reply and press Enter..."
                                className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50"
                              />
                              <button
                                onClick={() => handleReplySubmit(unrepliedMsg.id)}
                                disabled={isReplying || !replyText.trim()}
                                className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white text-sm font-bold rounded-xl transition disabled:opacity-50 shrink-0 flex items-center gap-2"
                              >
                                {isReplying ? (
                                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                )}
                                {isReplying ? 'Sending...' : 'Send'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            );
          })()}
          {activePage === "Announcements" && (
            <InstituteAnnouncements />
          )}
          {activePage === "Messages" && (
            <ChatLayout />
          )}
        </section>
      </main>
    </div>
  );
}
function StatCard({ title, value, icon, trend, colorClass }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.15)] transition-all duration-300 group cursor-pointer">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-2">
            {title}
          </p>
          <h3 className="text-4xl font-black text-slate-800 tracking-tight">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-20 group-hover:bg-opacity-30 transition-all`}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div className="mt-5 flex items-center gap-2 text-sm">
          <span className={`font-bold flex items-center gap-1 ${trend > 0 ? 'text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md' : 'text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md'}`}>
            {trend > 0 ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
            ) : null}
            {trend > 0 ? `+${trend}%` : '0%'}
          </span>
          <span className="text-slate-400 font-medium text-xs">from last month</span>
        </div>
      )}
    </div>
  );
}
function UserTable({ users, type, pendingCertificates, handleCertificateAction, title, headerAction }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {(title || headerAction) && (
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white gap-4">
          {title && <h3 className="text-lg font-extrabold text-slate-800 tracking-tight whitespace-nowrap">{title}</h3>}
          {headerAction && <div className="flex items-center gap-3">{headerAction}</div>}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[30%]">User Details</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[25%]">Contact</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider w-[30%]">Role & Details</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right w-[15%]">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No records found</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 text-blue-950 flex items-center justify-center font-bold text-sm shadow-sm">
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{user.name || "-"}</span>
                        <span className="text-[10px] text-slate-400 font-bold">User ID: {user.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <span className="text-sm font-medium">{user.email || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-bold text-slate-700">{user.role}</span>
                      <span className="text-[10px] font-medium text-slate-400">{getUserDetails(user, type)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right flex items-center justify-end gap-3">
                    {type === "learner" && (() => {
                      const pendingCert = pendingCertificates?.find(c => c.student_email === user.email);
                      if (pendingCert) {
                        return (
                          <div className="flex items-center gap-2 mr-3 pr-3 border-r border-slate-200">
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded">Cert Pending</span>
                            <button onClick={() => handleCertificateAction(pendingCert.id, "approve")} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition">Approve</button>
                            <span className="text-slate-300">|</span>
                            <button onClick={() => handleCertificateAction(pendingCert.id, "reject")} className="text-xs font-bold text-rose-600 hover:text-rose-700 transition">Reject</button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Approved
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ApprovalTable({ users, approveUser, rejectUser, type }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-[25%]">User Details</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-[20%]">Contact</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-[15%]">Role</th>
              {type === "all" && (
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Additional Details</th>
              )}
              {type === "employee" && (
                <>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Emp ID</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Org Code</th>
                </>
              )}
              {type === "organization" && (
                <>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-[15%]">Org Code</th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-[15%]">Location</th>
                </>
              )}
              {type === "instructor" && (
                <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Joined Date</th>
              )}
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap w-[10%]">Status</th>
              <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    </div>
                    <p className="text-sm font-semibold text-slate-500">No requests found</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user, index) => (
                <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 text-blue-950 flex items-center justify-center font-bold text-sm shadow-sm">
                        {(user.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800">{user.name || "-"}</span>
                        <span className="text-[10px] text-slate-400 font-bold">User ID: {user.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2 text-slate-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <span className="text-sm font-medium">{user.email || "-"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-slate-700 capitalize">{user.role ? user.role.replace('_', ' ') : 'User'}</span>
                  </td>
                  {type === "all" && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        {user.role === 'Learner' && user.learnerType === 'Employee' && (
                           <span className="text-[10px] font-medium text-slate-500">Emp ID: {user.employeeId || "-"} | Org Code: {user.organizationCode || "-"}</span>
                        )}
                        {user.role === 'Learner' && user.learnerType !== 'Employee' && (
                           <span className="text-[10px] font-medium text-slate-500">{user.learnerType || "Independent Learner"}</span>
                        )}
                        {user.role === 'Organization Admin' && (
                           <span className="text-[10px] font-medium text-slate-500">Org Code: {user.organizationCode || "-"} | Loc: {user.location || "-"}</span>
                        )}
                        {user.role === 'Instructor' && (
                           <span className="text-[10px] font-medium text-slate-500">Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}</span>
                        )}
                      </div>
                    </td>
                  )}
                  {type === "employee" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{user.employeeId || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{user.organizationCode || "-"}</td>
                    </>
                  )}
                  {type === "organization" && (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-700">{user.organizationCode || "-"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-600">{user.location || "-"}</td>
                    </>
                  )}
                  {type === "instructor" && (
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-medium text-slate-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user._status === 'approved' || user.is_approved ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[10px] font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {user._status === 'approved' || user.is_approved ? (
                      <span className="text-[10px] font-bold text-slate-400">No Action Needed</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => approveUser(user.email)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                          Approve
                        </button>
                        <button onClick={() => rejectUser(user.email)} className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm">
                          Reject
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function getUserDetails(user, type) {
  if (type === "employee") {
    return `${user.organizationCode || "-"} | ${user.employeeId || "-"
      }`;
  }
  if (type === "organization") {
    return `${user.organizationType || "-"} | ${user.organizationName || "-"
      }`;
  }
  if (type === "instructor") {
    return "Instructor Account";
  }
  if (type === "all") {
    if (user.role === "Learner" && user.learnerType === "Employee") {
      return `${user.organizationCode || "-"} | ${user.employeeId || "-"}`;
    }
    if (user.role === "Organization Admin") {
      return `${user.organizationType || "-"} | ${user.organizationName || "-"}`;
    }
    if (user.role === "Instructor") {
      return "Instructor Account";
    }
    return "-";
  }
  return `${user.learnerType || "-"}`;
}

function PlaceholderTable({ title, columns, emptyText, actionButton }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
        <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">{title}</h3>
        {actionButton && (
          <button className="bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm">
            {actionButton}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th key={idx} className={`px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${idx === columns.length - 1 ? 'text-right' : ''}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td colSpan={columns.length} className="text-center py-20 bg-white">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-slate-800 mb-1">{emptyText}</h4>
                  <p className="text-xs font-medium text-slate-500 max-w-sm">No data is currently available in this section. Records will appear here automatically.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-16 min-h-[300px]">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5 text-slate-400 border border-slate-100">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto">{description}</p>
    </div>
  );
}

function TabbedSection({ activeTitle, pendingTitle, activeData, pendingData, renderActiveTable, renderPendingTable, typeName, sortOption, setSortOption }) {
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');

  const currentData = (activeTab === 'active' ? activeData : pendingData) || [];
  const filteredData = React.useMemo(() => {
    if (!Array.isArray(currentData)) return [];
    let dataCopy = currentData.filter(item => {
      if (!item) return false;
      const str = JSON.stringify(item);
      return str ? str.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    });
    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a?.created_at || 0) - new Date(b?.created_at || 0));
    if (sortOption === "Title A-Z") return dataCopy.sort((a,b) => ((a?.title || a?.name || a?.full_name || '').localeCompare(b?.title || b?.name || b?.full_name || '')));
    if (sortOption === "Title Z-A") return dataCopy.sort((a,b) => ((b?.title || b?.name || b?.full_name || '').localeCompare(a?.title || a?.name || a?.full_name || '')));
    return dataCopy;
  }, [currentData, searchQuery, sortOption]);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none ${activeTab === 'active' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {activeTitle}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex-1 sm:flex-none flex items-center justify-center gap-2 ${activeTab === 'pending' ? 'bg-white text-blue-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {pendingTitle}
            {pendingData.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingData.length}</span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {sortOption !== undefined && setSortOption && (
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Newest">Sort by: Newest</option>
              <option value="Oldest">Sort by: Oldest</option>
              <option value="Title A-Z">Title A-Z</option>
              <option value="Title Z-A">Title Z-A</option>
            </select>
          )}
          <div className="relative w-full sm:w-72">
            <svg className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input
              type="text"
              placeholder={`Search ${typeName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <EmptyState
            title={`No ${activeTab === 'active' ? 'Active' : 'Pending'} ${typeName} Found`}
            description={activeTab === 'pending' ? `There are no pending approval requests for ${typeName.toLowerCase()} at the moment.` : `There are currently no active ${typeName.toLowerCase()} matching your criteria.`}
            icon={
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        </div>
      ) : (
        activeTab === 'active' ? renderActiveTable(filteredData) : renderPendingTable(filteredData)
      )}
    </div>
  );
}

export default AdminDashboard;
