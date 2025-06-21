"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Mail, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/Logo"
import toast from "react-hot-toast"

export default function VerifyEmailPage() {
  const [isResending, setIsResending] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get("email")
  const token = searchParams.get("token")

  useEffect(() => {
    if (token) {
      // Auto-verify if token is present in URL
      verifyEmail(token)
    } else {
      setIsLoading(false)
    }
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsVerified(true)
        toast.success("Email verified successfully!")
        setTimeout(() => {
          router.push("/auth/signin")
        }, 2000)
      } else {
        toast.error(data.message || "Verification failed")
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const resendVerificationEmail = async () => {
    if (!email) return

    setIsResending(true)
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Verification email sent!")
      } else {
        toast.error(data.message || "Failed to resend email")
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isVerified ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Email Verified!</h2>
              <p className="mt-2 text-sm text-gray-600">
                Your email has been successfully verified. You will be redirected to sign in shortly.
              </p>
              <Button asChild className="mt-4">
                <Link href="/auth/signin">Continue to Sign In</Link>
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <Mail className="mx-auto h-12 w-12 text-blue-600" />
              <h2 className="mt-4 text-2xl font-bold text-gray-900">Check your email</h2>
              <p className="mt-2 text-sm text-gray-600">
                We've sent a verification link to <span className="font-medium text-gray-900">{email}</span>
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Click the link in the email to verify your account and complete your registration.
              </p>

              <div className="mt-6 space-y-4">
                <Button onClick={resendVerificationEmail} disabled={isResending} variant="outline" className="w-full">
                  {isResending ? "Sending..." : "Resend verification email"}
                </Button>

                <div className="text-sm">
                  <Link href="/auth/signin" className="text-blue-600 hover:text-blue-500">
                    Back to sign in
                  </Link>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Didn't receive the email? Check your spam folder or try resending.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
