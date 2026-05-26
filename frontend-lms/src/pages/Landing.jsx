import logo from "../assets/shnoor-logo.jpeg";
import { Link } from "react-router-dom";
function Landing() {
  const features = [
    "Role-based LMS access for student, instructor, institute admin and super admin",
    "Subscription-controlled course access with free and premium plans",
    "Course builder support for lessons, PDFs, quizzes and assignments",
    "Progress tracking, certificate generation and admin reports",
  ];

  const stats = [
    { label: "Students Enrolled", value: 0 },
    { label: "Courses Published", value: 0 },
    { label: "Certificates Issued", value: 0 },
    { label: "Instructors", value: 0 },
  ];

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="SHNOOR International LLC" className="h-10 w-auto" />
            <h1 className="text-2xl font-extrabold text-blue-950">SHNOOR LMS</h1>
          </div>

          <div className="hidden md:flex gap-8 font-semibold text-sm">
            <a href="#home">Home</a>
            <a href="#courses">Courses</a>
            <a href="#categories">Categories</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="flex gap-3">
            <Link
             to="/register"
             className="bg-white border border-blue-950 text-blue-950 px-5 py-2 rounded-xl font-bold"
            >
             Register
            </Link>

            <Link
             to="/login"
             className="bg-blue-950 text-white px-5 py-2 rounded-xl font-bold"
            >
             Login
            </Link>
          </div>
        </div>
      </nav>

      <section id="home" className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <span className="inline-block bg-blue-100 text-blue-950 px-5 py-2 rounded-full font-bold text-sm">
            Subscription-Based LMS Platform
          </span>

          <h2 className="text-5xl lg:text-6xl font-extrabold leading-tight mt-6">
            Learn smarter with a structured digital LMS
          </h2>

          <p className="text-slate-600 text-lg mt-6 leading-8 max-w-2xl">
            A professional learning platform for institutes, instructors and students to manage courses,
            subscriptions, quizzes, assignments, progress and certificates from one place.
          </p>

          <div className="flex gap-4 mt-10">
          <Link
           to="/register"
           className="bg-blue-950 text-white px-8 py-4 rounded-xl font-bold inline-block"
          >
           Get Started
           </Link>
          </div>
        </div>

        <div className="bg-white rounded-[32px] p-8 shadow-xl border border-slate-200">
          <div className="mb-8">
            <h3 className="text-3xl font-extrabold mt-2">Platform Workflow</h3>
          </div>

          <div className="space-y-5">
            {[
              "Student or institute registers on the platform",
              "User selects a free or premium subscription plan",
              "Admin/instructor publishes courses from dashboard",
              "Student accesses eligible courses and learning materials",
              "Student completes quizzes and assignments",
              "System tracks progress and generates certificate",
            ].map((item, index) => (
              <div key={index} className="flex gap-4 items-start">
                <div className="min-w-10 h-10 rounded-xl bg-blue-100 text-blue-950 flex items-center justify-center font-extrabold">
                  {index + 1}
                </div>
                <p className="font-semibold leading-7">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-4xl font-extrabold mt-3">Platform Features</h2>
            <p className="text-slate-600 mt-4">
              Courses and categories will appear dynamically after they are created from dashboards.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="p-7 rounded-3xl border border-slate-200 bg-slate-50">
                <h3 className="text-lg font-extrabold mb-3">0{index + 1}</h3>
                <p className="text-slate-700 leading-7 font-medium">{feature}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold mt-3">Subscription Plans</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-10 rounded-3xl border border-slate-200">
              <h3 className="text-3xl font-extrabold">Free Plan</h3>
              <p className="text-slate-600 mt-4">Basic access for preview and limited learning.</p>
              <h2 className="text-5xl font-extrabold mt-8">₹0</h2>
            </div>

            <div className="bg-white p-10 rounded-3xl border-2 border-blue-950 shadow-xl">
              <h3 className="text-3xl font-extrabold">Premium Plan</h3>
              <p className="text-slate-600 mt-4">
                Price, access rules and benefits should come from database.
              </p>
              <h2 className="text-5xl font-extrabold mt-8">₹0</h2>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="text-center p-7 rounded-3xl bg-slate-50 border border-slate-200">
              <h2 className="text-4xl font-extrabold text-blue-950">{stat.value}</h2>
              <p className="text-slate-600 mt-2 font-semibold">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10">
          <div>
            <h2 className="text-4xl font-extrabold mt-3">Contact Admin</h2>
            <p className="text-slate-600 mt-4 leading-8">
              Submit LMS-related queries. These messages should be stored in the admin dashboard.
            </p>

            <div className="mt-8 bg-white rounded-3xl p-7 border border-slate-200">
              <h3 className="text-xl font-extrabold">Company Contact</h3>
              <p className="text-slate-600 mt-4">General: info@shnoor.com</p>
              <p className="text-slate-600">Sales: proc@shnoor.com</p>
              <p className="text-slate-600 mt-3">
                Location: 10009 Mount Tabor Road, Odessa Missouri, United States.
              </p>
            </div>
          </div>

          <form className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm grid gap-5">
            <input className="border border-slate-300 rounded-xl px-5 py-4" placeholder="Your Name" />
            <input className="border border-slate-300 rounded-xl px-5 py-4" placeholder="Email Address" />
            <textarea className="border border-slate-300 rounded-xl px-5 py-4 h-36" placeholder="Message"></textarea>
            <button className="bg-blue-950 text-white py-4 rounded-xl font-bold">Send Message</button>
          </form>
        </div>
      </section>

      <footer className="bg-slate-950 text-white py-14">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <img src={logo} alt="SHNOOR" className="h-10 w-auto bg-white rounded p-1" />
              <h2 className="text-2xl font-extrabold">SHNOOR</h2>
            </div>
            <p className="text-slate-400 mt-5 leading-7">
              SHNOOR International LLC works in IT consulting, product development,
              application design and global trade services.
            </p>
          </div>

          <div>
            <h3 className="font-extrabold mb-4">Services</h3>
            <p className="text-slate-400">Cloud Management</p>
            <p className="text-slate-400">Enterprise Management</p>
            <p className="text-slate-400">Data & Artificial Intelligence</p>
            <p className="text-slate-400">Consulting & Staffing</p>
            <p className="text-slate-400">Background Verification</p>
            <p className="text-slate-400">Health Care</p>
          </div>


          <div>
            <h3 className="font-extrabold mb-4">Contact</h3>
            <p className="text-slate-400">info@shnoor.com</p>
            <p className="text-slate-400">proc@shnoor.com</p>
            <p className="text-slate-400 mt-3">
              10009 Mount Tabor Road, Odessa Missouri, United States.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;