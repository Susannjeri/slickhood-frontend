"use client"


import { useAuthStore } from "@/store/authStore";
import { Visitor } from "./types";
import { useEffect, useState } from "react";
import { getGuardHostOptions, getVisitors, GuardHostOption, registerUnplannedVisit, updateVisitorStatus } from "@/services/visitors.service";
import { Eye, Clock, LogOut, UserCheck, Users, XCircle, LogIn, UserPlus, X } from "lucide-react";
import SuccessModal from "../common/successmodal";
import { formatDateTime, statusStyles, VisitorDetailsModal } from "./visitordetails-modal";
import SummaryCard from "./summarycard";



export default function VisitorManagement() {

    const { token } = useAuthStore();
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [phoneSearch, setPhoneSearch] = useState("");
    const [debouncedPhone, setDebouncedPhone] = useState("");

    const totalVisitors = visitors.length;

    const checkedInVisitors = visitors.filter(
        (visitor) =>
            visitor.status === "CHECKED_IN"
    ).length;

    const pendingVisitors = visitors.filter(
        (visitor) =>
            visitor.status === "PENDING"
    ).length;

    const checkedOutVisitors = visitors.filter(
        (visitor) =>
            visitor.status === "CHECKED_OUT"
    ).length;

    const cancelledVisitors = visitors.filter(
        (visitor) =>
            visitor.status === "CANCELLED"
    ).length;
    const walkIns = visitors.filter((visitor) => visitor.visitType === "WALK_IN").length;
    const driveIns = visitors.filter((visitor) => visitor.visitType === "DRIVE_IN").length;
    const deliveries = visitors.filter((visitor) => visitor.visitType === "DELIVERY").length;

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedPhone(phoneSearch);
        }, 400);
        return () => clearTimeout(timeout);
    }, [phoneSearch]);

    const fetchVisitors = async () => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            const res = await getVisitors(token, {
                phoneNumber: debouncedPhone || undefined,
                size: 50,
            });
            setVisitors(res.data?.data ?? res.data ?? []);
        } catch (err) {
            console.error(err);
            setError("Failed to load visitors. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVisitors();
    }, [token, debouncedPhone]);


    const handleCheckIn = async (visitor: Visitor) => {
        if (!token) return;
        try {
            await updateVisitorStatus(visitor.id, "CHECKED_IN", token, visitor.vehiclePlate);
            fetchVisitors();
        } catch (caught: unknown) {
            const apiError = caught as { response?: { data?: { description?: string } } };
            setError(apiError.response?.data?.description ?? "Check-in was denied. Confirm approval, access time, vehicle and entry limit.");
        }
    };

    const handleCheckOut = async (visitor: Visitor) => {
        if (!token) return;
        try {
            await updateVisitorStatus(visitor.id, "CHECKED_OUT", token);
            fetchVisitors();
        } catch (caught: unknown) {
            const apiError = caught as { response?: { data?: { description?: string } } };
            setError(apiError.response?.data?.description ?? "Check-out could not be completed.");
        }
    };


    return (
        <div className="space-y-4 px-2 py-5">

            {/* Visitor Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 justify-start ">

                {/* Total */}
                <SummaryCard
                    title="Total Visitors"
                    value={totalVisitors}
                    icon={<Users className="h-6 w-6" />}
                />


                {/* Inside */}
                <SummaryCard
                    title="Currently Inside"
                    value={checkedInVisitors}
                    icon={<UserCheck className="h-6 w-6" />}
                />


                {/* Waiting */}
                <SummaryCard
                    title="Waiting Check-In"
                    value={pendingVisitors}
                    icon={<Clock className="h-6 w-6" />}
                />


                {/* Checked Out */}
                <SummaryCard
                    title="Checked Out"
                    value={checkedOutVisitors}
                    icon={<LogOut className="h-6 w-6" />}
                />


                {/* Cancelled */}
                <SummaryCard
                    title="Cancelled"
                    value={cancelledVisitors}
                    icon={<XCircle className="h-6 w-6" />}
                />
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[#020B2D]/10 bg-white p-4">
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Walk-ins</p><p className="mt-1 text-2xl font-semibold text-[#020B2D]">{walkIns}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Drive-ins</p><p className="mt-1 text-2xl font-semibold text-[#020B2D]">{driveIns}</p></div>
                <div><p className="text-xs uppercase tracking-wide text-gray-500">Deliveries</p><p className="mt-1 text-2xl font-semibold text-[#020B2D]">{deliveries}</p></div>
            </div>


            {/* Visitors Table */}
            <div className="rounded-2xl border border-[#020B2D]/10 bg-white shadow-sm overflow-hidden">

                <div className="flex items-center justify-between px-6 py-6 border-b border-gray-100">
                    <div className="flex items-center gap-6">
                        <div>
                            <h2 className="text-lg font-semibold text-[#020B2D]">Visitor List</h2>
                            <p className="text-sm text-gray-500 mt-1">All registered visitors.</p>
                        </div>


                    </div>

                    <input
                        type="text"
                        placeholder="Enter full phone number"
                        value={phoneSearch}
                        onChange={(e) => setPhoneSearch(e.target.value)}
                        className="rounded-xl border border-[#020B2D]/15 px-3 py-2.5 text-sm w-64 focus:outline-none focus:border-[#08184A]"
                    />
                    <button onClick={() => setShowRegisterModal(true)} className="ml-2 inline-flex items-center gap-2 rounded-xl bg-[#FF4B1F] px-4 py-2.5 text-sm font-medium text-white"><UserPlus className="h-4 w-4"/>Record arrival</button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="text-[#08184A] font-bold">
                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ">
                                    Visitor
                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ">
                                    Category
                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ">
                                    Vehicle
                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ">
                                    Unit
                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ">
                                    Property
                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ">
                                    Expected Arrival
                                </th>

                                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ">
                                    Status
                                </th>

                                <th className="px-6 py-4 text-xs text-left font-semibold uppercase tracking-wider ">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                                        Loading visitors...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-red-500">
                                        {error}
                                    </td>
                                </tr>
                            ) : visitors.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center text-gray-500">
                                        No visitors found.
                                    </td>
                                </tr>
                            ) : (
                                visitors.map((visitor) => (
                                    <tr key={visitor.id} className="border-t border-gray-100">
                                        <td className="px-6 py-4 text-sm">
                                            {visitor.visitorName}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {(visitor.visitType || visitor.visitorCategory).replaceAll("_", " ")}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {visitor.vehiclePlate || "-"}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {visitor.unitRef}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {visitor.propertyName}
                                        </td>

                                        <td className="px-6 py-4 text-sm ">
                                            {formatDateTime(visitor.expectedArrivalTime)}
                                        </td>

                                        <td className="px-6 py-4 text-sm">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[visitor.status] ??
                                                    "bg-gray-50 text-gray-600 border border-gray-200"
                                                    }`}
                                            >
                                                {visitor.status}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">

                                                {/* View */}
                                                <button
                                                    onClick={() => setSelectedVisitor(visitor)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-[#020B2D]/15 bg-white px-3 py-2 text-xs font-medium text-[#020B2D] transition-all duration-200 hover:border-[#020B2D] hover:bg-[#020B2D]/5 hover:shadow-sm"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </button>

                                                {/* Check in only after resident pre-registration or host approval. */}
                                                {["PENDING", "APPROVED", "ARRIVED"].includes(visitor.status) && (
                                                    <button
                                                        onClick={() => handleCheckIn(visitor)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-[#FF4B1F]/20 bg-[#FF4B1F]/10 px-3 py-2 text-xs font-medium text-[#FF4B1F] transition-all duration-200 hover:border-[#FF4B1F]/40 hover:bg-[#FF4B1F]/20 hover:shadow-sm"
                                                    >
                                                        <LogIn className="h-4 w-4" />
                                                        Check In
                                                    </button>
                                                )}

                                                {/* Check Out - only when CHECKED_IN */}
                                                {visitor.status === "CHECKED_IN" && (
                                                    <button
                                                        onClick={() => handleCheckOut(visitor)}
                                                        className="inline-flex items-center gap-2 rounded-lg border border-[#08184A]/15 bg-[#08184A]/5 px-3 py-2 text-xs font-medium text-[#08184A] transition-all duration-200 hover:border-[#08184A]/30 hover:bg-[#08184A]/10 hover:shadow-sm"
                                                    >
                                                        <LogOut className="h-4 w-4" />
                                                        Check Out
                                                    </button>
                                                )}

                                            </div>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* View Details Modal */}
            {selectedVisitor && (
                <VisitorDetailsModal
                    visitor={selectedVisitor}
                    onClose={() => setSelectedVisitor(null)}
                />
            )}

            {/* Register Visitor Modal */}
            {showRegisterModal && <GuardArrivalModal onClose={() => setShowRegisterModal(false)} onSaved={() => { setShowRegisterModal(false); setSuccessMessage("Arrival recorded and sent to the host for approval."); fetchVisitors(); }} />}

            <SuccessModal
                open={!!successMessage}
                title="Success"
                message={successMessage ?? ""}
                onClose={() => setSuccessMessage(null)}
            />

        </div>
    );
}

function GuardArrivalModal({onClose,onSaved}:{onClose:()=>void;onSaved:()=>void}) {
    const {token}=useAuthStore();
    const [options,setOptions]=useState<GuardHostOption[]>([]);
    const [selected,setSelected]=useState("");
    const [form,setForm]=useState({visitorName:"",visitorPhoneNumber:"",visitType:"WALK_IN" as "WALK_IN"|"DRIVE_IN"|"DELIVERY",vehiclePlate:"",companyName:"",trackingNumber:"",purpose:""});
    const [error,setError]=useState("");
    useEffect(()=>{if(token)getGuardHostOptions(token).then(r=>setOptions(r.data?.data??[])).catch(()=>setError("Host list could not be loaded."));},[token]);
    const save=async()=>{const option=options.find(o=>`${o.unitId}:${o.hostUserId}`===selected);if(!token||!option||!form.visitorName.trim()||!form.visitorPhoneNumber.trim())return setError("Visitor, phone and host are required.");if(form.visitType==="DRIVE_IN"&&!form.vehiclePlate.trim())return setError("Vehicle plate is required for drive-in access.");
        const arrival=new Date(Date.now()+60_000);const localArrival=new Date(arrival.getTime()-arrival.getTimezoneOffset()*60_000);const apiTime=localArrival.toISOString().slice(0,19).replace("T"," ");
        try{await registerUnplannedVisit({...form,unitId:option.unitId,hostUserId:option.hostUserId,expectedArrivalTime:apiTime,parkingLot:"",chargeable:false,visitorCategory:form.visitType==="DELIVERY"?"DELIVERY":"GUEST",maxEntries:1},token);onSaved();}catch(e:any){setError(e?.response?.data?.description??"Arrival could not be recorded.");}};
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"><div className="flex justify-between"><div><h3 className="text-lg font-semibold">Record unplanned arrival</h3><p className="text-sm text-gray-500">The host must approve before entry.</p></div><button onClick={onClose}><X/></button></div>
        <div className="mt-5 space-y-3">{error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="grid grid-cols-3 gap-2">{(["WALK_IN","DRIVE_IN","DELIVERY"] as const).map(t=><button key={t} onClick={()=>setForm({...form,visitType:t})} className={`rounded-xl border p-3 text-xs font-semibold ${form.visitType===t?"border-[#FF4B1F] bg-[#FF4B1F]/10 text-[#FF4B1F]":""}`}>{t.replace("_"," ")}</button>)}</div>
        <input value={form.visitorName} onChange={e=>setForm({...form,visitorName:e.target.value})} placeholder="Visitor name" className="w-full rounded-xl border p-3 text-sm"/><input value={form.visitorPhoneNumber} onChange={e=>setForm({...form,visitorPhoneNumber:e.target.value})} placeholder="Phone number" className="w-full rounded-xl border p-3 text-sm"/>
        <select value={selected} onChange={e=>setSelected(e.target.value)} className="w-full rounded-xl border p-3 text-sm"><option value="">Select host and unit</option>{options.map(o=><option key={`${o.unitId}:${o.hostUserId}`} value={`${o.unitId}:${o.hostUserId}`}>{o.hostName} · {o.unitRef} · {o.propertyName}</option>)}</select>
        <input value={form.purpose} onChange={e=>setForm({...form,purpose:e.target.value})} placeholder="Purpose" className="w-full rounded-xl border p-3 text-sm"/>{form.visitType!=="WALK_IN"&&<input value={form.vehiclePlate} onChange={e=>setForm({...form,vehiclePlate:e.target.value.toUpperCase()})} placeholder="Vehicle plate" className="w-full rounded-xl border p-3 text-sm"/>}{form.visitType==="DELIVERY"&&<><input value={form.companyName} onChange={e=>setForm({...form,companyName:e.target.value})} placeholder="Courier / company" className="w-full rounded-xl border p-3 text-sm"/><input value={form.trackingNumber} onChange={e=>setForm({...form,trackingNumber:e.target.value})} placeholder="Tracking / order reference" className="w-full rounded-xl border p-3 text-sm"/></>}
        <button onClick={save} className="w-full rounded-xl bg-[#020B2D] p-3 font-semibold text-white">Request host approval</button></div></div></div>;
}
