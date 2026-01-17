import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore';
import { School, LogOut } from 'lucide-react';

export default function Layout({ children }) {
    const { user, logout } = useStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Full-screen pages without layout wrapper
    if (location.pathname === '/login' || location.pathname === '/register') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Navbar */}
            <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        {/* Left: Branding */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-xjtu-red rounded-xl flex items-center justify-center">
                                <School className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold text-gray-900 leading-tight">3227财务报账管理系统</h1>
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">3227 Finance Reimbursement</span>
                            </div>
                        </div>

                        {/* Right: User Info */}
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">{user?.username}</p>
                                <p className="text-[10px] text-gray-400 uppercase tracking-widest">
                                    {user?.role === 'ADMIN' ? '管理员' : '用户'}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-xjtu-red"
                                title="退出登录"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="px-6 lg:px-8 py-8">
                {children}
            </main>
        </div>
    );
}
