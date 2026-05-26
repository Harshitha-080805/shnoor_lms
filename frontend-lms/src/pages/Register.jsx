import{Link,useNavigate}from"react-router-dom";
import{useState,useEffect}from"react";
import logo from"../assets/shnoor-logo.jpeg";

function Register(){
  const navigate=useNavigate();
  const[name,setName]=useState("");
  const[email,setEmail]=useState("");
  const[role,setRole]=useState("Learner");
  const[learnerType,setLearnerType]=useState("Independent Learner");
  const[organizationCode,setOrganizationCode]=useState("");
  const[rollNumber,setRollNumber]=useState("");
  const[employeeId,setEmployeeId]=useState("");
  const[organizationType,setOrganizationType]=useState("Company");
  const[organizationName,setOrganizationName]=useState("");
  const[organizationLocation,setOrganizationLocation]=useState("");
  const[website,setWebsite]=useState("");
  const[password,setPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");

  useEffect(()=>{
    const token=localStorage.getItem("access");
    const roleVal=localStorage.getItem("role");
    if(token&&roleVal){
      if(roleVal==="admin"){
        navigate("/admin-dashboard");
      }else if(roleVal==="organization_admin"||roleVal==="manager"){
        navigate("/institute-dashboard");
      }else if(roleVal==="instructor"){
        navigate("/instructor-dashboard");
      }else{
        navigate("/student-dashboard");
      }
    }
  },[navigate]);

  const inputClass="w-full mt-3 border border-slate-300 rounded-2xl px-5 py-4 bg-white outline-none focus:border-blue-700";

  const handleRegister=(e)=>{
    e.preventDefault();
    if(password!==confirmPassword){
      alert("Passwords do not match");
      return;
    }
    const payload={
      email:email,
      full_name:name,
      password:password,
      confirm_password:confirmPassword,
      role:role==="Learner"?"learner":role==="Instructor"?"instructor":"organization_admin"
    };
    if(payload.role==="learner"){
      payload.learner_type=learnerType==="Independent Learner"?"independent":learnerType==="Student"?"student":"employee";
      if(organizationCode)payload.organization_code=organizationCode;
      if(rollNumber)payload.roll_number=rollNumber;
      if(employeeId)payload.employee_id=employeeId;
    }else if(payload.role==="organization_admin"){
      payload.organization_type=organizationType==="Company"?"company":"institute";
      payload.organization_name=organizationName;
      payload.location=organizationLocation;
      if(website)payload.website=website;
      payload.organization_code=organizationCode;
    }
    fetch("http://127.0.0.1:8000/api/auth/register/",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify(payload)
    })
    .then(res=>{
      if(res.ok){
        alert("Registration successful. Please login.");
        navigate("/login");
      }else{
        res.json().then(err=>{
          alert(JSON.stringify(err));
        });
      }
    })
    .catch(err=>{
      alert("Registration failed");
    });
  };

  return (
    <div className="h-screen grid lg:grid-cols-2 bg-white overflow-hidden">
      <div className="hidden lg:flex h-screen sticky top-0 bg-blue-950 text-white flex-col justify-between p-16">
        <div className="flex items-center gap-4">
          <img
            src={logo}
            alt="SHNOOR"
            className="h-16 bg-white rounded-xl p-2"
          />
          <div>
            <h1 className="text-3xl font-extrabold">SHNOOR LMS</h1>
            <p className="text-slate-200 mt-1">
              Subscription Based LMS Platform
            </p>
          </div>
        </div>
        <div className="max-w-xl">
          <h2 className="text-6xl font-extrabold leading-tight">
            Start your learning journey today.
          </h2>
          <p className="mt-8 text-xl text-slate-200 leading-9">
            Create a learner, instructor or organization account for a
            professional LMS experience.
          </p>
        </div>
        <div className="text-slate-300 text-sm">
          © 2026 SHNOOR International LLC
        </div>
      </div>
      <div className="h-screen overflow-y-auto flex justify-center px-8 lg:px-20 py-12 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src={logo} alt="SHNOOR" className="h-14" />
            <h1 className="text-2xl font-extrabold text-blue-700">
              SHNOOR LMS
            </h1>
          </div>
          <h2 className="text-5xl font-extrabold mt-3 leading-tight">
            Register your account
          </h2>
          <p className="text-slate-600 mt-5 leading-8">
            Choose your role and complete only the required details.
          </p>
          <form onSubmit={handleRegister} className="mt-10 grid gap-6">
            <div>
              <label className="font-semibold text-sm">Select Role</label>
              <select
                value={role}
                onChange={(e)=>setRole(e.target.value)}
                className={inputClass}
              >
                <option>Learner</option>
                <option>Instructor</option>
                <option>Organization Admin</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-sm">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e)=>setName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="font-semibold text-sm">Email Address</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                className={inputClass}
              />
            </div>
            {role==="Learner"&&(
              <>
                <div>
                  <label className="font-semibold text-sm">
                    Learner Type
                  </label>
                  <select
                    value={learnerType}
                    onChange={(e)=>setLearnerType(e.target.value)}
                    className={inputClass}
                  >
                    <option>Independent Learner</option>
                    <option>Student</option>
                    <option>Employee</option>
                  </select>
                </div>
                {learnerType==="Student"&&(
                  <>
                    <div>
                      <label className="font-semibold text-sm">
                        Organization Code{" "}
                        <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter organization code"
                        value={organizationCode}
                        onChange={(e)=>setOrganizationCode(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-sm">
                        Roll Number{" "}
                        <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter roll number"
                        value={rollNumber}
                        onChange={(e)=>setRollNumber(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </>
                )}
                {learnerType==="Employee"&&(
                  <>
                    <div>
                      <label className="font-semibold text-sm">
                        Organization Code{" "}
                        <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter organization code"
                        value={organizationCode}
                        onChange={(e)=>setOrganizationCode(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-sm">
                        Employee ID{" "}
                        <span className="text-slate-400">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter employee ID"
                        value={employeeId}
                        onChange={(e)=>setEmployeeId(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </>
                )}
              </>
            )}
            {role==="Organization Admin"&&(
              <>
                <div>
                  <label className="font-semibold text-sm">
                    Organization Type
                  </label>
                  <select
                    value={organizationType}
                    onChange={(e)=>setOrganizationType(e.target.value)}
                    className={inputClass}
                  >
                    <option>Company</option>
                    <option>Institute</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-sm">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter organization name"
                    value={organizationName}
                    onChange={(e)=>setOrganizationName(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold text-sm">
                    Organization Code
                  </label>
                  <input
                    type="text"
                    placeholder="Enter organization code"
                    value={organizationCode}
                    onChange={(e)=>setOrganizationCode(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold text-sm">Location</label>
                  <input
                    type="text"
                    placeholder="Enter location"
                    value={organizationLocation}
                    onChange={(e)=>setOrganizationLocation(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="font-semibold text-sm">
                    Website <span className="text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Enter website URL"
                    value={website}
                    onChange={(e)=>setWebsite(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </>
            )}
            <div>
              <label className="font-semibold text-sm">Password</label>
              <input
                type="password"
                placeholder="Create password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="font-semibold text-sm">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e)=>setConfirmPassword(e.target.value)}
                className={inputClass}
              />
            </div>
            <button
              type="submit"
              className="bg-blue-950 hover:bg-blue-900 transition text-white py-4 rounded-2xl font-bold text-lg"
            >
              Register
            </button>
          </form>
          <p className="mt-8 text-center text-slate-600">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-700 font-bold">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;