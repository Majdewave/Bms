
import { useState } from "react";
import { post } from "../api/apiClient";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";


export default function Register() {
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Optionally, for field-level errors in the future:
  // const [fieldError, setFieldError] = useState<{ field: string; message: string } | null>(null);
  const navigate = useNavigate();

  const { login } = useAuth();

  type RegisterResponse = {
  token: string;
  user: any;
   };



  // Robust error message extraction for backend and future errors
  const getErrorMessage = (apiError: any): string => {
    if (!apiError) return "Registration failed. Please try again.";
    // Prefer code-based handling, fallback to message, then generic
    if (apiError.code) {
      switch (apiError.code) {
        case "USER_ALREADY_EXISTS":
          return "This email is already registered.";
        case "DATABASE_ERROR":
          return "Something went wrong. Please try again later.";
        case "UNKNOWN_ERROR":
          return "Something went wrong. Please try again.";
        // Add more known codes here as needed
        default:
          // If code is unknown, but message exists, show it
          return apiError.message || `Unexpected error (${apiError.code}) occurred.`;
      }
    }
    // If error is a string
    if (typeof apiError === "string") return apiError;
    // If error has a message
    if (apiError.message) return apiError.message;
    // If error has an error property
    if (apiError.error) return apiError.error;
    // Fallback
    return "Registration failed. Please try again.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // setFieldError(null); // For future field-level error support
    try {
      localStorage.removeItem("token");
      const res = await post<RegisterResponse>("/api/auth/register", {
        businessName,
        email,
        password,
      });

      if (res.token) {
        await login(email, password);
        navigate("/admin/dashboard", { replace: true });
      } else {
        setError("Something went wrong. Please try again.");
      }
    } catch (err: any) {
      // Try to extract error from known structure (apiClient throws ApiError)
      const apiError = err?.response || err;
      setError(getErrorMessage(apiError));
      // For future field-level error support:
      // if (apiError?.field) {
      //   setFieldError({ field: apiError.field, message: apiError.message });
      // }
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center" dir="ltr">
      <div className="flex flex-1 flex-col md:flex-row max-w-5xl mx-auto rounded-2xl overflow-hidden bg-white shadow-xl">
        {/* LEFT: Marketing/Branding */}
        <div className="hidden md:flex flex-col justify-between p-10 w-1/2 bg-[linear-gradient(135deg,_#eff6ff,_#dbeafe)] relative text-left">
          <div>
            <img src="/clienta-logo.png" alt="Clienta" className="h-10 mb-2" />
            <div className="text-xs text-gray-500 mb-8">A product of digitalpenpro.com</div>
            <div className="text-2xl font-bold text-gray-900 mb-2">Manage your business smarter</div>
            <div className="text-gray-700 mb-6">Appointments, clients, scheduling, and billing — all in one place</div>
            <ul className="mb-6 space-y-2">
              <li className="flex items-center gap-2 text-gray-700"><span className="text-green-500 text-lg">✔</span> 7-day free trial</li>
              <li className="flex items-center gap-2 text-gray-700"><span className="text-green-500 text-lg">✔</span> No credit card required</li>
              <li className="flex items-center gap-2 text-gray-700"><span className="text-green-500 text-lg">✔</span> Setup in 1 minute</li>
            </ul>
            <div className="text-sm text-blue-900 font-medium mb-8">Trusted by professionals to manage their business efficiently</div>
            <div className="bg-white/90 rounded-xl p-4 border border-gray-200 mb-4">
              <div className="font-semibold text-gray-800 mb-1">Trial includes:</div>
              <ul className="text-gray-700 text-sm space-y-1">
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Up to 10 users</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Up to 100 messages</li>
                <li className="flex items-center gap-2"><span className="text-green-500">✔</span> Full system access</li>
              </ul>
              <div className="text-xs text-gray-500 mt-2">Upgrade anytime to unlock full features</div>
              <div className="text-xs text-blue-700 mt-1 font-semibold">Plans starting from $19/month</div>
            </div>
          </div>
          {/* Optional illustration or gradient */}
          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-blue-100 to-transparent pointer-events-none" />
        </div>

        {/* RIGHT: Registration Form */}
        <div className="flex-1 flex flex-col justify-center p-8 sm:p-12 bg-white text-left">
          <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-7 text-left">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start your 7-day free trial</h2>
            <div className="space-y-6">
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm text-left"
                placeholder="Business Name"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                required
                autoFocus
              />
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm text-left"
                placeholder="Email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 text-gray-900 bg-gray-50 shadow-sm text-left"
                placeholder="Password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded p-3 text-sm text-center mt-2">
                ⚠️ {error}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-[#2563eb] hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 text-white font-semibold py-3 rounded-lg shadow transition text-lg mt-2"
              style={{transition: 'box-shadow 0.2s, transform 0.2s'}}
              disabled={loading}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px 0 #2563eb22'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
            >
              {loading ? "Creating your account..." : "Start Free Trial"}
            </button>
            <div className="text-xs text-gray-500 text-center mt-3">No credit card required</div>
          </form>
          <div className="mt-10 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <a href="/login" className="text-[#2563eb] font-semibold hover:underline">Login</a>
          </div>
        </div>
      </div>
    </div>
  );
}
