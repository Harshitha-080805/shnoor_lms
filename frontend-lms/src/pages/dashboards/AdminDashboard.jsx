import{useState,useEffect}from"react";
import{useNavigate}from"react-router-dom";
import logo from"../../assets/shnoor-logo.jpeg";

function AdminDashboard(){
  const navigate=useNavigate();
  const[activeMenu,setActiveMenu]=useState("User Management");
  const[users,setUsers]=useState([]);
  const[orgs,setOrgs]=useState([]);
  const[loading,setLoading]=useState(true);
  const[searchQuery,setSearchQuery]=useState("");
  const[orgTab,setOrgTab]=useState("users");
  const[showAddOrgModal,setShowAddOrgModal]=useState(false);
  const[newOrgName,setNewOrgName]=useState("");
  const[newOrgType,setNewOrgType]=useState("company");
  const[newOrgCode,setNewOrgCode]=useState("");
  const[newOrgLocation,setNewOrgLocation]=useState("");
  const[newOrgWebsite,setNewOrgWebsite]=useState("");

  const menuItems=[
    "Overview",
    "User Management",
    "Manage Courses",
    "Subscription Plans",
    "Payments",
    "Reports",
    "Contact Queries",
  ];

  const fetchUsers=async()=>{
    try{
      const token=localStorage.getItem("access");
      const response=await fetch("http://127.0.0.1:8000/api/auth/admin/users/",{
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      });
      if(response.ok){
        const data=await response.json();
        setUsers(data);
      }
    }catch(err){}
  };

  const fetchOrgs=async()=>{
    try{
      const token=localStorage.getItem("access");
      const response=await fetch("http://127.0.0.1:8000/api/auth/admin/organizations/",{
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      });
      if(response.ok){
        const data=await response.json();
        setOrgs(data);
      }
    }catch(err){}
  };

  const loadData=async()=>{
    setLoading(true);
    await Promise.all([fetchUsers(),fetchOrgs()]);
    setLoading(false);
  };

  useEffect(()=>{
    const token=localStorage.getItem("access");
    const role=localStorage.getItem("role");
    if(!token){
      navigate("/login");
    }else if(role!=="admin"){
      if(role==="organization_admin"||role==="manager"){
        navigate("/institute-dashboard");
      }else if(role==="instructor"){
        navigate("/instructor-dashboard");
      }else{
        navigate("/student-dashboard");
      }
    }else{
      loadData();
    }
  },[navigate]);

  const handleApproveUser=async(id)=>{
    try{
      const token=localStorage.getItem("access");
      const response=await fetch(`http://127.0.0.1:8000/api/auth/admin/users/${id}/approve/`,{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      });
      if(response.ok){
        alert("User approved");
        fetchUsers();
        fetchOrgs();
      }
    }catch(err){}
  };

  const handleDeleteUser=async(id)=>{
    if(!window.confirm("Delete user?"))return;
    try{
      const token=localStorage.getItem("access");
      const response=await fetch(`http://127.0.0.1:8000/api/auth/admin/users/${id}/delete/`,{
        method:"DELETE",
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      });
      if(response.ok){
        alert("User deleted");
        fetchUsers();
        fetchOrgs();
      }
    }catch(err){}
  };

  const handleApproveOrg=async(id)=>{
    try{
      const token=localStorage.getItem("access");
      const response=await fetch(`http://127.0.0.1:8000/api/auth/admin/organizations/${id}/approve/`,{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      });
      if(response.ok){
        alert("Organization approved");
        fetchOrgs();
        fetchUsers();
      }
    }catch(err){}
  };

  const handleDeleteOrg=async(id)=>{
    if(!window.confirm("Delete organization?"))return;
    try{
      const token=localStorage.getItem("access");
      const response=await fetch(`http://127.0.0.1:8000/api/auth/admin/organizations/${id}/delete/`,{
        method:"DELETE",
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        }
      });
      if(response.ok){
        alert("Organization deleted");
        fetchOrgs();
        fetchUsers();
      }
    }catch(err){}
  };

  const handleAddOrg=async(e)=>{
    e.preventDefault();
    if(!newOrgName||!newOrgCode||!newOrgLocation){
      alert("Please fill all required fields");
      return;
    }
    try{
      const token=localStorage.getItem("access");
      const response=await fetch("http://127.0.0.1:8000/api/auth/admin/organizations/",{
        method:"POST",
        headers:{
          "Authorization":`Bearer ${token}`,
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          name:newOrgName,
          organization_type:newOrgType,
          organization_code:newOrgCode,
          location:newOrgLocation,
          website:newOrgWebsite
        })
      });
      const data=await response.json();
      if(response.ok){
        alert("Organization created successfully");
        setShowAddOrgModal(false);
        setNewOrgName("");
        setNewOrgType("company");
        setNewOrgCode("");
        setNewOrgLocation("");
        setNewOrgWebsite("");
        fetchOrgs();
        fetchUsers();
      }else{
        alert(data.error||"Failed to create organization");
      }
    }catch(err){
      alert("Error creating organization");
    }
  };

  const handleLogout=()=>{
    localStorage.clear();
    navigate("/login");
  };

  const filteredUsers=users.filter(u=>{
    const notSelf=u.email!==localStorage.getItem("email")&&u.role!=="admin";
    const matchesSearch=u.full_name.toLowerCase().includes(searchQuery.toLowerCase())||u.email.toLowerCase().includes(searchQuery.toLowerCase());
    return notSelf&&matchesSearch;
  });

  const filteredOrgs=orgs.filter(o=>{
    return o.name.toLowerCase().includes(searchQuery.toLowerCase())||o.organization_code.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen fixed left-0 top-0 flex flex-col justify-between shadow-lg">
        <div>
          <div className="px-6 py-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Logo" className="h-12 w-12 rounded-xl bg-white p-1 object-contain"/>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">SHNOOR LMS</h1>
                <p className="text-xs text-blue-400 font-semibold uppercase tracking-wider">Admin Portal</p>
              </div>
            </div>
          </div>
          <nav className="px-3 py-6 space-y-1.5">
            {menuItems.map((item,index)=>(
              <button
                key={index}
                onClick={()=>setActiveMenu(item)}
                className={`w-full text-left px-5 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                  activeMenu===item
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full bg-slate-800 hover:bg-red-900 text-slate-300 hover:text-white py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
          >
            Logout
          </button>
        </div>
      </aside>

      <main className="ml-64 flex-1 flex flex-col min-h-screen">
        <header className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{activeMenu}</h2>
            <p className="text-sm text-slate-500 mt-1">Control panel for managing SAAS LMS data.</p>
          </div>
        </header>

        <div className="p-8 flex-1">
          {activeMenu==="User Management"?(
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-center border-b border-slate-200 mb-6">
                <div className="flex">
                  <button
                    onClick={()=>setOrgTab("users")}
                    className={`px-6 py-4 font-bold text-sm border-b-2 -mb-[2px] transition ${orgTab==="users"?"border-blue-600 text-blue-600":"border-transparent text-slate-400 hover:text-slate-950"}`}
                  >
                    System Users
                  </button>
                  <button
                    onClick={()=>setOrgTab("organizations")}
                    className={`px-6 py-4 font-bold text-sm border-b-2 -mb-[2px] transition ${orgTab==="organizations"?"border-blue-600 text-blue-600":"border-transparent text-slate-400 hover:text-slate-955"}`}
                  >
                    Organizations
                  </button>
                </div>
                {orgTab==="organizations"&&(
                  <button
                    onClick={()=>setShowAddOrgModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-2.5 px-5 rounded-xl transition shadow-sm mb-2"
                  >
                    Add Organization
                  </button>
                )}
              </div>

              <div className="mb-6">
                <input
                  type="text"
                  placeholder={orgTab==="users"?"Search users by name/email...":"Search organizations by name/code..."}
                  value={searchQuery}
                  onChange={(e)=>setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3.5 border border-slate-200 rounded-xl bg-slate-50 outline-none text-sm focus:bg-white focus:border-blue-600 transition"
                />
              </div>

              {loading?(
                <div className="text-center py-10 font-bold text-slate-400 text-sm">Loading records...</div>
              ):(
                <div className="overflow-x-auto">
                  {orgTab==="users"?(
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-sm font-semibold uppercase tracking-wider">
                          <th className="p-5 text-left">User Info</th>
                          <th className="p-5 text-left">Role</th>
                          <th className="p-5 text-left">Mapping / Type</th>
                          <th className="p-5 text-left">Approved</th>
                          <th className="p-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.length>0?(
                          filteredUsers.map(u=>(
                            <tr key={u.id} className="hover:bg-slate-50 transition">
                              <td className="p-5">
                                <div className="font-bold text-slate-900 text-lg">{u.full_name}</div>
                                <div className="text-sm text-slate-500 mt-1 font-medium">{u.email}</div>
                              </td>
                              <td className="p-5">
                                <span className="capitalize font-semibold text-slate-800 text-base">{u.role}</span>
                              </td>
                              <td className="p-5 text-sm text-slate-700 leading-relaxed">
                                {u.role==="learner"&&(
                                  <div>
                                    <span className="font-bold text-slate-400">Subtype: </span>
                                    <span className="font-semibold text-slate-800 capitalize">{u.learner_type}</span>
                                    {u.organization_name&&(
                                      <div className="mt-1.5 flex items-center gap-1.5">
                                        <span className="font-bold text-slate-400">Org:</span>
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">{u.organization_name} ({u.organization_code})</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {u.role==="organization_admin"&&(
                                  <div>
                                    <span className="font-bold text-slate-400">Admin of: </span>
                                    <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-bold border border-purple-100 capitalize">{u.organization_name} ({u.organization_code})</span>
                                  </div>
                                )}
                                {u.role==="instructor"&&(
                                  <span className="text-slate-400 italic">Instructor profile</span>
                                )}
                              </td>
                              <td className="p-5">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${u.is_approved?"bg-emerald-100 text-emerald-800 border border-emerald-200":"bg-amber-100 text-amber-800 border border-amber-200"}`}>
                                  {u.is_approved?"Approved":"Pending"}
                                </span>
                              </td>
                              <td className="p-5 text-right">
                                <div className="flex gap-2.5 justify-end items-center">
                                  {!u.is_approved&&(
                                    <button
                                      onClick={()=>handleApproveUser(u.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition shadow-sm"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  <a
                                    href={`mailto:${u.email}`}
                                    className="bg-blue-600 hover:bg-blue-750 text-white text-xs font-bold py-2 px-4 rounded-xl transition shadow-sm inline-block text-center"
                                  >
                                    Mail
                                  </a>
                                  <button
                                    onClick={()=>handleDeleteUser(u.id)}
                                    className="bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 text-xs font-bold py-2 px-4 rounded-xl transition shadow-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ):(
                          <tr>
                            <td colSpan="5" className="text-center p-8 text-slate-400 font-semibold text-sm">No users matching search query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ):(
                    <table className="w-full text-left border-collapse bg-white">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-sm font-semibold uppercase tracking-wider">
                          <th className="p-5 text-left">Organization Name</th>
                          <th className="p-5 text-left">Type</th>
                          <th className="p-5 text-left">Code</th>
                          <th className="p-5 text-left">Created By (Admin)</th>
                          <th className="p-5 text-left">Status</th>
                          <th className="p-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredOrgs.length>0?(
                          filteredOrgs.map(org=>(
                            <tr key={org.id} className="hover:bg-slate-50 transition">
                              <td className="p-5">
                                <div className="font-bold text-slate-900 text-lg">{org.name}</div>
                                <div className="text-sm text-slate-500 mt-1 font-medium">{org.location}</div>
                              </td>
                              <td className="p-5">
                                <span className="capitalize font-semibold text-slate-800 text-base">{org.organization_type}</span>
                              </td>
                              <td className="p-5">
                                <span className="font-mono text-base text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded border border-blue-100">{org.organization_code}</span>
                              </td>
                              <td className="p-5 text-slate-700 text-sm font-medium">
                                {org.created_by?(
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-900">{org.created_by}</span>
                                    <a href={`mailto:${org.created_by}`} className="text-xs text-blue-600 hover:underline mt-0.5">Contact Creator</a>
                                  </div>
                                ):(
                                  <span className="text-slate-400 italic">System Default</span>
                                )}
                              </td>
                              <td className="p-5">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold ${org.is_approved?"bg-emerald-100 text-emerald-800 border border-emerald-200":"bg-amber-100 text-amber-800 border border-amber-200"}`}>
                                  {org.is_approved?"Approved":"Pending"}
                                </span>
                              </td>
                              <td className="p-5 text-right">
                                <div className="flex gap-2.5 justify-end items-center">
                                  {!org.is_approved&&(
                                    <button
                                      onClick={()=>handleApproveOrg(org.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition shadow-sm"
                                    >
                                      Approve
                                    </button>
                                  )}
                                  <button
                                    onClick={()=>handleDeleteOrg(org.id)}
                                    className="bg-white hover:bg-rose-50 text-rose-600 border border-slate-300 hover:border-rose-300 text-xs font-bold py-2 px-4 rounded-xl transition shadow-sm"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ):(
                          <tr>
                            <td colSpan="6" className="text-center p-8 text-slate-400 font-semibold text-sm">No organizations matching search query.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ):(
            <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center">
              <h3 className="text-lg font-bold text-slate-800 mb-2">{activeMenu} Module</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">This section is placeholder under testing stage. Use the User Management tab to test user approvals, organization approvals, mappings, and deletions.</p>
            </div>
          )}
        </div>
      </main>

      {showAddOrgModal&&(
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl border border-slate-100">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Add New Organization</h3>
            <form onSubmit={handleAddOrg} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Name</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e)=>setNewOrgName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-sm"
                  placeholder="e.g. Acme Corp"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Type</label>
                <select
                  value={newOrgType}
                  onChange={(e)=>setNewOrgType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-sm bg-white"
                >
                  <option value="company">Company</option>
                  <option value="institute">Institute</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Organization Code</label>
                <input
                  type="text"
                  required
                  value={newOrgCode}
                  onChange={(e)=>setNewOrgCode(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-sm"
                  placeholder="e.g. ACME123"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  required
                  value={newOrgLocation}
                  onChange={(e)=>setNewOrgLocation(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-sm"
                  placeholder="e.g. New York, USA"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Website (Optional)</label>
                <input
                  type="text"
                  value={newOrgWebsite}
                  onChange={(e)=>setNewOrgWebsite(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-blue-600 text-sm"
                  placeholder="e.g. https://acme.com"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button
                  type="button"
                  onClick={()=>setShowAddOrgModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;