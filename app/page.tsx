"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Link2,
  BarChart3,
  Shield,
  Zap,
  Globe,
  Users,
  ArrowRight,
  Copy,
  Check,
  Star,
  TrendingUp,
  Eye,
  QrCode,
  Download,
  ExternalLink,
  Sparkles,
  MousePointer,
  Activity,
  Lock,
  Layers,
  Rocket,
  Target,
  X,
  Mail,
  User,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sun,
  Moon,
} from "lucide-react";

// Auth Modal Component (same as before but with proper theming)
const AuthModals = ({
  isSignInOpen,
  isSignUpOpen,
  onClose,
  onSwitchToSignUp,
  onSwitchToSignIn,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    setError("");
    setSuccess("");
  }, [isSignInOpen, isSignUpOpen]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const validateForm = () => {
    if (isSignUpOpen) {
      if (!formData.name.trim()) return "Name is required";
      if (formData.name.trim().length < 2)
        return "Name must be at least 2 characters";
    }

    if (!formData.email.trim()) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      return "Invalid email format";

    if (!formData.password) return "Password is required";
    if (formData.password.length < 8)
      return "Password must be at least 8 characters";

    if (isSignUpOpen) {
      if (!formData.confirmPassword) return "Please confirm your password";
      if (formData.password !== formData.confirmPassword)
        return "Passwords do not match";
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        return "Password must contain uppercase, lowercase, and number";
      }
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSignUpOpen) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            confirmPassword: formData.confirmPassword,
            acceptTerms: true,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(
            "Account created successfully! Please check your email to verify your account."
          );
          setTimeout(() => {
            onSwitchToSignIn();
          }, 2000);
        } else {
          setError(data.error || "Failed to create account");
        }
      } else {
        try {
          const { signIn } = await import("next-auth/react");

          const result = await signIn("credentials", {
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            redirect: false,
          });

          if (result?.error) {
            setError("Invalid email or password");
          } else if (result?.ok) {
            setSuccess("Signed in successfully!");
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1000);
          }
        } catch (authError) {
          console.error("NextAuth import error:", authError);
          const response = await fetch("/api/auth/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: formData.email.trim().toLowerCase(),
              password: formData.password,
            }),
          });

          const data = await response.json();

          if (response.ok) {
            setSuccess("Signed in successfully!");
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 1000);
          } else {
            setError(data.error || "Invalid email or password");
          }
        }
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isSignInOpen && !isSignUpOpen) return null;

  const isSignUp = isSignUpOpen;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-3xl blur-xl" />
        <div className="relative bg-background/95 backdrop-blur-xl rounded-3xl border shadow-2xl overflow-hidden">
          <div className="relative p-8 pb-6">
            <button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
                {isSignUp ? (
                  <User className="w-8 h-8 text-white" />
                ) : (
                  <Shield className="w-8 h-8 text-white" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {isSignUp ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-muted-foreground">
                {isSignUp
                  ? "Join thousands of users creating magic"
                  : "Sign in to continue your journey"}
              </p>
            </div>
          </div>

          <div className="px-8 pb-8">
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                <span className="text-destructive text-sm">{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-green-500 text-sm">{success}</span>
              </div>
            )}

            <div className="space-y-6">
              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full pl-12 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                      placeholder="Enter your full name"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmit(e)}
                    className="w-full pl-12 pr-4 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                    placeholder="Enter your email"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === "Enter" && handleSubmit(e)}
                    className="w-full pl-12 pr-12 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onKeyPress={(e) => e.key === "Enter" && handleSubmit(e)}
                      className="w-full pl-12 pr-12 py-3 bg-background border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
                      placeholder="Confirm your password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      disabled={loading}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {isSignUp ? "Creating Account..." : "Signing In..."}
                  </>
                ) : (
                  <>
                    {isSignUp ? "Create Account" : "Sign In"}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            <div className="text-center mt-6">
              <span className="text-muted-foreground">
                {isSignUp
                  ? "Already have an account?"
                  : "Don't have an account?"}
              </span>
              <button
                onClick={isSignUp ? onSwitchToSignIn : onSwitchToSignUp}
                className="ml-2 text-blue-500 hover:text-blue-400 font-medium transition-colors"
                disabled={loading}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Homepage Component with proper shadcn theming
const ShadcnHomepage = () => {
  const [url, setUrl] = useState("");
  const [isShortening, setIsShortening] = useState(false);
  type ShortenResult = {
    shortUrl: string;
    clicks?: { total?: number };
    expiresIn?: string;
    [key: string]: any;
  };
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);

  // Mouse tracking for magical cursor effect
  useEffect(() => {
    const updateMousePosition = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", updateMousePosition);
    return () => window.removeEventListener("mousemove", updateMousePosition);
  }, []);

  // Theme toggle function
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  // Initialize theme
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    if (
      theme === "dark" ||
      (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const handleShorten = async () => {
    if (!url.trim()) return;

    setIsShortening(true);
    try {
      const response = await fetch("/api/public/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ originalUrl: url }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setResult(data.data);
        setUrl("");
      } else {
        alert(data.error || "Failed to shorten URL");
      }
    } catch (error) {
      alert("Network error. Please try again.");
    } finally {
      setIsShortening(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Magical cursor trail
  const CursorTrail = () => (
    <div
      className="fixed pointer-events-none z-40 w-4 h-4 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full mix-blend-screen opacity-75"
      style={{
        left: mousePosition.x - 8,
        top: mousePosition.y - 8,
        transform: "translate3d(0, 0, 0)",
        transition: "all 0.1s ease-out",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping opacity-75" />
    </div>
  );

  const features = [
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Lightning Speed",
      description:
        "Generate short links in microseconds with our edge computing infrastructure",
      gradient: "from-yellow-400 to-orange-500",
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "AI Analytics",
      description:
        "Machine learning powered insights with predictive click patterns",
      gradient: "from-green-400 to-blue-500",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Quantum Security",
      description: "Military-grade encryption with blockchain verification",
      gradient: "from-purple-400 to-pink-500",
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Global Network",
      description: "200+ edge locations worldwide for ultimate performance",
      gradient: "from-blue-400 to-indigo-500",
    },
    {
      icon: <QrCode className="w-8 h-8" />,
      title: "Smart QR Codes",
      description: "Dynamic QR codes with real-time customization and branding",
      gradient: "from-pink-400 to-red-500",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Team Synergy",
      description: "Collaborative workspaces with real-time link management",
      gradient: "from-indigo-400 to-purple-500",
    },
  ];

  const stats = [
    {
      label: "Links Generated",
      value: "50B+",
      icon: <Link2 className="w-6 h-6" />,
    },
    {
      label: "Global Clicks",
      value: "2.5T+",
      icon: <MousePointer className="w-6 h-6" />,
    },
    {
      label: "Active Users",
      value: "10M+",
      icon: <Users className="w-6 h-6" />,
    },
    {
      label: "Uptime",
      value: "99.99%",
      icon: <Activity className="w-6 h-6" />,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      <CursorTrail />

      {/* Auth Modals */}
      <AuthModals
        isSignInOpen={isSignInOpen}
        isSignUpOpen={isSignUpOpen}
        onClose={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(false);
        }}
        onSwitchToSignUp={() => {
          setIsSignInOpen(false);
          setIsSignUpOpen(true);
        }}
        onSwitchToSignIn={() => {
          setIsSignUpOpen(false);
          setIsSignInOpen(true);
        }}
      />

      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_50%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          33% {
            transform: translateY(-10px) rotate(120deg);
          }
          66% {
            transform: translateY(5px) rotate(240deg);
          }
        }
        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 40px rgba(59, 130, 246, 0.8),
              0 0 60px rgba(147, 51, 234, 0.3);
          }
        }
        @keyframes slide-up {
          0% {
            opacity: 0;
            transform: translateY(100px) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }
        .animate-slide-up {
          animation: slide-up 0.8s ease-out forwards;
        }
      `}</style>

      {/* Header */}
      <header className="relative z-30 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center animate-glow">
                  <Link2 className="w-6 h-6 text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                OnLink
              </span>
            </div>

            <nav className="hidden md:flex items-center space-x-8">
              {["Features", "Analytics", "Pricing", "API"].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105 relative group"
                >
                  {item}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 group-hover:w-full" />
                </a>
              ))}
            </nav>

            <div className="flex items-center space-x-4">
              {/* Theme Toggle Button */}
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label="Toggle theme"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </button>

              <button
                onClick={() => setIsSignInOpen(true)}
                className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
              >
                Sign In
              </button>
              <button
                onClick={() => setIsSignUpOpen(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-30 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          {/* Magical Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-muted/50 backdrop-blur-sm rounded-full border mb-12 group hover:bg-muted transition-all duration-500">
            <Sparkles className="w-5 h-5 text-yellow-500 animate-spin" />
            <span className="text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              ✨ Powered by AI • Trusted by 10M+ Users • 99.99% Uptime
            </span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>

          {/* Main Headline */}
          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="bg-gradient-to-r from-foreground via-foreground/80 to-foreground bg-clip-text text-transparent">
              Shorten
            </span>
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-pulse">
              Everything
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-16 max-w-4xl mx-auto leading-relaxed">
            Transform impossibly long URLs into powerful, intelligent short
            links.
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent font-semibold">
              {" "}
              Get AI-powered analytics, QR codes, and global performance in
              real-time.
            </span>
          </p>

          {/* Advanced URL Shortener */}
          <div className="relative max-w-5xl mx-auto mb-20">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-3xl blur-xl" />
            <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border p-8 shadow-2xl">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 relative">
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="🌐 Paste your impossibly long URL here..."
                    className="w-full px-8 py-6 text-lg bg-background border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-300 text-foreground placeholder-muted-foreground"
                    onKeyPress={(e) => e.key === "Enter" && handleShorten()}
                  />
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                    <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
                  </div>
                </div>
                <button
                  onClick={handleShorten}
                  disabled={isShortening || !url.trim()}
                  className="px-12 py-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                >
                  {isShortening ? (
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Creating Magic...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Rocket className="w-6 h-6" />
                      <span>Shorten Now</span>
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </button>
              </div>

              {/* Result Display */}
              {result && (
                <div className="mt-8 p-6 bg-green-500/10 border border-green-500/20 rounded-2xl animate-slide-up">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-green-500 font-semibold">
                          ✨ URL Magically Shortened!
                        </span>
                      </div>
                      <div className="flex items-center gap-4 bg-muted/30 rounded-xl p-4">
                        <code className="text-lg font-mono text-blue-600 dark:text-blue-400 flex-1">
                          {result.shortUrl}
                        </code>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(result.shortUrl)}
                            className="p-3 hover:bg-muted rounded-xl transition-all duration-200 group"
                            title="Copy to clipboard"
                          >
                            {copied ? (
                              <Check className="w-5 h-5 text-green-500" />
                            ) : (
                              <Copy className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                            )}
                          </button>
                          <a
                            href={result.shortUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-3 hover:bg-muted rounded-xl transition-all duration-200 group"
                            title="Open link"
                          >
                            <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-8 text-sm">
                    <span className="flex items-center gap-2 text-green-500">
                      <Eye className="w-4 h-4" />
                      {result.clicks?.total || 0} clicks
                    </span>
                    <span className="flex items-center gap-2 text-blue-500">
                      <TrendingUp className="w-4 h-4" />
                      Analytics enabled
                    </span>
                    <span className="flex items-center gap-2 text-purple-500">
                      <Target className="w-4 h-4" />
                      Expires in {result.expiresIn}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Live Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="relative group"
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                <div className="relative bg-card/80 backdrop-blur-xl rounded-2xl border p-6 hover:border-blue-500/50 transition-all duration-300 group-hover:scale-105">
                  <div className="flex items-center justify-center mb-4">
                    <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl text-white">
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-30 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Powered by
              </span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Future Technology
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Experience the next generation of URL management with AI-driven
              insights and quantum-speed performance
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="group relative">
                <div
                  className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-20 rounded-3xl blur-xl transition-all duration-500`}
                />
                <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border p-8 hover:border-blue-500/50 transition-all duration-500 group-hover:scale-105">
                  <div
                    className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  >
                    <div className="text-white">{feature.icon}</div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-blue-500 group-hover:to-purple-600 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative z-30 py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-600/30 rounded-3xl blur-3xl" />
            <div className="relative bg-card/80 backdrop-blur-xl rounded-3xl border p-16">
              <h2 className="text-5xl md:text-6xl font-bold mb-8">
                <span className="bg-gradient-to-r from-blue-500 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Ready to Experience
                </span>
                <br />
                <span className="text-foreground">The Future?</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
                Join millions of users who've already discovered the power of
                intelligent URL management
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <button
                  onClick={() => setIsSignUpOpen(true)}
                  className="px-12 py-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    <Rocket className="w-6 h-6" />
                    Start Creating Magic
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
                <button className="px-12 py-6 border-2 border-border text-foreground rounded-2xl font-bold text-lg hover:bg-muted transition-all duration-300 hover:scale-105">
                  Watch Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ShadcnHomepage;
