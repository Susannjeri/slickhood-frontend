// src/hooks/useApi.ts
import { useAuthStore } from "@/store/authStore"
import {
   API, 
   fetchUserList, 
   UserListParams, 
   UnitListParams,
   AuditLogsParams,
   UnitJobsParams,
   GetAllParamsOptions,
   NotificationParams,
   PaymentType,
   Param,
   SearchParams,
   UnitInviteSearchParams,
   ChargePeriod,
   ChargeItem,
   UpdateChargesBody,
   createProperty, 
   supportedPropertyTypes, 
   fetchPropertyList,
   fetchUnitList,
   viewProperty,
   editProperty,
   getImage,
   getImagePublic,
   createUnit,
   getMeasurentUnits,
   getSupportedUtilities,
   getSupportedUnitTypes,
   uploadUnitImages,
   getUnit,
   editUnit,
   toggleAdvert,
   createSimilarUnits,
   getPendingUnits,
   getCreateUnitJobs,
   getAuditLogs,
   getConfigNames,
   getConfigValues,
   editConfigValue,
   decryptConfigValue,
   getSupportedParams,
   createParam,
   listUserParams,
   editParam,
   deleteParams,
   decryptParams,
   verifyParams,
   getAllParams,
   getFeeTypes,
   getperiodTypes,
   getUnitCharges,
   getUnitChargesPublic,
   updateUnitCharges,
   listNotifications,
   UpdateInviteParams,
   createInvite,
   listInvites,
   listUnitInvites,
   shareInvite,
   validateInviteToken,
   viewInviteUnit,
   supportedInvites,
   updateInvite,
   getStaffAndInvites,
   deleteStaff,
   userDetails,
   verifyContact,
   updateContact,
   registerQRCode,
   updateUserDetails,
   createLeaseTemplate,
   viewLeaseTemplate,
   viewLeaseTemplatePublic,
   viewLeaseTemplateUnit,
   updateLeaseTemplate,
   listLeaseTemplates,
   deleteLeaseTemplate,
   LeaseTemplatePayload,
   listTenants,
   listManagers,
   createLeaseTenant,
   ListLeaseMessagesParams,
   leaseMessage,
   listLeaseMessages,
   signLease,
   listLeases,
   viewLeasePDF,
   viewPaymentReceipt,
   searchLandlords,
   searchProperties,
   searchTenants,
   searchUnits,
   ListInvoicesParams,
   FilterParams,
   getSupportedPaymentChannels,
   initPayment,
   listPayments,
   SearchParamswithFilter,
   updateFWPayment,
   manualPaymentRecord,
   viewParams,
   deletePropertyParam,
   addPropertyParam,
   paymentChannel,
   accountCategory,
   listAccounts,
   ListAccountsParams,
   listAccountDetails,
   activePaymentChannels,
   createLandlordAccount,
   createMerchantAccount,
   createSlickHoodAccount,
   createUpdateAccount,
   decryptEncrypt,
   verifyAccount,
   requestAccountVerification,
   deleteAccount,
   attachAccount,
   detachAccount,
   listPropertyAccounts,
   getDashboardTotals,
   } from "@/lib/api"
import { useEffect } from "react"
import { useAuth } from "./useAuth"
import { ProfileGateFields } from "@/components/auth/ProfileGateModal"


export interface ProfileGateResult {
        profileGate: true;
        fields: ProfileGateFields;
      }

export function useApi() {
      const { logout } = useAuth()
      const { token } = useAuthStore()

      useEffect(() => {
        // attach token if available
        if (token) {
          API.defaults.headers.common["Authorization"] = `Bearer ${token}`
        } else {
          delete API.defaults.headers.common["Authorization"]
        }

        // optional: add a response interceptor for expired tokens
        const interceptor = API.interceptors.response.use(
          (response) => response,
          (error) => {
            if (error.response?.status === 401) {
              // if unauthorized, log user out
              logout()
            }
            return Promise.reject(error)
          }
        )

        return () => {
          API.interceptors.response.eject(interceptor)
        }
      }, [token, logout])

      const getUserList = async (params: UserListParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              console.log("headers for fetchUserList:", API.defaults.headers.common);
              console.log("headers for fetchUserList (direct injection):", {
                Authorization: `Bearer ${token}`,
              });
              const res = await fetchUserList(params, {
                headers: { Authorization: `Bearer ${token}` }, // 👈 injected here
              });
              console.log("Response from fetchUserList:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error fetching user list:", error);
                throw error; // rethrow the error after logging it
          }
        };

      const deleteUser = async (email: string) => 
        {
          if (!token) throw new Error("No token");
          console.log("Deleting user with email:", email);
        }

      const createNewProperty = async (data: {image: File, name: string, type: string, address: string,mapLocation: string, currency:string}) => {
        try {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");
          console.log("Creating property with data:", data);
          const res = await createProperty(data, token);
          if (res.data?.code === "S0174") {
                console.log("Gated: ", res.data.code)
                return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult;
              }
          console.log("Response from createProperty:", res);
          return res.data;
        }
        catch (error: any) {
          if (error?.response?.data?.code === "S0174") {
                  console.log("Gated: ", error.response.data.code)
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
              }
          console.error("Error creating property:", error);
          throw error;
        }
      }

      interface PropertyType {
        id: string;
        name: string;
        description: string;
      }

      interface PropertyTypeResponse {
          success: boolean;
          code: string
          message: string;
          data: PropertyType[];
      }

      

      const getProperties = async (params: UserListParams = {}) => {
          try {
              const { token, activeRole } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              console.log("headers for getProperties:", API.defaults.headers.common);
              console.log("headers for getProperties (direct injection):", {
                Authorization: `Bearer ${token}`,
              });
              const res = await fetchPropertyList(
                { ...params, role: activeRole?.title },
                { headers: { Authorization: `Bearer ${token}` } },
              );

              if (res.data?.code === "S0174") {
                console.log("Gated: ", res.data.code)
                return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult;
              }
              console.log("Response from getProperties:", res);
              return res.data; // directly return the response payload
          }
          catch (error: any) {
                if (error?.response?.data?.code === "S0174") {
                  console.log("Gated: ", error.response.data.code)
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
              }

              else{
                console.error("Error fetching Properties:", error.response);
                // rethrow the error after logging it
              }
          }
        };
        
        const viewPropertyDetails = async (propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
              console.log("headers for getProperties:", API.defaults.headers.common);
              console.log("headers for getProperties (direct injection):", {
                Authorization: `Bearer ${token}`,
              });
              console.log("TOken from viewPropertyDetails:", token);
              const res = await viewProperty(propertyId, {
                headers: { Authorization: `Bearer ${token}` }, // 👈 injected here
              });
              console.log("Response from viewPropertyDetails:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error fetching Property Details:", error);
                throw error; // rethrow the error after logging it
          }
        };

        const editPropertyDetails = async (data: {image: File, name: string, propertyId: number, type: string, address: string,mapLocation: string, currency:string}) => {
        try {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");
          console.log("Creating property with data:", data);
          const res = await editProperty(data, token);
          console.log("Response from createProperty:", res);
          return res.data;
        }
        catch (error) {
          console.error("Error creating property:", error);
          throw error;
        }
      }

      const getPropertyImage = async(imagePath: string, inviteToken?: string) => {
        try {

          if (inviteToken){
            console.log("Fetching image with invite token:", inviteToken);
            const res = await getImagePublic(imagePath, inviteToken);
            return res.data;
          }

          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");

          console.log("Fetching image with path:", imagePath);
          const res = await getImage(imagePath, {
            headers: { Authorization: `Bearer ${token}`}, // 👈 injected here
          });
          console.log("Response from getImage:", res);
          return res.data;
        }
        catch (error) {
          console.error("Error fetching image:", error);
          throw error;
        }
      }

      const getSupportedPropertyTypes = async(): Promise<PropertyTypeResponse> => {
        try {
          const res = await supportedPropertyTypes();
          console.log("Response from supportedPropertyTypes:", res);
          const success = res.data.success
          const code = res.data.code
          const message = res.data.description
          const data = res.data.data

          return {success, code, message, data};
        }
        catch(error: any){
          console.error("Error fetching supported property types:", error);
          return error
        }
      }

      const createNewUnit = async (data: {propertyId: number, uniqueRef: string, unitTypeId: string, size: string, measurementUnits: string, utilities: string, leaseMode: string, price: string, image: File, currency: string, templateId?: number}) => {
        try {
          const { token } = useAuthStore.getState();  
          if (!token) throw new Error("No token available");
          console.log("Creating unit with data:", data);
          const res = await createUnit(data, token);
          console.log("Response from createUnit:", res);
          return res.data;
        }
        catch (error) {
          console.error("Error creating unit:", error);
          throw error;
        }
      }

      const fetchSupportedUtilities = async() => {
        try {
          const { token } = useAuthStore.getState();  
          if (!token) throw new Error("No token available");
          const res = await getSupportedUtilities(token);
          console.log("Response from getSupportedUtilities:", res);
          return res.data;
        }
        catch (error) {
          console.error("Error fetching supported utilities:", error);
          throw error;
        }
      }

      const fetchSupportedUnitTypes = async(propertyType: string) => {
        try {
          const res = await getSupportedUnitTypes(propertyType);
          console.log("Response from getSupportedUnitTypes:", res);
          return res.data;
        } 
        catch (error) {
          console.error("Error fetching supported unit types:", error);
          throw error;
        }
      }

      const fetchMeasurementUnits = async() => {
        try {
          const { token } = useAuthStore.getState();  
          if (!token) throw new Error("No token available");
          const res = await getMeasurentUnits(token);
          console.log("Response from getSupportedUnitTypes:", res);
          return res.data;
        }
        catch(error){
          console.error("Error fetching supported unit types:", error);
          throw error;
        }
      }

      const getUnits = async (params: UnitListParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await fetchUnitList(params, {
                headers: { Authorization: `Bearer ${token}` }, // 👈 injected here
              });
              console.log("Response from fetchUserList:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error fetching user list:", error);
                throw error; // rethrow the error after logging it
          }
        };

      const addUnitImages = async (params: { unitId: number; images: File[] }) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await uploadUnitImages(params, token); // ✅ pass token string only
            console.log("Response from image upload:", res.data);
            return res.data;
          } catch (error) {
              console.error("Error uploading images:", error);
              throw error;
            }
        };

        const viewUnit = async (propertyId: number, unitId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            
            const res = await getUnit(propertyId, unitId, token);
            console.log("Response from getUnit: ", res.data)
            return res.data
          }
          catch (error) {
            console.error("Error getting unit: ", error)
          }
        }
      
        const handleEditUnit = async (params: {
              propertyId: number;
              uniqueRef: string;
              unitTypeId: string;
              size: string;
              measurementUnits: string;
              utilities: string;
              leaseMode: string;
              price: string;
              images: File[] ;
              unitId: number;
              templateId?: number; }) => {
            try {
              // ✅ Get token from global auth store
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");

              // ✅ Call the API function with correct parameters
              const res = await editUnit(params, token);

              console.log("Response from editUnit:", res);
              return res.data;
            } catch (error) {
              console.error("Error editing unit:", error);
              throw error;
            }
          };

        const handleToggleAdvert = async(unitId: number) => {
          try {
              // ✅ Get token from global auth store
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");

              // ✅ Call the API function with correct parameters
              const res = await toggleAdvert(unitId, token);

              console.log("Response from ToggleAdvertState:", res);
              return res.data;
            } catch (error) {
              console.error("Error editing unit:", error);
              throw error;
            }
        }

        const handleCreateSimilarUnits = async(unitId: number, count: number) => {
          try {
              // ✅ Get token from global auth store
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              // ✅ Call the API function with correct parameters
              const res = await createSimilarUnits(unitId, count, token);
              console.log("Response from createSimilarUnits:", res);
              return res.data;
            } catch (error) {
              console.error("Error creating similar units:", error);
              throw error;
            }
        }

        const handleGetPendingUnits = async() => {  
          try {
              // ✅ Get token from global auth store
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              // ✅ Call the API function with correct parameters
              const res = await getPendingUnits(token);
              console.log("Response from getPendingUnits:", res);
              return res.data;
            } 
             catch (error) {
              console.error("Error getting pending units:", error);
              throw error;
            } 
        }
        
        const handleGetCreateUnitJobs = async(params: UnitJobsParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getCreateUnitJobs(params, token)
              console.log("Response from handleGetCreateUnitJobs:", res);
              return res.data; // directly return the response payload      
          }
          catch (error) {
                console.error("Error fetching create unit jobs:", error);
                throw error; // rethrow the error after logging it
          }
        }

        const fetchAuditLogs = async(params: AuditLogsParams = {}) => 
        {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getAuditLogs(params, token)
            console.log("Response from fetchAuditLogs:", res);
            return res.data; // directly return the response payload

          }
          catch (error) {
                console.error("Error fetching audit logs:", error);
                throw error; // rethrow the error after logging it
          }
        }

        const fetchConfigNames = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getConfigNames(token);
            console.log("Response from fetchConfigNames:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error fetching config names:", error);
            throw error;
          }
        }

        const fetchConfigValues = async(configName: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getConfigValues(configName, token);
            console.log("Response from fetchConfigValues:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error fetching config values:", error);
            throw error;
          }
        }

        const handleEditConfigValue = async(configName: string, configValue: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const payload = {config: configName, value: configValue};
            console.log("Editing config with payload:", payload);
            const res = await editConfigValue(payload, token);
            console.log("Response from handleEditConfigValue:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error editing config value:", error);
            throw error;
          }
        }
        
        const handleDecryptConfigValue = async(encryptedValue: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await decryptConfigValue(encryptedValue, token);
            console.log("Response from handleDecryptConfigValue:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error decrypting config value:", error);
            throw error;
          }
        }
        
        // Params Management APIs
        const handleGetSupportedParams = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getSupportedParams(token);
            console.log("Response from handleGetSupportedParams:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error fetching supported params:", error);
            throw error;
          }
        }

        const handleCreateParam = async(name:string, type:PaymentType, params:Param[]) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Creating param with name:", name, "type:", type, "params:", params);
            const res = await createParam(name, type, params, token);
            console.log("Response from handleCreateParam:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error creating param:", error);
            throw error;
          }
        }

        const handleListUserParams = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listUserParams(token);
            console.log("Response from handleListUserParams:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error listing user params:", error);
            throw error;
          }
        }

        const handleEditParam = async(name:string, type:PaymentType, params:Param[]) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Editing param with name:", name, "type:", type, "params:", params);
            const res = await editParam(name, type, params, token);
            console.log("Response from handleEditParam:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error editing param:", error);
            throw error;
          }
        }

        const handleDeleteParams = async(name:string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Deleting params with names:", name);
            const res = await deleteParams(name, token);
            console.log("Response from handleDeleteParams:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error deleting params:", error);
            throw error;
          }
        }

        const handleDecryptParams = async(encryptedValue:string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await decryptParams(encryptedValue, token);
            console.log("Response from handleDecryptParams:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error decrypting params:", error);
            throw error;
          }
        }

        const handleVerifyParams = async(groupName:string, verify:boolean) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await verifyParams(groupName, verify, token);
            console.log("Response from handleVerifyParams:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error verifying params:", error);
            throw error;
          }
        }

        const handleGetAllParams = async(options: GetAllParamsOptions = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Fetching all params with options:", options);
            const res = await getAllParams(options, token);
            console.log("Response from handleGetAllParams:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error fetching all params:", error);
            throw error;
          }
        }
        
        const handleGetFeeTypes = async() => {  
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getFeeTypes(token);
              console.log("Response from handleGetFeeTypes:", res);
              return res.data;
            }
          catch (error) {
              console.error("Error getting fee types:", error);
              throw error;
            }
        }

        const handleGetPeriodTypes = async() => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getperiodTypes(token);
              console.log("Response from handleGetPeriodTypes:", res);
              return res.data;
            } 
          catch (error) {
              console.error("Error getting period types:", error);
              throw error;
            }
        }

        const handleGetUnitCharges = async(unitId: number, inviteToken?: string) => {
          try {
              if (inviteToken){
                console.log("UNIT ID:", unitId, "Invite Token:", inviteToken);
                console.log("Fetching unit charges with invite token:", inviteToken);
                const res = await getUnitChargesPublic(unitId, inviteToken);
                console.log("Response from getUnitChargesPublic:", res);
                return res.data;
              }
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getUnitCharges(unitId, token);
              console.log("Response from handleGetUnitCharges:", res);
              return res.data;
            } 
          catch (error) {
              console.error("Error getting unit charges:", error);
              throw error;
            }
        }

        const handleUpdateUnitCharges = async(data: UpdateChargesBody) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await updateUnitCharges(data, token);
              console.log("Response from handleUpdateUnitCharges:", res);
              return res.data;
            }
          catch (error) {
              console.error("Error updating unit charges:", error);
              throw error;
            }
        }

        const getNotificationList = async(params: NotificationParams = {}) => {
          try {
              const { token } = useAuthStore.getState();  
              if (!token) throw new Error("No token available");
              const res = await listNotifications(params,token)
              console.log("Response from listNotifications:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error fetching notification list:", error);
                throw error; // rethrow the error after logging it
          }
        };

        const handleCreateInvite = async(inviteType: string, entityId:number) => {
          try {
              const { token } = useAuthStore.getState();  
              if (!token) throw new Error("No token available");
              const res = await createInvite({inviteType, entityId}, token)
              console.log("Response from createInvite:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error creating invite:", error);
                throw error; // rethrow the error after logging it
          }
        };

        const handlelistInvites = async(params: SearchParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await listInvites(params, token)
              console.log("Response from listInvites:", res);
              return res.data; // directly return the response payload
          }

          catch (error) {
                console.error("Error fetching invites list:", error);
                throw error; // rethrow the error after logging it
          } 
        };

        const handlelistUnitInvites = async(unitId: number, params: UnitInviteSearchParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await listUnitInvites(unitId, params, token)
              console.log("Response from listUnitInvites:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error fetching unit invites list:", error);
                throw error; // rethrow the error after logging it
          }
        };


        const handleShareInvite = async(inviteId: number, recipient: string, notificationChannel: "EMAIL" | "SMS") => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await shareInvite(inviteId, recipient, notificationChannel, token)
              console.log("Response from shareInvite:", res);
              return res.data; // directly return the response payload
          }
          catch (error) { 
                console.error("Error sharing invite:", error);
                throw error; // rethrow the error after logging it
          }
        };

        const handleValidateInviteToken = async(inviteToken: string) => {
          try {
              const { token } = useAuthStore.getState();
              if (token){
                  console.log("Validating invite token with user token:", token);
                  const res = await validateInviteToken(inviteToken, token )
                  console.log("Response from validateInviteToken 1:", res);
                  return res.data; 
              }
              else {
                const res = await validateInviteToken(inviteToken)
                console.log("Response from validateInviteToken:", res);
                return res.data; 
              }
              
              // directly return the response payload
          }
          catch (error) {
                console.error("Error validating invite token:", error);
                throw error; // rethrow the error after logging it
          }
        };

        const handleViewInviteUnit = async(inviteToken: string) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await viewInviteUnit(inviteToken)
              console.log("Response from viewInviteUnit:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error viewing invite unit:", error);
                throw error; // rethrow the error after logging it
          }
        };

        const handleSupportedInvites = async() => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await supportedInvites(token)
              console.log("Response from supportedInvites:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
              console.error("Error fetching supported invites:", error);
              throw error; // rethrow the error after logging it
          }
        };

        const handleUpdateInvite = async(params: UpdateInviteParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await updateInvite(params, token)
              console.log("Response from updateInvite:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
              console.error("Error updating invite:", error);
              throw error; // rethrow the error after logging it
          }
        };

        const handleGetStaffAndInvites = async(propertyId: number) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getStaffAndInvites(propertyId, token)
              console.log("Response from getStaffAndInvites:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
              console.error("Error fetching staff and invites:", error);
              throw error; // rethrow the error after logging it
          }
        };

        const handleDeleteStaff = async(staffId: number) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await deleteStaff(staffId, token)
              console.log("Response from deleteStaff:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
              console.error("Error deleting staff:", error);
              throw error; // rethrow the error after logging it
          }
        };

        const getUserDetails = async () => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await userDetails(token);
              console.log("Response from userDetails:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error fetching user details:", error);
                throw error; // rethrow the error after logging it
          }
        }

        const handleVerifyContact = async(contact: string, channel: "EMAIL" | "SMS") => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await verifyContact({contact, channel, token});
              console.log("Response from verifyContact:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error verifying contact:", error);
                throw error; // rethrow the error after logging it
          }
        }
        
        const handleUpdateContact = async(otp: string) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await updateContact(otp, token);
              console.log("Response from updateContact:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
                console.error("Error updating contact:", error);
                throw error; // rethrow the error after logging it
          }
        }

        const handleRegisterQRCode = async() => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await registerQRCode(token);
              console.log("Response from registerQRCode:", res);
              return res.data; // directly return the response payload
          }
          catch (error) {
              console.error("Error registering QR code:", error);
              throw error; // rethrow the error after logging it
          }
        }

        const handleUpdateUserDetails = async(data: {name: string; profileType: "INDIVIDUAL" | "COMPANY"; identificationNumber: string; taxPin: string}) => {
          try {
              const { token } = useAuthStore.getState();  
              if (!token) throw new Error("No token available");
              const payload = { ...data, token };
              console.log("Updating user details with data:", payload);
              const res = await updateUserDetails(payload);
              console.log("Response from updateUserDetails:", res);
              return res.data;
          }
          catch (error) {
              console.error("Error updating user details:", error);
              throw error;
          }
        }
        
        const handleCreateLeaseTemplate = async (data: LeaseTemplatePayload) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await createLeaseTemplate(data, token);
            if(res.data?.code === "S0174"){
              return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult
            }
            console.log("Response from createLeaseTemplate:", res);
            return res.data;
          } catch (error: any) {
            if (error?.response?.data?.code === "S0174") {
                  console.log("Gated: ", error.response.data.code)
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
            }
            console.error("Error creating lease template:", error);
            throw error;
          }
        };

        const handleViewLeaseTemplate = async (templateId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewLeaseTemplate(templateId, token);
            console.log("Response from viewLeaseTemplate:", res);
            return res.data;
          } catch (error) {
            console.error("Error viewing lease template:", error);
            throw error;
          }
        };

        const handleViewLeaseTemplateUnit = async (unitId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewLeaseTemplateUnit(unitId, token);
            console.log("Response from viewLeaseTemplate:", res);
            return res.data;
          } catch (error) {
            console.error("Error viewing lease template:", error);
            throw error;
          }
        };

        const handleViewLeaseTemplatePublic = async (inviteToken: string) => {
          try {
            const res = await viewLeaseTemplatePublic(inviteToken);
            console.log("Response from viewLeaseTemplatePublic:", res);
            return res.data;
          } catch (error) {
            console.error("Error viewing lease template publicly:", error);
            throw error;
          }
        }

        const handleListLeaseTemplates = async (params: SearchParams = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listLeaseTemplates(params, token);

            if(res.data.code == "S0174") {
              return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult;
            }
            console.log("Response from listLeaseTemplates:", res);
            return res.data;
          } catch (error: any) {
            if (error?.response?.data?.code === "S0174") {
                  console.log("Gated: ", error.response.data.code)
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
            }
            console.error("Error listing lease templates:", error);
            throw error;
          }
        };

        const handleUpdateLeaseTemplate = async (id: string, data: LeaseTemplatePayload) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await updateLeaseTemplate(id, data, token);
            console.log("Response from updateLeaseTemplate:", res);
            return res.data;
          } catch (error) {
            console.error("Error updating lease template:", error);
            throw error;
          }
        };

        const handleDeleteLeaseTemplate = async (templateId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await deleteLeaseTemplate(templateId, token);
            console.log("Response from deleteLeaseTemplate:", res);
            return res.data;
          } catch (error) {
            console.error("Error deleting lease template:", error);
            throw error;
          }
        };

        const handleListTenants = async (unitId: number, params: SearchParams = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listTenants(unitId, params, token);
            console.log("Response from listTenants:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error listing tenants:", error);
            throw error;
          }
        };

        const handleListManagers = async ( unitId: number ) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listManagers( unitId, token );
            console.log("Response from listManagers:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error listing managers:", error);
            throw error;
          }
        };

        const handleCreateLeaseTenant = async (
          inviteToken: string,
          moveInDate: string,
          moveOutDate: string
        ) => {
          try {
            const { token:jwt } = useAuthStore.getState();
            if (!jwt) throw new Error("No token available");
            const payload = { token:inviteToken, moveInDate, moveOutDate };
            console.log("Creating lease tenant with payload:", payload);
            const res = await createLeaseTenant(payload, jwt);
            if(res.data.code=="S0174"){
              return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult;
            }
            console.log("Response from createLeaseTenant:", res);
            return res.data;

          }
          catch (error: any) {
            if (error?.response?.data?.code === "S0174") {
                  console.log("Gated: ", error.response.data.code)
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
            }
            
            console.error("Error creating lease tenant:", error);
            throw error;
            
          }
        }

        const handleLeaseMessage = async (leaseId: number, message: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await leaseMessage(message, leaseId, token);
            console.log("Response from leaseMessage:", res);
            return res.data;
          } catch (error) {
            console.error("Error sending lease message:", error);
            throw error;
          }
        }

        const handleListLeaseMessages = async (leaseId: number, params: ListLeaseMessagesParams = {}) => {  
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listLeaseMessages(leaseId, params, token);
            console.log("Response from listLeaseMessages:", res);
            return res.data;
          }

          catch (error) {
            console.error("Error fetching lease messages:", error);
            throw error;
          }
        }

        const handleSignLease = async (leaseId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await signLease(leaseId, token);
            console.log("Response from signLease:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error signing lease:", error);
            throw error;
          }
        }

        const handleListLeases = async (params: ListInvoicesParams = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listLeases(params, token);
            console.log("Response from listLeases:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error fetching leases:", error);
            throw error;
          }
        }

        const handleViewLeasePDF = async (invoiceId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewLeasePDF(invoiceId, token);
            console.log("Response from viewLeasePDF:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error viewing lease PDF:", error);
            throw error;
          }
        }

        const handleViewPaymentReceipt = async (paymentId: number) => {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");
          const res = await viewPaymentReceipt(paymentId, token);
          return res.data;
        }

        const handleSearchProperties = async (params: FilterParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Searching properties with params:", params);
            const res = await searchProperties(params, token);
            console.log("Response from searchProperties:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error searching properties:", error);
            throw error;
          }
        }

         const handleSearchTenants = async (params: FilterParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Searching tenants with params:", params);
            const res = await searchTenants(params, token);
            console.log("Response from searchTenants:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error searching tenants:", error);
            throw error;
          }
        }

         const handleSearchLandlords = async (params: FilterParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Searching landlords with params:", params);
            const res = await searchLandlords(params, token);
            console.log("Response from searchLandlords:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error searching landlords:", error);
            throw error;
          }
        }

        const handleSearchUnits = async (params: FilterParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Searching units with params:", params);
            const res = await searchUnits(params, token);
            console.log("Response from searchUnits:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error searching units:", error);
            throw error;
          }
        }

        const handleGetSupportedPaymentChannels = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getSupportedPaymentChannels(token);
            console.log("Response from getSupportedPaymentChannels:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error fetching supported payment channels:", error);
            throw error;
          }
        }

        const handleInitPayment = async(invoiceRef: string, accountId: number, channel: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await initPayment(invoiceRef, accountId, channel, token);
            console.log("Response from initPayment:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error initializing payment:", error);
            throw error;
          }
        }

        const handleListPayments = async(params: SearchParamswithFilter = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listPayments(params, token);
            console.log("Response from listPayments:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error listing payments:", error);
            throw error;
          }
        }

        const handleUpdateFWPayment = async( status: string, ref: string, transactionId: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await updateFWPayment(status, ref, transactionId, token);
            console.log("Response from updateFWPayment:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error updating FW payment:", error);
            throw error;
          }
        }

        const handleManualPaymentRecord = async(invoiceRef: string, amount: number, channel?: string, transId?: string, transactionDate?: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Recording manual payment with invoiceRef:", invoiceRef, "amount:", amount, "channel:", channel, "transId:", transId, "transactionDate:", transactionDate);
            const res = await manualPaymentRecord(invoiceRef, amount, token, channel, transId, transactionDate);
            console.log("Response from manualPaymentRecord:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error recording manual payment:", error);
            throw error;
          }
        }

        const handleViewParams = async(propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewParams(propertyId, token);
            console.log("Response from viewParams:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error viewing params:", error);
            throw error;
          }
        }

        const handleDeletePropertyParam = async(groupName: string, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await deletePropertyParam(groupName, propertyId, token);
            console.log("Response from deletePropertyParam:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error deleting property param:", error);
            throw error;
          }
        }

        const handleAddPropertyParam = async(groupName: string, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            console.log("Adding property param with groupName:", groupName, "propertyId:", propertyId);
            const res = await addPropertyParam(groupName, propertyId, token);
            console.log("Response from addPropertyParam:", res);
            return res.data;
          }
          catch (error) {
            console.error("Error adding property param:", error);
            throw error;
          }
        }


        // Account Management
        // List Accounts
        const handleListAccounts = async (params?: ListAccountsParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await listAccounts(token, params);

            console.log("Response from listAccounts:", res);
            return res.data;
          } catch (error) {
            console.error("Error listing accounts:", error);
            throw error;
          }
        };

        // Account Detail
        const handleListAccountDetail = async (accountId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await listAccountDetails(accountId, token);

            console.log("Response from listAccountDetail:", res);
            return res.data;
          } catch (error) {
            console.error("Error getting account detail:", error);
            throw error;
          }
        };

        // Active Payment Channels
        const handleActivePaymentChannels = async () => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await activePaymentChannels(token);

            console.log("Response from activePaymentChannels:", res);
            return res.data;
          } catch (error) {
            console.error("Error getting payment channels:", error);
            throw error;
          }
        };

        // Create Landlord Account
        const handleCreateLandlordAccount = async (
          channel: paymentChannel,
          name: string,
          category: accountCategory
        ) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await createLandlordAccount(channel,name,token);

            console.log("Response from createLandlordAccount:", res);
            return res.data;
          } catch (error) {
            console.error("Error creating landlord account:", error);
            throw error;
          }
        };

        const handleCreateMerchantAccount = async (channel: paymentChannel, name: string, category: accountCategory) => {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");
          const res = await createMerchantAccount(channel, name, token);
          return res.data;
        };

        // Create SlickHood Account
        const handleCreateSlickHoodAccount = async (
          channel: paymentChannel,
          name: string,
          category: accountCategory
        ) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await createSlickHoodAccount(
              channel,
              name,
              token
            );

            console.log("Response from createSlickHoodAccount:", res);
            return res.data;
          } catch (error) {
            console.error("Error creating SlickHood account:", error);
            throw error;
          }
        };

        // Update Account Property
        const handleCreateUpdateAccount = async (
          accountId: number,
          key: string,
          value: string
        ) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await createUpdateAccount(
              accountId,
              key,
              value,
              token
            );

            console.log("Response from createUpdateAccount:", res);
            return res.data;
          } catch (error) {
            console.error("Error updating account:", error);
            throw error;
          }
        };

        // Decrypt Property
        const handleDecryptEncrypt = async (
          accountId: number,
          key: string
        ) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await decryptEncrypt(accountId, key, token);

            // No logging here — res.data carries the decrypted plaintext credential.
            return res.data;
          } catch (error) {
            console.error("Error decrypting property:", error);
            throw error;
          }
        };

        // Verify (approve) or reject an account. verify is required, no
        // default direction for a toggle like this. Rejecting (verify=false)
        // requires non-empty comments — enforced here so no call site can
        // forget to collect a reason before rejecting.
        const handleVerifyAccount = async (accountId: number, verify: boolean, comments?: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            if (!verify && !comments?.trim()) {
              throw new Error("Comments are required when rejecting a verification request");
            }

            const res = await verifyAccount(accountId, verify, token, comments);

            console.log("Response from verifyAccount:", res);
            return res.data;
          } catch (error) {
            console.error("Error verifying account:", error);
            throw error;
          }
        };

        // Send Account Verification Request (owner -> superadmin)
        const handleRequestAccountVerification = async (accountId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await requestAccountVerification(accountId, token);
            return res.data;
          } catch (error) {
            console.error("Error requesting account verification:", error);
            throw error;
          }
        };

        // Delete Account
        const handleDeleteAccount = async (accountId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await deleteAccount(accountId, token);

            console.log("Response from deleteAccount:", res);
            return res.data;
          } catch (error) {
            console.error("Error deleting account:", error);
            throw error;
          }
        };

        const handleAttachAccount = async (accountId: number, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await attachAccount(accountId, propertyId, token);

            console.log("Response from attachAccount:", res);
            return res.data;
          } catch (error) {
            console.error("Error attaching account:", error);
            throw error;
          }
        }

        const handleDetachAccount = async (accountId: number, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await detachAccount(accountId, propertyId, token);

            console.log("Response from detachAccount:", res);
            return res.data;
          } catch (error) {
            console.error("Error detaching account:", error);
            throw error;
          }
        }

        const handleListPropertyAccounts = async (propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await listPropertyAccounts(propertyId, token);

            console.log("Response from listPropertyAccounts:", res);
            return res.data;
          } catch (error) {
            console.error("Error listing property accounts:", error);
            throw error;
          }
        }

        const handleGetDashboardTotals = async (role: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await getDashboardTotals(role, token);

            console.log("Response from getDashboardTotals:", res);
            return res.data;
          } catch (error) {
            console.error("Error fetching dashboard totals:", error);
            throw error;
          }
        }


  return {
    getUserList,
    deleteUser,
    createNewProperty,
    createNewUnit,
    getSupportedPropertyTypes,
    fetchSupportedUnitTypes,
    fetchSupportedUtilities,
    fetchMeasurementUnits,
    getProperties,
    getUnits,
    viewPropertyDetails,
    getPropertyImage,
    addUnitImages,
    editPropertyDetails,
    handleEditUnit,
    handleToggleAdvert,
    viewUnit,
    fetchAuditLogs,
    fetchConfigNames,
    fetchConfigValues,
    handleEditConfigValue,
    handleDecryptConfigValue,
    handleCreateSimilarUnits,
    handleGetPendingUnits,
    handleGetCreateUnitJobs,
    handleGetSupportedParams,
    handleCreateParam,
    handleListUserParams,
    handleEditParam,
    handleDeleteParams,
    handleDecryptParams,
    handleVerifyParams,
    handleGetAllParams,
    handleGetFeeTypes,
    handleGetPeriodTypes,
    handleGetUnitCharges,
    handleUpdateUnitCharges,
    getNotificationList,
    handleCreateInvite,
    handlelistInvites,
    handlelistUnitInvites,
    handleShareInvite,
    handleValidateInviteToken,
    handleViewInviteUnit,
    handleSupportedInvites,
    handleUpdateInvite,
    handleGetStaffAndInvites,
    handleDeleteStaff,
    getUserDetails,
    handleVerifyContact,
    handleUpdateContact,
    handleRegisterQRCode,
    handleUpdateUserDetails,
    handleCreateLeaseTemplate,
    handleViewLeaseTemplate,
    handleViewLeaseTemplatePublic,
    handleViewLeaseTemplateUnit,
    handleListLeaseTemplates,
    handleUpdateLeaseTemplate,
    handleDeleteLeaseTemplate,
    handleListTenants,
    handleListManagers,
    handleCreateLeaseTenant,
    handleLeaseMessage,
    handleListLeaseMessages,
    handleSignLease,
    handleListLeases,
    handleViewLeasePDF,
    handleViewPaymentReceipt,
    handleSearchProperties,
    handleSearchTenants,
    handleSearchLandlords,
    handleSearchUnits,
    handleGetSupportedPaymentChannels,
    handleInitPayment,
    handleListPayments,
    handleUpdateFWPayment,
    handleManualPaymentRecord,
    handleViewParams,
    handleDeletePropertyParam,
    handleAddPropertyParam,
    handleListAccounts,
    handleListAccountDetail,
    handleActivePaymentChannels,
    handleCreateLandlordAccount,
    handleCreateMerchantAccount,
    handleCreateSlickHoodAccount,
    handleCreateUpdateAccount,
    handleDecryptEncrypt,
    handleVerifyAccount,
    handleRequestAccountVerification,
    handleDeleteAccount,
    handleAttachAccount,
    handleDetachAccount,
    handleListPropertyAccounts,
    handleGetDashboardTotals,
  }
}
