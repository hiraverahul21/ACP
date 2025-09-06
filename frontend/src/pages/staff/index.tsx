import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import { PermissionGate } from '@/context/PermissionContext';
import Navigation from '@/components/layout/Navigation';
import { FiSearch, FiFilter, FiKey, FiEye, FiEyeOff, FiUsers, FiBuilding, FiPlus } from 'react-icons/fi';
import { Bars3Icon } from '@heroicons/react/24/outline';
import AddStaffForm from '@/components/forms/AddStaffForm';

interface Staff {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: string;
  is_active: boolean;
  created_at: string;
  company: {
    id: string;
    name: string;
  };
  branch: {
    id: string;
    name: string;
    branch_type: string;
  } | null;
}

interface Branch {
  id: string;
  name: string;
  branch_type: string;
  city: string;
  company: {
    id: string;
    name: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

const StaffManagement: React.FC = () => {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10
  });
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Password change modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Add staff modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  
  // Handle staff creation success
  const handleStaffCreated = () => {
    fetchStaff(); // Refresh the staff list
  };

  const roles = [
    { value: '', label: 'All Roles' },
    { value: 'SUPERADMIN', label: 'Super Admin' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
    { value: 'AREA_MANAGER', label: 'Area Manager' },
    { value: 'OPERATION_MANAGER', label: 'Operation Manager' },
    { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
    { value: 'ACCOUNT_MANAGER', label: 'Account Manager' },
    { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
    { value: 'SUPERVISOR', label: 'Supervisor' },
    { value: 'TECHNICIAN', label: 'Technician' },
    { value: 'CUSTOMER', label: 'Customer' }
  ];

  const handleNavClick = (href: string) => {
    router.push(href);
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  // Fetch staff data
  const fetchStaff = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(roleFilter && { role: roleFilter }),
        ...(branchFilter && { branch_id: branchFilter })
      });

      const response = await fetch(`/api/staff/list?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/auth');
          return;
        }
        throw new Error('Failed to fetch staff');
      }

      const data = await response.json();
      setStaff(data.data.staff);
      setPagination(data.data.pagination);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch branches for filter dropdown
  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/staff/branches', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBranches(data.data);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  // Change password
  const handlePasswordChange = async () => {
    if (!selectedStaff) return;
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    try {
      setPasswordLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/staff/admin/change-password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          new_password: newPassword
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.errors) {
          const validationErrors = errorData.errors.map((err: any) => err.msg || err.message).join(', ');
          throw new Error(validationErrors);
        }
        throw new Error(errorData.message || 'Failed to change password');
      }

      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setSelectedStaff(null);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Handle search and filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchStaff(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search, roleFilter, branchFilter]);

  useEffect(() => {
    fetchStaff();
    fetchBranches();
  }, []);

  const getRoleBadgeColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'SUPERADMIN': 'bg-purple-100 text-purple-800',
      'ADMIN': 'bg-blue-100 text-blue-800',
      'REGIONAL_MANAGER': 'bg-green-100 text-green-800',
      'AREA_MANAGER': 'bg-yellow-100 text-yellow-800',
      'TECHNICIAN': 'bg-gray-100 text-gray-800',
      'INVENTORY_MANAGER': 'bg-orange-100 text-orange-800',
      'SUPERVISOR': 'bg-indigo-100 text-indigo-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Staff Management - Pest Control Management</title>
        <meta name="description" content="Manage staff members and change passwords" />
      </Head>

      <Navigation
        currentPath={router.pathname}
        onNavClick={handleNavClick}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden mr-4 text-gray-600 hover:text-gray-900"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Staff Management
                  </h1>
                  <p className="text-sm text-gray-600">
                    Manage staff members and change passwords
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <PermissionGate module="STAFF" action="CREATE">
                  <button
                    onClick={() => setShowAddStaffModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <FiPlus className="-ml-1 mr-2 h-4 w-4" />
                    Add Staff
                  </button>
                </PermissionGate>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{user.role}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, email, or mobile..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <FiFilter className="w-4 h-4" />
                  Filters
                </button>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Role Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {roles.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Branch Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch
                      </label>
                      <select
                        value={branchFilter}
                        onChange={(e) => setBranchFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">All Branches</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name} - {branch.city}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Staff List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading staff...</span>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-5 h-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900">
                          Staff Members ({pagination.totalCount})
                        </h2>
                      </div>
                    </div>
                  </div>

                  {staff.length === 0 ? (
                    <div className="text-center py-12">
                      <FiUsers className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No staff found</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {search || roleFilter || branchFilter
                          ? 'Try adjusting your search or filter criteria.'
                          : 'No staff members available.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Name & Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Branch
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Company
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Mobile
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {staff.map((member) => (
                            <tr key={member.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {member.email}
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  getRoleBadgeColor(member.role)
                                }`}>
                                  {member.role}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {member.branch ? (
                                  <div>
                                    <div className="font-medium">{member.branch.name}</div>
                                    <div className="text-xs text-gray-500 uppercase">
                                      {member.branch.branch_type}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">No branch</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {member.company.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {member.mobile}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <PermissionGate module="STAFF" action="EDIT">
                                  <button
                                    onClick={() => {
                                      setSelectedStaff(member);
                                      setShowPasswordModal(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-900"
                                  >
                                    <FiKey className="w-4 h-4" />
                                    Change Password
                                  </button>
                                </PermissionGate>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination */}
                  {pagination.totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                          Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{' '}
                          {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of{' '}
                          {pagination.totalCount} results
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => fetchStaff(pagination.currentPage - 1)}
                            disabled={pagination.currentPage === 1}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Previous
                          </button>
                          <span className="px-3 py-1 text-sm">
                            Page {pagination.currentPage} of {pagination.totalPages}
                          </span>
                          <button
                            onClick={() => fetchStaff(pagination.currentPage + 1)}
                            disabled={pagination.currentPage === pagination.totalPages}
                            className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Change Password for {selectedStaff.name}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-medium mb-1">Password requirements:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>At least 8 characters long</li>
                    <li>At least one uppercase letter (A-Z)</li>
                    <li>At least one lowercase letter (a-z)</li>
                    <li>At least one number (0-9)</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedStaff(null);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={passwordLoading}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={passwordLoading || !newPassword || !confirmPassword}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
         </div>
       )}
      
      {/* Add Staff Modal */}
      <AddStaffForm
        isOpen={showAddStaffModal}
        onClose={() => setShowAddStaffModal(false)}
        onSuccess={handleStaffCreated}
      />
     </div>
   );
};

export default StaffManagement;