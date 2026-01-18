import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../lib/axios';
import logo from '../assets/a4-2xbred.png';
import bgPattern from '../assets/a5-1xxys1.png';

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/auth/register', formData);
            alert('注册成功！请登录。');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.error || '注册失败');
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Top Header Bar */}
            <header className="w-full px-8 py-4 flex items-center justify-between border-b border-gray-100">
                {/* Left: University Logo (with Chinese, English & emblem) */}
                <img src={logo} alt="西安交通大学" className="h-14 w-auto" />

                {/* Right: System Name */}
                <div className="text-right">
                    <h2 className="text-lg font-bold text-xjtu-red">3227财务报账管理系统</h2>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">3227 Finance Reimbursement Management System</p>
                </div>
            </header>

            {/* Main Content - Centered with Background */}
            <main className="flex-1 flex items-center justify-center p-6 relative">
                {/* Background Pattern */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.8 }}>
                    <img src={bgPattern} alt="" className="w-[600px] h-auto" />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md relative z-10"
                >
                    {/* Register Title */}
                    <div className="text-center mb-10">
                        <h1 className="text-7xl font-display font-black text-gray-900 mb-2">注册</h1>
                        <p className="text-xl text-gray-300 tracking-widest">Register</p>
                    </div>

                    {/* Register Form Card */}
                    <div className="bg-white/90 rounded-[2rem] p-8 border border-gray-100 shadow-bento">
                        <div className="mb-6 text-center">
                            <h3 className="text-2xl font-bold text-gray-900">创建账户</h3>
                            <p className="text-sm text-gray-400">Create Account</p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="bg-red-50 text-xjtu-red px-4 py-3 rounded-xl mb-6 text-sm font-bold flex items-center justify-center gap-2"
                            >
                                <ShieldCheck className="w-4 h-4" /> {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-4">用户名 <span className="opacity-50">Username</span></label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-xjtu-red transition-colors">
                                        <User className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 border-2 border-transparent text-gray-900 text-lg font-bold rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-xjtu-red/20 focus:bg-white focus:shadow-[0_0_0_4px_rgba(164,31,53,0.05)] transition-all placeholder:text-gray-300 placeholder:font-medium"
                                        placeholder="请输入用户名"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 uppercase ml-4">密码 <span className="opacity-50">Password</span></label>
                                <div className="relative group">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-xjtu-red transition-colors">
                                        <Lock className="w-5 h-5" />
                                    </span>
                                    <input
                                        type="password"
                                        className="w-full bg-gray-50 border-2 border-transparent text-gray-900 text-lg font-bold rounded-2xl py-4 pl-14 pr-6 focus:outline-none focus:border-xjtu-red/20 focus:bg-white focus:shadow-[0_0_0_4px_rgba(164,31,53,0.05)] transition-all placeholder:text-gray-300 placeholder:font-medium"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-xjtu-red text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-xjtu-dark transition-all group active:scale-[0.98] shadow-lg hover:shadow-xl mt-2"
                            >
                                注册账户 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>

                            <div className="text-center pt-2">
                                <Link to="/login" className="inline-flex items-center gap-1 text-sm font-bold text-gray-400 hover:text-xjtu-red transition-colors">
                                    已有账户？登录 <span className="opacity-50 text-xs">Login</span> <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </form>
                    </div>

                    {/* Footer Info */}
                    <div className="text-center mt-8">
                        <p className="text-xs text-gray-300">2026 System Build  Version 1.3.0</p>
                    </div>
                </motion.div>
            </main>
        </div>
    );
}
