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
   getCreateUnitJobStatus,
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
   createEmailOccupantInvite,
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
      const { token } = useAuthStore()

      useEffect(() => {
        // attach token if available
        if (token) {
          API.defaults.headers.common["Authorization"] = `Bearer ${token}`
        } else {
          delete API.defaults.headers.common["Authorization"]
        }

        return () => {
          // The shared API client owns token refresh. Component mounts must not
          // register competing 401 handlers that log out a recoverable session.
        }
      }, [token])

      const getUserList = async (params: UserListParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await fetchUserList(params, {
                headers: { Authorization: `Bearer ${token}` }, // 👈 injected here
              });
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };

      const deleteUser = async (email: string) => 
        {
          if (!token) throw new Error("No token");
        }

      const createNewProperty = async (data: {image: File, name: string, type: string, managementMode: "RENTAL" | "SALE" | "SERVICE_CHARGE", address: string,mapLocation: string, currency:string}) => {
        try {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");
          const res = await createProperty(data, token);
          if (res.data?.code === "S0174") {
                return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult;
              }
          return res.data;
        }
        catch (error: unknown) {
          const apiError = error as { response?: { data?: { code?: string; data?: ProfileGateFields[] } } };
          if (apiError.response?.data?.code === "S0174") {
                return {profileGate: true, fields: apiError.response.data.data?.[0] ?? {}} satisfies ProfileGateResult;
              }
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
              const res = await fetchPropertyList(
                { ...params, role: activeRole?.title },
                { headers: { Authorization: `Bearer ${token}` } },
              );

              if (res.data?.code === "S0174") {
                return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult;
              }
              return res.data; // directly return the response payload
          }
          catch (error: any) {
                if (error?.response?.data?.code === "S0174") {
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
              }

              else{
                // rethrow the error after logging it
              }
          }
        };
        
        const viewPropertyDetails = async (propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
              const res = await viewProperty(propertyId, {
                headers: { Authorization: `Bearer ${token}` }, // 👈 injected here
              });
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };

        const editPropertyDetails = async (data: {image: File, name: string, propertyId: number, type: string, address: string,mapLocation: string, currency:string}) => {
        try {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");
          const res = await editProperty(data, token);
          return res.data;
        }
        catch (error) {
          throw error;
        }
      }

      const getPropertyImage = async(imagePath: string, inviteToken?: string) => {
        try {

          if (inviteToken){
            const res = await getImagePublic(imagePath, inviteToken);
            return res.data;
          }

          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");

          const res = await getImage(imagePath, {
            headers: { Authorization: `Bearer ${token}`}, // 👈 injected here
          });
          return res.data;
        }
        catch (error) {
          throw error;
        }
      }

      const getSupportedPropertyTypes = async(): Promise<PropertyTypeResponse> => {
        try {
          const res = await supportedPropertyTypes();
          const success = res.data.success
          const code = res.data.code
          const message = res.data.description
          const data = res.data.data

          return {success, code, message, data};
        }
        catch(error: any){
          return error
        }
      }

      const createNewUnit = async (data: {propertyId: number, uniqueRef: string, unitTypeId: string, size: string, measurementUnits: string, utilities: string, leaseMode: string, price: string, image: File, currency: string, templateId?: number}) => {
        try {
          const { token } = useAuthStore.getState();  
          if (!token) throw new Error("No token available");
          const res = await createUnit(data, token);
          return res.data;
        }
        catch (error) {
          throw error;
        }
      }

      const fetchSupportedUtilities = async() => {
        try {
          const { token } = useAuthStore.getState();  
          if (!token) throw new Error("No token available");
          const res = await getSupportedUtilities(token);
          return res.data;
        }
        catch (error) {
          throw error;
        }
      }

      const fetchSupportedUnitTypes = async(propertyType: string) => {
        try {
          const res = await getSupportedUnitTypes(propertyType);
          return res.data;
        } 
        catch (error) {
          throw error;
        }
      }

      const fetchMeasurementUnits = async() => {
        try {
          const { token } = useAuthStore.getState();  
          if (!token) throw new Error("No token available");
          const res = await getMeasurentUnits(token);
          return res.data;
        }
        catch(error){
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
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };

      const addUnitImages = async (params: { unitId: number; images: File[] }) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await uploadUnitImages(params, token); // ✅ pass token string only
            return res.data;
          } catch (error) {
              throw error;
            }
        };

        const viewUnit = async (propertyId: number, unitId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            
            const res = await getUnit(propertyId, unitId, token);
            return res.data
          }
          catch (error) {
            throw error;
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

              return res.data;
            } catch (error) {
              throw error;
            }
          };

        const handleToggleAdvert = async(unitId: number, published: boolean) => {
          try {
              // ✅ Get token from global auth store
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");

              // ✅ Call the API function with correct parameters
              const res = await toggleAdvert(unitId, published, token);

              return res.data;
            } catch (error) {
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
              return res.data;
            } catch (error) {
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
              return res.data;
            } 
             catch (error) {
              throw error;
            } 
        }

        const handleGetCreateUnitJobStatus = async(jobId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getCreateUnitJobStatus(jobId, token);
            return res.data;
          } catch (error) {
            throw error;
          }
        }
        
        const handleGetCreateUnitJobs = async(params: UnitJobsParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getCreateUnitJobs(params, token)
              return res.data; // directly return the response payload      
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        }

        const fetchAuditLogs = async(params: AuditLogsParams = {}) => 
        {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getAuditLogs(params, token)
            return res.data; // directly return the response payload

          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        }

        const fetchConfigNames = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getConfigNames(token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const fetchConfigValues = async(configName: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getConfigValues(configName, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleEditConfigValue = async(configName: string, configValue: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const payload = {config: configName, value: configValue};
            const res = await editConfigValue(payload, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }
        
        const handleDecryptConfigValue = async(encryptedValue: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await decryptConfigValue(encryptedValue, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }
        
        // Params Management APIs
        const handleGetSupportedParams = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getSupportedParams(token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleCreateParam = async(name:string, type:PaymentType, params:Param[]) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await createParam(name, type, params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleListUserParams = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listUserParams(token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleEditParam = async(name:string, type:PaymentType, params:Param[]) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await editParam(name, type, params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleDeleteParams = async(name:string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await deleteParams(name, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleDecryptParams = async(encryptedValue:string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await decryptParams(encryptedValue, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleVerifyParams = async(groupName:string, verify:boolean) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await verifyParams(groupName, verify, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleGetAllParams = async(options: GetAllParamsOptions = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getAllParams(options, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }
        
        const handleGetFeeTypes = async() => {  
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getFeeTypes(token);
              return res.data;
            }
          catch (error) {
              throw error;
            }
        }

        const handleGetPeriodTypes = async() => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getperiodTypes(token);
              return res.data;
            } 
          catch (error) {
              throw error;
            }
        }

        const handleGetUnitCharges = async(unitId: number, inviteToken?: string) => {
          try {
              if (inviteToken){
                const res = await getUnitChargesPublic(unitId, inviteToken);
                return res.data;
              }
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getUnitCharges(unitId, token);
              return res.data;
            } 
          catch (error) {
              throw error;
            }
        }

        const handleUpdateUnitCharges = async(data: UpdateChargesBody) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await updateUnitCharges(data, token);
              return res.data;
            }
          catch (error) {
              throw error;
            }
        }

        const getNotificationList = async(params: NotificationParams = {}) => {
          try {
              const { token } = useAuthStore.getState();  
              if (!token) throw new Error("No token available");
              const res = await listNotifications(params,token)
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };

        const handleCreateInvite = async(inviteType: string, entityId:number) => {
          try {
              const { token } = useAuthStore.getState();  
              if (!token) throw new Error("No token available");
              const res = await createInvite({inviteType, entityId}, token)
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };

        const handleCreateEmailOccupantInvite = async(
          inviteType: "TENANT" | "HOMEOWNER",
          entityId: number,
          email: string,
          leaseStartDate?: string,
          leaseEndDate?: string
        ) => {
          const { token } = useAuthStore.getState();
          if (!token) throw new Error("No token available");
          const res = await createEmailOccupantInvite({ inviteType, entityId, email, leaseStartDate, leaseEndDate }, token);
          return res.data;
        };

        const handlelistInvites = async(params: SearchParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await listInvites(params, token)
              return res.data; // directly return the response payload
          }

          catch (error) {
                throw error; // rethrow the error after logging it
          } 
        };

        const handlelistUnitInvites = async(unitId: number, params: UnitInviteSearchParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await listUnitInvites(unitId, params, token)
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };


        const handleShareInvite = async(inviteId: number, recipient: string, notificationChannel: "EMAIL" | "SMS") => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await shareInvite(inviteId, recipient, notificationChannel, token)
              return res.data; // directly return the response payload
          }
          catch (error) { 
                throw error; // rethrow the error after logging it
          }
        };

        const handleValidateInviteToken = async(inviteToken: string) => {
          try {
              const { token } = useAuthStore.getState();
              if (token){
                  const res = await validateInviteToken(inviteToken, token )
                  return res.data; 
              }
              else {
                const res = await validateInviteToken(inviteToken)
                return res.data; 
              }
              
              // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };

        const handleViewInviteUnit = async(inviteToken: string) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await viewInviteUnit(inviteToken)
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        };

        const handleSupportedInvites = async() => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await supportedInvites(token)
              return res.data; // directly return the response payload
          }
          catch (error) {
              throw error; // rethrow the error after logging it
          }
        };

        const handleUpdateInvite = async(params: UpdateInviteParams = {}) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await updateInvite(params, token)
              return res.data; // directly return the response payload
          }
          catch (error) {
              throw error; // rethrow the error after logging it
          }
        };

        const handleGetStaffAndInvites = async(propertyId: number) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await getStaffAndInvites(propertyId, token)
              return res.data; // directly return the response payload
          }
          catch (error) {
              throw error; // rethrow the error after logging it
          }
        };

        const handleDeleteStaff = async(staffId: number) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await deleteStaff(staffId, token)
              return res.data; // directly return the response payload
          }
          catch (error) {
              throw error; // rethrow the error after logging it
          }
        };

        const getUserDetails = async () => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await userDetails(token);
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        }

        const handleVerifyContact = async(contact: string, channel: "EMAIL" | "SMS") => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await verifyContact({contact, channel, token});
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        }
        
        const handleUpdateContact = async(otp: string) => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await updateContact(otp, token);
              return res.data; // directly return the response payload
          }
          catch (error) {
                throw error; // rethrow the error after logging it
          }
        }

        const handleRegisterQRCode = async() => {
          try {
              const { token } = useAuthStore.getState();
              if (!token) throw new Error("No token available");
              const res = await registerQRCode(token);
              return res.data; // directly return the response payload
          }
          catch (error) {
              throw error; // rethrow the error after logging it
          }
        }

        const handleUpdateUserDetails = async(data: {name: string; profileType: "INDIVIDUAL" | "COMPANY"; identificationNumber: string; taxPin: string}) => {
          try {
              const { token } = useAuthStore.getState();  
              if (!token) throw new Error("No token available");
              const payload = { ...data, token };
              const res = await updateUserDetails(payload);
              return res.data;
          }
          catch (error) {
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
            return res.data;
          } catch (error: any) {
            if (error?.response?.data?.code === "S0174") {
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
            }
            throw error;
          }
        };

        const handleViewLeaseTemplate = async (templateId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewLeaseTemplate(templateId, token);
            return res.data;
          } catch (error) {
            throw error;
          }
        };

        const handleViewLeaseTemplateUnit = async (unitId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewLeaseTemplateUnit(unitId, token);
            return res.data;
          } catch (error) {
            throw error;
          }
        };

        const handleViewLeaseTemplatePublic = async (inviteToken: string) => {
          try {
            const res = await viewLeaseTemplatePublic(inviteToken);
            return res.data;
          } catch (error) {
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
            return res.data;
          } catch (error: any) {
            if (error?.response?.data?.code === "S0174") {
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
            }
            throw error;
          }
        };

        const handleUpdateLeaseTemplate = async (id: string, data: LeaseTemplatePayload) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await updateLeaseTemplate(id, data, token);
            return res.data;
          } catch (error) {
            throw error;
          }
        };

        const handleDeleteLeaseTemplate = async (templateId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await deleteLeaseTemplate(templateId, token);
            return res.data;
          } catch (error) {
            throw error;
          }
        };

        const handleListTenants = async (unitId: number, params: SearchParams = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listTenants(unitId, params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        };

        const handleListManagers = async ( unitId: number ) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listManagers( unitId, token );
            return res.data;
          }
          catch (error) {
            throw error;
          }
        };

        const handleCreateLeaseTenant = async (inviteToken: string) => {
          try {
            const { token:jwt } = useAuthStore.getState();
            if (!jwt) throw new Error("No token available");
            const payload = { token:inviteToken };
            const res = await createLeaseTenant(payload, jwt);
            if(res.data.code=="S0174"){
              return {profileGate: true, fields: res.data.data[0]} satisfies ProfileGateResult;
            }
            return res.data;

          }
          catch (error: any) {
            if (error?.response?.data?.code === "S0174") {
                return {profileGate: true, fields: error?.response?.data.data[0]} satisfies ProfileGateResult;
            }
            
            throw error;
            
          }
        }

        const handleLeaseMessage = async (leaseId: number, message: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await leaseMessage(message, leaseId, token);
            return res.data;
          } catch (error) {
            throw error;
          }
        }

        const handleListLeaseMessages = async (leaseId: number, params: ListLeaseMessagesParams = {}) => {  
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listLeaseMessages(leaseId, params, token);
            return res.data;
          }

          catch (error) {
            throw error;
          }
        }

        const handleSignLease = async (leaseId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await signLease(leaseId, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleListLeases = async (params: ListInvoicesParams = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listLeases(params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleViewLeasePDF = async (invoiceId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewLeasePDF(invoiceId, token);
            return res.data;
          }
          catch (error) {
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
            const res = await searchProperties(params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

         const handleSearchTenants = async (params: FilterParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await searchTenants(params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

         const handleSearchLandlords = async (params: FilterParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await searchLandlords(params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleSearchUnits = async (params: FilterParams) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await searchUnits(params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleGetSupportedPaymentChannels = async() => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await getSupportedPaymentChannels(token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleInitPayment = async(invoiceRef: string, accountId: number, channel: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await initPayment(invoiceRef, accountId, channel, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleListPayments = async(params: SearchParamswithFilter = {}) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await listPayments(params, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleUpdateFWPayment = async( status: string, ref: string, transactionId: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await updateFWPayment(status, ref, transactionId, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleManualPaymentRecord = async(invoiceRef: string, amount: number, channel?: string, transId?: string, transactionDate?: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await manualPaymentRecord(invoiceRef, amount, token, channel, transId, transactionDate);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleViewParams = async(propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await viewParams(propertyId, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleDeletePropertyParam = async(groupName: string, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await deletePropertyParam(groupName, propertyId, token);
            return res.data;
          }
          catch (error) {
            throw error;
          }
        }

        const handleAddPropertyParam = async(groupName: string, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");
            const res = await addPropertyParam(groupName, propertyId, token);
            return res.data;
          }
          catch (error) {
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

            return res.data;
          } catch (error) {
            throw error;
          }
        };

        // Account Detail
        const handleListAccountDetail = async (accountId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await listAccountDetails(accountId, token);

            return res.data;
          } catch (error) {
            throw error;
          }
        };

        // Active Payment Channels
        const handleActivePaymentChannels = async () => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await activePaymentChannels(token);

            return res.data;
          } catch (error) {
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

            return res.data;
          } catch (error) {
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

            return res.data;
          } catch (error) {
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

            return res.data;
          } catch (error) {
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

            return res.data;
          } catch (error) {
            throw error;
          }
        };

        // Validate the complete setup and make it eligible for routing.
        // There is no SlickHood admin approval in this owner flow.
        const handleRequestAccountVerification = async (accountId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await requestAccountVerification(accountId, token);
            return res.data;
          } catch (error) {
            throw error;
          }
        };

        // Delete Account
        const handleDeleteAccount = async (accountId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await deleteAccount(accountId, token);

            return res.data;
          } catch (error) {
            throw error;
          }
        };

        const handleAttachAccount = async (accountId: number, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await attachAccount(accountId, propertyId, token);

            return res.data;
          } catch (error) {
            throw error;
          }
        }

        const handleDetachAccount = async (accountId: number, propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await detachAccount(accountId, propertyId, token);

            return res.data;
          } catch (error) {
            throw error;
          }
        }

        const handleListPropertyAccounts = async (propertyId: number) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await listPropertyAccounts(propertyId, token);

            return res.data;
          } catch (error) {
            throw error;
          }
        }

        const handleGetDashboardTotals = async (role: string) => {
          try {
            const { token } = useAuthStore.getState();
            if (!token) throw new Error("No token available");

            const res = await getDashboardTotals(role, token);

            return res.data;
          } catch (error) {
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
    handleGetCreateUnitJobStatus,
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
    handleCreateEmailOccupantInvite,
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
