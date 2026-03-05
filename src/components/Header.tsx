import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Cloud, Home, Upload, FolderOpen, Search, LogOut, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Home },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/files', label: 'My Files', icon: FolderOpen },
  { path: '/search', label: 'Search', icon: Search },
];

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b bg-card/90 backdrop-blur-xl shadow-sm'
          : 'border-b border-transparent bg-card/70 backdrop-blur-md'
      )}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="p-2 rounded-xl gradient-primary shadow-glow group-hover:shadow-glow-lg transition-shadow">
            <Cloud className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg hidden sm:block tracking-tight">
            Smart Cloud
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant="ghost"
                  className={cn(
                    'gap-2 relative h-9 px-4 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary bg-primary/10 hover:bg-primary/15'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full gradient-primary" />
                  )}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-transparent hover:ring-primary/30 transition-all">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="gradient-primary text-primary-foreground font-semibold text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 p-2">
              <div className="flex items-center gap-3 p-2 mb-1">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="gradient-primary text-primary-foreground font-semibold text-sm">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <p className="font-semibold text-sm truncate">{user?.email}</p>
                  <p className="text-xs text-muted-foreground">Free Plan</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive cursor-pointer mt-1 gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t p-3 bg-card/95 backdrop-blur-md animate-slide-up">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3 h-11',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full gradient-primary" />
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
