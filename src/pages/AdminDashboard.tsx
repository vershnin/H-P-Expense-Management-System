import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building,
  Plus,
  Search,
  Filter,
  PieChart,
  LogOut,
  X,
  FileImage,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Receipt,
  FileText,
  Settings,
  Wallet,
  Edit,
  UserIcon,
  Eye,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/toaster";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ===============================
// API SERVICE FUNCTIONS - NEW
// ===============================
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Enhanced API call function with better error handling
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem("auth_token");
  
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API Error for ${endpoint}:`, error);
    throw error;
  }
};

// File upload function
const uploadFile = async (endpoint: string, formData: FormData) => {
  const token = localStorage.getItem("auth_token");
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message || "File upload failed");
  }

  return response.json();
};

// API endpoint functions - UPDATED
const fetchFloats = () => apiCall("/floats");
const fetchExpenses = () => apiCall("/expenses");
const fetchDashboardStats = () => apiCall("/dashboard/stats");
const fetchLocations = () => apiCall("/locations");
const fetchCategories = () => apiCall("/categories");
const fetchCurrencies = () => apiCall("/currencies");
const fetchPolicies = () => apiCall("/policies");
const fetchAuditLogs = () => apiCall("/audit-logs");

const createFloat = (data: any) =>
  apiCall("/floats", {
    method: "POST",
    body: JSON.stringify(data),
  });

const updateFloat = (id: string, data: any) =>
  apiCall(`/floats/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

const deleteFloat = (id: string) =>
  apiCall(`/floats/${id}`, {
    method: "DELETE",
  });

const createExpense = (data: any) =>
  apiCall("/expenses", {
    method: "POST",
    body: JSON.stringify(data),
  });

const approveExpense = (
  id: string,
  action: "approve" | "reject",
  comments?: string
) =>
  apiCall(`/expenses/approve/${id}`, {
    method: "POST",
    body: JSON.stringify({ action, comments }),
  });

const markExpenseAsPaid = (id: string) =>
  apiCall(`/expenses/${id}/pay`, {
    method: "POST",
  });

// ===============================
// ENHANCED INTERFACES - UPDATED
// ===============================
interface FloatData {
  id: string;
  code: string;
  description: string;
  location: string;
  initialAmount: number;
  usedAmount: number;
  balance: number;
  status: "active" | "low" | "exhausted";
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseData {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  floatId: string;
  location: string;
  status: "pending" | "approved" | "rejected" | "paid";
  receipt?: string;
  currency: string;
  exchangeRate?: number;
  attachments?: string[];
  approver?: string;
  approvedAt?: string;
  policyViolation?: boolean;
  violationReason?: string;
  submittedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface Policy {
  id: string;
  name: string;
  description: string;
  amountLimit?: number;
  category?: string;
  location?: string;
  isActive: boolean;
}

interface DashboardStats {
  totalFloats: number;
  totalValue: number;
  totalUsed: number;
  totalBalance: number;
  pendingApprovals: number;
  policyViolations: number;
  monthlyExpenses: number;
  expensesByCategory: Record<string, number>;
  expensesByLocation: Record<string, number>;
  recentActivity: any[];
}

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  details: any;
}

// ===============================
// MAIN DASHBOARD COMPONENT - ENHANCED
// ===============================
const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // User role checks
  const isAdmin = user?.role === "admin";
  const isBranchManager = user?.role === "branch";
  const isFinance = user?.role === "finance";
  const isAuditor = user?.role === "auditor";
  const userName = user ? `${user.firstName} ${user.lastName}` : "";

  // ===============================
  // STATE MANAGEMENT - ENHANCED
  // ===============================
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all"); // NEW
  const [statusFilter, setStatusFilter] = useState("all"); // NEW
  const [activeTab, setActiveTab] = useState("overview");
  
  // Dialog states
  const [showNewFloatDialog, setShowNewFloatDialog] = useState(false);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [showPolicyDetails, setShowPolicyDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false); // NEW
  const [showRejectDialog, setShowRejectDialog] = useState(false); // NEW
  
  // Selected items
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [selectedFloat, setSelectedFloat] = useState<FloatData | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null); // NEW
  const [expenseToReject, setExpenseToReject] = useState<string | null>(null); // NEW
  const [rejectionReason, setRejectionReason] = useState(""); // NEW
  
  // File states
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  // API-driven state - ENHANCED
  const [floats, setFloats] = useState<FloatData[]>([]);
  const [expenses, setExpenses] = useState<ExpenseData[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [policies, setPolicies] = useState<Policy[]>([]); // NEW
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]); // NEW
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalFloats: 0,
    totalValue: 0,
    totalUsed: 0,
    totalBalance: 0,
    pendingApprovals: 0,
    policyViolations: 0,
    monthlyExpenses: 0,
    expensesByCategory: {},
    expensesByLocation: {},
    recentActivity: [],
  });
  
  // Loading and error states - ENHANCED
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // NEW

  // ===============================
  // AUTHENTICATION & AUTHORIZATION - ENHANCED
  // ===============================
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const allowedRoles = ['admin', 'finance', 'branch', 'auditor'];
    if (!allowedRoles.includes(user.role)) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this dashboard",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
  }, [user, navigate]);

  // ===============================
  // DATA FETCHING - ENHANCED
  // ===============================
  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const promises = [
        fetchDashboardStats(),
        fetchExpenses(),
        fetchLocations(),
        fetchCategories(),
        fetchCurrencies(),
      ];

      // Add role-specific data fetching
      if (isAdmin || isFinance) {
        promises.push(fetchFloats());
      }
      
      if (isAdmin || isFinance || isAuditor) {
        promises.push(fetchPolicies());
      }
      
      if (isAuditor) {
        promises.push(fetchAuditLogs());
      }

      const results = await Promise.all(promises);
      
      setDashboardStats(results[0]);
      setExpenses(results[1]);
      setLocations(results[2]);
      setCategories(results[3]);
      setCurrencies(results[4]);
      
      let resultIndex = 5;
      if (isAdmin || isFinance) {
        setFloats(results[resultIndex++]);
      }
      if (isAdmin || isFinance || isAuditor) {
        setPolicies(results[resultIndex++]);
      }
      if (isAuditor) {
        setAuditLogs(results[resultIndex++]);
      }

    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh data function - NEW
  const refreshData = async () => {
    setActionLoading("refresh");
    try {
      await loadInitialData();
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // ===============================
  // FORM STATES - ENHANCED
  // ===============================
  const [newFloat, setNewFloat] = useState({
    code: "",
    description: "",
    location: "",
    initialAmount: 0,
    usedAmount: 0,
    currency: "KES",
  });

  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    category: "",
    amount: 0,
    floatId: "",
    location: user?.role === "branch" ? user.location || "" : "",
    currency: "KES",
    exchangeRate: 1,
  });

  // ==================================
  // BUSINESS LOGIC FUNCTIONS - ENHANCED
  // ==================================

  // Available tabs based on user role - UPDATED
  const getAvailableTabs = () => {
    const baseTabs = [
      { id: "overview", label: "Overview" },
      { id: "expenses", label: "Expense Tracking" },
    ];

    if (isAdmin || isFinance) {
      baseTabs.push({ id: "floats", label: "Float Management" });
    }

    if (isAdmin || isBranchManager || isFinance) {
      baseTabs.push({ id: "approvals", label: "Approvals" });
    }

    if (isAdmin || isFinance || isAuditor) {
      baseTabs.push({ id: "reports", label: "Reports" });
    }

    if (isAuditor) {
      baseTabs.push({ id: "audit", label: "Audit Trail" });
    }

    return baseTabs;
  };

  // File upload handlers - ENHANCED
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a JPG, PNG, or PDF file",
          variant: "destructive",
        });
        return;
      }
      
      setReceiptFile(file);
    }
  };

  const handleAdditionalFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const maxSize = 5 * 1024 * 1024; // 5MB per file
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
      
      const validFiles = files.filter(file => {
        if (file.size > maxSize || !allowedTypes.includes(file.type)) {
          toast({
            title: "Invalid file",
            description: `${file.name} is too large or not an allowed type`,
            variant: "destructive",
          });
          return false;
        }
        return true;
      });
      
      setAdditionalFiles(prev => [...prev, ...validFiles]);
    }
  };

  // Float management functions - ENHANCED
  const handleCreateFloat = async () => {
    if (!newFloat.code || !newFloat.description || !newFloat.location || newFloat.initialAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setActionLoading("create-float");
    try {
      const floatData = {
        code: newFloat.code,
        description: newFloat.description,
        location: newFloat.location,
        initialAmount: newFloat.initialAmount,
        usedAmount: newFloat.usedAmount || 0,
        currency: newFloat.currency,
      };

      await createFloat(floatData);
      
      // Refresh data
      const [updatedFloats, updatedStats] = await Promise.all([
        fetchFloats(),
        fetchDashboardStats(),
      ]);
      
      setFloats(updatedFloats);
      setDashboardStats(updatedStats);
      setShowNewFloatDialog(false);
      setNewFloat({
        code: "",
        description: "",
        location: "",
        initialAmount: 0,
        usedAmount: 0,
        currency: "KES",
      });

      toast({
        title: "Success",
        description: "Float created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create float",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateFloat = async () => {
    if (!selectedFloat) return;

    setActionLoading("update-float");
    try {
      await updateFloat(selectedFloat.id, {
        description: selectedFloat.description,
        location: selectedFloat.location,
        initialAmount: selectedFloat.initialAmount,
        usedAmount: selectedFloat.usedAmount,
      });

      // Refresh data
      const [updatedFloats, updatedStats] = await Promise.all([
        fetchFloats(),
        fetchDashboardStats(),
      ]);
      
      setFloats(updatedFloats);
      setDashboardStats(updatedStats);
      setSelectedFloat(null);

      toast({
        title: "Success",
        description: "Float updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update float",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteFloat = async () => {
    if (!itemToDelete) return;

    setActionLoading("delete-float");
    try {
      await deleteFloat(itemToDelete);
      
      // Refresh data
      const [updatedFloats, updatedStats] = await Promise.all([
        fetchFloats(),
        fetchDashboardStats(),
      ]);
      
      setFloats(updatedFloats);
      setDashboardStats(updatedStats);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      setSelectedFloat(null);

      toast({
        title: "Success",
        description: "Float deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete float",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Expense management functions - ENHANCED
  const handleCreateExpense = async () => {
    if (!newExpense.description || !newExpense.category || newExpense.amount <= 0 || !newExpense.floatId) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setActionLoading("create-expense");
    try {
      const expenseData = {
        date: newExpense.date,
        description: newExpense.description,
        category: newExpense.category,
        amount: newExpense.amount,
        floatId: newExpense.floatId,
        location: newExpense.location,
        currency: newExpense.currency,
        exchangeRate: newExpense.exchangeRate,
      };
      
      const result = await createExpense(expenseData);

      // Handle file uploads if present
      if (receiptFile || additionalFiles.length > 0) {
        const formData = new FormData();
        if (receiptFile) formData.append("receipt", receiptFile);
        additionalFiles.forEach((file) => formData.append("attachments", file));

        try {
          await uploadFile(`/expenses/${result.expense.id}/upload`, formData);
        } catch (uploadError) {
          console.warn("File upload failed:", uploadError);
          toast({
            title: "Warning",
            description: "Expense created but file upload failed",
            variant: "destructive",
          });
        }
      }
      
      // Refresh data
      const [updatedExpenses, updatedStats] = await Promise.all([
        fetchExpenses(),
        fetchDashboardStats(),
      ]);
      
      setExpenses(updatedExpenses);
      setDashboardStats(updatedStats);
      setShowNewExpenseDialog(false);
      resetExpenseForm();

      toast({
        title: "Success",
        description: `Expense ${result.expense.status === "approved" ? "created and approved" : "submitted for approval"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create expense",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Approval functions - ENHANCED
  const approveExpenseHandler = async (expenseId: string) => {
    setActionLoading(`approve-${expenseId}`);
    try {
      await approveExpense(expenseId, "approve");

      const [updatedExpenses, updatedStats] = await Promise.all([
        fetchExpenses(),
        fetchDashboardStats(),
      ]);

      setExpenses(updatedExpenses);
      setDashboardStats(updatedStats);

      toast({
        title: "Success",
        description: "Expense approved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve expense",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const rejectExpenseHandler = async () => {
    if (!expenseToReject || !rejectionReason.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    setActionLoading(`reject-${expenseToReject}`);
    try {
      await approveExpense(expenseToReject, "reject", rejectionReason);

      const [updatedExpenses, updatedStats] = await Promise.all([
        fetchExpenses(),
        fetchDashboardStats(),
      ]);

      setExpenses(updatedExpenses);
      setDashboardStats(updatedStats);
      setShowRejectDialog(false);
      setExpenseToReject(null);
      setRejectionReason("");

      toast({
        title: "Success",
        description: "Expense rejected",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reject expense",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const markAsPaidHandler = async (expenseId: string) => {
    setActionLoading(`pay-${expenseId}`);
    try {
      await markExpenseAsPaid(expenseId);

      const [updatedExpenses, updatedStats] = await Promise.all([
        fetchExpenses(),
        fetchDashboardStats(),
      ]);

      setExpenses(updatedExpenses);
      setDashboardStats(updatedStats);

      toast({
        title: "Success",
        description: "Expense marked as paid",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to mark expense as paid",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Utility functions - ENHANCED
  const formatCurrency = (amount: number, currency: string = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const resetExpenseForm = () => {
    setNewExpense({
      date: new Date().toISOString().split("T")[0],
      description: "",
      category: "",
      amount: 0,
      floatId: "",
      location: user?.role === "branch" ? user.location || "" : "",
      currency: "KES",
      exchangeRate: 1,
    });
    setReceiptFile(null);
    setAdditionalFiles([]);
  };

  // Filter functions - NEW
  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === "all" || expense.location === locationFilter;
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || expense.status === statusFilter;
    
    return matchesSearch && matchesLocation && matchesCategory && matchesStatus;
  });

  const filteredFloats = floats.filter((float) => {
    const matchesSearch = 
      float.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      float.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      float.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLocation = locationFilter === "all" || float.location === locationFilter;
    
    return matchesSearch && matchesLocation;
  });

  // Get pending approvals based on user role - NEW
  const getPendingApprovals = () => {
    return expenses.filter(expense => {
      if (expense.status !== "pending") return false;
      
      // Branch managers can only approve expenses from their location
      if (isBranchManager && user?.location && expense.location !== user.location) {
        return false;
      }
      
      return true;
    });
  };

  // ===============================
  // LOADING AND ERROR STATES
  // ===============================
  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const pendingApprovals = getPendingApprovals();

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header - ENHANCED */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="/hal_logo_320x132.png"
              alt="Hotpoint Logo"
              className="h-14 w-auto"
              style={{ maxHeight: "60px", objectFit: "contain" }}
            />
            <div>
              <h1 className="text-xl font-bold">Expense Management System</h1>
              <p className="text-sm text-muted-foreground">
                {isAdmin && "Administrator Dashboard"}
                {isFinance && "Finance Dashboard"}
                {isBranchManager && "Branch Manager Dashboard"}
                {isAuditor && "Auditor Dashboard"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap w-full md:w-auto justify-end gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <UserIcon className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">
                {userName}
              </span>
              <Badge variant="outline" className="text-xs">
                {user.role?.toUpperCase()}
              </Badge>
            </div>
            
            {/* Refresh button - NEW */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={!!actionLoading}
              className="flex-1 md:flex-none"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${actionLoading === 'refresh' ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button variant="outline" size="sm" className="flex-1 md:flex-none">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            {/* Conditionally show New Float button */}
            {(isAdmin || isFinance) && (
              <Button
                size="sm"
                onClick={() => setShowNewFloatDialog(true)}
                disabled={!!actionLoading}
                className="flex-1 md:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Float
              </Button>
            )}

            {/* Conditionally show New Expense button */}
            {!isAuditor && (
              <Button
                size="sm"
                onClick={() => setShowNewExpenseDialog(true)}
                disabled={!!actionLoading}
                className="flex-1 md:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            )}

            {/* Logout button */}
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="flex-1 md:flex-none"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview - ENHANCED */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Show for all except auditors */}
        {!isAuditor && (
          <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Float Value
              </CardTitle>
              <Wallet className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(dashboardStats.totalValue)}
              </div>
              <p className="text-xs opacity-80">
                {dashboardStats.totalFloats} floats • {formatCurrency(dashboardStats.totalBalance)} available
              </p>
            </CardContent>
          </Card>
        )}

        {(isAdmin || isBranchManager || isFinance) && (
          <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Approvals
              </CardTitle>
              <Clock className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApprovals.length}</div>
              <p className="text-xs opacity-80">
                {pendingApprovals.length === 0
                  ? "All caught up!"
                  : "Needs your attention"}
              </p>
            </CardContent>
          </Card>
        )}

        <Card className={dashboardStats.policyViolations > 0 ? "bg-gradient-to-r from-red-500 to-red-600 text-white" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Policy Violations
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.policyViolations}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.policyViolations === 0 ? "No violations" : "Review needed"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardStats.monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {isBranchManager ? "Your branch this month" : "All locations this month"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
          {getAvailableTabs().map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Enhanced Filters - UPDATED */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search expenses, floats, or descriptions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeTab === "expenses" && (
          <>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      {/* Content based on active tab - ENHANCED */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No expenses yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.slice(0, 5).map((expense) => (
                      <TableRow
                        key={expense.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedExpense(expense)}
                      >
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{expense.description}</TableCell>
                        <TableCell>
                          {formatCurrency(expense.amount, expense.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              expense.status === "approved"
                                ? "default"
                                : expense.status === "rejected"
                                ? "destructive"
                                : expense.status === "paid"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {expense.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {!isAuditor && (
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    onClick={() => setShowNewExpenseDialog(true)}
                    disabled={!!actionLoading}
                  >
                    <Plus className="h-6 w-6 mb-2" />
                    <span className="text-sm">New Expense</span>
                  </Button>
                )}
                
                {(isAdmin || isFinance) && (
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    onClick={() => setShowNewFloatDialog(true)}
                    disabled={!!actionLoading}
                  >
                    <Plus className="h-6 w-6 mb-2" />
                    <span className="text-sm">New Float</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("expenses")}
                >
                  <Receipt className="h-6 w-6 mb-2" />
                  <span className="text-sm">View Expenses</span>
                </Button>

                {(isAdmin || isFinance || isAuditor) && (
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    onClick={() => setActiveTab("reports")}
                  >
                    <PieChart className="h-6 w-6 mb-2" />
                    <span className="text-sm">Generate Report</span>
                  </Button>
                )}

                {(isAdmin || isBranchManager || isFinance) && (
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    onClick={() => setActiveTab("floats")}
                  >
                    <Wallet className="h-6 w-6 mb-2" />
                    <span className="text-sm">Manage Floats</span>
                  </Button>
                )}

                {(isAdmin || isFinance || isBranchManager) && (
                  <Button
                    variant="outline"
                    className="h-20 flex-col"
                    onClick={() => setActiveTab("approvals")}
                  >
                    <CheckCircle className="h-6 w-6 mb-2" />
                    <span className="text-sm">
                      Approvals
                      {pendingApprovals.length > 0 && (
                        <Badge className="ml-1 text-xs" variant="destructive">
                          {pendingApprovals.length}
                        </Badge>
                      )}
                    </span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expense Tracking Tab - ENHANCED */}
      {activeTab === "expenses" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense History ({filteredExpenses.length})
            </CardTitle>

            {!isAuditor && (
              <Button 
                size="sm" 
                onClick={() => setShowNewExpenseDialog(true)}
                disabled={!!actionLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No expenses found</h3>
                <p className="text-muted-foreground mb-4">
                  {expenses.length === 0 
                    ? "Start by creating your first expense"
                    : "Try adjusting your filters"
                  }
                </p>
                {!isAuditor && expenses.length === 0 && (
                  <Button onClick={() => setShowNewExpenseDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Expense
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    {!isBranchManager && <TableHead>Float</TableHead>}
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={expense.description}>
                          {expense.description}
                        </div>
                      </TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>
                        {formatCurrency(expense.amount, expense.currency)}
                        {expense.currency !== "KES" && expense.exchangeRate && (
                          <span className="text-xs text-muted-foreground block">
                            ≈ {formatCurrency(expense.amount * expense.exchangeRate)}
                          </span>
                        )}
                      </TableCell>
                      {!isBranchManager && <TableCell>{expense.floatId}</TableCell>}
                      <TableCell>{expense.location}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge
                            variant={
                              expense.status === "approved"
                                ? "default"
                                : expense.status === "rejected"
                                ? "destructive"
                                : expense.status === "paid"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {expense.status.toUpperCase()}
                          </Badge>
                          {expense.policyViolation && (
                            <Badge variant="destructive" className="text-xs">
                              POLICY
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expense.receipt ? (
                          <Badge variant="outline" className="cursor-pointer">
                            <FileImage className="h-3 w-3 mr-1" />
                            View
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedExpense(expense)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Float Management Tab - ENHANCED */}
      {(isAdmin || isFinance) && activeTab === "floats" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Float Management ({filteredFloats.length})
            </CardTitle>
            <Button 
              size="sm" 
              onClick={() => setShowNewFloatDialog(true)}
              disabled={!!actionLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Float
            </Button>
          </CardHeader>
          <CardContent>
            {filteredFloats.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No floats found</h3>
                <p className="text-muted-foreground mb-4">
                  {floats.length === 0 
                    ? "Create your first float to get started"
                    : "Try adjusting your search or filters"
                  }
                </p>
                {floats.length === 0 && (
                  <Button onClick={() => setShowNewFloatDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Float
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Initial Amount</TableHead>
                    <TableHead>Used Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFloats.map((float) => (
                    <TableRow key={float.id}>
                      <TableCell className="font-medium">{float.code}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="truncate" title={float.description}>
                          {float.description}
                        </div>
                      </TableCell>
                      <TableCell>{float.location}</TableCell>
                      <TableCell>{formatCurrency(float.initialAmount)}</TableCell>
                      <TableCell>{formatCurrency(float.usedAmount)}</TableCell>
                      <TableCell>
                        <div>
                          {formatCurrency(float.balance)}
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                float.balance / float.initialAmount > 0.5
                                  ? 'bg-green-500'
                                  : float.balance / float.initialAmount > 0.2
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.max(5, (float.balance / float.initialAmount) * 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            float.status === "exhausted"
                              ? "destructive"
                              : float.status === "low"
                              ? "outline"
                              : "default"
                          }
                        >
                          {float.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFloat(float)}
                            disabled={!!actionLoading}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Approvals Tab - ENHANCED */}
      {(isAdmin || isFinance || isBranchManager) && activeTab === "approvals" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Pending Approvals ({pendingApprovals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No pending approvals at this time</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Receipt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.submittedBy || expense.floatId}</TableCell>
                      <TableCell className="max-w-[200px]">
                        <div>
                          <div className="truncate" title={expense.description}>
                            {expense.description}
                          </div>
                          {expense.policyViolation && (
                            <Badge variant="destructive" className="mt-1 text-xs">
                              POLICY VIOLATION
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>
                        {expense.receipt ? (
                          <Badge variant="outline">
                            <FileImage className="h-3 w-3 mr-1" />
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-500">
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedExpense(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => approveExpenseHandler(expense.id)}
                            disabled={actionLoading === `approve-${expense.id}`}
                          >
                            {actionLoading === `approve-${expense.id}` ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setExpenseToReject(expense.id);
                              setShowRejectDialog(true);
                            }}
                            disabled={actionLoading === `reject-${expense.id}`}
                          >
                            {actionLoading === `reject-${expense.id}` ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              "Reject"
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports Tab - ENHANCED */}
      {(isAdmin || isFinance || isAuditor) && activeTab === "reports" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">
                Overview of expenses across categories and locations
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">By Category</h3>
                  <div className="space-y-4">
                    {Object.entries(dashboardStats.expensesByCategory).map(([category, amount]) => {
                      const totalExpenses = Object.values(dashboardStats.expensesByCategory).reduce((sum, val) => sum + val, 0);
                      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                      
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{category}</span>
                            <span>{formatCurrency(amount)}</span>
                          </div>
                          <Progress value={percentage} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">By Location</h3>
                  <div className="space-y-4">
                    {Object.entries(dashboardStats.expensesByLocation).map(([location, amount]) => {
                      const totalExpenses = Object.values(dashboardStats.expensesByLocation).reduce((sum, val) => sum + val, 0);
                      const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                      
                      return (
                        <div key={location} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{location}</span>
                            <span>{formatCurrency(amount)}</span>
                          </div>
                          <Progress value={percentage} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Policy Compliance - NEW */}
          <Card>
            <CardHeader>
              <CardTitle>Policy Compliance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {expenses.filter(e => !e.policyViolation).length}
                  </div>
                  <p className="text-sm text-green-600">Compliant Expenses</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {dashboardStats.policyViolations}
                  </div>
                  <p className="text-sm text-red-600">Policy Violations</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {expenses.length > 0 ? Math.round(((expenses.length - dashboardStats.policyViolations) / expenses.length) * 100) : 100}%
                  </div>
                  <p className="text-sm text-blue-600">Compliance Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Audit Trail Tab - NEW */}
      {isAuditor && activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Trail</CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete log of all system activities and changes
            </p>
          </CardHeader>
                    <CardContent>
            {auditLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No audit logs found</h3>
                <p className="text-muted-foreground">System activity will appear here</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {log.userName || log.userId}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.entity} {log.entityId ? `(${log.entityId})` : ''}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {JSON.stringify(log.details)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* =============================== */}
      {/* DIALOGS AND MODALS - ENHANCED */}
      {/* =============================== */}

      {/* New Float Dialog - ENHANCED */}
      <Dialog open={showNewFloatDialog} onOpenChange={setShowNewFloatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Float</DialogTitle>
            <DialogDescription>
              Create a new cash float for expense management
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floatCode" className="text-right">
                Code*
              </Label>
              <Input
                id="floatCode"
                value={newFloat.code}
                onChange={(e) =>
                  setNewFloat({ ...newFloat, code: e.target.value })
                }
                className="col-span-3"
                placeholder="e.g. F-001"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floatDescription" className="text-right">
                Description*
              </Label>
              <Input
                id="floatDescription"
                value={newFloat.description}
                onChange={(e) =>
                  setNewFloat({ ...newFloat, description: e.target.value })
                }
                className="col-span-3"
                placeholder="e.g. Branch Operations Float"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floatLocation" className="text-right">
                Location*
              </Label>
              <Select
                value={newFloat.location}
                onValueChange={(value) =>
                  setNewFloat({ ...newFloat, location: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="floatAmount" className="text-right">
                Initial Amount*
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Select
                  value={newFloat.currency}
                  onValueChange={(value) =>
                    setNewFloat({ ...newFloat, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="floatAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newFloat.initialAmount}
                  onChange={(e) =>
                    setNewFloat({
                      ...newFloat,
                      initialAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreateFloat}
              disabled={actionLoading === 'create-float'}
            >
              {actionLoading === 'create-float' ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Float
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Float Dialog - ENHANCED */}
      {selectedFloat && (
        <Dialog
          open={!!selectedFloat}
          onOpenChange={(open) => !open && setSelectedFloat(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Float</DialogTitle>
              <DialogDescription>
                Update float details and amounts
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editFloatCode" className="text-right">
                  Code
                </Label>
                <Input
                  id="editFloatCode"
                  value={selectedFloat.code}
                  disabled
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editFloatDescription" className="text-right">
                  Description*
                </Label>
                <Input
                  id="editFloatDescription"
                  value={selectedFloat.description}
                  onChange={(e) =>
                    setSelectedFloat({
                      ...selectedFloat,
                      description: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editFloatLocation" className="text-right">
                  Location*
                </Label>
                <Select
                  value={selectedFloat.location}
                  onValueChange={(value) =>
                    setSelectedFloat({ ...selectedFloat, location: value })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editFloatInitial" className="text-right">
                  Initial Amount*
                </Label>
                <Input
                  id="editFloatInitial"
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedFloat.initialAmount}
                  onChange={(e) =>
                    setSelectedFloat({
                      ...selectedFloat,
                      initialAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editFloatUsed" className="text-right">
                  Used Amount
                </Label>
                <Input
                  id="editFloatUsed"
                  type="number"
                  min="0"
                  step="0.01"
                  value={selectedFloat.usedAmount}
                  onChange={(e) =>
                    setSelectedFloat({
                      ...selectedFloat,
                      usedAmount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="editFloatBalance" className="text-right">
                  Balance
                </Label>
                <Input
                  id="editFloatBalance"
                  value={selectedFloat.balance}
                  disabled
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="destructive"
                onClick={() => {
                  setItemToDelete(selectedFloat.id);
                  setShowDeleteConfirm(true);
                }}
                disabled={!!actionLoading}
              >
                Delete Float
              </Button>
              <Button
                onClick={handleUpdateFloat}
                disabled={actionLoading === 'update-float'}
              >
                {actionLoading === 'update-float' ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog - NEW */}
      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the float
              and all associated expenses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFloat}
              disabled={actionLoading === 'delete-float'}
            >
              {actionLoading === 'delete-float' ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Expense Dialog - ENHANCED */}
      <Dialog
        open={showNewExpenseDialog}
        onOpenChange={(open) => {
          if (!open) {
            resetExpenseForm();
          }
          setShowNewExpenseDialog(open);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
            <DialogDescription>
              Submit a new expense for approval and processing
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expenseDate" className="text-right">
                Date*
              </Label>
              <Input
                id="expenseDate"
                type="date"
                value={newExpense.date}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, date: e.target.value })
                }
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expenseDescription" className="text-right">
                Description*
              </Label>
              <Input
                id="expenseDescription"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                className="col-span-3"
                placeholder="Brief description of the expense"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expenseCategory" className="text-right">
                Category*
              </Label>
              <Select
                value={newExpense.category}
                onValueChange={(value) =>
                  setNewExpense({ ...newExpense, category: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expenseAmount" className="text-right">
                Amount*
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Select
                  value={newExpense.currency}
                  onValueChange={(value) =>
                    setNewExpense({ ...newExpense, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="expenseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="flex-1"
                  placeholder="0.00"
                />
              </div>
            </div>
            {newExpense.currency !== "KES" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="exchangeRate" className="text-right">
                  Exchange Rate
                </Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  min="0"
                  step="0.0001"
                  value={newExpense.exchangeRate}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      exchangeRate: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="col-span-3"
                />
              </div>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expenseFloat" className="text-right">
                Float*
              </Label>
              <Select
                value={newExpense.floatId}
                onValueChange={(value) =>
                  setNewExpense({ ...newExpense, floatId: value })
                }
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select float" />
                </SelectTrigger>
                <SelectContent>
                  {floats
                    .filter((float) => float.status !== "exhausted")
                    .map((float) => (
                      <SelectItem key={float.id} value={float.id}>
                        {float.code} - {float.description} (
                        {formatCurrency(float.balance)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="expenseLocation" className="text-right">
                Location
              </Label>
              <Input
                id="expenseLocation"
                value={newExpense.location}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, location: e.target.value })
                }
                className="col-span-3"
                disabled={isBranchManager}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receiptUpload" className="text-right">
                Receipt
              </Label>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('receiptInput')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {receiptFile ? "Change Receipt" : "Upload Receipt"}
                  </Button>
                  <input
                    id="receiptInput"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                  {receiptFile && (
                    <div className="flex items-center gap-1 text-sm">
                      <FileText className="h-4 w-4" />
                      <span>{receiptFile.name}</span>
                      <span className="text-muted-foreground">
                        ({Math.round(receiptFile.size / 1024)} KB)
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload a clear image or PDF of your receipt (max 5MB)
                </p>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="additionalFiles" className="text-right">
                Additional Files
              </Label>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('additionalFilesInput')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Add Files
                  </Button>
                  <input
                    id="additionalFilesInput"
                    type="file"
                    multiple
                    accept="image/*,.pdf,.txt"
                    onChange={handleAdditionalFilesUpload}
                    className="hidden"
                  />
                </div>
                {additionalFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {additionalFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4" />
                        <span>{file.name}</span>
                        <span className="text-muted-foreground">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 ml-auto"
                          onClick={() =>
                            setAdditionalFiles(prev => prev.filter((_, i) => i !== index))
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Upload supporting documents if needed (max 5MB each)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={handleCreateExpense}
              disabled={actionLoading === 'create-expense'}
            >
              {actionLoading === 'create-expense' ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Submit Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Detail Dialog - ENHANCED */}
      {selectedExpense && (
        <Dialog
          open={!!selectedExpense}
          onOpenChange={(open) => !open && setSelectedExpense(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
              <DialogDescription>
                {selectedExpense.id} • Submitted on{" "}
                {new Date(selectedExpense.createdAt).toLocaleDateString()}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Status</Label>
                <div className="col-span-3">
                  <Badge
                    variant={
                      selectedExpense.status === "approved"
                        ? "default"
                        : selectedExpense.status === "rejected"
                        ? "destructive"
                        : selectedExpense.status === "paid"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {selectedExpense.status.toUpperCase()}
                  </Badge>
                  {selectedExpense.policyViolation && (
                    <Badge variant="destructive" className="ml-2">
                      POLICY VIOLATION
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Date</Label>
                <div className="col-span-3">
                  {new Date(selectedExpense.date).toLocaleDateString()}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Description</Label>
                <div className="col-span-3">{selectedExpense.description}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Category</Label>
                <div className="col-span-3">{selectedExpense.category}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Amount</Label>
                <div className="col-span-3">
                  {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  {selectedExpense.currency !== "KES" && selectedExpense.exchangeRate && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (≈ {formatCurrency(selectedExpense.amount * selectedExpense.exchangeRate)})
                    </span>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Float</Label>
                <div className="col-span-3">
                  {selectedExpense.floatId || "N/A"}
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Location</Label>
                <div className="col-span-3">{selectedExpense.location}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Submitted By</Label>
                <div className="col-span-3">
                  {selectedExpense.submittedBy || "Unknown"}
                </div>
              </div>
              {selectedExpense.approver && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">
                    {selectedExpense.status === "approved" ? "Approved By" : "Rejected By"}
                  </Label>
                  <div className="col-span-3">
                    {selectedExpense.approver}
                    {selectedExpense.approvedAt && (
                      <span className="text-sm text-muted-foreground ml-2">
                        on {new Date(selectedExpense.approvedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {selectedExpense.status === "rejected" && selectedExpense.violationReason && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Rejection Reason</Label>
                  <div className="col-span-3 text-destructive">
                    {selectedExpense.violationReason}
                  </div>
                </div>
              )}
              {selectedExpense.policyViolation && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Policy Violation</Label>
                  <div className="col-span-3 text-destructive">
                    {selectedExpense.violationReason || "This expense violates company policy"}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Receipt</Label>
                <div className="col-span-3">
                  {selectedExpense.receipt ? (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Receipt
                    </Button>
                  ) : (
                    <span className="text-muted-foreground">No receipt attached</span>
                  )}
                </div>
              </div>
              {selectedExpense.attachments && selectedExpense.attachments.length > 0 && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Attachments</Label>
                  <div className="col-span-3 space-y-2">
                    {selectedExpense.attachments.map((attachment, index) => (
                      <Button key={index} variant="outline" size="sm" className="mr-2">
                        <Download className="h-4 w-4 mr-2" />
                        File {index + 1}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              {(isAdmin || isFinance || isBranchManager) && selectedExpense.status === "pending" && (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setExpenseToReject(selectedExpense.id);
                      setShowRejectDialog(true);
                    }}
                    disabled={actionLoading === `reject-${selectedExpense.id}`}
                  >
                    {actionLoading === `reject-${selectedExpense.id}` ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Reject
                  </Button>
                  <Button
                    onClick={() => approveExpenseHandler(selectedExpense.id)}
                    disabled={actionLoading === `approve-${selectedExpense.id}`}
                  >
                    {actionLoading === `approve-${selectedExpense.id}` ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve
                  </Button>
                </>
              )}
              {isFinance && selectedExpense.status === "approved" && (
                <Button
                  onClick={() => markAsPaidHandler(selectedExpense.id)}
                  disabled={actionLoading === `pay-${selectedExpense.id}`}
                >
                  {actionLoading === `pay-${selectedExpense.id}` ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wallet className="h-4 w-4 mr-2" />
                  )}
                  Mark as Paid
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Expense Dialog - NEW */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="rejectionReason" className="text-right">
                Reason*
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="col-span-3"
                placeholder="Explain why this expense is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={rejectExpenseHandler}
              disabled={!rejectionReason.trim() || !!actionLoading}
            >
              {actionLoading?.startsWith('reject-') ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Policy Details Dialog - NEW */}
      <Dialog open={showPolicyDetails} onOpenChange={setShowPolicyDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Policy Details</DialogTitle>
            <DialogDescription>
              Review company expense policies and guidelines
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {policies.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No policies defined</p>
              </div>
            ) : (
              policies.map((policy) => (
                <div key={policy.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{policy.name}</h3>
                    <Badge variant={policy.isActive ? "default" : "outline"}>
                      {policy.isActive ? "ACTIVE" : "INACTIVE"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {policy.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {policy.category && (
                      <div>
                        <span className="font-medium">Category:</span> {policy.category}
                      </div>
                    )}
                    {policy.location && (
                      <div>
                        <span className="font-medium">Location:</span> {policy.location}
                      </div>
                    )}
                    {policy.amountLimit && (
                      <div>
                        <span className="font-medium">Limit:</span> {formatCurrency(policy.amountLimit)}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notifications */}
      <Toaster />
    </div>
  );
};

export default Dashboard;