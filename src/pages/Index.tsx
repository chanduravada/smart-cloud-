import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import {
  Cloud,
  Upload,
  Search,
  Shield,
  Sparkles,
  Zap,
  Lock,
  FileText,
  Image,
  FileSpreadsheet,
  Music,
  Video,
  ArrowRight,
  CheckCircle2,
  Star,
  HardDrive,
  Brain,
  Layers,
  Users,
} from 'lucide-react';

export default function Index() {
  const { user, loading } = useAuth();

  const features = [
    {
      icon: Upload,
      title: 'Easy Upload',
      description: 'Drag and drop files with instant S3 processing and secure storage',
      iconBg: 'bg-orange-500/15',
      iconColor: 'text-orange-400',
      border: 'hover:border-orange-500/30',
    },
    {
      icon: Sparkles,
      title: 'AI Classification',
      description: 'Automatic categorization and tagging using machine learning',
      iconBg: 'bg-purple-500/15',
      iconColor: 'text-purple-400',
      border: 'hover:border-purple-500/30',
    },
    {
      icon: Search,
      title: 'Smart Search',
      description: 'Find files instantly with semantic search and filters',
      iconBg: 'bg-cyan-500/15',
      iconColor: 'text-cyan-400',
      border: 'hover:border-cyan-500/30',
    },
    {
      icon: Shield,
      title: 'Duplicate Detection',
      description: 'SHA-256 hashing prevents duplicate file uploads automatically',
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-400',
      border: 'hover:border-emerald-500/30',
    },
    {
      icon: Lock,
      title: 'Secure Storage',
      description: 'Enterprise-grade security with AWS S3 encrypted file storage',
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-400',
      border: 'hover:border-amber-500/30',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Instant uploads and downloads powered by AWS CloudFront CDN',
      iconBg: 'bg-rose-500/15',
      iconColor: 'text-rose-400',
      border: 'hover:border-rose-500/30',
    },
  ];

  const fileTypes = [
    { icon: FileText, label: 'Documents', types: 'PDF, DOC, TXT', color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { icon: Image, label: 'Images', types: 'JPG, PNG, WEBP', color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { icon: FileSpreadsheet, label: 'Spreadsheets', types: 'XLS, XLSX, CSV', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { icon: Music, label: 'Audio', types: 'MP3, WAV, AAC', color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { icon: Video, label: 'Video', types: 'MP4, MOV, MKV', color: 'text-rose-400', bg: 'bg-rose-400/10' },
  ];

  const stats = [
    { value: '5GB', label: 'Free Storage', icon: HardDrive },
    { value: '99.9%', label: 'Uptime SLA', icon: Zap },
    { value: 'AI', label: 'Classification', icon: Brain },
    { value: '∞', label: 'File Types', icon: Layers },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, hsl(222 47% 5%) 0%, hsl(222 45% 9%) 50%, hsl(222 47% 6%) 100%)',
      }}>
        {/* Background glow orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -right-1/4 w-[600px] h-[600px] rounded-full blur-[120px] animate-pulse-slow"
            style={{ background: 'hsl(38 95% 54% / 0.08)' }} />
          <div className="absolute -bottom-1/4 -left-1/4 w-[500px] h-[500px] rounded-full blur-[100px] animate-pulse-slow"
            style={{ background: 'hsl(280 70% 60% / 0.06)', animationDelay: '2s' }} />
          {/* Grid overlay */}
          <div className="absolute inset-0 opacity-[0.04]" style={{
            backgroundImage: 'linear-gradient(hsl(210 40% 80%) 1px, transparent 1px), linear-gradient(90deg, hsl(210 40% 80%) 1px, transparent 1px)',
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="container relative">
          {/* Nav */}
          <nav className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl gradient-primary shadow-glow">
                <Cloud className="h-5 w-5" style={{ color: 'hsl(222 47% 7%)' }} />
              </div>
              <span className="font-display font-bold text-xl text-white tracking-tight">
                Smart Cloud
              </span>
            </div>

            <div className="flex items-center gap-3">
              {!loading && (
                user ? (
                  <Link to="/dashboard">
                    <Button className="gradient-primary gap-2 shadow-glow">
                      Dashboard
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button className="gradient-primary shadow-glow gap-2">
                        Sign Up
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </>
                )
              )}
            </div>
          </nav>

          {/* Hero Content */}
          <div className="py-24 md:py-32 text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 animate-fade-in border"
              style={{ background: 'hsl(38 95% 54% / 0.1)', borderColor: 'hsl(38 95% 54% / 0.2)' }}>
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="text-sm font-medium text-white/80">AI-Powered File Management</span>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.95] tracking-tight animate-slide-up">
              <span className="text-white">Smart Cloud</span>
              <br />
              <span className="text-primary">Powered by AI</span>
            </h1>

            <p className="mt-8 text-lg md:text-xl text-white/55 max-w-2xl mx-auto leading-relaxed animate-slide-up"
              style={{ animationDelay: '0.1s' }}>
              Upload, organize, and find your files effortlessly with intelligent
              classification, duplicate detection, and semantic search.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 animate-slide-up"
              style={{ animationDelay: '0.2s' }}>
              <Link to="/auth">
                <Button size="lg" className="gradient-primary shadow-glow-lg text-base px-8 h-14 gap-2 group"
                  style={{ color: 'hsl(222 47% 7%)' }}>
                  Start Free Today
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-14 animate-fade-in"
              style={{ animationDelay: '0.4s' }}>
              {['No Credit Card', '5GB Free', 'AI Powered', 'Secure Storage'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-white/50">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats band */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden mb-0 border animate-scale-in"
            style={{ background: 'hsl(210 40% 80% / 0.05)', borderColor: 'hsl(210 40% 80% / 0.1)', animationDelay: '0.5s' }}>
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex flex-col items-center gap-1 py-6 px-4 hover:bg-white/5 transition-colors"
                  style={{ background: 'hsl(210 40% 80% / 0.04)' }}>
                  <Icon className="h-5 w-5 text-primary mb-1" />
                  <p className="text-2xl md:text-3xl font-display font-bold text-white">{stat.value}</p>
                  <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Wave divider */}
        <div className="relative mt-16">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full block">
            <path d="M0 80L60 70C120 60 240 40 360 30C480 20 600 20 720 25C840 30 960 40 1080 45C1200 50 1320 50 1380 50L1440 50V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" fill="hsl(var(--background))" />
          </svg>
        </div>
      </section>

      {/* ─── File Types Section ─── */}
      <section className="py-16 bg-background">
        <div className="container">
          <p className="text-center text-sm uppercase tracking-[0.2em] text-muted-foreground font-medium mb-8">
            Supports all your favorite file formats
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {fileTypes.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.label}
                  className="flex items-center gap-3 px-6 py-4 bg-card rounded-2xl border border-border hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
                >
                  <div className={`p-2.5 rounded-xl ${type.bg} group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-5 w-5 ${type.color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-foreground">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.types}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="py-24 bg-background">
        <div className="container">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              Features
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold leading-tight text-foreground">
              Everything you need for
              <br />
              <span className="text-primary">smart file management</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make file organization effortless and intelligent
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`group relative p-6 bg-card rounded-2xl border border-border ${feature.border} hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
                >
                  <div className="relative">
                    <div className={`inline-flex p-3 rounded-xl ${feature.iconBg} mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className={`h-5 w-5 ${feature.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="py-28 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, hsl(222 47% 5%) 0%, hsl(222 45% 9%) 50%, hsl(222 47% 6%) 100%)',
      }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full blur-[120px]"
            style={{ background: 'hsl(38 95% 54% / 0.06)' }} />
        </div>

        <div className="container relative text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white/60 text-sm font-medium mb-6 border"
            style={{ borderColor: 'hsl(210 40% 80% / 0.15)', background: 'hsl(210 40% 80% / 0.05)' }}>
            <Users className="h-3.5 w-3.5 text-primary" />
            Join thousands of users
          </div>
          <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight text-white">
            Ready to organize<br />
            <span className="text-primary">your files smarter?</span>
          </h2>
          <p className="text-lg text-white/50 max-w-xl mx-auto mb-10">
            Join Smart Cloud today and experience the future of file management with AI-powered organization.
          </p>
          <Link to="/auth">
            <Button size="lg" className="gradient-primary shadow-glow-lg text-base px-10 h-14 gap-2 group font-semibold"
              style={{ color: 'hsl(222 47% 7%)' }}>
              Create Free Account
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-10 border-t bg-card">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg gradient-primary">
              <Cloud className="h-4 w-4" style={{ color: 'hsl(222 47% 7%)' }} />
            </div>
            <span className="font-display font-semibold text-foreground">Smart Cloud</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Smart Cloud. AI-Powered Secure Storage.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            <span>Encrypted &amp; Secure</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
