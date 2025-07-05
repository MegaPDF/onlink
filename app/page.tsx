"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LinkIcon,
  BarChart3,
  QrCode,
  Shield,
  Users,
  Zap,
  Globe,
  ArrowRight,
  Check,
  Star,
  TrendingUp,
  Eye,
  MousePointer,
  Calendar,
  Crown,
  Smartphone,
  Lock,
  Download,
  Copy,
  ExternalLink,
  Rocket,
  Building2,
  Target,
  Briefcase,
  ChevronRight,
  Play,
  RefreshCw,
  Layers,
  BarChart2,
  Activity,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/footer";

const features = [
  {
    icon: Zap,
    title: "Instant URL Shortening",
    description:
      "Create short links in seconds with our lightning-fast infrastructure and global CDN.",
    stats: "< 100ms response time",
  },
  {
    icon: BarChart3,
    title: "Comprehensive Analytics",
    description:
      "Track clicks, locations, devices, and referrers with real-time data visualization.",
    stats: "50+ metrics tracked",
  },
  {
    icon: QrCode,
    title: "Dynamic QR Codes",
    description:
      "Auto-generate QR codes for every link with customizable designs and download options.",
    stats: "Unlimited QR codes",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Password protection, link expiration, and advanced security controls for your links.",
    stats: "Bank-level encryption",
  },
  {
    icon: Globe,
    title: "Custom Domains",
    description:
      "Use your own branded domain to create professional short links that build trust.",
    stats: "Unlimited domains",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Share links across teams with role-based permissions and collaborative workspaces.",
    stats: "Unlimited team members",
  },
];

const stats = [
  {
    label: "Links Created",
    value: "5.2B+",
    growth: "+15% this month",
    icon: LinkIcon,
  },
  {
    label: "Clicks Tracked",
    value: "847M+",
    growth: "+23% this month",
    icon: MousePointer,
  },
  {
    label: "Active Users",
    value: "125K+",
    growth: "+8% this month",
    icon: Users,
  },
  {
    label: "Uptime",
    value: "99.99%",
    growth: "SLA guaranteed",
    icon: Activity,
  },
];

const plans = [
  {
    name: "Free",
    price: "0",
    period: "Forever",
    description: "Perfect for personal use and getting started",
    highlight: false,
    features: [
      "1,000 links per month",
      "Basic click analytics",
      "Standard short domains",
      "Mobile and desktop apps",
      "Browser extensions",
      "Community support",
    ],
    cta: "Get Started Free",
    ctaVariant: "outline" as const,
  },
  {
    name: "Professional",
    price: "8",
    period: "per user/month",
    description: "Advanced features for growing businesses",
    highlight: true,
    features: [
      "Everything in Free",
      "Unlimited links",
      "Advanced analytics & insights",
      "Custom branded domains",
      "QR code generator",
      "Link-in-bio pages",
      "API access",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    ctaVariant: "default" as const,
    badge: "Most Popular",
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "Contact sales",
    description: "Scalable solution for large organizations",
    highlight: false,
    features: [
      "Everything in Professional",
      "Unlimited team members",
      "Advanced security controls",
      "SSO & SAML integration",
      "Custom integrations",
      "Dedicated account manager",
      "99.99% SLA guarantee",
      "White-label options",
    ],
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
  },
];

const testimonials = [
  {
    quote:
      "ShortLink has transformed how we track our marketing campaigns. The analytics are incredibly detailed.",
    author: "Sarah Chen",
    role: "Marketing Director",
    company: "TechCorp",
    avatar: "S",
  },
  {
    quote:
      "The custom domain feature makes our links look professional and trustworthy. Click-through rates improved by 40%.",
    author: "Michael Rodriguez",
    role: "Growth Manager",
    company: "StartupXYZ",
    avatar: "M",
  },
  {
    quote:
      "Enterprise-grade security and reliability. Exactly what we needed for our global campaigns.",
    author: "Emily Watson",
    role: "Digital Marketing Lead",
    company: "Fortune500Co",
    avatar: "E",
  },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [demoUrl, setDemoUrl] = useState("");
  const [isShortening, setIsShortening] = useState(false);
  const [shortenedResult, setShortenedResult] = useState<any>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleDemoShorten = async () => {
    if (!demoUrl.trim()) return;

    setIsShortening(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const shortCode = Math.random().toString(36).substring(2, 8);
      setShortenedResult({
        shortUrl: `sho.rt/${shortCode}`,
        shortCode,
        originalUrl: demoUrl,
        clicks: 0,
        created: new Date().toLocaleDateString(),
      });
      setDemoUrl("");
    } catch (error) {
      console.error("Demo shortening error:", error);
    } finally {
      setIsShortening(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section - Bitly-inspired */}
      <section className="pt-16 pb-20 bg-gradient-to-b from-blue-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Trust Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm mb-8">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-700">
                Trusted by 125,000+ businesses worldwide
              </span>
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              More than a<span className="text-blue-600"> short link</span>
            </h1>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Build stronger connections between your content and your audience
              with short links, QR Codes, and landing pages.
            </p>

            {/* URL Shortener Demo - Bitly Style */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="bg-white rounded-lg border border-gray-200 shadow-lg p-2">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Shorten your link"
                      value={demoUrl}
                      onChange={(e) => setDemoUrl(e.target.value)}
                      className="border-0 text-lg py-6 px-4 focus-visible:ring-0 bg-gray-50 rounded-md"
                      onKeyPress={(e) =>
                        e.key === "Enter" && handleDemoShorten()
                      }
                    />
                  </div>
                  <Button
                    onClick={handleDemoShorten}
                    disabled={!demoUrl.trim() || isShortening}
                    className="px-8 py-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md text-lg"
                  >
                    {isShortening ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      "Shorten"
                    )}
                  </Button>
                </div>
              </div>

              {shortenedResult && (
                <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <LinkIcon className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-lg text-blue-600">
                          {shortenedResult.shortUrl}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {shortenedResult.originalUrl}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(`https://${shortenedResult.shortUrl}`)
                      }
                      className="shrink-0"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4 mr-2 text-green-600" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MousePointer className="w-4 h-4" />
                      {shortenedResult.clicks} clicks
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Created {shortenedResult.created}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              {isAuthenticated ? (
                <Button
                  size="lg"
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg"
                  asChild
                >
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg"
                    asChild
                  >
                    <Link href="/auth/signup">Get started for free</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="px-8 py-4 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold text-lg"
                    asChild
                  >
                    <Link href="/demo" className="flex items-center gap-2">
                      <Play className="w-5 h-5" />
                      Watch demo
                    </Link>
                  </Button>
                </>
              )}
            </div>

            <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section - Clean */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Powering connections for leading brands
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of companies using ShortLink to grow their business
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-green-600 font-medium">
                  {stat.growth}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Grid Layout */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Everything you need to connect
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful tools to create, manage, and track your links across all
              channels
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 group"
              >
                <CardHeader className="pb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4 group-hover:bg-blue-600 transition-colors">
                    <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <CardTitle className="text-xl font-semibold">
                    {feature.title}
                  </CardTitle>
                  <div className="text-sm text-blue-600 font-medium">
                    {feature.stats}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof / Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Loved by marketing teams everywhere
            </h2>
            <p className="text-xl text-gray-600">
              See what our customers have to say about ShortLink
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-0 shadow-sm bg-white">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className="flex text-yellow-400 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                      ))}
                    </div>
                    <p className="text-gray-700 italic leading-relaxed">
                      "{testimonial.quote}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {testimonial.author}
                      </div>
                      <div className="text-sm text-gray-600">
                        {testimonial.role} at {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section - Clean Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that works for your team size and needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={cn(
                  "relative border-2 transition-all duration-300",
                  plan.highlight
                    ? "border-blue-600 shadow-xl scale-105"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-lg"
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {plan.price !== "Custom" ? "$" : ""}
                      {plan.price}
                    </span>
                    <span className="text-gray-600 ml-1">
                      {plan.price !== "Custom"
                        ? `/${plan.period}`
                        : plan.period}
                    </span>
                  </div>
                  <CardDescription className="mt-2 text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={cn(
                      "w-full py-3 font-semibold",
                      plan.ctaVariant === "default"
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "border-gray-300 text-gray-700 hover:bg-gray-50"
                    )}
                    variant={plan.ctaVariant}
                    asChild
                  >
                    <Link
                      href={
                        plan.name === "Enterprise" ? "/contact" : "/auth/signup"
                      }
                    >
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              All plans include SSL certificates, 24/7 support, and 99.9% uptime
              SLA
            </p>
            <Link
              href="/pricing"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Compare all features →
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h2 className="text-4xl font-bold mb-6">Ready to get started?</h2>
            <p className="text-xl opacity-90 mb-8">
              Join 125,000+ businesses already using ShortLink to create
              meaningful connections with their audience.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 font-semibold text-lg"
                asChild
              >
                <Link href="/auth/signup">Start for free</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 border-white text-white hover:bg-white/10 font-semibold text-lg"
                asChild
              >
                <Link href="/contact">Talk to sales</Link>
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 mt-12 text-white/80">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                <span>Enterprise security</span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                <span>99.9% uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                <span>Global CDN</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
