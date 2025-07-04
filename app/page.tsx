"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { UrlShortener } from "@/components/dashboard/url-shortener";
import { cn } from "@/lib/utils";
import { Footer } from "@/components/layout/footer";

const features = [
  {
    icon: LinkIcon,
    title: "Smart URL Shortening",
    description:
      "Create short, memorable links with custom aliases and branded domains.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Track clicks, geographic data, devices, and referrers with detailed insights.",
  },
  {
    icon: QrCode,
    title: "QR Code Generator",
    description:
      "Generate QR codes for your links with customizable designs and colors.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Work together with team members and manage permissions efficiently.",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description:
      "Password protection, expiration dates, and access controls for your links.",
  },
  {
    icon: Globe,
    title: "Custom Domains",
    description:
      "Use your own domain for branded short links and enhanced trust.",
  },
];

const stats = [
  { label: "Links Created", value: "2.5M+", icon: LinkIcon },
  { label: "Clicks Tracked", value: "125M+", icon: MousePointer },
  { label: "Active Users", value: "50K+", icon: Users },
  { label: "Countries", value: "195", icon: Globe },
];

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Perfect for personal use",
    features: [
      "5 links per month",
      "Basic analytics",
      "Standard domains",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Premium",
    price: "$9",
    description: "Great for professionals",
    features: [
      "Unlimited links",
      "Advanced analytics",
      "Custom domains",
      "QR code generation",
      "Priority support",
      "Team collaboration",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Premium",
      "Advanced security",
      "API access",
      "SSO integration",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function HomePage() {
  const { user, isAuthenticated } = useAuth();
  const [demoUrl, setDemoUrl] = useState("");
  const [isShortening, setIsShortening] = useState(false);
  const [shortenedResult, setShortenedResult] = useState<any>(null);

  const handleDemoShorten = async () => {
    if (!demoUrl.trim()) return;

    setIsShortening(true);
    try {
      // Simulate API call for demo
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const shortCode = Math.random().toString(36).substring(2, 8);
      setShortenedResult({
        shortUrl: `${window.location.origin}/${shortCode}`,
        shortCode,
        originalUrl: demoUrl,
      });
    } catch (error) {
      console.error("Demo shortening error:", error);
    } finally {
      setIsShortening(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800" />
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] dark:bg-grid-slate-700/25 dark:[mask-image:linear-gradient(0deg,rgba(255,255,255,0.1),rgba(255,255,255,0.5))]" />

        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="outline" className="mb-4">
              <Star className="w-3 h-3 mr-1" />
              Trusted by 50,000+ users worldwide
            </Badge>

            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6">
              Shorten URLs with
              <span className="text-primary bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {" "}
                Advanced Analytics
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create short, memorable links and track their performance with
              detailed analytics. Perfect for marketers, businesses, and content
              creators.
            </p>

            {/* Demo URL Shortener */}
            <div className="max-w-2xl mx-auto mb-8">
              <Card className="p-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter a long URL to shorten..."
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    className="flex-1 border-0 focus-visible:ring-0"
                    onKeyPress={(e) => e.key === "Enter" && handleDemoShorten()}
                  />
                  <Button
                    onClick={handleDemoShorten}
                    disabled={!demoUrl.trim() || isShortening}
                    className="px-6"
                  >
                    {isShortening ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Shortening...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Shorten
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {shortenedResult && (
                <Card className="mt-4 p-4 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600" />
                      <code className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                        {shortenedResult.shortUrl}
                      </code>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(shortenedResult.shortUrl)}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Sign up to track analytics and manage your links!
                  </p>
                </Card>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {isAuthenticated ? (
                <Button size="lg" asChild>
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild>
                    <Link href="/auth/signup">
                      Get Started Free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="/auth/signin">Sign In</Link>
                  </Button>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • Free forever plan available
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Everything you need to manage links
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed for modern link management and
              analytics
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="border-0 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader>
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that's right for you. Upgrade or downgrade at any
              time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={cn(
                  "relative",
                  plan.popular && "border-primary shadow-lg scale-105"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold">
                    {plan.price}
                    {plan.price !== "Custom" && (
                      <span className="text-lg font-normal text-muted-foreground">
                        /month
                      </span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-center gap-2"
                      >
                        <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-0 text-white">
            <CardContent className="text-center py-16">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                Ready to shorten your first link?
              </h2>
              <p className="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
                Join thousands of users who trust ShortLink for their URL
                management needs.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" variant="secondary" asChild>
                  <Link href="/auth/signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/demo">View Demo</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
}
