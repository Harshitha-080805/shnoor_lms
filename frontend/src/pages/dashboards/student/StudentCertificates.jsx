import React,{useState,useEffect} from 'react';
import { useLocation } from 'react-router-dom';
import { Award, Clock, CheckCircle, XCircle, Download, X, Printer } from 'lucide-react';
import api from '../../../api';

function StudentCertificates(){
  const location = useLocation();
  const searchTerm = location.state?.searchTerm || '';
  const[requests,setRequests]=useState([]);
  const[loading,setLoading]=useState(true);
  const[selectedCert,setSelectedCert]=useState(null);
  const[sortOption, setSortOption]=useState("Newest");

  const loadCerts=async()=>{
    try{
      const res=await api.get(`/api/courses/certificates`);
      if((res.status >= 200 && res.status < 300))setRequests(res.data);
    }catch(e){ console.error(e); }finally{
      setLoading(false);
    }
  };

  useEffect(()=>{
    loadCerts();
  },[]);

  const getStatusStyle = (status) => {
    const s = status?.toUpperCase();
    if (s === 'APPROVED') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle size={14} />, label: 'APPROVED' };
    if (s === 'REJECTED') return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: <XCircle size={14} />, label: 'REJECTED' };
    return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: <Clock size={14} />, label: 'PENDING' };
  };

  const approvedCerts = requests.filter(r => r.status?.toUpperCase() === 'APPROVED');
  const pendingCerts = requests.filter(r => r.status?.toUpperCase() === 'PENDING');
  const rejectedCerts = requests.filter(r => r.status?.toUpperCase() === 'REJECTED');

  const sortedRequests = React.useMemo(() => {
    let dataCopy = [...requests];
    
    // search filter
    if (searchTerm) {
      dataCopy = dataCopy.filter(r => r.course_title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (sortOption === "Newest") return dataCopy.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    if (sortOption === "Oldest") return dataCopy.sort((a,b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    if (sortOption === "Course A-Z") return dataCopy.sort((a,b) => (a.course_title||'').localeCompare(b.course_title||''));
    if (sortOption === "Course Z-A") return dataCopy.sort((a,b) => (b.course_title||'').localeCompare(a.course_title||''));

    return dataCopy;
  }, [requests, searchTerm, sortOption]);

  return(
    <div className="space-y-6">
      <style>{`
        @media print {
          /* Hide everything */
          body * { visibility: hidden !important; }
          /* Show only the certificate */
          #cert-print-modal, #cert-print-modal * { visibility: visible !important; }
          #cert-print-modal {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            margin: 0 !important;
            padding: 40px !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            z-index: 99999 !important;
            display: flex !important;
            flex-direction: column !important;
          }
          /* Ensure the page fits */
          @page {
            size: landscape;
            margin: 0;
          }
          html, body {
            height: 100% !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">My Certificates</h2>
          <p className="text-slate-500 text-sm mt-1">View and print your earned course credentials</p>
        </div>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block px-4 py-2 shadow-sm"
        >
          <option value="Newest">Sort by: Newest</option>
          <option value="Oldest">Sort by: Oldest</option>
          <option value="Course A-Z">Course A-Z</option>
          <option value="Course Z-A">Course Z-A</option>
        </select>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Earned</p>
            <h3 className="text-xl font-black text-white">{approvedCerts.length}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Pending</p>
            <h3 className="text-xl font-black text-white">{pendingCerts.length}</h3>
          </div>
        </div>
        <div className="bg-blue-950 p-5 rounded-2xl border border-blue-900 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
            <XCircle size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wider">Rejected</p>
            <h3 className="text-xl font-black text-white">{rejectedCerts.length}</h3>
          </div>
        </div>
      </div>

      {loading?(
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
        </div>
      ):(
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedRequests.map(r=>{
            const st = getStatusStyle(r.status);
            const isApproved = r.status?.toUpperCase() === 'APPROVED';
            return(
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                {/* Card Header */}
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0 pr-3">
                      <h4 className="font-bold text-lg text-slate-900 leading-snug mb-1 truncate">{r.course_title}</h4>
                      {r.instructor_name && (
                        <p className="text-xs text-slate-400 font-medium">Instructor: {r.instructor_name}</p>
                      )}
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${st.bg} ${st.text} flex items-center justify-center flex-shrink-0`}>
                      <Award size={20} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${st.bg} ${st.text} border ${st.border}`}>
                      {st.icon}
                      {st.label}
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Request Date: {new Date(r.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {isApproved && r.updated_at && (
                    <div className="text-xs text-emerald-500 font-semibold mt-1">
                      Issued: {new Date(r.updated_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                {isApproved ? (
                  <div className="px-6 pb-6">
                    <button
                      onClick={()=>setSelectedCert(r)}
                      className="w-full bg-yellow-500 hover:bg-yellow-400 text-blue-950 font-black py-3 px-4 rounded-xl text-sm transition shadow-[0_4px_20px_-4px_rgba(234,179,8,0.5)] flex items-center justify-center gap-2"
                    >
                      <Award size={16} />
                      View Certificate
                    </button>
                  </div>
                ) : (
                  <div className="px-6 pb-6">
                    <div className={`w-full text-center py-3 rounded-xl text-sm font-bold ${
                      r.status?.toUpperCase() === 'REJECTED' 
                        ? 'bg-red-50 text-red-400 border border-red-100' 
                        : 'bg-slate-50 text-slate-400 border border-slate-100'
                    }`}>
                      {r.status?.toUpperCase() === 'REJECTED' ? 'Request Denied' : 'Awaiting Approval'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {sortedRequests.length===0&&(
            <div className="col-span-2 bg-white p-16 rounded-2xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-slate-100">
                <Award size={28} />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">No Certificates Yet</h3>
              <p className="text-slate-400 text-sm max-w-sm mx-auto">Complete your courses and request certificates. They will appear here once your admin approves them.</p>
            </div>
          )}
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCert&&(
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white p-2 w-full max-w-4xl shadow-2xl relative rounded-sm flex flex-col">
            <div id="cert-print-modal" className="bg-white border-[1px] border-slate-300 p-14 relative shadow-inner min-h-[580px] flex flex-col print:border-none print:shadow-none">
              
              {/* Top Header - Institution / Logos */}
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-900 rounded-sm flex items-center justify-center text-white font-black text-xl">S</div>
                  <div className="text-blue-900 font-bold text-xl tracking-wide uppercase">SHNOOR LMS</div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-sans font-semibold">Official Certificate</span>
                </div>
              </div>

              {/* Main Certificate Content */}
              <div className="flex-1 px-8">
                <p className="text-slate-500 text-sm mb-4 font-sans tracking-wide">This is to certify that</p>
                <h2 className="text-[#1a202c] text-5xl font-semibold mb-6 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  {selectedCert.student_name}
                </h2>
                
                <p className="text-slate-500 text-sm mb-4 font-sans tracking-wide">has successfully completed</p>
                
                <h3 className="text-blue-900 text-3xl font-bold mb-4 leading-snug">
                  {selectedCert.course_title}
                </h3>
                
                <p className="text-slate-500 text-sm max-w-2xl font-sans leading-relaxed">
                  an online non-credit course authorized by Shnoor LMS and offered through our learning platform.
                </p>
              </div>
              
              {/* Footer / Signatures */}
              <div className="flex justify-between items-end mt-auto px-8 pb-4">
                <div className="w-56">
                  <div className="h-16 flex items-end mb-2">
                    <span className="text-slate-800 text-4xl" style={{ fontFamily: '"Brush Script MT", cursive' }}>
                      {selectedCert.instructor_name || 'Admin'}
                    </span>
                  </div>
                  <div className="w-full h-px bg-slate-300 mb-2"></div>
                  <p className="text-slate-800 font-bold text-xs uppercase tracking-wider">
                    {selectedCert.instructor_name || 'LMS Administrator'}
                  </p>
                  <p className="text-slate-500 text-[10px] uppercase">Course Instructor</p>
                </div>

                <div className="w-56 text-right">
                  <div className="w-full flex justify-end mb-2">
                    <div className="text-center">
                      <div className="text-slate-800 font-bold text-lg">{new Date(selectedCert.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                  </div>
                  <div className="w-full h-px bg-slate-300 mb-2"></div>
                  <p className="text-slate-800 font-bold text-xs uppercase tracking-wider">Date of Issue</p>
                </div>
              </div>

              {/* Verification Strip at Bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-10 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-6">
                <div className="text-[10px] text-slate-500 font-mono">
                  Verify at: shnoor-lms.com/verify/{selectedCert.id.toString().padStart(6, '0')}
                </div>
                <div className="text-[10px] text-slate-400">
                  Shnoor LMS has confirmed the identity of this individual and their participation in the course.
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 flex justify-end gap-3 print:hidden border-t border-slate-200">
              <button onClick={()=>setSelectedCert(null)} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2 px-6 rounded-lg text-sm transition flex items-center gap-2">
                <X size={16} />
                Close
              </button>
              <button onClick={()=>window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg text-sm transition shadow-md flex items-center gap-2">
                <Printer size={16} />
                Download / Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentCertificates;