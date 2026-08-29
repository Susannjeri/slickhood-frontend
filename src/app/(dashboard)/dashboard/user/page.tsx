"use client"
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {  REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  MapPin,
  Mailbox,
  Globe, 
  Shield,
  CheckCircle2,
  XCircle,
  Loader2,
  Edit2,
  IdCard,
  Building2,
  FileText,
  QrCode,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Image from "next/image";

interface ProfileType {
  id: "INDIVIDUAL" | "COMPANY";
  name: string;
}

interface UserDetails {
  name: string | null;
  email: string;
  phoneNumber: string | null;
  registrationDate: string;
  lastLogin: string;
  registrationIp: string;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  source: string;
  profileType: ProfileType;
  identificationNumber: string | null;
  taxPin: string | null;
  active: boolean;
  completedProfile: boolean;
  verified: boolean;
  postalAddress: string | null;
}

interface ProfileEditForm {
  name: string;
  profileType: "INDIVIDUAL" | "COMPANY";
  identificationNumber: string;
  taxPin: string;
  postalAddress: string;
}

export default function UserDetailsPage() {
  const { getUserDetails, handleVerifyContact, handleUpdateContact, handleUpdateUserDetails, handleRegisterQRCode } = useApi();
  const { logout } = useAuth();
  const router = useRouter();
  
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Update contact dialog states
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [contactType, setContactType] = useState<"EMAIL" | "SMS">("EMAIL");
  const [contactValue, setContactValue] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [updating, setUpdating] = useState(false);

  // Profile edit dialog states
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profileForm, setProfileForm] = useState<ProfileEditForm>({
    name: "",
    profileType: "INDIVIDUAL",
    identificationNumber: "",
    taxPin: "",
    postalAddress: "",
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // QR Code dialog states
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingQR, setLoadingQR] = useState(false);

  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getUserDetails();
      
      if (response.success && response.data && response.data.length > 0) {
        const userData = response.data[0];
        setUserDetails(userData);
        
        // Initialize profile form with current data
        setProfileForm({
          name: userData.name || "",
          profileType: userData.profileType.id,
          identificationNumber: userData.identificationNumber || "",
          taxPin: userData.taxPin || "",
          postalAddress: userData.postalAddress || "",
        });
      } else {
        setError("Failed to load user details");
        toast.error("Failed to load user details");
      }
    } catch (err) {
      setError("An error occurred while fetching user details");
      toast.error("Failed to load user details");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpdateDialog = (type: "EMAIL" | "SMS") => {
    setContactType(type);
    setContactValue("");
    setPhoneNumber("");
    setOtp("");
    setOtpSent(false);
    setShowUpdateDialog(true);
  };

  const handleSendOTP = async () => {
    try {
      setUpdating(true);

      let contact = "";
      
      if (contactType === "EMAIL") {
        if (!contactValue || !contactValue.includes("@")) {
          toast.error("Please enter a valid email address");
          return;
        }
        contact = contactValue;
      } else {
        // Handle phone number from PhoneInput component
        if (!phoneNumber) {
          toast.error("Please enter a phone number");
          return;
        }
        
        // The PhoneInput component already returns the number in E.164 format (e.g., +254712345678)
        // We just need to remove the + for our backend
        let cleanNumber = phoneNumber.replace(/[\s\-()]/g, "");
        
        // Remove + if present
        if (cleanNumber.startsWith("+")) {
          cleanNumber = cleanNumber.substring(1);
        }
        
        contact = cleanNumber;
      }

      const response = await handleVerifyContact(contact, contactType);
      
      if (response.success) {
        setOtpSent(true);
        toast.success(response.description || "OTP sent successfully");
      } else {
        toast.error(response.description || "Failed to send OTP");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.description || "Failed to send OTP");
    } finally {
      setUpdating(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      setUpdating(true);

      if (!otp || otp.length < 4) {
        toast.error("Please enter a valid OTP");
        return;
      }

      const response = await handleUpdateContact(otp);
      
      if (response.success) {
        toast.success(response.description || "Contact updated successfully");
        
        // If email was updated, logout the user
        if (contactType === "EMAIL") {
          setTimeout(() => {
            setShowUpdateDialog(false);
            toast.info("Please login with your new email address", {
              duration: 5000,
            });
            
            // Logout and redirect to login
            setTimeout(() => {
              logout();
              router.push("/login");
            }, 1500);
          }, 1000);
        } else {
          // For phone updates, just refresh the page
          setTimeout(() => {
            fetchUserDetails();
            setShowUpdateDialog(false);
          }, 1500);
        }
      } else {
        toast.error(response.description || "Invalid OTP");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.description || "Failed to verify OTP");
    } finally {
      setUpdating(false);
    }
  };

  const resetDialog = () => {
    setShowUpdateDialog(false);
    setContactValue("");
    setPhoneNumber("");
    setOtp("");
    setOtpSent(false);
  };

  const handleOpenProfileDialog = () => {
    if (userDetails) {
      setProfileForm({
        name: userDetails.name || "",
        profileType: userDetails.profileType.id,
        identificationNumber: userDetails.identificationNumber || "",
        taxPin: userDetails.taxPin || "",
        postalAddress: userDetails.postalAddress || "",
      });
    }
    setShowProfileDialog(true);
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdatingProfile(true);

      // Validate all fields
      if (!profileForm.name.trim()) {
        toast.error("Name is required");
        return;
      }
      if (!profileForm.identificationNumber.trim()) {
        toast.error("Identification number is required");
        return;
      }
      if (!profileForm.taxPin.trim()) {
        toast.error("Tax PIN is required");
        return;
      }

      if (!profileForm.postalAddress.trim()) {
        toast.error("Postal Address is required");
        return;
      }

      const response = await handleUpdateUserDetails(profileForm);
      
      if (response.success) {
        toast.success("Profile updated successfully");
        await fetchUserDetails();
        setShowProfileDialog(false);
      } else {
        toast.error(response.description || "Failed to update profile");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.description || "Failed to update profile");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleSetupTOTP = async () => {
    try {
      setLoadingQR(true);
      setShowQRDialog(true);

      const response = await handleRegisterQRCode();
      
      if (response.success && response.data && response.data.length > 0) {
        setQrCodeData(response.data[0].qrcode);
        toast.success("QR code generated successfully");
      } else {
        toast.error("Failed to generate QR code");
        setShowQRDialog(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.description || "Failed to generate QR code");
      setShowQRDialog(false);
    } finally {
      setLoadingQR(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
      </div>
    );
  }

  if (error || !userDetails) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-800 font-medium">{error || "User details not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "#141130" }}>Account Details</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">Manage your personal information and security settings</p>
      </div>

      <div className="grid gap-4 sm:gap-6">
        {/* Profile Information Card - Editable */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Your personal and business details</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenProfileDialog}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Full Name</Label>
                <p className="text-base font-medium">{userDetails.name || "Not provided"}</p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Profile Type</Label>
                <Badge variant="outline" className="font-normal">
                  {userDetails.profileType.id === "INDIVIDUAL" ? (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Individual
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      Company
                    </div>
                  )}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IdCard className="w-4 h-4" />
                  Identification Number
                </Label>
                <p className="text-base font-medium">{userDetails.identificationNumber || "Not provided"}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tax PIN
                </Label>
                <p className="text-base font-medium">{userDetails.taxPin || "Not provided"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mailbox className="w-4 h-4" />
                  Postal Address
                </Label>
                <p className="text-base font-medium">{userDetails.postalAddress || "Not provided"}</p>
              </div>
            </div>

          </CardContent>
        </Card>

        {/* Account Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Account Status
            </CardTitle>
            <CardDescription>Your account security and verification status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Account Source</Label>
                <Badge variant="outline" className="font-normal">
                  {userDetails.source}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Account Status</Label>
                <div className="flex items-center gap-2">
                  {userDetails.active ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800 border-red-200">
                      <XCircle className="w-3 h-3 mr-1" />
                      Inactive
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Contact Information
            </CardTitle>
            <CardDescription>Your email and phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <Label className="text-sm font-medium text-muted-foreground">Email Address</Label>
                    <p className="text-base font-medium break-all">{userDetails.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenUpdateDialog("EMAIL")}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Edit2 className="w-4 h-4" />
                  Update
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <Label className="text-sm font-medium text-muted-foreground">Phone Number</Label>
                    <p className="text-base font-medium break-all">
                      {userDetails.phoneNumber || "Not provided"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenUpdateDialog("SMS")}
                  className="flex items-center gap-2 w-full sm:w-auto"
                >
                  <Edit2 className="w-4 h-4" />
                  {userDetails.phoneNumber ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Two-Factor Authentication Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>Enhance your account security with Google Authenticator</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-muted/30 gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Google Authenticator (TOTP)</p>
                <p className="text-xs text-muted-foreground">
                  Secure your account with time-based one-time passwords
                </p>
              </div>
              <Button
                onClick={handleSetupTOTP}
                style={{ backgroundColor: "#EF4217" }}
                className="text-white hover:opacity-90 w-full sm:w-auto"
                size="sm"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Setup Authenticator
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Account Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Account Activity
            </CardTitle>
            <CardDescription>Registration and login information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Registration Date
                </Label>
                <p className="text-base font-medium">{userDetails.registrationDate}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Last Login
                </Label>
                <p className="text-base font-medium">{userDetails.lastLogin}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Registration IP
                </Label>
                <p className="text-base font-medium font-mono">{userDetails.registrationIp}</p>
              </div>

              {userDetails.country && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <p className="text-base font-medium">
                    {[userDetails.city, userDetails.country].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Update Contact Dialog */}
      <Dialog open={showUpdateDialog} onOpenChange={resetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {contactType === "EMAIL" ? "Update Email Address" : "Update Phone Number"}
            </DialogTitle>
            <DialogDescription>
              {!otpSent 
                ? `Enter your new ${contactType === "EMAIL" ? "email address" : "phone number"}. We'll send you a verification code.`
                : "Enter the verification code sent to your contact."
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!otpSent ? (
              <>
                {contactType === "EMAIL" ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                    />
                    <p className="text-xs text-amber-600 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      You'll be logged out after updating your email
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <PhoneInput
                      value={phoneNumber}
                      onChange={(value) => setPhoneNumber(value || "")}
                      defaultCountry="KE"
                      placeholder="Enter phone number"
                    />
                    <p className="text-xs text-muted-foreground">
                      Select your country and enter your phone number
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <Label className="text-sm font-medium">Enter Verification Code</Label>
                  <p className="text-xs text-muted-foreground">
                    We sent a 6-digit code to your {contactType === "EMAIL" ? "email" : "phone"}
                  </p>
                </div>
                
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                    disabled={updating}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot 
                        index={0} 
                        className="w-10 h-10 sm:w-12 sm:h-12 text-lg font-semibold"
                      />
                      <InputOTPSlot 
                        index={1} 
                        className="w-10 h-10 sm:w-12 sm:h-12 text-lg font-semibold"
                      />
                      <InputOTPSlot 
                        index={2} 
                        className="w-10 h-10 sm:w-12 sm:h-12 text-lg font-semibold"
                      />
                      <InputOTPSlot 
                        index={3} 
                        className="w-10 h-10 sm:w-12 sm:h-12 text-lg font-semibold"
                      />
                      <InputOTPSlot 
                        index={4} 
                        className="w-10 h-10 sm:w-12 sm:h-12 text-lg font-semibold"
                      />
                      <InputOTPSlot 
                        index={5} 
                        className="w-10 h-10 sm:w-12 sm:h-12 text-lg font-semibold"
                      />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {contactType === "EMAIL" && (
                  <div className="flex items-center justify-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                    <Shield className="w-4 h-4 flex-shrink-0" />
                    <span>You'll be logged out after verification</span>
                  </div>
                )}

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
                    disabled={updating}
                  >
                    Didn't receive code? Try again
                  </button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={resetDialog}
              disabled={updating}
              className="mx-2"
            >
              Cancel
            </Button>
            {!otpSent ? (
              <Button
                onClick={handleSendOTP}
                disabled={updating}
                style={{ backgroundColor: "#EF4217" }}
                className="text-white hover:opacity-90 mx-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Code"
                )}
              </Button>
            ) : (
              <Button
                onClick={handleVerifyOTP}
                disabled={updating}
                style={{ backgroundColor: "#EF4217" }}
                className="text-white hover:opacity-90 mx-2"
              >
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Profile Information</DialogTitle>
            <DialogDescription>
              Update your personal or business details. All fields are required.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter your full name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profileType">Profile Type *</Label>
              <Select
                value={profileForm.profileType}
                onValueChange={(value: "INDIVIDUAL" | "COMPANY") => 
                  setProfileForm({ ...profileForm, profileType: value })
                }
              >
                <SelectTrigger id="profileType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INDIVIDUAL">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Individual
                    </div>
                  </SelectItem>
                  <SelectItem value="COMPANY">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Company
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idNumber">Identification Number *</Label>
              <Input
                id="idNumber"
                placeholder={profileForm.profileType === "INDIVIDUAL" ? "National ID" : "Company Registration Number"}
                value={profileForm.identificationNumber}
                onChange={(e) => setProfileForm({ ...profileForm, identificationNumber: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="taxPin">Tax PIN *</Label>
              <Input
                id="taxPin"
                placeholder="Enter your KRA PIN"
                value={profileForm.taxPin}
                onChange={(e) => setProfileForm({ ...profileForm, taxPin: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxPin">Postal Address *</Label>
              <Input
                  id="postalAddress"
                  placeholder="Enter your Postal Address"
                  value={profileForm.postalAddress}
                  onChange={(e) => setProfileForm({ ...profileForm, postalAddress: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowProfileDialog(false)}
              disabled={updatingProfile}
              className="mx-2"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={updatingProfile}
              style={{ backgroundColor: "#EF4217" }}
              className="text-white hover:opacity-90 mx-2"
            >
              {updatingProfile ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Setup Google Authenticator
            </DialogTitle>
            <DialogDescription>
              Scan this QR code with your Google Authenticator app to enable two-factor authentication.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            {loadingQR ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#EF4217" }} />
              </div>
            ) : qrCodeData ? (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <Image
                    src={qrCodeData}
                    alt="QR Code for Google Authenticator"
                    width={200}
                    height={200}
                    className="w-full max-w-[200px] h-auto"
                  />
                </div>

                <div className="space-y-3 text-sm">
                  <p className="font-medium">How to set up:</p>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    <li>Open Google Authenticator on your phone</li>
                    <li>Tap the "+" icon to add a new account</li>
                    <li>Select "Scan a QR code"</li>
                    <li>Scan the QR code above</li>
                    <li>Your account will be added automatically</li>
                  </ol>
                </div>

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Once set up, you can use Google Authenticator codes for verification instead of SMS or email OTPs.
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Failed to load QR code
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button
              onClick={() => setShowQRDialog(false)}
              className="w-full mx-2"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}