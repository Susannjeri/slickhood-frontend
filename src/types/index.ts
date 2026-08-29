// src/types/index.ts
export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "LANDLORD" | "TENANT" | "SECURITY"; 
}

export type VerifyOtpParams = {
  code: string;
  email: string;
  option: 'email' | 'google' | 'sms'; // added 'sms' option
  password: string; // optional
};

export type Channel = "EMAIL" | "GOOGLE_TOTP" | "SMS";

export type RegistrationStep = "role" | "account" | "verify" | "complete";

export type LeaseMode = "SALE" | "RENT"