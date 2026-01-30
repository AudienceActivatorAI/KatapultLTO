"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { launchFinancing } from "@/services/lendproService";

interface PreApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  estimatedAmount?: number;
}

export default function PreApprovalModal({
  isOpen,
  onClose,
  estimatedAmount = 5000,
}: PreApprovalModalProps) {
  const [step, setStep] = useState<"form" | "application">("form");
  const [customerInfo, setCustomerInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [launchURL, setLaunchURL] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format phone number as user types (auto-add dashes)
  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    const limited = digits.slice(0, 10);

    if (limited.length <= 3) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 3)}-${limited.slice(3)}`;
    } else {
      return `${limited.slice(0, 3)}-${limited.slice(3, 6)}-${limited.slice(6)}`;
    }
  };

  // Handle phone input change with auto-formatting
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setCustomerInfo({ ...customerInfo, phone: formatted });

    const digits = formatted.replace(/\D/g, "");
    if (digits.length === 0) {
      setValidationErrors({ ...validationErrors, phone: "" });
    } else if (digits.length < 10) {
      setValidationErrors({
        ...validationErrors,
        phone: "Phone number must be 10 digits",
      });
    } else {
      setValidationErrors({ ...validationErrors, phone: "" });
    }
  };

  // Validate form before submission
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!customerInfo.firstName.trim())
      errors.firstName = "First name is required";
    if (!customerInfo.lastName.trim())
      errors.lastName = "Last name is required";
    if (!customerInfo.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email))
      errors.email = "Invalid email format";

    const phoneDigits = customerInfo.phone.replace(/\D/g, "");
    if (!customerInfo.phone.trim()) errors.phone = "Phone number is required";
    else if (phoneDigits.length !== 10)
      errors.phone = "Phone number must be 10 digits";

    if (!customerInfo.address.trim()) errors.address = "Address is required";
    if (!customerInfo.city.trim()) errors.city = "City is required";
    if (!customerInfo.state.trim()) errors.state = "State is required";
    else if (customerInfo.state.length !== 2)
      errors.state = "State must be 2 characters (e.g., PA)";

    if (!customerInfo.zip.trim()) errors.zip = "Zip code is required";
    else if (!/^\d{5}$/.test(customerInfo.zip))
      errors.zip = "Zip code must be 5 digits";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields correctly");
      return;
    }

    setIsSubmitting(true);
    try {
      console.log("[PreApproval] Submitting pre-approval request...", customerInfo);

      // Format phone number to required format (555-123-4567)
      const formatPhoneForAPI = (phone: string) => {
        const digits = phone.replace(/\D/g, "");
        if (digits.length === 10) {
          return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return phone;
      };

      const formattedPhone = formatPhoneForAPI(customerInfo.phone);

      // Generate order ID for pre-approval
      const orderId = `PREAPP-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)
        .toUpperCase()}`;

      // Prepare financing payload for pre-approval
      const financingPayload = {
        orderId,
        totalAmount: estimatedAmount,
        subtotal: estimatedAmount,
        tax: 0,
        fees: 0,
        shipping: 0,
        customer: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          email: customerInfo.email,
          mobilePhone: formattedPhone,
          streetAddress: customerInfo.address,
          city: customerInfo.city,
          state: customerInfo.state,
          zipCode: customerInfo.zip,
        },
        items: [
          {
            name: "Pre-Approval Application",
            price: estimatedAmount,
            quantity: 1,
          },
        ],
      };

      console.log("[PreApproval] Financing payload:", financingPayload);

      // Launch Katapult financing (powered by LendPro API)
      const result = await launchFinancing(financingPayload);

      console.log("[PreApproval] Pre-approval response:", result);

      if (result.launchURL) {
        setLaunchURL(result.launchURL);
        setStep("application");
        toast.success("Opening Katapult financing application...");
      } else {
        toast.error("Failed to start pre-approval process");
      }
    } catch (error: any) {
      console.error("[PreApproval] Error:", error);

      const errorMessage =
        error.message || "Failed to start pre-approval";
      console.error("[PreApproval] Detailed error:", {
        message: error.message,
        response: error.response,
        data: error.data,
      });

      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("form");
    setCustomerInfo({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
    });
    setValidationErrors({});
    setLaunchURL("");
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("form");
      setLaunchURL("");
      setCustomerInfo({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zip: "",
      });
      setValidationErrors({});
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-katapult-dark-blue border-white/10">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            {step === "form" && "Get Pre-Approved for Katapult Financing"}
            {step === "application" && "Complete Your Application"}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {step === "form" &&
              `Check your financing options for purchases up to $${estimatedAmount.toLocaleString()}`}
            {step === "application" &&
              "Complete the application below to see your financing options"}
          </DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-white">
                  First Name <span className="text-katapult-pink">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  className={`bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500 ${
                    validationErrors.firstName ? "border-katapult-pink" : ""
                  }`}
                  value={customerInfo.firstName}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      firstName: e.target.value,
                    })
                  }
                />
                {validationErrors.firstName && (
                  <p className="text-xs text-katapult-pink mt-1">
                    {validationErrors.firstName}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-white">
                  Last Name <span className="text-katapult-pink">*</span>
                </Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  className={`bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500 ${
                    validationErrors.lastName ? "border-katapult-pink" : ""
                  }`}
                  value={customerInfo.lastName}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      lastName: e.target.value,
                    })
                  }
                />
                {validationErrors.lastName && (
                  <p className="text-xs text-katapult-pink mt-1">
                    {validationErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email Address <span className="text-katapult-pink">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  className={`bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500 ${
                    validationErrors.email ? "border-katapult-pink" : ""
                  }`}
                  value={customerInfo.email}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, email: e.target.value })
                  }
                />
                {validationErrors.email && (
                  <p className="text-xs text-katapult-pink mt-1">
                    {validationErrors.email}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">
                  Number <span className="text-katapult-pink">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="555-123-4567"
                  className={`bg-white/10 border-white/20 text-white focus:border-blue-500 ${
                    validationErrors.phone ? "border-katapult-pink" : ""
                  }`}
                  value={customerInfo.phone}
                  onChange={handlePhoneChange}
                />
                {validationErrors.phone && (
                  <p className="text-xs text-katapult-pink mt-1">
                    {validationErrors.phone}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-white">
                Street Address
              </Label>
              <Input
                id="address"
                placeholder="123 Automotive Way"
                className={`bg-white/10 border-white/20 text-white focus:border-blue-500 ${
                  validationErrors.address ? "border-katapult-pink" : ""
                }`}
                value={customerInfo.address}
                onChange={(e) =>
                  setCustomerInfo({ ...customerInfo, address: e.target.value })
                }
              />
              {validationErrors.address && (
                <p className="text-xs text-katapult-pink mt-1">
                  {validationErrors.address}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-white">
                  City <span className="text-katapult-pink">*</span>
                </Label>
                <Input
                  id="city"
                  placeholder="Detroit"
                  className={`bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500 ${
                    validationErrors.city ? "border-katapult-pink" : ""
                  }`}
                  value={customerInfo.city}
                  onChange={(e) =>
                    setCustomerInfo({ ...customerInfo, city: e.target.value })
                  }
                />
                {validationErrors.city && (
                  <p className="text-xs text-katapult-pink mt-1">
                    {validationErrors.city}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-white">
                  State <span className="text-katapult-pink">*</span>
                </Label>
                <Input
                  id="state"
                  placeholder="PA"
                  maxLength={2}
                  className={`bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500 ${
                    validationErrors.state ? "border-katapult-pink" : ""
                  }`}
                  value={customerInfo.state}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      state: e.target.value.toUpperCase(),
                    })
                  }
                />
                {validationErrors.state && (
                  <p className="text-xs text-katapult-pink mt-1">
                    {validationErrors.state}
                  </p>
                )}
              </div>
              <div className="space-y-2 col-span-2 md:col-span-1">
                <Label htmlFor="zip" className="text-white">
                  Zip Code <span className="text-katapult-pink">*</span>
                </Label>
                <Input
                  id="zip"
                  placeholder="48201"
                  maxLength={5}
                  className={`bg-white/10 border-white/20 text-white focus:border-blue-500 focus:ring-blue-500 ${
                    validationErrors.zip ? "border-katapult-pink" : ""
                  }`}
                  value={customerInfo.zip}
                  onChange={(e) =>
                    setCustomerInfo({
                      ...customerInfo,
                      zip: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
                {validationErrors.zip && (
                  <p className="text-xs text-katapult-pink mt-1">
                    {validationErrors.zip}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1 border-gray-600 bg-gray-800/50 text-white hover:bg-gray-700/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 font-bold bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Check Financing Options"
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "application" && launchURL && (
          <div className="space-y-4 mt-4">
            <div className="relative w-full" style={{ height: "600px" }}>
              <iframe
                src={launchURL}
                className="w-full h-full border-0 rounded-lg bg-white"
                title="Katapult Financing Application"
                allow="payment"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleClose}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
