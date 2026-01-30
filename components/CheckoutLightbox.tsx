"use client";

import { useState, useRef, useEffect } from "react";
import { X, CreditCard, ChevronRight, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { launchFinancing } from "@/services/lendproService";
import type { CheckoutData } from "@/types";

interface CheckoutLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  cartData: CheckoutData | null;
}

export default function CheckoutLightbox({
  isOpen,
  onClose,
  cartData,
}: CheckoutLightboxProps) {
  const [step, setStep] = useState<"summary" | "shipping" | "payment" | "financing">(
    "summary"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [launchURL, setLaunchURL] = useState<string | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
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
  const contentAreaRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep("summary");
      setLaunchURL(null);
      setShippingInfo({
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

  useEffect(() => {
    if (contentAreaRef.current) {
      contentAreaRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step]);

  if (!isOpen || !cartData) return null;

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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    setShippingInfo({ ...shippingInfo, phone: formatted });

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

  const validateShippingForm = () => {
    const errors: Record<string, string> = {};

    if (!shippingInfo.firstName.trim())
      errors.firstName = "First name is required";
    if (!shippingInfo.lastName.trim())
      errors.lastName = "Last name is required";
    if (!shippingInfo.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shippingInfo.email))
      errors.email = "Invalid email format";

    const phoneDigits = shippingInfo.phone.replace(/\D/g, "");
    if (!shippingInfo.phone.trim()) errors.phone = "Phone number is required";
    else if (phoneDigits.length !== 10)
      errors.phone = "Phone number must be 10 digits";

    if (!shippingInfo.address.trim()) errors.address = "Address is required";
    if (!shippingInfo.city.trim()) errors.city = "City is required";
    if (!shippingInfo.state.trim()) errors.state = "State is required";
    else if (shippingInfo.state.length !== 2)
      errors.state = "State must be 2 characters (e.g., PA)";

    if (!shippingInfo.zip.trim()) errors.zip = "Zip code is required";
    else if (!/^\d{5}$/.test(shippingInfo.zip))
      errors.zip = "Zip code must be 5 digits";

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (step === "summary") {
      setStep("shipping");
    } else if (step === "shipping") {
      if (validateShippingForm()) {
        setStep("payment");
      } else {
        toast.error("Please fill in all required fields correctly");
      }
    }
  };

  const handleBack = () => {
    if (step === "shipping") setStep("summary");
    else if (step === "payment") setStep("shipping");
    else if (step === "financing") {
      setStep("payment");
      setLaunchURL(null); // Reset launch URL when going back
    }
  };

  const startFinancing = async () => {
    console.log('[Checkout] Starting financing flow...');
    console.log('[Checkout] Shipping info:', shippingInfo);
    console.log('[Checkout] Cart data:', cartData);
    
    setIsSubmitting(true);
    try {
      // Format phone number to required format (555-123-4567)
      const formatPhoneForAPI = (phone: string) => {
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) {
          return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
        }
        return phone;
      };
      
      const formattedPhone = formatPhoneForAPI(shippingInfo.phone);
      console.log('[Checkout] Formatted phone:', formattedPhone);
      
      // Generate order ID
      const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Prepare financing payload
      const financingPayload = {
        orderId,
        totalAmount: cartData.total,
        subtotal: cartData.products.reduce((sum: number, p: any) => sum + (p.price * p.quantity), 0),
        tax: 0,
        fees: 0,
        shipping: 0,
        customer: {
          firstName: shippingInfo.firstName,
          lastName: shippingInfo.lastName,
          email: shippingInfo.email,
          mobilePhone: formattedPhone,
          streetAddress: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zip,
        },
        items: cartData.products.map((p: any) => ({
          name: p.name,
          price: p.price,
          quantity: p.quantity,
        })),
      };
      
      console.log('[Checkout] Financing payload:', financingPayload);
      
      // Launch Katapult financing (powered by LendPro API)
      console.log('[Checkout] Launching Katapult financing...');
      const result = await launchFinancing(financingPayload);
      
      console.log('[Checkout] Financing launched successfully:', result);
      console.log('[Checkout] Launch URL:', result.launchURL);
      
      // Store launch URL and move to financing step
      setLaunchURL(result.launchURL);
      setStep("financing");
      toast.success("Connected to Katapult financing");
    } catch (error: any) {
      console.error('[Checkout] Error starting financing:', error);
      console.error('[Checkout] Error details:', {
        message: error.message,
        response: error.response,
        data: error.data,
      });
      toast.error(`Failed to start financing: ${error.message || "Please try again."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    try {
      // In a real implementation, this would process the payment
      toast.success("Processing payment...");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success("Order placed successfully!");
      onClose();
    } catch (error) {
      console.error("Order submission failed:", error);
      toast.error("Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-all duration-300"
        onClick={onClose}
      />

      {/* Main Modal Container */}
      <div className="relative w-full max-w-5xl h-[90vh] max-h-[800px] bg-katapult-dark-blue border border-white/10 shadow-2xl rounded-lg overflow-hidden flex flex-col md:flex-row animate-in fade-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-katapult-pink/20 hover:text-katapult-pink transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Panel: Order Summary */}
        <div
          className={`w-full md:w-1/3 bg-white/5 border-r border-white/10 flex flex-col ${
            step === "financing" ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="p-6 border-b border-white/10">
            <h2 className="font-bold text-2xl tracking-wide text-white flex items-center gap-2">
              ORDER SUMMARY
            </h2>
            <p className="text-sm text-white/70 mt-1">
              {cartData.vehicle
                ? `${cartData.vehicle.year} ${cartData.vehicle.make} ${cartData.vehicle.model}`
                : "Vehicle Selection"}
            </p>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {cartData.products.map((product, index) => (
                <div key={`${product.id}-${index}`} className="flex gap-4 group">
                  <div className="w-20 h-20 bg-white/10 rounded-md border border-white/10 flex items-center justify-center overflow-hidden relative">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-xs text-white/50 text-center p-1">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg leading-tight text-white">
                      {product.name}
                    </h3>
                    <p className="text-xs text-white/70 mt-1 font-mono">
                      {product.sku}
                    </p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-medium text-white/80">
                        Qty: {product.quantity}
                      </span>
                      <span className="font-bold text-katapult-pink">
                        ${product.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="p-6 bg-white/5 border-t border-white/10 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Subtotal</span>
              <span className="font-mono text-white">${cartData.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Shipping</span>
              <span className="font-mono text-katapult-pink">
                Calculated at next step
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/70">Tax</span>
              <span className="font-mono text-white">$0.00</span>
            </div>
            <Separator className="my-2 bg-white/10" />
            <div className="flex justify-between items-end">
              <span className="font-bold text-lg text-white">TOTAL</span>
              <span className="font-bold text-3xl text-katapult-pink">
                ${cartData.total.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Panel: Checkout Steps */}
        <div className="flex-1 flex flex-col bg-katapult-dark-blue relative overflow-hidden">
          {/* Header Progress */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== "summary" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="mr-2 text-white hover:bg-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <h2 className="font-bold text-2xl tracking-wide text-white">
                {step === "summary" && "REVIEW CART"}
                {step === "shipping" && "SHIPPING DETAILS"}
                {step === "payment" && "PAYMENT METHOD"}
                {step === "financing" && "KATAPULT FINANCING"}
              </h2>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center gap-1">
              <div
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  ["summary", "shipping", "payment", "financing"].includes(step)
                    ? "bg-katapult-pink"
                    : "bg-white/20"
                }`}
              />
              <div
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  ["shipping", "payment", "financing"].includes(step)
                    ? "bg-katapult-pink"
                    : "bg-white/20"
                }`}
              />
              <div
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  ["payment", "financing"].includes(step)
                    ? "bg-katapult-pink"
                    : "bg-white/20"
                }`}
              />
            </div>
          </div>

          {/* Content Area */}
          <div ref={contentAreaRef} className="flex-1 p-6 overflow-y-auto">
            {step === "summary" && (
              <div className="h-full flex flex-col justify-center items-center space-y-8 animate-in slide-in-from-right-10 duration-300">
                <div className="text-center space-y-2 max-w-md">
                  <h3 className="font-bold text-3xl text-white">
                    Ready to Checkout?
                  </h3>
                  <p className="text-white/70">
                    Review your items on the left. When you're ready, proceed to
                    secure checkout.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
                  <Button
                    size="lg"
                    className="h-16 text-lg font-bold bg-katapult-pink hover:bg-katapult-pink/90 shadow-lg shadow-katapult-pink/20"
                    onClick={handleNext}
                  >
                    SECURE CHECKOUT <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 text-lg font-bold border-white/20 hover:bg-white/10 text-white"
                    onClick={onClose}
                  >
                    CONTINUE SHOPPING
                  </Button>
                </div>
              </div>
            )}

            {step === "shipping" && (
              <div className="space-y-6 max-w-2xl mx-auto animate-in slide-in-from-right-10 duration-300">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-white">
                      First Name <span className="text-katapult-pink">*</span>
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                        validationErrors.firstName ? "border-katapult-pink" : ""
                      }`}
                      value={shippingInfo.firstName}
                      onChange={(e) =>
                        setShippingInfo({
                          ...shippingInfo,
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
                      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                        validationErrors.lastName ? "border-katapult-pink" : ""
                      }`}
                      value={shippingInfo.lastName}
                      onChange={(e) =>
                        setShippingInfo({
                          ...shippingInfo,
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
                      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                        validationErrors.email ? "border-katapult-pink" : ""
                      }`}
                      value={shippingInfo.email}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, email: e.target.value })
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
                      Phone Number <span className="text-katapult-pink">*</span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="555-123-4567"
                      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                        validationErrors.phone ? "border-katapult-pink" : ""
                      }`}
                      value={shippingInfo.phone}
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
                    Street Address <span className="text-katapult-pink">*</span>
                  </Label>
                  <Input
                    id="address"
                    placeholder="123 Automotive Way"
                    className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                      validationErrors.address ? "border-katapult-pink" : ""
                    }`}
                    value={shippingInfo.address}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, address: e.target.value })
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
                      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                        validationErrors.city ? "border-katapult-pink" : ""
                      }`}
                      value={shippingInfo.city}
                      onChange={(e) =>
                        setShippingInfo({ ...shippingInfo, city: e.target.value })
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
                      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                        validationErrors.state ? "border-katapult-pink" : ""
                      }`}
                      value={shippingInfo.state}
                      onChange={(e) =>
                        setShippingInfo({
                          ...shippingInfo,
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
                      className={`bg-white/10 border-white/20 text-white placeholder:text-white/50 ${
                        validationErrors.zip ? "border-katapult-pink" : ""
                      }`}
                      value={shippingInfo.zip}
                      onChange={(e) =>
                        setShippingInfo({
                          ...shippingInfo,
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

                <Button
                  size="lg"
                  className="w-full mt-8 font-bold text-lg bg-katapult-pink hover:bg-katapult-pink/90"
                  onClick={handleNext}
                >
                  CONTINUE TO PAYMENT
                </Button>
              </div>
            )}

            {step === "payment" && (
              <div className="space-y-8 max-w-2xl mx-auto animate-in slide-in-from-right-10 duration-300">
                <Tabs defaultValue="card" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/10">
                    <TabsTrigger
                      value="card"
                      className="font-bold text-white data-[state=active]:bg-katapult-pink"
                    >
                      CREDIT CARD
                    </TabsTrigger>
                    <TabsTrigger
                      value="financing"
                      className="font-bold text-white data-[state=active]:bg-katapult-pink"
                    >
                      FINANCING
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="card" className="space-y-6">
                    <div className="p-6 border border-white/20 rounded-lg bg-white/5 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-white">Card Number</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-3 top-3 h-4 w-4 text-white/50" />
                          <Input
                            className="pl-10 font-mono bg-white/10 border-white/20 text-white"
                            placeholder="0000 0000 0000 0000"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-white">Expiry Date</Label>
                          <Input
                            className="font-mono bg-white/10 border-white/20 text-white"
                            placeholder="MM/YY"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white">CVC</Label>
                          <Input
                            className="font-mono bg-white/10 border-white/20 text-white"
                            placeholder="123"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full font-bold text-lg bg-katapult-pink hover:bg-katapult-pink/90"
                      onClick={handlePayment}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          PROCESSING...
                        </>
                      ) : (
                        `PAY $${cartData.total.toFixed(2)}`
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="financing" className="space-y-6">
                    <Card className="border-katapult-pink/50 bg-katapult-pink/10 overflow-hidden">
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="flex justify-center mb-6">
                          <div className="bg-white/10 rounded-lg p-8">
                            <h3 className="text-2xl font-bold text-white mb-2">
                              Katapult Financing
                            </h3>
                            <p className="text-white/80">
                              See if You Pre-Qualify
                            </p>
                          </div>
                        </div>
                        <p className="text-white/70">
                          Get approved instantly with no impact to your credit
                          score. Flexible payment plans available.
                        </p>
                        <ul className="text-left space-y-2 text-sm my-6 max-w-xs mx-auto text-white/80">
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-katapult-pink" />
                            Instant decision
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-katapult-pink" />
                            No hidden fees
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-katapult-pink" />
                            0% APR options available
                          </li>
                        </ul>
                        <Button
                          size="lg"
                          className="w-full font-bold text-lg bg-katapult-pink hover:bg-katapult-pink/90"
                          onClick={startFinancing}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="animate-spin mr-2 w-5 h-5" />
                              CONNECTING...
                            </>
                          ) : (
                            "APPLY NOW"
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {step === "financing" && (
              <div className="h-full flex flex-col animate-in slide-in-from-right-10 duration-300">
                <div className="flex-1 bg-white rounded-lg overflow-hidden border border-white/20 relative shadow-inner">
                  {isSubmitting || !launchURL ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/10">
                      <div className="text-center space-y-4">
                        <Loader2 className="animate-spin w-12 h-12 text-katapult-pink mx-auto" />
                        <p className="font-medium text-lg text-white">
                          Connecting to LendPro Secure Server...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <iframe 
                      src={launchURL}
                      className="w-full h-full relative z-10 bg-white"
                      title="Katapult Financing Application"
                      onLoad={(e) => {
                        (e.target as HTMLIFrameElement).style.opacity = '1';
                      }}
                      style={{ opacity: 0, transition: 'opacity 0.5s ease-in-out' }}
                    />
                  )}
                </div>
                <p className="text-center text-xs text-white/60 mt-4">
                  Your information is encrypted and secure. By continuing, you
                  agree to Katapult's Terms of Service.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
