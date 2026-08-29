// // 'use server';

// import { listRoles, loginUser, logoutUser, setrefreshToken, retrieveRefreshToken, registerUser, googleLogin, googleRegister, registerQRCode, getOTP ,validateTotp, getVerificationOptions, setCookie, clearCookie } from "@/lib/api";
// import { useAuthStore } from "@/store/authStore";
// import { decodeIdToken } from "@/lib/actions";
// import { VerifyOtpParams } from "@/types";
// import { decodeServerToken } from "@/lib/actions";
// import { useRouter } from "next/navigation";
// import { Channel } from "@/types";



// export function useAuth() {

//     const router = useRouter();
//     const { setmfaEnabled, settotpEnabled, setToken, setEmail, setRoleName, setPermissions, setInviteToken, setPropertyIds, setRoles, setStep, resetRegistrationData } = useAuthStore()
//     const { setActiveRole } = useAuthStore.getState()

//     const roles = async () => {
//         try {
//             const response = await listRoles();
//             console.log("Fetched roles: ", response.data)
//             return response.data; // Return the full data object
//         } catch (error: any) {
//             console.error("Failed to fetch roles:", error);
//             return { data: [], message: error?.code  }; // Return an empty array on failure
//         }
//     }

//     const handleTokenRefresh = async () => {
//         try {
//             console.log("Attempting token refresh...");
//             const response:any = await setrefreshToken();
//             console.log("Token refresh response: ", response)
//             if (response.status !== 200) {
//                 throw new Error("Failed to refresh token");
//             }
//             else {
//                 console.log("Token refresh successful, retrieving new token...");
//             }
//             const tokenresponse: any = await retrieveRefreshToken();
//             console.log("Retrieve token response: ", tokenresponse)
//             if (tokenresponse.status !== 200) {
//                 throw new Error("Failed to retrieve refreshed token");
//             }
//             const data = await tokenresponse.json();
//             console.log("Retrieved token data: ", data)
//             const token = data.data.jwt
//             console.log("New token after refresh: ", token)
//             if (token) {
//                 const payload = decodeServerToken(token);
//                 const roles = payload?.roles || [];
//                 setToken(token);
//                 setRoles(roles);
//                 setStep("complete")
//                 // const roleTypes = payload?.roles || [];

//                 //Permissions
//                 const permissions = payload?.roles?.flatMap(role => role.permissions) || [];
//                 const uniquePermissions = Array.from(new Set(permissions)); // [...new Set(permissions)]
//                 setPermissions(uniquePermissions);

//                 //Extract property IDs
//                 const allPropertyIds = roles.flatMap(role => role.properties);
//                 const uniquePropertyIds = Array.from(new Set(allPropertyIds));
//                 setPropertyIds(uniquePropertyIds);

//                 //Extract role titles for display
//                 const roleNames = roles.map(role => role.title);
//                 setRoleName(roleNames);
//                 console.log("Decoded roles from token:", roleNames);
//                 console.log("Decoded permissions from token:", permissions);
//                 // await setCookie({ token, refreshToken: response.data.refreshToken });
//                 console.log("Token and refresh token set in cookie after refresh");
//             }

//         }
//         catch (error) {
//             console.log("Token refresh error: ", error)
//             throw error; // Rethrow the error to be handled by the caller
//         }
//     }

//     const logout = async () => {
//         try {
//             const token = useAuthStore.getState().token;
//             // if (token) {
//             //     const res:any = await logoutUser(token);
//             //     if (!res.success) {
//             //         throw new Error("Logout API call failed");
//             //     }
//             //     console.log("Logout API call successful");
//             // }
//             await clearCookie();
//             router.replace("/login");

//             setTimeout( async () => {
//             // await clearCookie();
//             setToken(null);
//             setInviteToken(null);
//             resetRegistrationData();
//             console.log("Cleared cookie and reset auth store");
//             }, 0);
//             // router.push("/login");
//             return { success: true, message: "Logged out successfully" };
//         } catch (error: any) {
//             console.error("Logout error:", error);
//             return { success: false, message: "Logout failed" };
//         }
//     }

//     const login = async (email: string, password: string) => {
//         try {
//             const { inviteToken } = useAuthStore.getState()
//             const payload: any = { email, password };
//             if (inviteToken) payload.token = inviteToken;
//             console.log("Login payload: ", payload)
//             const response = await loginUser(payload);
//             // const response = await loginUser({ email, password });
//             const success = response.data.success
//             const code = response.data.code
//             const description = response.data.description
//             const { totpEnabled, mfaSetup: mfaEnabled, jwt: token, refreshToken } = response.data.data[0]
//             if (token) {
//                 // Set the token in a cookie
//                 const payload = decodeServerToken(token);
//                 const roles = payload?.roles || [];
//                 setRoles(roles);
//                 setStep("complete")
//                 // const roleTypes = payload?.roles || [];

//                 //Permissions
//                 const permissions = payload?.roles?.flatMap(role => role.permissions) || [];
//                 const uniquePermissions = Array.from(new Set(permissions)); // [...new Set(permissions)]
//                 setPermissions(uniquePermissions);

//                 //Extract property IDs
//                 const allPropertyIds = roles.flatMap(role => role.properties);
//                 const uniquePropertyIds = Array.from(new Set(allPropertyIds));
//                 setPropertyIds(uniquePropertyIds);

//                 //Extract role titles for display
//                 const roleNames = roles.map(role => role.title);
//                 setRoleName(roleNames);
                
//                 console.log("Decoded roles from token:", roleNames);
//                 console.log("Decoded permissions from token:", uniquePermissions);
//                 await setCookie({ token, refreshToken });
//                 console.log("Token set in cookie");

//                 //invite token
//                 if (inviteToken) {
//                     console.log("Clearing invite token after successful use");
//                     setInviteToken(null);
//             }
//             }
//             // 17-09-2025 - will have to handle totp, not setting token yet, keeping it null
//             // setToken(jwt);
//             console.log("Response from login: ", response.data.data[0])
//             console.log("TOTP Enabled: ", totpEnabled, " MFA Enabled: ", mfaEnabled)
//             setmfaEnabled(mfaEnabled);
//             settotpEnabled(totpEnabled);
//             setEmail(email)
//             console.log("Auth Store after login: ", useAuthStore.getState())
//             return { success: success , message: description, mfaEnabled, totpEnabled, token };
//         } catch (error: any) {
//             console.log("Login error: ", error)
//             const { inviteToken } = useAuthStore.getState()
//             if (inviteToken) {
//                 console.log("Clearing invite token after failed login attempt");
//                 setInviteToken(null);
//             }
//             return { success: false, message: error.response?.data?.description || "Login failed" };
//         }
//     } 

//     const register = async ( email: string, password: string) => {
//         try {
//             const {roleId, inviteToken } = useAuthStore.getState()

//             // Build request payload conditionally
//             const payload: any = { email, password };
//             if (roleId) payload.roleId = roleId;
//             if (inviteToken) payload.token = inviteToken;

//             console.log("Register payload: ", payload)
//             const response = await registerUser(payload);
//             console.log("Register res: ", response)
//             const code = response.data.code
//             const description = response.data.description
//             // const { jwt, mfaEnabled } = response.data.data[0]
//             // setAuth(jwt, mfaEnabled);
//             setEmail(email)
//             if (inviteToken) {
//                 console.log("Clearing invite token after successful use");
//                 setInviteToken(null);
//             }

//             console.log("Auth Store after register: " , useAuthStore.getState())
//             return { success: true, message: description };
//         } catch (error: any) {
//             console.log("Registration error: ", error)
//             const { inviteToken } = useAuthStore.getState()
//             if (inviteToken) {
//                 console.log("Clearing invite token after failed registration attempt");
//                 setInviteToken(null);
//             }
//             return { success: false, message: error.response?.data?.description || "Registration failed" };
//         }
//     }
//     const getVerOptions = async (email:string) => {
//         try {
//             // const email = useAuthStore.getState().email || "";
//             const response = await getVerificationOptions({ email });
//             const code = response.data.code
//             const description = response.data.description
//             const success = response.data.success
//             const data = response.data.data[0]
//             return { success: success, message: description, options: data };
//         }
//         catch (error: any) {
//             console.log("Get verification options error: ", error);
//             return { success: false, message: error.response?.data?.description || "Failed to get verification options" };
//         }   
//     }
//     const get_OTP = async (email:string, channel: Channel) => {
//         try {
//             // const email = useAuthStore.getState().email || "";
//             const response = await getOTP({ email, channel });
//             const code = response.data.code
//             const description = response.data.description
//             const success = response.data.success
//             return { success: success, message: description, data: response.data.data[0]  };
//         }
//         catch (error: any) {
//             console.log("Get OTP error: ", error);
//             return { success: false, message: error.response?.data?.description || "Failed to get OTP" };
//         }
//     }

//     const handleGoogleLogin = async (idToken: string) => {
//         try {
//             const { inviteToken } = useAuthStore.getState()
//             const payload: any = { idToken };
//             if (inviteToken) payload.token = inviteToken;
//             console.log("Google Login payload: ", payload)
            
//             console.log("Handling Google login with ID token: ", idToken)
//             const response = await googleLogin(payload)
//             console.log("Google res: ", response)
//             const code = response.data.code
//             const description = response.data.description
//             const success = response.data.success
//             const jwt = response.data.data[0].jwt
//             const refreshToken = response.data.data[0].refreshToken
//             if (jwt) {
//                 const payload = decodeServerToken(jwt);
//                 const roles = payload?.roles || [];
//                 setRoles(roles);
//                 // const roleTypes = payload?.roles || [];

//                 //Permissions
//                 const permissions = payload?.roles?.flatMap(role => role.permissions) || [];
//                 const uniquePermissions = Array.from(new Set(permissions)); // [...new Set(permissions)]
//                 setPermissions(uniquePermissions);

//                 //Extract property IDs
//                 const allPropertyIds = roles.flatMap(role => role.properties);
//                 const uniquePropertyIds = Array.from(new Set(allPropertyIds));
//                 setPropertyIds(uniquePropertyIds);

//                 //Extract role titles for display
//                 const roleNames = roles.map(role => role.title);
//                 setRoleName(roleNames);
//                 console.log("Decoded roles from token:", roles);
//                 console.log("Decoded permissions from token:", permissions);
//                 await setCookie({ token: jwt, refreshToken });
//                 console.log("Token set in cookie");
//             }
//             const { totpEnabled, mfaSetup } = response.data.data[0]

//             // setAuth(totpEnabled, mfaEnabled)
//             setmfaEnabled(mfaSetup);
//             settotpEnabled(totpEnabled);
//             if (inviteToken) {
//                 console.log("Clearing invite token after successful use");
//                 setInviteToken(null);
//             }
//             console.log("Auth Store after Google login: " , useAuthStore.getState())
//             return { success: success, mfaEnabled: mfaSetup, totpEnabled, token: jwt }
//         } catch (error: any) {
//             console.log("Google login error: ", error)
//             const { inviteToken } = useAuthStore.getState()
//             if (inviteToken) {
//                 console.log("Clearing invite token after failed Google login attempt");
//                 setInviteToken(null);
//             }
//             return { 
//                 success: false, 
//                 message: 
//                     error.response?.data?.description || "Google login failed" }
//         }
//     }

//     const handleGoogleRegister = async (idToken: string, roleId: number) => {
//         try {
//             const { inviteToken } = useAuthStore.getState()
//             const payload: any = { idToken, roleId };
//             if (inviteToken) payload.token = inviteToken;
//             console.log("Google Register payload: ", payload)
//             console.log("Handling Google register with ID token: ", idToken, " and roleId: ", roleId)
//             const decoded = decodeIdToken(idToken);
//             console.log("Decoded ID token: ", decoded)
//             const email = decoded?.email || "no-email"
           
//             // Call the googleRegister API with both idToken and roleId
//             const response = await googleRegister(payload)
//             console.log("Google register res: ", response)
//             const code = response.data.code
//             const description = response.data.description
//             const success = response.data.success
//             // const jwt = response.data.data[0].jwt
//             const { totpEnabled, mfaSetup, jwt, refreshToken} = response.data.data[0]
//             // No JWT yet since user needs to verify TOTP first
//             // setAuth(jwt, mfaEnabled)
//             if (jwt) {
//                 const payload = decodeServerToken(jwt);
//                 const roles = payload?.roles || [];
//                 setRoles(roles);
//                 // const roleTypes = payload?.roles || [];

//                 //Permissions
//                 const permissions = payload?.roles?.flatMap(role => role.permissions) || [];
//                 const uniquePermissions = Array.from(new Set(permissions)); // [...new Set(permissions)]
//                 setPermissions(uniquePermissions);

//                 //Extract property IDs
//                 const allPropertyIds = roles.flatMap(role => role.properties);
//                 const uniquePropertyIds = Array.from(new Set(allPropertyIds));
//                 setPropertyIds(uniquePropertyIds);

//                 //Extract role titles for display
//                 const roleNames = roles.map(role => role.title);
//                 setRoleName(roleNames);

//                 console.log("Decoded roles from token:", roles);
//                 console.log("Decoded permissions from token:", permissions);
//                 await setCookie({ token: jwt, refreshToken });
//                 console.log("Token and refresh token set in cookie");
//             }
//             setEmail(email)
//             console.log("Auth Store after Google register: " , useAuthStore.getState())
//             if (inviteToken) {
//                 console.log("Clearing invite token after successful use");
//                 setInviteToken(null);
//             }
//             return { success: success, totpEnabled, mfaEnabled: mfaSetup, token: jwt}
//         } 
//         catch (error: any) 
//         {
//             console.log("Google register error: ", error)
//             const { inviteToken } = useAuthStore.getState()
//             if (inviteToken) {
//                 console.log("Clearing invite token after failed Google registration attempt");
//                 setInviteToken(null);
//             }
//             const success = error.response?.data?.success || false;
//             const code = error.response?.data?.code || "500";
//             const description = error.response?.data?.description || "Google registeration failed. Try again";
//             return { success: success, message: description, error_code: code || "Google registration failed. Try again" }
//         }
//     }

//     // const fetchQRCode = async () => {
//     //     try {
//     //         const email = useAuthStore.getState().email || "";
//     //         const response = await getQRCode({ email });
//     //         const code = response.data.code
//     //         const description = response.data.description
//     //         const success = response.data.success
//     //         console.log("Fetched QR Code: ", response.data.data[0].qrcode);
//     //         return { success: true, qrcode: response.data.data[0].qrcode };
//     //     }
//     //     catch (error: any) {
//     //         console.log("Fetch QR Code error: ", error);
//     //         const success = error.response?.data?.success || false;
//     //         const code = error.response?.data?.code || "500";
//     //         const description = error.response?.data?.description || "Failed to fetch QR code";
//     //         return { success: success, message: description, error_code: code || "Failed to fetch QR code" };
//     //     }
//     // }
//        const verifyTotpCodewithPass = async (code:string, email:string, channel: "EMAIL" | "GOOGLE_TOTP" | "SMS", password:string) => {
//         try {
//             // const email = useAuthStore.getState().email || "";          
//             const response = await validateTotp({ code, email, channel, password });
//             console.log("TOTP validation response: ", response.data);
//             const response_code = response.data.code
//             const success = response.data.success
//             const description = response.data.description
//             const token = response.data.data[0].jwt
//             const refreshToken = response.data.data[0].refreshToken
//             if (token) {
//                 const payload = decodeServerToken(token);
//                 const roles = payload?.roles || [];
//                 setRoles(roles);
//                 // const roleTypes = payload?.roles || [];

//                 //Permissions
//                 const permissions = payload?.roles?.flatMap(role => role.permissions) || [];
//                 const uniquePermissions = Array.from(new Set(permissions)); // [...new Set(permissions)]
//                 setPermissions(uniquePermissions);

//                 //Extract property IDs
//                 const allPropertyIds = roles.flatMap(role => role.properties);
//                 const uniquePropertyIds = Array.from(new Set(allPropertyIds));
//                 setPropertyIds(uniquePropertyIds);

//                 //Extract role titles for display
//                 const roleNames = roles.map(role => role.title);
//                 setRoleName(roleNames);
//                 console.log("Decoded roles from token:", roleNames);
//                 console.log("Decoded permissions from token:", permissions);
//                 await setCookie({ token, refreshToken });
//                 console.log("Token and refresh token set in cookie");
//             }
//             // setEmail(email)
//             settotpEnabled(true);
//             return { success: success, message: description, data: token };
//         }
//         catch (error: any) {
//             console.log("TOTP validation error: ", error);
//             const success = error.response?.data?.success || false;
//             const code = error.response?.data?.code || "500";
//             const description = error.response?.data?.description || "TOTP validation failed";
//             return { success: success, message: description, error_code: code || "TOTP validation failed" };
//         }
//     }
//     const verifyTotpCode = async (code:string, email:string, channel: "EMAIL" | "GOOGLE_TOTP" | "SMS") => {
//         try {
//             const email = useAuthStore.getState().email || "";          
//             const response = await validateTotp({ code, email, channel });
//             console.log("TOTP validation response: ", response.data);
//             const response_code = response.data.code
//             const success = response.data.success
//             const description = response.data.description
//             const token = response.data.data[0].jwt
//             const refreshToken = response.data.data[0].refreshToken
//             console.log("TOTP validation data: ", token);
            
//             console.log("TOTP JWT: ", token);
//             if (token) {
//                 const payload = decodeServerToken(token);
//                 const roles = payload?.roles || [];
//                 setRoles(roles);
//                 // const roleTypes = payload?.roles || [];

//                 //Permissions
//                 const permissions = payload?.roles?.flatMap(role => role.permissions) || [];
//                 const uniquePermissions = Array.from(new Set(permissions)); // [...new Set(permissions)]
//                 setPermissions(uniquePermissions);

//                 //Extract property IDs
//                 const allPropertyIds = roles.flatMap(role => role.properties);
//                 const uniquePropertyIds = Array.from(new Set(allPropertyIds));
//                 setPropertyIds(uniquePropertyIds);

//                 //Extract role titles for display
//                 const roleNames = roles.map(role => role.title);
//                 setRoleName(roleNames);
//                 console.log("Decoded roles from token:", roleNames);
//                 console.log("Decoded permissions from token:", permissions);
//                 await setCookie({ token, refreshToken });
//                 console.log("Token and refresh token set in cookie");
//             }
//             settotpEnabled(true);
//             return { success: success, message: description, data: token };
//         }
//         catch (error: any) {
//             console.log("TOTP validation error: ", error);
//             return { success: false, message: error.response?.data?.description || "TOTP validation failed!" };
//         }
//     }


//     return {
//         roles,
//         login,
//         register,
//         logout,
//         handleGoogleLogin,
//         handleGoogleRegister,
//         // fetchQRCode,
//         getVerOptions,
//         get_OTP,
//         verifyTotpCode,
//         verifyTotpCodewithPass,
//         handleTokenRefresh
//     }
// }

// 'use server';

import axios from "axios";
import { listRoles, loginUser, logoutUser, setrefreshToken, retrieveRefreshToken, registerUser, googleLogin, googleRegister, getOTP, validateTotp, getVerificationOptions, setCookie, clearCookie } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { decodeIdToken } from "@/lib/actions";
import { decodeServerToken } from "@/lib/actions";
import { useRouter } from "next/navigation";
import { Channel } from "@/types";

// ─── helper ────────────────────────────────────────────────────────────────────
// Extracts roles from a decoded token payload and calls setActiveRole,
// restoring the previously active role title when possible (e.g. after refresh).
// Falls back to roles[0] if no match. Call this wherever a new token is received.
function applyRolesToStore(
  decodedPayload: ReturnType<typeof decodeServerToken>,
  setters: {
    setRoles: (r: AuthRole[]) => void;
    setRoleName: (n: string[]) => void;
    setActiveRole: (r: AuthRole) => void;
    setPermissions: (p: string[]) => void;
    setPropertyIds: (ids: number[]) => void;
    setPropertyNames: (names: string[]) => void;
  },
  previousActiveRoleTitle?: string | null
) {
  const roles = decodedPayload?.roles || [];

  setters.setRoles(roles);
  setters.setRoleName(roles.map((r) => r.title));
  

  if (roles.length > 0) {
    // Try to restore previous active role, otherwise default to first
    const restored =
      previousActiveRoleTitle
        ? roles.find((r) => r.title === previousActiveRoleTitle) ?? roles[0]
        : roles[0];
    setters.setActiveRole(restored); // derives permissions + propertyIds automatically
  } else {
    // No roles — clear permissions and properties manually
    setters.setPermissions([]);
    setters.setPropertyIds([]);
  }
}

type AuthRole = NonNullable<ReturnType<typeof decodeServerToken>>["roles"][number];

function apiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data as { description?: string } | undefined;
  return data?.description ?? fallback;
}

function apiErrorDetails(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return {
      success: false as const,
      message: fallback,
      error_code: "500",
      data: undefined,
      token: undefined,
      mfaEnabled: undefined,
      totpEnabled: undefined,
    };
  }
  const data = error.response?.data as { success?: boolean; description?: string; code?: string } | undefined;
  return {
    success: false as const,
    message: data?.description ?? fallback,
    error_code: data?.code ?? "500",
    data: undefined,
    token: undefined,
    mfaEnabled: undefined,
    totpEnabled: undefined,
  };
}
// ───────────────────────────────────────────────────────────────────────────────

export function useAuth() {

  const router = useRouter();

  const {
    setmfaEnabled,
    settotpEnabled,
    setToken,
    setEmail,
    setRoleName,
    setPermissions,
    setInviteToken,
    setPropertyIds,
    setPropertyNames,
    setRoles,
    setStep,
    resetRegistrationData,
  } = useAuthStore();

  // setActiveRole lives on getState() because it's not needed reactively
  const { setActiveRole } = useAuthStore.getState();

  // Shared setters object passed to the helper
  const roleSetters = { setRoles, setRoleName, setActiveRole, setPermissions, setPropertyIds, setPropertyNames };

  // ─── roles ─────────────────────────────────────────────────────────────────

  const roles = async () => {
    try {
      const response = await listRoles();
      console.log("Fetched roles: ", response.data);
      return response.data;
    } catch (error: unknown) {
      console.error("Failed to fetch roles:", error);
      return { data: [], message: apiErrorMessage(error, "Failed to fetch roles") };
    }
  };

  // ─── login ─────────────────────────────────────────────────────────────────

  const login = async (email: string, password: string) => {
    try {
      const { inviteToken } = useAuthStore.getState();
      const payload: { email: string; password: string; token?: string } = { email, password };
      if (inviteToken) payload.token = inviteToken;

      const response = await loginUser(payload);

      const success = Boolean(response.data.success);
      const description = response.data.description;
      const loginData = response.data.data?.[0];

      // An inactive local account receives a fresh email OTP from the backend.
      // That is a successful verification hand-off, not an authenticated session.
      // Never attempt to decode or persist it as a login token.
      if (success && (!loginData || typeof loginData !== "object" || !loginData.jwt)) {
        setEmail(email);
        setToken(null);
        setStep("verify");
        return {
          success: true,
          requiresVerification: true,
          message: description || "Verify your email to continue.",
          mfaEnabled: false,
          totpEnabled: false,
          token: undefined,
        };
      }

      const { totpEnabled, mfaSetup: mfaEnabled, jwt: token, refreshToken } = loginData;

      if (token) {
        const decoded = decodeServerToken(token);
        applyRolesToStore(decoded, roleSetters); // 👈 first login, no previous role to restore
        setToken(token);
        setStep("complete");

        console.log("Auth store roles applied on login");

        await setCookie({ token, refreshToken });
        console.log("Token set in cookie");

        if (inviteToken) {
          console.log("Clearing invite token after successful use");
          setInviteToken(null);
        }
      }

      setmfaEnabled(mfaEnabled);
      settotpEnabled(totpEnabled);
      setEmail(email);

      return {
        success,
        requiresVerification: false,
        message: description,
        mfaEnabled,
        totpEnabled,
        token,
      };
    } catch (error: unknown) {
      console.log("Login error: ", error);
      const { inviteToken } = useAuthStore.getState();
      if (inviteToken) {
        console.log("Clearing invite token after failed login attempt");
        setInviteToken(null);
      }
      return { success: false, message: apiErrorMessage(error, "Login failed") };
    }
  };

  // ─── token refresh ─────────────────────────────────────────────────────────

  const handleTokenRefresh = async () => {
    try {
      console.log("Attempting token refresh...");
      const response = await setrefreshToken();

      if (response.status !== 200) {
        throw new Error("Failed to refresh token");
      } else {
        console.log("Token refresh successful, retrieving new token...");
      }

      const tokenresponse = await retrieveRefreshToken();

      if (tokenresponse.status !== 200) {
        throw new Error("Failed to retrieve refreshed token");
      }

      const data = await tokenresponse.json();
      const token = data.data.jwt;

      if (token) {
        const decoded = decodeServerToken(token);

        // 👇 Restore whichever role the user had selected before the refresh
        const { activeRole } = useAuthStore.getState();
        applyRolesToStore(decoded, roleSetters, activeRole?.title);

        setToken(token);
        setStep("complete");

        console.log("Auth store updated after token refresh");
        console.log("Token and refresh token set in cookie after refresh");
      }
    } catch (error) {
      console.log("Token refresh error: ", error);
      throw error;
    }
  };

  // ─── logout ────────────────────────────────────────────────────────────────

  const logout = async () => {
    try {
      const { token } = useAuthStore.getState();
      if (token) {
        try {
          await logoutUser(token);
        } catch {
          // Clear the local session even when the backend session is already unavailable.
        }
      }
      await clearCookie();
      router.replace("/login");

      setTimeout(async () => {
        setToken(null);
        setInviteToken(null);
        resetRegistrationData();
        console.log("Cleared cookie and reset auth store");
      }, 0);

      return { success: true, message: "Logged out successfully" };
    } catch (error: unknown) {
      console.error("Logout error:", error);
      return { success: false, message: "Logout failed" };
    }
  };

  // ─── register ──────────────────────────────────────────────────────────────

  const register = async (email: string, password: string, fullName: string) => {
    try {
      const { roleId, inviteToken } = useAuthStore.getState();
      const payload: { email: string; password: string; fullName: string; roleId?: number; token?: string; referralCode?: string; referralCampaign?: string } = { email, password, fullName };
      if (roleId) payload.roleId = roleId;
      if (inviteToken) payload.token = inviteToken;
      if (typeof window !== "undefined") {
        const referralCode = localStorage.getItem("slickhood_referral_code");
        const referralCampaign = localStorage.getItem("slickhood_referral_campaign");
        if (referralCode) payload.referralCode = referralCode;
        if (referralCampaign) payload.referralCampaign = referralCampaign;
      }

      const response = await registerUser(payload);
      if (typeof window !== "undefined") { localStorage.removeItem("slickhood_referral_code"); localStorage.removeItem("slickhood_referral_campaign"); }

      const description = response.data.description;
      setEmail(email);

      if (inviteToken) {
        console.log("Clearing invite token after successful use");
        setInviteToken(null);
      }

      return { success: true, message: description };
    } catch (error: unknown) {
      console.log("Registration error: ", error);
      const { inviteToken } = useAuthStore.getState();
      if (inviteToken) {
        console.log("Clearing invite token after failed registration attempt");
        setInviteToken(null);
      }
      return { success: false, message: apiErrorMessage(error, "Registration failed") };
    }
  };

  // ─── verification options ──────────────────────────────────────────────────

  const getVerOptions = async (email: string) => {
    try {
      const response = await getVerificationOptions({ email });
      const success = response.data.success;
      const description = response.data.description;
      const data = response.data.data[0];
      return { success, message: description, options: data };
    } catch (error: unknown) {
      console.log("Get verification options error: ", error);
      return { success: false, message: apiErrorMessage(error, "Failed to get verification options") };
    }
  };

  // ─── OTP ───────────────────────────────────────────────────────────────────

  const get_OTP = async (email: string, channel: Channel) => {
    try {
      const response = await getOTP({ email, channel });
      const description = response.data.description;
      return { success: true as const, message: description, data: response.data.data[0], error_code: undefined };
    } catch (error: unknown) {
      console.log("Get OTP error: ", error);
      return apiErrorDetails(error, "Failed to get OTP");
    }
  };

  // ─── Google login ──────────────────────────────────────────────────────────

  const handleGoogleLogin = async (idToken: string) => {
    try {
      const { inviteToken } = useAuthStore.getState();
      const payload: { idToken: string; token?: string } = { idToken };
      if (inviteToken) payload.token = inviteToken;

      const response = await googleLogin(payload);

      const { jwt, refreshToken, totpEnabled, mfaSetup } = response.data.data[0];

      if (jwt) {
        const decoded = decodeServerToken(jwt);
        applyRolesToStore(decoded, roleSetters); // 👈 fresh login, no previous role

        await setCookie({ token: jwt, refreshToken });
        setToken(jwt);
        setStep("complete");
        console.log("Token set in cookie");
      }

      setmfaEnabled(mfaSetup);
      settotpEnabled(totpEnabled);

      if (inviteToken) {
        console.log("Clearing invite token after successful use");
        setInviteToken(null);
      }

      return {
        success: true as const,
        message: "",
        error_code: undefined,
        mfaEnabled: Boolean(mfaSetup),
        totpEnabled: Boolean(totpEnabled),
        token: jwt as string,
      };
    } catch (error: unknown) {
      console.log("Google login error: ", error);
      const { inviteToken } = useAuthStore.getState();
      if (inviteToken) {
        console.log("Clearing invite token after failed Google login attempt");
        setInviteToken(null);
      }
      return apiErrorDetails(error, "Google login failed");
    }
  };

  // ─── Google register ───────────────────────────────────────────────────────

  const handleGoogleRegister = async (idToken: string, roleId: number) => {
    try {
      const { inviteToken } = useAuthStore.getState();
      const payload: { idToken: string; roleId: number; token?: string; referralCode?: string; referralCampaign?: string } = { idToken, roleId };
      if (inviteToken) payload.token = inviteToken;
      if (typeof window !== "undefined") {
        const referralCode = localStorage.getItem("slickhood_referral_code");
        const referralCampaign = localStorage.getItem("slickhood_referral_campaign");
        if (referralCode) payload.referralCode = referralCode;
        if (referralCampaign) payload.referralCampaign = referralCampaign;
      }

      const decoded_id = decodeIdToken(idToken);
      const email = decoded_id?.email || "no-email";

      const response = await googleRegister(payload);
      if (typeof window !== "undefined") { localStorage.removeItem("slickhood_referral_code"); localStorage.removeItem("slickhood_referral_campaign"); }

      const { totpEnabled, mfaSetup, jwt, refreshToken } = response.data.data[0];

      if (jwt) {
        const decoded = decodeServerToken(jwt);
        applyRolesToStore(decoded, roleSetters); // 👈 fresh registration, no previous role

        await setCookie({ token: jwt, refreshToken });
        setToken(jwt);
        setStep("complete");
        console.log("Token and refresh token set in cookie");
      }

      setEmail(email);

      if (inviteToken) {
        console.log("Clearing invite token after successful use");
        setInviteToken(null);
      }

      return {
        success: true as const,
        message: "",
        error_code: undefined,
        totpEnabled: Boolean(totpEnabled),
        mfaEnabled: Boolean(mfaSetup),
        token: jwt as string,
      };
    } catch (error: unknown) {
      console.log("Google register error: ", error);
      const { inviteToken } = useAuthStore.getState();
      if (inviteToken) {
        console.log("Clearing invite token after failed Google registration attempt");
        setInviteToken(null);
      }
      return apiErrorDetails(error, "Google registration failed. Try again");
    }
  };

  // ─── TOTP verify (with password) ───────────────────────────────────────────

  const verifyTotpCodewithPass = async (
    code: string,
    email: string,
    channel: "EMAIL" | "GOOGLE_TOTP" | "SMS",
    password: string
  ) => {
    try {
      const response = await validateTotp({ code, email, channel, password });

      const description = response.data.description;
      const token = response.data.data[0].jwt;
      const refreshToken = response.data.data[0].refreshToken;

      if (token) {
        const decoded = decodeServerToken(token);
        applyRolesToStore(decoded, roleSetters); // 👈 fresh auth, no previous role

        await setCookie({ token, refreshToken });
        setToken(token);
        setStep("complete");
        console.log("Token and refresh token set in cookie");
      }

      settotpEnabled(true);
      return { success: true as const, message: description, data: token as string, error_code: undefined };
    } catch (error: unknown) {
      console.log("TOTP validation error: ", error);
      return apiErrorDetails(error, "TOTP validation failed");
    }
  };

  // ─── TOTP verify ───────────────────────────────────────────────────────────

  const verifyTotpCode = async (
    code: string,
    email: string,
    channel: "EMAIL" | "GOOGLE_TOTP" | "SMS"
  ) => {
    try {
      const response = await validateTotp({ code, email, channel });

      const description = response.data.description;
      const token = response.data.data[0].jwt;
      const refreshToken = response.data.data[0].refreshToken;


      if (token) {
        const decoded = decodeServerToken(token);
        applyRolesToStore(decoded, roleSetters); // 👈 fresh auth, no previous role

        await setCookie({ token, refreshToken });
        setToken(token);
        setStep("complete");
        console.log("Token and refresh token set in cookie");
      }

      settotpEnabled(true);
      return { success: true as const, message: description, data: token as string, error_code: undefined };
    } catch (error: unknown) {
      console.log("TOTP validation error: ", error);
      return { success: false, message: apiErrorMessage(error, "TOTP validation failed!") };
    }
  };

  // ─── exports ───────────────────────────────────────────────────────────────

  return {
    roles,
    login,
    register,
    logout,
    handleGoogleLogin,
    handleGoogleRegister,
    getVerOptions,
    get_OTP,
    verifyTotpCode,
    verifyTotpCodewithPass,
    handleTokenRefresh,
  };
}
