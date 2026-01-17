import { create } from 'zustand';

const useStore = create((set) => ({
    user: null,
    isAuthenticated: false,
    role: null,
    setUser: (user) => set({ user, isAuthenticated: !!user, role: user?.role }),
    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, isAuthenticated: false, role: null });
    },
}));

export default useStore;
