import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Error Card */}
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#000] p-8 text-center">
          <div className="mb-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-black mb-2">
              Authentication Error
            </h1>
            <p className="text-gray-600 font-medium">
              There was a problem signing you in with Google.
            </p>
          </div>

          <div className="mb-8 p-4 bg-red-50 border-2 border-red-200">
            <h2 className="font-bold text-red-800 mb-2">Possible causes:</h2>
            <ul className="text-sm text-red-700 text-left space-y-1">
              <li>• Google OAuth is not properly configured</li>
              <li>• Redirect URL mismatch</li>
              <li>• Cancelled sign-in process</li>
              <li>• Network connection issue</li>
            </ul>
          </div>

          <div className="space-y-4">
            <Link
              href="/"
              className="w-full bg-black text-white font-bold py-3 px-6 border-4 border-black hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Home
            </Link>
            
            <Link
              href="/"
              className="w-full bg-blue-400 text-black font-bold py-3 px-6 border-4 border-black hover:bg-blue-300 transition-colors block"
            >
              Try Again
            </Link>
          </div>

          <div className="mt-6 p-4 bg-gray-50 border-2 border-gray-200">
            <p className="text-xs text-gray-500">
              If this problem persists, please check your Google OAuth configuration
              in the Supabase dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
