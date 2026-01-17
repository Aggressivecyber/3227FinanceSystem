import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Clock, FileText, Upload, Trash2, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import api from '../lib/axios';

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export default function UserDashboard() {
    const [requests, setRequests] = useState([]);
    const [totalFunds, setTotalFunds] = useState(null);
    const [formData, setFormData] = useState({ amount: '', purpose: '', invoices: [] });
    const [uploading, setUploading] = useState(false);
    const [invoiceError, setInvoiceError] = useState('');

    const validateAmount = (value) => {
        const text = value === undefined || value === null ? '' : String(value).trim();
        if (!text) return { ok: false, message: '请输入金额' };
        if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return { ok: false, message: '金额小数位不能超过2位' };
        const num = Number.parseFloat(text);
        if (!Number.isFinite(num) || num <= 0) return { ok: false, message: '金额必须大于0' };
        return { ok: true, value: num };
    };

    const fetchRequests = async () => {
        try {
            const res = await api.get('/reimbursement/my');
            setRequests(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchFunds = async () => {
        try {
            const res = await api.get('/reimbursement/funds');
            setTotalFunds(res.data?.totalFunds ?? 0);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchRequests();
        fetchFunds();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.invoices.length === 0) {
            setInvoiceError('请上传发票');
            return;
        }

        const amountCheck = validateAmount(formData.amount);
        if (!amountCheck.ok) return alert(amountCheck.message);

        const ok = confirm(
            `确认提交申请？\n金额：¥${amountCheck.value}\n用途：${(formData.purpose || '').trim() || '（空）'}\n发票：${formData.invoices.length} 个文件`
        );
        if (!ok) return;

        setUploading(true);
        const data = new FormData();
        data.append('amount', formData.amount);
        data.append('purpose', formData.purpose);
        // Append all files with the same field name
        formData.invoices.forEach(file => {
            data.append('invoices', file);
        });

        try {
            await api.post('/reimbursement/submit', data);
            alert('提交成功');
            setFormData({ amount: '', purpose: '', invoices: [] });
            fetchRequests();
        } catch (err) {
            alert(err.response?.data?.error || '提交失败');
        } finally {
            setUploading(false);
        }
    };

    const handleWithdraw = async (id) => {
        if (!confirm('确认撤回此申请？')) return;
        try {
            await api.post(`/reimbursement/${id}/withdraw`);
            fetchRequests();
        } catch (err) {
            alert('撤回失败');
        }
    };

    const StatusBadge = ({ status }) => {
        const config = {
            PENDING: { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock, text: '审核中', en: 'Pending' },
            APPROVED: { color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle, text: '已通过', en: 'Approved' },
            REJECTED: { color: 'text-red-600 bg-red-50 border-red-200', icon: XCircle, text: '已拒绝', en: 'Rejected' },
            WITHDRAWN: { color: 'text-gray-400 bg-gray-50 border-gray-200', icon: AlertCircle, text: '已撤回', en: 'Withdrawn' }
        };
        const { color, icon: Icon, text, en } = config[status] || config.PENDING;
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${color}`}>
                <Icon className="w-3.5 h-3.5" /> {text}
                <span className="opacity-50 text-[10px] ml-1">{en}</span>
            </span>
        );
    };

    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
            className="max-w-7xl mx-auto space-y-6"
        >
            {/* Header Section */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Hero Card */}
                <div className="md:col-span-2 bg-xjtu-red text-white p-10 rounded-[2.5rem] shadow-bento relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                    {/* Decorative gradient */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-black/20 to-transparent" />

                    <div className="relative z-10">
                        <p className="text-sm uppercase tracking-widest opacity-60 mb-2">用户面板</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-30">User Dashboard</p>
                        <div className="relative mt-6">
                            <h1 className="text-6xl font-display font-black leading-none tracking-tighter">我的报账</h1>
                            <p className="mt-2 text-xl font-light opacity-30 tracking-widest">Reimbursement</p>
                        </div>
                    </div>

                    <div className="relative z-10 flex items-end gap-8 mt-8">
                        <div>
                            <p className="text-sm opacity-50 uppercase tracking-widest mb-1">总申请</p>
                            <p className="text-5xl font-mono font-bold">{requests.length}</p>
                        </div>

                        <div>
                            <p className="text-sm opacity-50 uppercase tracking-widest mb-1">剩余总金额</p>
                            <p className="text-5xl font-mono font-bold">¥{(totalFunds ?? 0).toLocaleString()}</p>
                        </div>

                    </div>
                </div>

                {/* Pending Count Card */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-bento border border-gray-100 flex flex-col justify-center items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-xjtu-red/30 to-transparent" />
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 text-xjtu-red">
                        <TrendingUp className="w-8 h-8" />
                    </div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-1">待处理</p>
                    <p className="text-[10px] text-gray-300 uppercase tracking-widest mb-2">Pending</p>
                    <p className="text-5xl font-display font-bold text-gray-900">
                        {requests.filter(r => r.status === 'PENDING').length}
                    </p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Submit Form Card */}
                <motion.div variants={itemVariants} className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] shadow-bento border border-gray-100 h-fit">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="w-12 h-12 rounded-2xl bg-xjtu-red text-white flex items-center justify-center shadow-lg shadow-xjtu-red/20">
                            <Plus className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">新建申请</h2>
                            <p className="text-[10px] text-gray-300 uppercase tracking-widest">New Request</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">金额 <span className="opacity-50">Amount</span></label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold group-focus-within:text-xjtu-red transition-colors">¥</span>
                                <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    className="w-full bg-gray-50 border-2 border-transparent text-gray-900 font-mono font-bold text-2xl rounded-2xl py-4 pl-10 pr-4 focus:outline-none focus:border-xjtu-red/20 focus:bg-white focus:shadow-[0_0_0_4px_rgba(164,31,53,0.05)] transition-all"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">用途 <span className="opacity-50">Purpose</span></label>
                            <textarea
                                className="w-full bg-gray-50 border-2 border-transparent text-gray-900 font-bold rounded-2xl py-4 px-5 focus:outline-none focus:border-xjtu-red/20 focus:bg-white focus:shadow-[0_0_0_4px_rgba(164,31,53,0.05)] transition-all resize-none text-base min-h-[100px]"
                                placeholder="请描述报销用途..."
                                value={formData.purpose}
                                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">发票 <span className="opacity-50">Invoices (可多选)</span></label>
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-xjtu-red hover:bg-red-50/50 transition-all group relative overflow-hidden">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6 relative z-10">
                                    <Upload className="w-8 h-8 text-gray-300 group-hover:text-xjtu-red mb-2 transition-colors transform group-hover:-translate-y-1" />
                                    <p className="text-sm text-gray-400 group-hover:text-xjtu-red font-bold text-center px-4 transition-colors">
                                        {formData.invoices.length > 0
                                            ? `已选择 ${formData.invoices.length} 个文件`
                                            : '点击上传发票（可多选）'}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                        const files = Array.from(e.target.files || []);
                                        setFormData({ ...formData, invoices: files });
                                        if (files.length > 0) setInvoiceError('');
                                    }}
                                />
                            </label>
                            {invoiceError && (
                                <div className="mt-2 text-xs font-bold text-xjtu-red">
                                    {invoiceError}
                                </div>
                            )}
                            {formData.invoices.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {formData.invoices.map((file, idx) => (
                                        <span key={idx} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg truncate max-w-[120px]">
                                            {file.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={uploading}
                            className="w-full bg-slate-900 text-white font-bold text-lg py-4 rounded-2xl hover:bg-xjtu-red transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {uploading ? '提交中...' : '提交申请'}
                        </button>
                    </form>
                </motion.div>

                {/* History List Card */}
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-bento border border-gray-100 flex flex-col min-h-[550px]">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400">
                            <FileText className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">历史记录</h2>
                            <p className="text-[10px] text-gray-300 uppercase tracking-widest">History Records</p>
                        </div>
                    </div>

                    <div className="overflow-auto flex-grow -mx-2 px-2">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3">日期</th>
                                    <th className="px-4 py-3">金额</th>
                                    <th className="px-4 py-3">用途</th>
                                    <th className="px-4 py-3">状态</th>
                                    <th className="px-4 py-3 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map((req) => (
                                    <tr key={req.id} className="bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all group duration-300">
                                        <td className="px-4 py-5 rounded-l-2xl text-sm font-bold text-gray-500 border border-transparent group-hover:border-gray-100 group-hover:border-r-transparent">
                                            {new Date(req.createdAt).toLocaleDateString('zh-CN')}
                                        </td>
                                        <td className="px-4 py-5 font-mono font-bold text-lg text-gray-900 border-y border-transparent group-hover:border-gray-100">
                                            ¥{req.amount}
                                        </td>
                                        <td className="px-4 py-5 text-sm font-bold text-gray-700 max-w-[150px] truncate border-y border-transparent group-hover:border-gray-100">
                                            {req.purpose}
                                        </td>
                                        <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-4 py-5 rounded-r-2xl text-right border border-transparent group-hover:border-gray-100 group-hover:border-l-transparent">
                                            {req.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleWithdraw(req.id)}
                                                    className="text-gray-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"
                                                    title="撤回"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {requests.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="text-center py-20 text-gray-300 italic">
                                            <div className="flex flex-col items-center gap-4">
                                                <FileText className="w-12 h-12 opacity-20" />
                                                <div>
                                                    <p className="font-bold">暂无记录</p>
                                                    <p className="text-xs opacity-50">No records found</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
