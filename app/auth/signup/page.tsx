"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LinkIcon,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Crown,
  Zap,
  Users,
  BarChart3,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleIcon } from "@/components/icons/GoogleIcon";

interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  plan: "free" | "premium" | "enterprise";
  acceptTerms: boolean;
}

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Perfect for personal use",
    features: [
      "5 links per month",
      "Basic analytics",
      "Standard domains",
      "Community support",
    ],
    icon: LinkIcon,
    popular: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$9",
    description: "Great for professionals",
    features: [
      "Unlimited links",
      "Advanced analytics",
      "Custom domains",
      "QR code generation",
      "Priority support",
    ],
    icon: Crown,
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    description: "For large organizations",
    features: [
      "Everything in Premium",
      "Team collaboration",
      "Advanced security",
      "API access",
      "Dedicated support",
    ],
    icon: Users,
    popular: false,
  },
];

const passwordRequirements = [
  { text: "At least 8 characters", regex: /.{8,}/ },
  { text: "Contains uppercase letter", regex: /[A-Z]/ },
  { text: "Contains lowercase letter", regex: /[a-z]/ },
  { text: "Contains number", regex: /\d/ },
  { text: "Contains special character", regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

export default function SignUpPage() {
  const router = useRouter();
  const {
    signup,
    loginWithGoogle,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();

  const [formData, setFormData] = useState<SignUpFormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    plan: "free",
    acceptTerms: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<SignUpFormData>>({});
  const [submitError, setSubmitError] = useState("");
  const [activeTab, setActiveTab] = useState("account");

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  const validateForm = (): boolean => {
    const newErrors: Partial<SignUpFormData> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Terms acceptance
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms and conditions";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setSubmitError("");

    try {
      const result = await signup(formData);

      if (!result.success) {
        setSubmitError(
          result.error || "Account creation failed. Please try again."
        );
      } else {
        // Success - user will be redirected by the auth hook
        router.push(
          "/auth/signin?message=Account created successfully! Please check your email to verify your account."
        );
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setSubmitError("");

    try {
      const result = await loginWithGoogle();
      if (!result.success) {
        setSubmitError("Google sign up failed. Please try again.");
      }
    } catch (error) {
      setSubmitError("An unexpected error occurred with Google sign up.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (
    field: keyof SignUpFormData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }

    // Clear submit error
    if (submitError) {
      setSubmitError("");
    }
  };

  const getPasswordStrength = (password: string) => {
    const score = passwordRequirements.reduce((acc, req) => {
      return acc + (req.regex.test(password) ? 1 : 0);
    }, 0);

    if (score < 2) return { strength: "weak", color: "bg-red-500" };
    if (score < 4) return { strength: "medium", color: "bg-yellow-500" };
    return { strength: "strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LinkIcon className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">ShortLink</span>
          </div>

          <h1 className="text-2xl font-bold mb-2">Create your account</h1>
          <p className="text-muted-foreground">
            Start shortening URLs and tracking analytics today
          </p>
        </div>

        {/* Sign Up Form */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign up for ShortLink</CardTitle>
            <CardDescription>
              Choose your plan and create your account to get started
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="account">Account Details</TabsTrigger>
                <TabsTrigger value="plan">Choose Plan</TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="space-y-4">
                {/* Error Alert */}
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Google Sign Up */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                >
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Continue with Google
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                {/* Account Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        className={cn(
                          "pl-10",
                          errors.name &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        disabled={isLoading}
                        autoComplete="name"
                        autoFocus
                      />
                    </div>
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={cn(
                          "pl-10",
                          errors.email &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        disabled={isLoading}
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={cn(
                          "pl-10 pr-10",
                          errors.password &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                passwordStrength.color
                              )}
                              style={{
                                width: `${
                                  (passwordRequirements.filter((req) =>
                                    req.regex.test(formData.password)
                                  ).length /
                                    passwordRequirements.length) *
                                  100
                                }%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground capitalize">
                            {passwordStrength.strength}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-1">
                          {passwordRequirements.map((req, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-xs"
                            >
                              <CheckCircle
                                className={cn(
                                  "h-3 w-3",
                                  req.regex.test(formData.password)
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                                )}
                              />
                              <span
                                className={cn(
                                  req.regex.test(formData.password)
                                    ? "text-green-600"
                                    : "text-muted-foreground"
                                )}
                              >
                                {req.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {errors.password && (
                      <p className="text-sm text-destructive">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        onChange={(e) =>
                          handleInputChange("confirmPassword", e.target.value)
                        }
                        className={cn(
                          "pl-10 pr-10",
                          errors.confirmPassword &&
                            "border-destructive focus-visible:ring-destructive"
                        )}
                        disabled={isLoading}
                        autoComplete="new-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 h-8 w-8"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        disabled={isLoading}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="acceptTerms"
                      checked={formData.acceptTerms}
                      onCheckedChange={(checked) =>
                        handleInputChange("acceptTerms", checked as boolean)
                      }
                      disabled={isLoading}
                    />
                    <Label
                      htmlFor="acceptTerms"
                      className="text-sm font-normal cursor-pointer"
                    >
                      I agree to the{" "}
                      <Link
                        href="/terms"
                        className="text-primary hover:underline"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        className="text-primary hover:underline"
                      >
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>
                  {errors.acceptTerms && (
                    <p className="text-sm text-destructive">
                      {errors.acceptTerms}
                    </p>
                  )}

                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setActiveTab("plan")}
                    disabled={
                      !formData.name ||
                      !formData.email ||
                      !formData.password ||
                      !formData.confirmPassword ||
                      !formData.acceptTerms
                    }
                  >
                    Continue to Plan Selection
                    <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="plan" className="space-y-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">
                      Choose your plan
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Start with any plan and upgrade anytime
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                      <Card
                        key={plan.id}
                        className={cn(
                          "relative cursor-pointer transition-all",
                          formData.plan === plan.id
                            ? "border-primary ring-2 ring-primary/20"
                            : "hover:border-muted-foreground/50",
                          plan.popular && "border-primary"
                        )}
                        onClick={() => handleInputChange("plan", plan.id)}
                      >
                        {plan.popular && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <Badge className="bg-primary text-primary-foreground">
                              Most Popular
                            </Badge>
                          </div>
                        )}

                        <CardHeader className="text-center pb-4">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-3 mx-auto">
                            <plan.icon className="w-6 h-6 text-primary" />
                          </div>
                          <CardTitle className="text-xl">{plan.name}</CardTitle>
                          <div className="text-3xl font-bold">
                            {plan.price}
                            {plan.price !== "Custom" && (
                              <span className="text-lg font-normal text-muted-foreground">
                                /month
                              </span>
                            )}
                          </div>
                          <CardDescription>{plan.description}</CardDescription>
                        </CardHeader>

                        <CardContent className="pt-0">
                          <ul className="space-y-2">
                            {plan.features.map((feature, featureIndex) => (
                              <li
                                key={featureIndex}
                                className="flex items-center gap-2 text-sm"
                              >
                                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4 flex items-center justify-center">
                            <div
                              className={cn(
                                "w-4 h-4 rounded-full border-2 transition-colors",
                                formData.plan === plan.id
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground"
                              )}
                            >
                              {formData.plan === plan.id && (
                                <div className="w-full h-full rounded-full bg-white scale-50" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setActiveTab("account")}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Account
                    </Button>

                    <Button
                      type="submit"
                      className="flex-1"
                      onClick={handleSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        <>
                          Create Account
                          <CheckCircle className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  {formData.plan === "premium" && (
                    <Alert className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
                      <Zap className="h-4 w-4" />
                      <AlertDescription>
                        <strong>14-day free trial included!</strong> No credit
                        card required. You can cancel anytime during the trial
                        period.
                      </AlertDescription>
                    </Alert>
                  )}

                  {formData.plan === "enterprise" && (
                    <Alert className="border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
                      <Users className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Enterprise plan selected!</strong> Our sales
                        team will contact you within 24 hours to discuss your
                        specific needs and pricing.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Sign In Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/signin"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Security Notice */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Shield className="h-3 w-3" />
            <span>Your data is protected with enterprise-grade security</span>
          </div>
          <p className="text-xs text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
