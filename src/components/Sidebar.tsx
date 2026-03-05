import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Cloud, LayoutDashboard, Upload, FolderOpen, Search, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/upload', label: 'Upload', icon: Upload },
    { path: '/files', label: 'My Files', icon: FolderOpen },
    { path: '/search', label: 'Search', icon: Search },
];

export function Sidebar() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const initials = user?.email?.charAt(0).toUpperCase() ?? '?';
    const email = user?.email ?? '';

    return (
        <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col"
            style={{ background: 'hsl(var(--sidebar-background))' }}>

            {/* Logo */}
            <div className="flex items-center gap-3 px-5 py-5 border-b"
                style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
                <div className="p-2 rounded-xl gradient-primary shadow-glow shrink-0">
                    <Cloud className="h-5 w-5" style={{ color: 'hsl(var(--primary-foreground))' }} />
                </div>
                <span className="font-display font-bold text-base tracking-tight text-white">
                    Smart Cloud
                </span>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map(({ path, label, icon: Icon }) => {
                    const isActive = location.pathname === path;
                    return (
                        <Link key={path} to={path}>
                            <span className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                                isActive
                                    ? 'text-[hsl(var(--primary-foreground))] shadow-glow'
                                    : 'text-[hsl(var(--sidebar-foreground))] hover:text-white hover:bg-white/5'
                            )}
                                style={isActive ? { background: 'hsl(var(--primary))' } : {}}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </nav>

            {/* User Footer */}
            <div className="border-t px-4 py-4 space-y-3"
                style={{ borderColor: 'hsl(var(--sidebar-border))' }}>
                {/* User info */}
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full gradient-primary flex items-center justify-center shrink-0 text-sm font-bold"
                        style={{ color: 'hsl(var(--primary-foreground))' }}>
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{initials === '?' ? 'User' : email.split('@')[0]}</p>
                        <p className="text-xs truncate" style={{ color: 'hsl(var(--muted-foreground))' }}>{email}</p>
                    </div>
                </div>

                {/* Sign Out */}
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-2 text-xs font-medium transition-colors hover:text-red-400 w-full"
                    style={{ color: 'hsl(var(--muted-foreground))' }}
                >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
