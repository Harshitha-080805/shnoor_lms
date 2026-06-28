import { useState, useEffect } from 'react';
import api from '../../api';

function SubscriptionPlansView() {
  const [plans, setPlans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    plan_type: 'learner',
    billing_cycle: 'monthly',
    price: '',
    duration_months: '1',
    description: '',
    badge_text: '',
    features: ''
  });

  const loadPlans = () => {
    api.get('/api/plans')
      .then(res => setPlans(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      // Reconstruct features string
      let featuresStr = '';
      if (plan.features && Array.isArray(plan.features)) {
        featuresStr = plan.features.map(f => f.feature_value && f.feature_value !== 'True' ? `${f.feature_name}: ${f.feature_value}` : f.feature_name).join(', ');
      }

      setFormData({
        name: plan.name,
        plan_type: plan.plan_type || 'learner',
        billing_cycle: plan.billing_cycle || 'monthly',
        price: plan.price,
        duration_months: plan.duration_months.toString(),
        description: plan.description || '',
        badge_text: plan.badge_text || '',
        features: featuresStr
      });
    } else {
      setEditingPlan(null);
      setFormData({
        name: '',
        plan_type: 'learner',
        billing_cycle: 'monthly',
        price: '',
        duration_months: '1',
        description: '',
        badge_text: '',
        features: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse features from comma-separated string
    const parsedFeatures = formData.features.split(',').filter(f => f.trim() !== '').map(f => {
      const parts = f.split(':');
      if (parts.length > 1) {
        return { feature_name: parts[0].trim(), feature_value: parts[1].trim() };
      } else {
        return { feature_name: f.trim(), feature_value: 'True' };
      }
    });

    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      duration_months: parseInt(formData.duration_months),
      features: parsedFeatures
    };

    if (editingPlan) {
      api.put(`/api/plans/${editingPlan.id}`, payload)
        .then(() => {
          loadPlans();
          setShowModal(false);
        })
        .catch(err => alert("Error updating plan"));
    } else {
      api.post('/api/plans', payload)
        .then(() => {
          loadPlans();
          setShowModal(false);
        })
        .catch(err => alert("Error creating plan"));
    }
  };

  const handleDelete = (id) => {
    if (confirm("Are you sure you want to delete this plan?")) {
      api.delete(`/api/plans/${id}`)
        .then(() => loadPlans())
        .catch(err => alert("Error deleting plan"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => handleOpenModal()} 
          className="bg-blue-950 hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
        >
          + New Plan
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
            <div className="mb-4 flex justify-between items-center">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest border border-blue-100">
                {(plan.plan_type || 'learner').toUpperCase()}
              </span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{plan.billing_cycle}</span>
            </div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">{plan.name}</h3>
            
            <div className="text-sm text-slate-500 mb-6 flex-1 min-h-[40px]">
               <ul className="space-y-1">
                 {plan.features && Array.isArray(plan.features) ? plan.features.map((f, i) => (
                    <li key={i}>• {f.feature_name} {f.feature_value && f.feature_value !== 'True' ? `- ${f.feature_value}` : ''}</li>
                 )) : null}
               </ul>
            </div>
            
            <div className="mb-6 pb-6 border-b border-slate-100">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">₹{parseFloat(plan.price).toLocaleString()}</span>
                <span className="text-sm font-bold text-slate-400">/{plan.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto">
              <button onClick={() => handleOpenModal(plan)} className="flex-1 bg-blue-950 hover:bg-yellow-500 hover:text-blue-950 text-white py-2.5 rounded-xl text-sm font-bold transition shadow-sm">
                Edit Plan
              </button>
              <button onClick={() => handleDelete(plan.id)} className="w-10 bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center rounded-xl transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Plan Type</label>
                  <select required value={formData.plan_type} onChange={e => setFormData({...formData, plan_type: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors">
                    <option value="learner">Learner</option>
                    <option value="organization">Organization</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Plan Name</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Free" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Price (₹)</label>
                  <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="e.g. 1499" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Duration (Months)</label>
                  <input type="number" required min="1" value={formData.duration_months} onChange={e => setFormData({...formData, duration_months: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Features (Comma separated. Use ':' for values. e.g. "Max Learners: 50, Certificates")</label>
                <textarea required value={formData.features} onChange={e => setFormData({...formData, features: e.target.value})} placeholder="e.g. Max Learners: 50, Certificates, Priority Support" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors h-24 resize-none"></textarea>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-950 hover:bg-yellow-500 hover:text-blue-950 text-white rounded-xl text-sm font-bold transition shadow-sm">
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionPlansView;

