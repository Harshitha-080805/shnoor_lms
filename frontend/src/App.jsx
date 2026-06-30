import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import ChatLayout from "./pages/chat/ChatLayout";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import InstituteDashboard from "./pages/dashboards/institute/InstituteDashboard";
import InstituteOverview from "./pages/dashboards/institute/InstituteOverview";
import InstituteCourses from "./pages/dashboards/institute/InstituteCourses";
import StudentReports from "./pages/dashboards/institute/StudentReports";
import InstituteUsers from "./pages/dashboards/institute/InstituteUsers";
import InstituteProgress from "./pages/dashboards/institute/InstituteProgress";
import InstituteSubscriptions from "./pages/dashboards/institute/InstituteSubscriptions";
import InstituteCertificates from "./pages/dashboards/institute/InstituteCertificates";
import InstituteExams from "./pages/dashboards/institute/InstituteExams";

import InstituteProfile from "./pages/dashboards/institute/InstituteProfile";
import InstituteAnnouncements from "./pages/dashboards/institute/InstituteAnnouncements";
import InstructorDashboard from "./pages/dashboards/instructor/InstructorDashboard";
import InstructorOverview from "./pages/dashboards/instructor/InstructorOverview";
import InstructorCourses from "./pages/dashboards/instructor/InstructorCourses";
import CourseBuilder from "./pages/dashboards/instructor/CourseBuilder";
import InstructorAssignments from "./pages/dashboards/instructor/InstructorAssignments";
import InstructorQuizzes from "./pages/dashboards/instructor/InstructorQuizzes";
import CourseExams from "./pages/dashboards/instructor/CourseExams";
import ExamBuilder from "./pages/dashboards/instructor/ExamBuilder";
import StudentProgress from "./pages/dashboards/instructor/StudentProgress";
import StudentDashboard from "./pages/dashboards/student/StudentDashboard";
import StudentOverview from "./pages/dashboards/student/StudentOverview";
import StudentCourses from "./pages/dashboards/student/StudentCourses";
import StudentQuizzes from "./pages/dashboards/student/StudentQuizzes";
import StudentAssignments from "./pages/dashboards/student/StudentAssignments";
import StudentExams from "./pages/dashboards/student/StudentExams";
import ProgressTracker from "./pages/dashboards/student/ProgressTracker";
import StudentCertificates from "./pages/dashboards/student/StudentCertificates";
import StudentSubscription from "./pages/dashboards/student/StudentSubscription";
import StudentProfile from "./pages/dashboards/student/StudentProfile";
import InstructorProfile from "./pages/dashboards/instructor/InstructorProfile";
import Leaderboard from "./pages/dashboards/Leaderboard";
import api from './api';

import InstructorGlobalArenas from "./pages/dashboards/instructor/InstructorGlobalArenas";
import StudentGlobalArenas from "./pages/dashboards/student/StudentGlobalArenas";
import StudentGlobalArenaView from "./pages/dashboards/student/StudentGlobalArenaView";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/institute-dashboard" element={<InstituteDashboard />}>
          <Route index element={<InstituteOverview />} />
          <Route path="courses" element={<InstituteCourses />} />
          <Route path="reports" element={<StudentReports />} />
          <Route path="users" element={<InstituteUsers />} />
          <Route path="progress" element={<InstituteProgress />} />
          <Route path="subscriptions" element={<InstituteSubscriptions />} />
          <Route path="certificates" element={<InstituteCertificates />} />
          <Route path="exams" element={<InstituteExams />} />
          <Route path="profile" element={<InstituteProfile />} />
          <Route path="chat" element={<ChatLayout />} />
          <Route path="announcements" element={<InstituteAnnouncements />} />
        </Route>
        <Route path="/instructor-dashboard" element={<InstructorDashboard />}>
          <Route index element={<InstructorOverview />} />
          <Route path="courses" element={<InstructorCourses />} />
          <Route path="courses/:courseId/build" element={<CourseBuilder />} />
          <Route path="assignments" element={<InstructorAssignments />} />
          <Route path="quizzes" element={<InstructorQuizzes />} />
          <Route path="exams" element={<CourseExams />} />
          <Route path="exams/:examId/build" element={<ExamBuilder />} />
          <Route path="practice-arena" element={<InstructorGlobalArenas />} />
          <Route path="students" element={<StudentProgress />} />
          <Route path="announcements" element={<InstituteAnnouncements />} />
          <Route path="leaderboards" element={<Leaderboard />} />
          <Route path="chat" element={<ChatLayout />} />
          <Route path="profile" element={<InstructorProfile />} />
        </Route>
        <Route path="/student-dashboard" element={<StudentDashboard />}>
          <Route index element={<StudentOverview />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="exams" element={<StudentExams />} />
          <Route path="practice-arena" element={<StudentGlobalArenas />} />
          <Route path="practice-arena/:arenaId" element={<StudentGlobalArenaView />} />
          <Route path="progress" element={<ProgressTracker />} />
          <Route path="certificates" element={<StudentCertificates />} />
          <Route path="subscription" element={<StudentSubscription />} />
          <Route path="leaderboards" element={<Leaderboard />} />
          <Route path="announcements" element={<InstituteAnnouncements />} />
          <Route path="chat" element={<ChatLayout />} />
          <Route path="profile" element={<StudentProfile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;