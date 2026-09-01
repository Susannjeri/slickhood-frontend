// src/components/UserTable.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Trash2, UserPlus, X } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { inviteInternalStaff, InternalStaffRole } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { normalizedRoleTitle, roleDisplayName } from '@/config/businessAreas';

interface ProfileType {
  id: string;
  name: string;
  description?: string | null;
}

interface User {
  name: string | null;
  email: string;
  registrationDate: string;
  lastLogin: string;
  registrationIp: string;
  country: string | null;
  city: string | null;
  source: string;
  active: boolean;
  profileType: ProfileType;
  userTypes: string[];
}

interface UserListResponse {
  success: boolean;
  code: string;
  description: string;
  data: User[];
  totalPages: number;
  totalElements: number;
  size: number;
}

export default function UserTable() {
  const { getUserList, deleteUser } = useApi();
  const token = useAuthStore((state) => state.token);
  const activeRole = useAuthStore((state) => state.activeRole?.title);
  const isSuperadmin = normalizedRoleTitle(activeRole) === 'superadmin';

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<InternalStaffRole>('SUPPORT');
  const [inviteSaving, setInviteSaving] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  // Table state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(14);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users
  useEffect(() => {
    loadUsers();
  }, [page, pageSize, debouncedSearch, sortField, sortOrder]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: UserListResponse = await getUserList({
        page,
        size: pageSize,
        search: debouncedSearch,
        sort: `${sortField},${sortOrder}`,
      });

      setUsers(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortOrder === 'asc'
      ? <ChevronUp className="w-4 h-4 ml-1" />
      : <ChevronDown className="w-4 h-4 ml-1" />;
  };

  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalElements);

  const submitStaffInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !inviteEmail.trim()) return;
    setInviteSaving(true);
    setInviteMessage(null);
    try {
      const response = await inviteInternalStaff(inviteEmail.trim(), inviteRole, token);
      const result = response.data?.data?.[0] ?? response.data?.data;
      setInviteMessage(`Invitation sent to ${result?.email ?? inviteEmail.trim()}.`);
      setInviteEmail('');
    } catch (err: any) {
      setInviteMessage(err?.response?.data?.description ?? 'The staff invitation could not be sent.');
    } finally {
      setInviteSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Users &amp; Staff</h2>
          <p className="text-sm text-muted-foreground">View system users and securely invite authorised SlickHood or Silverwood staff.</p>
        </div>
        {isSuperadmin && (
          <button type="button" onClick={() => { setInviteMessage(null); setInviteOpen(true); }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-[#EF4217] px-4 py-2 font-semibold text-white hover:bg-[#d93a13]">
            <UserPlus className="h-4 w-4" /> Create staff invitation
          </button>
        )}
      </div>

      {inviteOpen && isSuperadmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="staff-invite-title">
          <form onSubmit={submitStaffInvite} className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div><h3 id="staff-invite-title" className="text-xl font-bold">Invite SlickHood or Silverwood staff</h3><p className="mt-1 text-sm text-muted-foreground">The staff member will set their own password using a one-time invitation bound to this email. No password is shared with an administrator.</p></div>
              <button type="button" onClick={() => setInviteOpen(false)} aria-label="Close" className="rounded-md p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            <label className="block space-y-2"><span className="text-sm font-semibold">Work email</span><input type="email" required maxLength={254} autoComplete="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full rounded-md border px-3 py-2" placeholder="name@company.com" /></label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold">Organisation and staff role</span>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as InternalStaffRole)} className="w-full rounded-md border px-3 py-2">
                <optgroup label="SlickHood">
                  <option value="SUPPORT">Support</option>
                  <option value="SALES_MARKETING">Sales &amp; Marketing</option>
                  <option value="FINANCE">Finance</option>
                </optgroup>
                <optgroup label="Silverwood Insurance Agency">
                  <option value="INSURANCE_ADVISER">Insurance Adviser</option>
                  <option value="INSURANCE_MANAGER">Insurance Manager</option>
                </optgroup>
              </select>
            </label>
            {inviteMessage && <p className="rounded-md bg-slate-50 px-3 py-2 text-sm" role="status">{inviteMessage}</p>}
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setInviteOpen(false)} className="rounded-md border px-4 py-2">Close</button><button type="submit" disabled={inviteSaving || !inviteEmail.trim()} className="inline-flex min-w-36 items-center justify-center rounded-md bg-[#EF4217] px-4 py-2 font-semibold text-white disabled:opacity-50">{inviteSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send invitation'}</button></div>
          </form>
        </div>
      )}

      {/* Search + Rows per page */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-10 pr-4 py-2 border rounded-md"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="10">10</option>
            <option value="14">14</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button onClick={() => handleSort('email')} className="flex items-center">
                  Email {getSortIcon('email')}
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center">
                  Name 
                </button>
              </TableHead>
              <TableHead>User Type</TableHead>
              <TableHead>
                <button className="flex items-center">
                  Location 
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center">
                  Registration 
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center">
                  Last Login 
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              {
              // uncomment once sorting is implemented for these fields

              /* <TableHead>
                <button onClick={() => handleSort('name')} className="flex items-center">
                  Name {getSortIcon('name')}
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('country')} className="flex items-center">
                  Location {getSortIcon('country')}
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('registrationDate')} className="flex items-center">
                  Registration {getSortIcon('registrationDate')}
                </button>
              </TableHead>
              <TableHead>
                <button onClick={() => handleSort('lastLogin')} className="flex items-center">
                  Last Login {getSortIcon('lastLogin')}
                </button>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead> */}
              {/* <TableHead className="text-right">Actions</TableHead> */}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Loading users...</p>
                </TableCell>
              </TableRow>
             ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
             ) : (
              users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.name || '—'}</TableCell>
                  <TableCell className="min-w-48">
                    <div className="flex flex-wrap gap-1.5">
                      {user.userTypes?.length ? user.userTypes.map((userType) => (
                        <span key={userType} className="inline-flex rounded-full bg-orange-50 px-2 py-1 text-xs font-medium text-orange-800">
                          {roleDisplayName(userType)}
                        </span>
                      )) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                          No role assigned
                        </span>
                      )}
                    </div>
                    {user.profileType?.name && (
                      <span className="mt-1.5 block text-xs text-muted-foreground">{user.profileType.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.country ? `${user.city || ''}, ${user.country}` : '—'}
                  </TableCell>
                  <TableCell>{new Date(user.registrationDate).toLocaleDateString()}</TableCell>
                  <TableCell>{user.lastLogin}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      user.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                      {user.source}
                    </span>
                  </TableCell>
                  
                  {
                  // Not needed now that users can't be deleted
                  // uncomment when functionality is implemented

                  /* <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button className="text-red-600 hover:text-red-800 p-1" title="Delete user">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete <strong>{user.email}</strong>? This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteUser(user.email);
                              loadUsers();
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell> */}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing <span className="font-medium">{startIndex + 1}</span>–<span className="font-medium">{endIndex}</span> of{' '}
          <span className="font-medium">{totalElements}</span> users
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(0)}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            First
          </button>
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>Page {page + 1} of {totalPages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
          <button
            onClick={() => setPage(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}




// // src/components/UserTable.tsx - Non shadcn version
// 'use client';

// import React, { useState, useEffect } from 'react';
// import { Search, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Trash2 } from 'lucide-react';
// import { useApi } from '@/hooks/useApi';

// interface User {
//   name: string | null;
//   email: string;
//   registrationDate: string;
//   lastLogin: string;
//   registrationIp: string;
//   country: string | null;
//   city: string | null;
//   source: string;
//   active: boolean;
// }

// interface UserListResponse {
//   success: boolean;
//   code: string;
//   description: string;
//   data: User[];
//   totalPages: number;
//   totalElements: number;
//   size: number;
// }

// export default function UserTable() {
//   const { getUserList, deleteUser } = useApi();
  
//   const [users, setUsers] = useState<User[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
  
//   // Table state
//   const [page, setPage] = useState(0);
//   const [pageSize, setPageSize] = useState(14);
//   const [totalPages, setTotalPages] = useState(0);
//   const [totalElements, setTotalElements] = useState(0);
//   const [search, setSearch] = useState('');
//   const [sortField, setSortField] = useState('id');
//   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
//   // Debounced search - prevents API call on every keystroke
//   const [debouncedSearch, setDebouncedSearch] = useState('');

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       setDebouncedSearch(search);
//     }, 500); // 500ms delay

//     return () => clearTimeout(timer);
//   }, [search]);

//   // Load users whenever params change
//   useEffect(() => {
//     loadUsers();
//   }, [page, pageSize, debouncedSearch, sortField, sortOrder]);

//   const loadUsers = async () => {
//     try {
//       setLoading(true);
//       setError(null);
      
//       const response: UserListResponse = await getUserList({
//         page,
//         size: pageSize,
//         search: debouncedSearch,
//         sort: `${sortField},${sortOrder}`
//       });
      
//       setUsers(response.data);
//       setTotalPages(response.totalPages);
//       setTotalElements(response.totalElements);
//     } catch (err: any) {
//       setError(err.message || 'Failed to load users');
//       console.error('Error loading users:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSort = (field: string) => {
//     if (sortField === field) {
//       // Toggle sort order if clicking same field
//       setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
//     } else {
//       // Set new field and default to ascending
//       setSortField(field);
//       setSortOrder('asc');
//     }
//     setPage(0); // Reset to first page when sorting
//   };

//   const handleDelete = async (email: string) => {
//     if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
//       try {
//         await deleteUser(email);
//         loadUsers(); // Reload the list after deletion
//       } catch (err) {
//         console.error('Delete failed:', err);
//         alert('Failed to delete user');
//       }
//     }
//   };

//   const getSortIcon = (field: string) => {
//     if (sortField !== field) {
//       return <ChevronsUpDown className="w-4 h-4 ml-1 text-gray-400" />;
//     }
//     return sortOrder === 'asc' 
//       ? <ChevronUp className="w-4 h-4 ml-1" />
//       : <ChevronDown className="w-4 h-4 ml-1" />;
//   };

//   const startIndex = page * pageSize;
//   const endIndex = Math.min(startIndex + pageSize, totalElements);

//   return (
//     <div className="w-full space-y-4 p-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h2 className="text-2xl font-bold tracking-tight">Users</h2>
//           <p className="text-sm text-gray-500 mt-1">
//             Manage your user accounts
//           </p>
//         </div>
//       </div>

//       {/* Search Bar and Page Size Selector */}
//       <div className="flex items-center gap-4">
//         <div className="relative flex-1 max-w-sm">
//           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//           <input
//             type="text"
//             placeholder="Search users..."
//             value={search}
//             onChange={(e) => {
//               setSearch(e.target.value);
//               setPage(0); // Reset to first page on search
//             }}
//             className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>
        
//         <div className="flex items-center gap-2">
//           <span className="text-sm text-gray-600">Rows per page:</span>
//           <select
//             value={pageSize}
//             onChange={(e) => {
//               setPageSize(Number(e.target.value));
//               setPage(0); // Reset to first page when changing page size
//             }}
//             className="border rounded px-2 py-1 text-sm"
//           >
//             <option value="10">10</option>
//             <option value="14">14</option>
//             <option value="20">20</option>
//             <option value="50">50</option>
//           </select>
//         </div>
//       </div>

//       {/* Error Message */}
//       {error && (
//         <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
//           {error}
//         </div>
//       )}

//       {/* Table */}
//       <div className="border rounded-lg overflow-hidden">
//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-gray-50 border-b">
//               <tr>
//                 <th className="text-left p-4">
//                   <button
//                     onClick={() => handleSort('email')}
//                     className="flex items-center font-medium text-sm hover:text-blue-600"
//                   >
//                     Email
//                     {getSortIcon('email')}
//                   </button>
//                 </th>
//                 <th className="text-left p-4">
//                   <button
//                     onClick={() => handleSort('name')}
//                     className="flex items-center font-medium text-sm hover:text-blue-600"
//                   >
//                     Name
//                     {getSortIcon('name')}
//                   </button>
//                 </th>
//                 <th className="text-left p-4">
//                   <button
//                     onClick={() => handleSort('country')}
//                     className="flex items-center font-medium text-sm hover:text-blue-600"
//                   >
//                     Location
//                     {getSortIcon('country')}
//                   </button>
//                 </th>
//                 <th className="text-left p-4">
//                   <button
//                     onClick={() => handleSort('registrationDate')}
//                     className="flex items-center font-medium text-sm hover:text-blue-600"
//                   >
//                     Registration
//                     {getSortIcon('registrationDate')}
//                   </button>
//                 </th>
//                 <th className="text-left p-4">
//                   <button
//                     onClick={() => handleSort('lastLogin')}
//                     className="flex items-center font-medium text-sm hover:text-blue-600"
//                   >
//                     Last Login
//                     {getSortIcon('lastLogin')}
//                   </button>
//                 </th>
//                 <th className="text-left p-4">
//                   <span className="font-medium text-sm">Status</span>
//                 </th>
//                 <th className="text-left p-4">
//                   <span className="font-medium text-sm">Source</span>
//                 </th>
//                 <th className="text-right p-4">
//                   <span className="font-medium text-sm">Actions</span>
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="divide-y">
//               {loading ? (
//                 <tr>
//                   <td colSpan={8} className="text-center py-12">
//                     <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
//                     <p className="text-sm text-gray-500 mt-2">Loading users...</p>
//                   </td>
//                 </tr>
//               ) : users.length === 0 ? (
//                 <tr>
//                   <td colSpan={8} className="text-center py-12 text-gray-500">
//                     No users found
//                   </td>
//                 </tr>
//               ) : (
//                 users.map((user, idx) => (
//                   <tr key={idx} className="hover:bg-gray-50">
//                     <td className="p-4 text-sm font-medium">{user.email}</td>
//                     <td className="p-4 text-sm">{user.name || '—'}</td>
//                     <td className="p-4 text-sm">
//                       {user.country ? `${user.city || ''}, ${user.country}` : '—'}
//                     </td>
//                     <td className="p-4 text-sm">
//                       {new Date(user.registrationDate).toLocaleDateString()}
//                     </td>
//                     <td className="p-4 text-sm">{user.lastLogin}</td>
//                     <td className="p-4">
//                       <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
//                         user.active 
//                           ? 'bg-green-100 text-green-800' 
//                           : 'bg-gray-100 text-gray-800'
//                       }`}>
//                         {user.active ? 'Active' : 'Inactive'}
//                       </span>
//                     </td>
//                     <td className="p-4">
//                       <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
//                         {user.source}
//                       </span>
//                     </td>
//                     <td className="p-4 text-right">
//                       <button
//                         onClick={() => handleDelete(user.email)}
//                         className="text-red-600 hover:text-red-800 p-1"
//                         title="Delete user"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Pagination */}
//       <div className="flex items-center justify-between px-2">
//         <div className="text-sm text-gray-600">
//           Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
//           <span className="font-medium">{endIndex}</span> of{' '}
//           <span className="font-medium">{totalElements}</span> users
//         </div>
        
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => setPage(0)}
//             disabled={page === 0}
//             className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
//           >
//             First
//           </button>
//           <button
//             onClick={() => setPage(page - 1)}
//             disabled={page === 0}
//             className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
//           >
//             Previous
//           </button>
          
//           <span className="px-3 py-1 text-sm">
//             Page <span className="font-medium">{page + 1}</span> of{' '}
//             <span className="font-medium">{totalPages}</span>
//           </span>
          
//           <button
//             onClick={() => setPage(page + 1)}
//             disabled={page >= totalPages - 1}
//             className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
//           >
//             Next
//           </button>
//           <button
//             onClick={() => setPage(totalPages - 1)}
//             disabled={page >= totalPages - 1}
//             className="px-3 py-1 border rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
//           >
//             Last
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
