import React, { useState, useEffect, useRef } from "react";
import { User, Lock, Save, Camera, CheckCircle } from 'lucide-react';
import api from '../../../api';

function InstructorProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [profile, setProfile] = useState({ full_name: '', email: '', phone_number: '', role: '', department: 'Instructor' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profilePic, setProfilePic] = useState(sessionStorage.getItem("profile_pic") || null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/api/accounts/profile');
      setProfile({
        full_name: res.data.full_name || '',
        email: res.data.email || '',
        phone_number: res.data.phone_number || '',
        role: 'Instructor',
        department: res.data.department || 'Instructor'
      });
      if (res.data.profile_pic) {
        setProfilePic(res.data.profile_pic);
        sessionStorage.setItem("profile_pic", res.data.profile_pic);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/accounts/profile', {
        full_name: profile.full_name,
        phone_number: profile.phone_number,
        department: profile.department,
        profile_pic: profilePic
      });
      sessionStorage.setItem("username", profile.full_name);
      
      // Force a re-render of the dashboard top bar by dispatching a custom event
      window.dispatchEvent(new Event('storage'));
      
      alert('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    if (passwords.newPassword !== passwords.confirmPassword) {
      alert('New passwords do not match!');
      return;
    }
    setPwdSaving(true);
    try {
      await api.put('/api/accounts/password', {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      alert('Password updated successfully!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to update password');
    } finally {
      setPwdSaving(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        setProfilePic(base64String);
        sessionStorage.setItem("profile_pic", base64String);
        // Force header update
        window.dispatchEvent(new Event('storage'));
        
        // Save immediately to backend
        try {
          await api.put('/api/accounts/profile', {
            full_name: profile.full_name,
            phone_number: profile.phone_number,
            department: profile.department,
            profile_pic: base64String
          });
        } catch (err) {
          console.error("Failed to save profile picture to server", err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getInitials = (name) => {
    if (!name || name.trim() === '') return "IN";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name[0] + (name[1] || "")).toUpperCase();
  };

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto pt-6">
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-slate-200 shadow-sm mt-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-950"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column: Profile Card */}
          <div className="md:col-span-1">
            <div className="sticky top-6 flex flex-col gap-6 max-h-[calc(100vh-2rem)] overflow-y-auto hide-scrollbar pb-2">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Instructor Profile</h2>
                <p className="text-slate-500 text-sm mt-1">Manage your public bio and professional credentials</p>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="h-32 bg-gradient-to-r from-blue-700 to-blue-600 relative">
                {/* Decorative background pattern */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
              </div>
              <div className="px-6 pb-6 flex flex-col items-center relative">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md absolute -top-12 flex items-center justify-center text-3xl font-black text-blue-900 overflow-hidden">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    getInitials(profile.full_name)
                  )}
                </div>
                
                <div className="mt-14 text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800 leading-tight">{profile.full_name || 'Instructor'}</h3>
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-md">
                    {profile.role}
                  </span>
                </div>

                <div className="mt-4 w-full">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <User size={16} /> Update Photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

          {/* Right Column: Information & Settings */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <User size={20} className="text-slate-400" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.full_name}
                    onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Enter your full name" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Instructor Email</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-500 cursor-not-allowed focus:outline-none pr-10" 
                      disabled 
                      value={profile.email} 
                    />
                    <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <span className="text-slate-400">📱</span> Phone Number
                  </label>
                  <input 
                    type="tel" 
                    value={profile.phone_number}
                    onChange={(e) => setProfile({...profile, phone_number: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Enter phone number" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Department</label>
                  <input 
                    type="text" 
                    value={profile.department}
                    onChange={(e) => setProfile({...profile, department: e.target.value})}
                    className="w-full bg-white border border-slate-200 px-4 py-2.5 rounded-lg text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleProfileSave}
                  disabled={saving}
                  className="bg-blue-950 hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-md disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Update Information'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
                <Lock size={20} className="text-slate-400" />
                Change Password
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Current Password</label>
                  <input 
                    type="password" 
                    autoComplete="new-password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Enter current password" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">New Password</label>
                  <input 
                    type="password" 
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Enter new password" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    placeholder="Confirm new password" 
                  />
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <button 
                  onClick={handlePasswordSave}
                  disabled={pwdSaving || !passwords.currentPassword || !passwords.newPassword}
                  className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50"
                >
                  {pwdSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorProfile;
