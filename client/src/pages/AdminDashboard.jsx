import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, CheckCircle, XCircle, DollarSign, Database, Users, Search, Lock, Key } from 'lucide-react';
import api from '../lib/axios';

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export default function AdminDashboard() {
        const backendOrigin = (() => {
            const base = api?.defaults?.baseURL || '';
            // If baseURL is absolute (e.g. https://api.example.com/api)
            if (base.startsWith('http://') || base.startsWith('https://')) {
                return base.replace(/\/?api\/?$/, '');
            }
            // If baseURL is relative (default '/api'), uploads should be same-origin
            return window.location.origin;
        })();

        const toInvoiceHref = (url) => {
            if (!url) return null;
            if (typeof url !== 'string') return null;
            if (url.startsWith('http://') || url.startsWith('https://')) return url;
            if (url.startsWith('/')) return `${backendOrigin}${url}`;
            return url;
        };
    const [requests, setRequests] = useState([]);
    const [funds, setFunds] = useState(0);
    const [users, setUsers] = useState([]);
    const [showProcessedRequests, setShowProcessedRequests] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isEditingFunds, setIsEditingFunds] = useState(false);
    const [newFunds, setNewFunds] = useState('');

    const pendingRequests = requests.filter(r => r.status === 'PENDING');
    const processedRequests = requests.filter(r => r.status !== 'PENDING');

    const normalizedSearch = (searchQuery || '').trim().toLowerCase();
    const matchRequest = (req) => {
        if (!normalizedSearch) return true;

        const username = (req?.user?.username || '').toString().toLowerCase();
        const purpose = (req?.purpose || '').toString().toLowerCase();
        const idText = (req?.id ?? '').toString().toLowerCase();
        const amountText = (req?.amount ?? '').toString().toLowerCase();

        return (
            username.includes(normalizedSearch) ||
            purpose.includes(normalizedSearch) ||
            idText.includes(normalizedSearch) ||
            amountText.includes(normalizedSearch)
        );
    };

    const pendingRequestsFiltered = pendingRequests.filter(matchRequest);
    const processedRequestsFiltered = processedRequests.filter(matchRequest);

    // Password change state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('新密码与确认密码不一致');
            return;
        }

        if (passwordData.newPassword.length < 4) {
            setPasswordError('新密码至少4位');
            return;
        }

        try {
            await api.post('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            alert('密码修改成功！');
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setPasswordError(err.response?.data?.error || '修改失败');
        }
    };

    const fetchData = async () => {
        try {
            const [reqsRes, fundsRes] = await Promise.all([
                api.get('/admin/requests'),
                api.get('/admin/funds')
            ]);
            setRequests(reqsRes.data);
            setFunds(fundsRes.data.totalFunds);
            setNewFunds(fundsRes.data.totalFunds);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users');
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, []);

    const handleDeleteUser = async (user) => {
        if (!user?.id) return;
        if (user.role === 'ADMIN') {
            alert('不能删除管理员账号');
            return;
        }
        if (user.isDeleted) {
            alert('该账号已删除');
            return;
        }

        const ok = window.confirm(`确认删除账号：${user.username} (ID: ${user.id})？\n\n说明：删除后该用户将无法登录，但历史报销记录和上传文件不会删除。`);
        if (!ok) return;

        try {
            await api.delete(`/admin/users/${user.id}`);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data?.error || '删除失败');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            await api.post(`/admin/requests/${id}/status`, { status });
            fetchData();
        } catch (err) {
            alert('操作失败');
        }
    };

    const updateFunds = async () => {
        try {
            await api.post('/admin/funds', { amount: parseFloat(newFunds) });
            setIsEditingFunds(false);
            fetchData();
        } catch (err) {
            alert('更新失败');
        }
    };

    const StatusBadge = ({ status }) => {
        const config = {
            PENDING: { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', text: '审核中', en: 'Pending' },
            APPROVED: { color: 'text-green-600 bg-green-50 border-green-200', text: '已通过', en: 'Approved' },
            REJECTED: { color: 'text-red-600 bg-red-50 border-red-200', text: '已拒绝', en: 'Rejected' },
            WITHDRAWN: { color: 'text-gray-400 bg-gray-50 border-gray-200', text: '已撤回', en: 'Withdrawn' }
        };
        const { color, text, en } = config[status] || config.PENDING;
        return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${color}`}>
                {text} <span className="opacity-50 text-[10px] ml-1">{en}</span>
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
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Title Block (Bento Large) */}
                <div className="md:col-span-8 bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-bento relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                    {/* Decorative gradient */}
                    <div className="absolute top-0 right-[-10%] w-[400px] h-[400px] bg-xjtu-red rounded-full opacity-20 blur-[100px]" />

                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                                <Database className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <p className="text-sm uppercase tracking-widest opacity-60">管理中心</p>
                                <p className="text-[10px] uppercase tracking-widest opacity-30">Admin Control</p>
                            </div>
                        </div>
                        <div className="relative">
                            <h1 className="text-6xl font-display font-bold leading-none tracking-tighter">
                                财务管理
                            </h1>
                            <p className="mt-2 text-xl font-light opacity-20 tracking-widest">
                                Governance
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 flex gap-8 mt-8 items-end">
                        <div>
                            <p className="text-xs opacity-40 uppercase tracking-widest mb-1">总申请</p>
                            <p className="text-4xl font-mono font-bold">{requests.length}</p>
                        </div>
                        <div>
                            <p className="text-xs opacity-40 uppercase tracking-widest mb-1">待审核</p>
                            <p className="text-4xl font-mono font-bold text-yellow-500">{pendingRequests.length}</p>
                        </div>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className="ml-auto flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-colors text-sm font-bold"
                        >
                            <Key className="w-4 h-4" /> 修改密码
                        </button>
                    </div>
                </div>

                {/* Funds Card (Bento Medium) */}
                <div className="md:col-span-4 bg-xjtu-red text-white p-8 rounded-[2.5rem] shadow-bento flex flex-col justify-between relative overflow-hidden group min-h-[280px]">
                    {/* Decorative gradient */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-black/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />

                    <div className="flex items-center justify-between relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                            <DollarSign className="w-8 h-8" />
                        </div>
                        {!isEditingFunds && (
                            <button onClick={() => setIsEditingFunds(true)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                                <Settings className="w-5 h-5 text-white/80" />
                            </button>
                        )}
                    </div>

                    <div className="relative z-10 mt-auto">
                        <p className="text-xs opacity-70 font-bold uppercase tracking-widest mb-1">资金池</p>
                        <p className="text-[10px] opacity-40 uppercase tracking-widest mb-3">Total Budget</p>
                        {isEditingFunds ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={newFunds}
                                    onChange={(e) => setNewFunds(e.target.value)}
                                    className="w-full bg-white/10 border border-white/30 rounded-xl px-3 py-2 text-2xl font-bold font-mono focus:outline-none focus:bg-white/20"
                                    autoFocus
                                />
                                <button onClick={updateFunds} className="p-2 bg-white text-xjtu-red rounded-lg shadow-lg">
                                    <CheckCircle className="w-6 h-6" />
                                </button>
                            </div>
                        ) : (
                            <p className="text-5xl font-mono font-bold tracking-tighter">
                                ¥{funds.toLocaleString()}
                            </p>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Pending Requests Section */}
            <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] shadow-bento border border-gray-100 min-h-[500px]">
                <div className="flex items-center justify-between mb-8 px-2">
                    <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                            <Users className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">未处理申请</h2>
                            <p className="text-[10px] text-gray-300 uppercase tracking-widest">Request Queue</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索用户..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-600 w-28"
                        />
                    </div>
                </div>

                <div className="overflow-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-4 py-3 pl-6">申请人</th>
                                <th className="px-4 py-3">金额</th>
                                <th className="px-4 py-3">用途</th>
                                <th className="px-4 py-3">发票</th>
                                <th className="px-4 py-3">状态</th>
                                <th className="px-4 py-3 text-right pr-6">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingRequestsFiltered.map((req) => (
                                <tr key={req.id} className="bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all group duration-300 transform hover:-translate-y-1">
                                    <td className="px-4 py-5 rounded-l-2xl border border-transparent group-hover:border-gray-100 group-hover:border-r-transparent">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                                                {req.user?.username?.substring(0, 2).toUpperCase()}
                                            </div>
                                            <span className="font-bold text-gray-900">{req.user?.username}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-5 font-mono font-bold text-lg text-gray-900 border-y border-transparent group-hover:border-gray-100">
                                        ¥{req.amount}
                                    </td>
                                    <td className="px-4 py-5 text-sm font-bold text-gray-500 max-w-[180px] truncate border-y border-transparent group-hover:border-gray-100">
                                        {req.purpose}
                                    </td>
                                    <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100">
                                        {(() => {
                                            const urls = Array.isArray(req.invoiceUrls) && req.invoiceUrls.length > 0
                                                ? req.invoiceUrls
                                                : (req.invoiceUrl ? [req.invoiceUrl] : []);

                                            const hrefs = urls
                                                .map(toInvoiceHref)
                                                .filter(Boolean);

                                            if (hrefs.length === 0) return <span className="text-gray-300 text-xs font-bold">无</span>;

                                            if (hrefs.length === 1) {
                                                return (
                                                    <a href={hrefs[0]} target="_blank" rel="noreferrer" className="text-xs font-bold text-xjtu-red hover:underline flex items-center gap-1">
                                                        查看文件
                                                    </a>
                                                );
                                            }

                                            return (
                                                <div className="flex flex-col gap-1">
                                                    {hrefs.map((href, idx) => (
                                                        <a key={href + idx} href={href} target="_blank" rel="noreferrer" className="text-xs font-bold text-xjtu-red hover:underline flex items-center gap-1">
                                                            查看文件{idx + 1}
                                                        </a>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100">
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td className="px-4 py-5 rounded-r-2xl text-right border border-transparent group-hover:border-gray-100 group-hover:border-l-transparent">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleUpdateStatus(req.id, 'APPROVED')}
                                                className="p-2 rounded-xl text-green-600 hover:bg-green-50 transition-colors"
                                                title="通过"
                                            >
                                                <CheckCircle className="w-6 h-6" />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                                                className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                                                title="拒绝"
                                            >
                                                <XCircle className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {pendingRequestsFiltered.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="text-center py-20 text-gray-300 italic">
                                        <div className="flex flex-col items-center gap-4">
                                            <Users className="w-12 h-12 opacity-20" />
                                            <div>
                                                <p className="font-bold">暂无未处理申请</p>
                                                <p className="text-xs opacity-50">Queue is empty</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Processed Requests Section (Collapsed by default) */}
            <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] shadow-bento border border-gray-100">
                <div className="flex items-center justify-between mb-6 px-2">
                    <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                            <Users className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">已处理申请</h2>
                            <p className="text-[10px] text-gray-300 uppercase tracking-widest">Processed</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowProcessedRequests(v => !v)}
                        className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        {showProcessedRequests ? '收起' : `查看（${processedRequests.length}）`}
                    </button>
                </div>

                {showProcessedRequests && (
                    <div className="overflow-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                <tr>
                                    <th className="px-4 py-3 pl-6">申请人</th>
                                    <th className="px-4 py-3">金额</th>
                                    <th className="px-4 py-3">用途</th>
                                    <th className="px-4 py-3">发票</th>
                                    <th className="px-4 py-3">状态</th>
                                    <th className="px-4 py-3 text-right pr-6">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processedRequestsFiltered.map((req) => (
                                    <tr key={req.id} className="bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all group duration-300 transform hover:-translate-y-1">
                                        <td className="px-4 py-5 rounded-l-2xl border border-transparent group-hover:border-gray-100 group-hover:border-r-transparent">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {req.user?.username?.substring(0, 2).toUpperCase()}
                                                </div>
                                                <span className="font-bold text-gray-900">{req.user?.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-5 font-mono font-bold text-lg text-gray-900 border-y border-transparent group-hover:border-gray-100">
                                            ¥{req.amount}
                                        </td>
                                        <td className="px-4 py-5 text-sm font-bold text-gray-500 max-w-[180px] truncate border-y border-transparent group-hover:border-gray-100">
                                            {req.purpose}
                                        </td>
                                        <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100">
                                            {(() => {
                                                const urls = Array.isArray(req.invoiceUrls) && req.invoiceUrls.length > 0
                                                    ? req.invoiceUrls
                                                    : (req.invoiceUrl ? [req.invoiceUrl] : []);

                                                const hrefs = urls
                                                    .map(toInvoiceHref)
                                                    .filter(Boolean);

                                                if (hrefs.length === 0) return <span className="text-gray-300 text-xs font-bold">无</span>;

                                                if (hrefs.length === 1) {
                                                    return (
                                                        <a href={hrefs[0]} target="_blank" rel="noreferrer" className="text-xs font-bold text-xjtu-red hover:underline flex items-center gap-1">
                                                            查看文件
                                                        </a>
                                                    );
                                                }

                                                return (
                                                    <div className="flex flex-col gap-1">
                                                        {hrefs.map((href, idx) => (
                                                            <a key={href + idx} href={href} target="_blank" rel="noreferrer" className="text-xs font-bold text-xjtu-red hover:underline flex items-center gap-1">
                                                                查看文件{idx + 1}
                                                            </a>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-4 py-5 rounded-r-2xl text-right border border-transparent group-hover:border-gray-100 group-hover:border-l-transparent">
                                            <span className="text-gray-300 font-bold text-xs uppercase tracking-wider">已完成</span>
                                        </td>
                                    </tr>
                                ))}
                                {processedRequestsFiltered.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-10 text-sm font-bold text-gray-400">
                                            暂无已处理申请
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </motion.div>

            {/* Users Section */}
            <motion.div variants={itemVariants} className="bg-white p-8 rounded-[2.5rem] shadow-bento border border-gray-100">
                <div className="flex items-center justify-between mb-6 px-2">
                    <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500">
                            <Users className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">账户管理</h2>
                            <p className="text-[10px] text-gray-300 uppercase tracking-widest">Accounts</p>
                        </div>
                    </div>
                </div>

                <div className="overflow-auto">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-4 py-3 pl-6">ID</th>
                                <th className="px-4 py-3">用户名</th>
                                <th className="px-4 py-3">角色</th>
                                <th className="px-4 py-3">状态</th>
                                <th className="px-4 py-3 text-right pr-6">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((u) => (
                                <tr key={u.id} className="bg-gray-50/50 hover:bg-white hover:shadow-lg hover:shadow-gray-200/50 transition-all group duration-300 transform hover:-translate-y-1">
                                    <td className="px-4 py-5 pl-6 rounded-l-2xl border border-transparent group-hover:border-gray-100 group-hover:border-r-transparent font-mono font-bold text-gray-900">
                                        {u.id}
                                    </td>
                                    <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100 font-bold text-gray-900">
                                        {u.username}
                                    </td>
                                    <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100 text-sm font-bold text-gray-500">
                                        {u.role}
                                    </td>
                                    <td className="px-4 py-5 border-y border-transparent group-hover:border-gray-100">
                                        {u.isDeleted ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border text-gray-500 bg-gray-50 border-gray-200">
                                                已删除
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border text-green-600 bg-green-50 border-green-200">
                                                正常
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-5 rounded-r-2xl border border-transparent group-hover:border-gray-100 group-hover:border-l-transparent text-right pr-6">
                                        <button
                                            disabled={u.role === 'ADMIN' || u.isDeleted}
                                            onClick={() => handleDeleteUser(u)}
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                                                (u.role === 'ADMIN' || u.isDeleted)
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                                            }`}
                                        >
                                            删除
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm font-bold text-gray-400">
                                        暂无用户数据
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl"
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-xjtu-red rounded-2xl flex items-center justify-center">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">修改密码</h3>
                                <p className="text-xs text-gray-400">Change Password</p>
                            </div>
                        </div>

                        {passwordError && (
                            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm font-bold">
                                {passwordError}
                            </div>
                        )}

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">当前密码</label>
                                <input
                                    type="password"
                                    className="w-full bg-gray-50 border-2 border-transparent rounded-xl py-3 px-4 focus:outline-none focus:border-xjtu-red/20 font-bold"
                                    placeholder="••••••••"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">新密码</label>
                                <input
                                    type="password"
                                    className="w-full bg-gray-50 border-2 border-transparent rounded-xl py-3 px-4 focus:outline-none focus:border-xjtu-red/20 font-bold"
                                    placeholder="••••••••"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">确认新密码</label>
                                <input
                                    type="password"
                                    className="w-full bg-gray-50 border-2 border-transparent rounded-xl py-3 px-4 focus:outline-none focus:border-xjtu-red/20 font-bold"
                                    placeholder="••••••••"
                                    value={passwordData.confirmPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordError('');
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 rounded-xl bg-xjtu-red text-white font-bold hover:bg-xjtu-dark transition-colors"
                                >
                                    确认修改
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
}
