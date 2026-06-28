import React, { useState, useEffect } from 'react';
import api from '../../../api';
import { 
    CreditCard, CheckCircle2, Zap, AlertTriangle, ChevronRight, X, User,
    LayoutDashboard, Users, UserPlus, ShieldAlert, BadgeInfo, Calendar, Clock, ArrowRight
} from 'lucide-react';
import PaymentGatewayModal from '../../../components/PaymentGatewayModal';

const InstituteSubscriptions = () => {
    const [activeSubscription, setActiveSubscription] = useState(null);
    const [availablePlans, setAvailablePlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState(null);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [showPaymentGateway, setShowPaymentGateway] = useState(false);
    const [stats, setStats] = useState({ learners: 0, instructors: 0 });

    const fetchData = async () => {
        try {
            const subRes = await api.get('/api/subscriptions/me');
            setActiveSubscription(subRes.data);

            const plansRes = await api.get('/api/plans?plan_type=organization');
            setAvailablePlans(plansRes.data);

            const statsRes = await api.get('/api/org-admin/overview-stats');
            if (statsRes.data) {
                setStats({
                    learners: statsRes.data.totalLearners || 0,
                    instructors: statsRes.data.totalInstructors || 0
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUpgradeClick = () => {
        if (!selectedPlanId) return;
        setShowUpgradeModal(false);
        setShowPaymentGateway(true);
    };

    const handlePaymentSuccess = async () => {
        try {
            await api.post('/api/subscriptions', { plan_id: selectedPlanId });
            setShowPaymentGateway(false);
            fetchData();
        } catch (err) {
            console.error("Error upgrading:", err);
            alert("Subscription activation failed. Please contact support.");
        }
    };

    if (loading) {
        return <div className="p-6 text-slate-500 font-medium animate-pulse">Loading subscription details...</div>;
    }

    const calculateDaysLeft = (endDateStr) => {
        const end = new Date(endDateStr);
        const now = new Date();
        const diffTime = end - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const getFeatureValue = (featureName) => {
        if (!activeSubscription || !activeSubscription.features) return 'Unlimited';
        const feature = activeSubscription.features.find(f => f.feature_name.toLowerCase().includes(featureName.toLowerCase()));
        return feature ? feature.feature_value : 'Unlimited';
    };

    const maxLearnersStr = getFeatureValue('Learner');
    const maxLearners = maxLearnersStr.toLowerCase() === 'unlimited' ? 'Unlimited' : parseInt(maxLearnersStr) || 5000;
    // Set to 0 until backend tracking is implemented
    const activeLearners = stats.learners;
    const learnerPct = maxLearners === 'Unlimited' ? 0 : Math.min(100, (activeLearners / maxLearners) * 100);

    const maxInstructorsStr = getFeatureValue('Instructor');
    const maxInstructors = maxInstructorsStr.toLowerCase() === 'unlimited' ? 'Unlimited' : parseInt(maxInstructorsStr) || 100;

    // Set to 0 until backend tracking is implemented
    const activeInstructors = stats.instructors;
    const instructorPct = maxInstructors === 'Unlimited' ? 0 : Math.min(100, (activeInstructors / maxInstructors) * 100);

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-blue-950">My Subscription</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Manage your billing, plan details, and organization usage limits</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Main Content Area */}
                <div className="md:col-span-2 space-y-6">
                    {/* Active Plan Card */}
                    {activeSubscription ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-blue-950 rounded-2xl flex items-center justify-center text-yellow-400 shadow-inner">
                                    <Zap className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-blue-950">{activeSubscription.plan_name}</h2>
                                    <div className="flex items-center gap-3 mt-2">
                                        {activeSubscription.status === 'revoked' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 text-xs font-bold border border-rose-100">
                                                <AlertTriangle className="w-3 h-3" /> SUSPENDED
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                                                <CheckCircle2 className="w-3 h-3" /> ACTIVE
                                            </span>
                                        )}
                                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                                            Auto-renews on {new Date(activeSubscription.end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-3">
                                <div className="text-xl font-black text-blue-950 flex items-baseline">
                                    <span className="text-3xl">₹{parseFloat(activeSubscription.price || 0).toLocaleString()}</span>
                                    <span className="text-sm text-slate-500 font-bold ml-1">/mo</span>
                                </div>
                                <button
                                    onClick={() => setShowUpgradeModal(true)}
                                    className="px-5 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-blue-950 text-sm font-bold rounded-xl shadow-sm transition-colors"
                                >
                                    Manage Billing
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
                            <div>
                                <h2 className="text-xl font-black text-blue-950">No Active Plan</h2>
                                <p className="text-sm text-slate-500 font-medium mt-1">Upgrade your organization to expand limits.</p>
                            </div>
                            <button
                                onClick={() => setShowUpgradeModal(true)}
                                className="px-5 py-2.5 bg-blue-950 hover:bg-blue-900 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                            >
                                Upgrade Plan
                            </button>
                        </div>
                    )}

                    {/* Plan Usage & Limits Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-blue-950 mb-6">Plan Usage & Limits</h3>

                        <div className="space-y-6">
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-blue-950">Learner Seats</p>
                                        <p className="text-xs text-slate-500">Active learners enrolled</p>
                                    </div>
                                    <p className="text-sm font-bold text-blue-950">{activeLearners.toLocaleString()} / {maxLearners.toLocaleString()}</p>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-950 rounded-full" style={{ width: `${learnerPct}%` }}></div>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <p className="text-sm font-bold text-blue-950">Instructor Seats</p>
                                        <p className="text-xs text-slate-500">Active instructors onboarded</p>
                                    </div>
                                    <p className="text-sm font-bold text-blue-950">{activeInstructors} / {maxInstructors}</p>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-950 rounded-full" style={{ width: `${instructorPct}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Area */}
                <div className="space-y-6">
                    {/* Payment Details */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <CreditCard className="w-4 h-4 text-slate-400" />
                            <h3 className="text-sm font-bold text-blue-950">Payment Details</h3>
                        </div>
                        {activeSubscription ? (
                            <div className={`border rounded-xl p-4 ${activeSubscription.status === 'revoked' ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className={`text-sm font-bold ${activeSubscription.status === 'revoked' ? 'text-rose-950' : 'text-blue-950'}`}>
                                    {activeSubscription.plan_name} {activeSubscription.status === 'revoked' ? '(Suspended)' : `ending in ${calculateDaysLeft(activeSubscription.end_date)} days`}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Expires {new Date(activeSubscription.end_date).toLocaleDateString()}</p>
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 italic">No active payment details.</p>
                        )}
                    </div>

                    {/* Billing History */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <h3 className="text-sm font-bold text-blue-950">Billing History</h3>
                        </div>

                        <div className="space-y-4">
                            {activeSubscription ? (
                                <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                                    <div>
                                        <p className="font-bold text-blue-950">{new Date(activeSubscription.created_at).toLocaleDateString()}</p>
                                        <p className="text-sm text-slate-500">{activeSubscription.plan_name} Subscription</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">Paid ₹{activeSubscription.price || 0}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-500">No recent billing history.</p>
                            )}
                        </div>

                        {activeSubscription && (
                            <button className="w-full mt-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
                                View All Invoices
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Upgrade/Manage Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                            <h3 className="text-lg font-bold text-blue-950">Choose an Organization Plan</h3>
                            <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto grid gap-4 shrink">
                            {availablePlans.length === 0 ? (
                                <p className="text-slate-500 italic text-center py-4">No organization plans available.</p>
                            ) : null}
                            {availablePlans.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => setSelectedPlanId(plan.id)}
                                    className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${selectedPlanId === plan.id ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="text-lg font-black text-blue-950">{plan.name}</h4>
                                        <div className="text-right">
                                            <span className="text-xl font-black text-blue-950">₹{parseFloat(plan.price).toLocaleString()}</span>
                                            <span className="text-xs font-bold text-slate-500">/{plan.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span>
                                        </div>
                                    </div>
                                    <div className="text-sm text-slate-600 mb-2">{plan.description}</div>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {plan.features && plan.features.map((f, i) => (
                                            <span key={i} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                {f.feature_name} {f.feature_value && f.feature_value !== 'True' ? `- ${f.feature_value}` : ''}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                disabled={!selectedPlanId || processingPayment}
                                onClick={handleUpgradeClick}
                                className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm flex items-center gap-2
                                    ${!selectedPlanId || processingPayment ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-950 hover:bg-blue-900 text-white'}`}
                            >
                                {processingPayment ? (
                                    <>
                                        <Clock className="w-4 h-4 animate-spin" /> Processing Payment...
                                    </>
                                ) : (
                                    <>
                                        Confirm Payment <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <PaymentGatewayModal
                isOpen={showPaymentGateway}
                onClose={() => setShowPaymentGateway(false)}
                onSuccess={handlePaymentSuccess}
                amount={availablePlans.find(p => p.id === selectedPlanId)?.price || 0}
                planName={availablePlans.find(p => p.id === selectedPlanId)?.name || ''}
            />
        </div>
    );
};

export default InstituteSubscriptions;
