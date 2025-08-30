import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { FiSearch, FiFilter, FiKey, FiEye, FiEyeOff, FiUsers, FiBuilding } from 'react-icons/fi';

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

  const roles = [
    { value: '', label: 'All Roles' },
    { value: 'SUPERADMIN', label: 'Super Admin' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'REGIONAL_MANAGER', label: 'Regional Manager' },
    { value: 'AREA_MANAGER', label: 'Area Manager' },
    { value: 'TECHNICIAN', label: 'Technician' },
    { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
    { value: 'SUPERVISOR', label: 'Supervisor' }
  ];

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
      
      console.log('Changing password for staff:', {
        staff_id: selectedStaff.id,
        staff_name: selectedStaff.name,
        staff_email: selectedStaff.email
      });
      
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
        // Handle validation errors specifically
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Management</h1>
          <p className="text-gray-600">Manage staff members and change passwords</p>
        </div>

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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading staff...</p>
            </div>
          ) : staff.length === 0 ? (
            <div className="p-8 text-center">
              <FiUsers className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No staff members found</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-3">Name & Email</div>
                  <div className="col-span-2">Role</div>
                  <div className="col-span-2">Branch</div>
                  <div className="col-span-2">Company</div>
                  <div className="col-span-2">Mobile</div>
                  <div className="col-span-1">Actions</div>
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-200">
                {staff.map((member) => (
                  <div key={member.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Name & Email */}
                      <div className="col-span-3">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-600">{member.email}</div>
                      </div>

                      {/* Role */}
                      <div className="col-span-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                          {member.role.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Branch */}
                      <div className="col-span-2">
                        {member.branch ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{member.branch.name}</div>
                            <div className="text-xs text-gray-600">{member.branch.branch_type.replace('_', ' ')}</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No branch</span>
                        )}
                      </div>

                      {/* Company */}
                      <div className="col-span-2">
                        <div className="text-sm text-gray-900">{member.company.name}</div>
                      </div>

                      {/* Mobile */}
                      <div className="col-span-2">
                        <div className="text-sm text-gray-900">{member.mobile}</div>
                      </div>

                      {/* Actions */}
                      <div className="col-span-1">
                        <button
                          onClick={() => {
                            setSelectedStaff(member);
                            setShowPasswordModal(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Change Password"
                        >
                          <FiKey className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to {Math.min(pagination.currentPage * pagination.limit, pagination.totalCount)} of {pagination.totalCount} results
                    </div>
                    <div className="flex gap-2">
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
            </>
          )}
        </div>
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
    </div>
  );
};

export default StaffManagement;