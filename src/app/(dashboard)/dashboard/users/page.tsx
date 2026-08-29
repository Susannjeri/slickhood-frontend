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
import { Search, ChevronDown, ChevronUp, ChevronsUpDown, Loader2, Trash2 } from 'lucide-react';
import { useApi } from '@/hooks/useApi';

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

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Users</h2>
        <p className="text-sm text-muted-foreground">Manage your user accounts</p>
      </div>

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
      <div className="border rounded-md">
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