import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import type { User } from "@/types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
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
  CreditCard,
  Wallet,
  Edit,
  UserIcon,
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

interface FloatData {
  id: string;
  description: string;
  location: string;
  initialAmount: number;
  usedAmount: number;
  balance: number;
  status: "active" | "low" | "exhausted";
  currency: string;
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
  policyViolation?: boolean;
  violationReason?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const FinanceDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [showNewFloatDialog, setShowNewFloatDialog] = useState(false);
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [selectedFloat, setSelectedFloat] = useState<FloatData | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  // Form states
  const [newFloat, setNewFloat] = useState<
    Omit<FloatData, "id" | "balance" | "status"> & { code: string }
  >({
    code: "",
    description: "",
    location: "",
    initialAmount: 0,
    usedAmount: 0,
    currency: "KES",
  });

  const [newExpense, setNewExpense] = useState<
    Omit<ExpenseData, "id" | "status">
  >({
    date: new Date().toISOString().split("T")[0],
    description: "",
    category: "",
    amount: 0,
    floatId: "",
    location: "",
    currency: "KES",
    exchangeRate: 1,
  });

  // Mock data
  const mockFloats: FloatData[] = [
    {
      id: "FL001",
      description: "B2B Sales",
      location: "SALES - CORPORATE SALES",
      initialAmount: 50000,
      usedAmount: 32000,
      balance: 18000,
      status: "active",
      currency: "KES",
    },
    {
      id: "FL002",
      description: "Commercial Operations",
      location: "HEAD OFFICE FINANCE LOCATION",
      initialAmount: 30000,
      usedAmount: 28500,
      balance: 1500,
      status: "low",
      currency: "KES",
    },
    {
      id: "FL003",
      description: "Export Division",
      location: "SALES EXPORTS",
      initialAmount: 75000,
      usedAmount: 45000,
      balance: 30000,
      status: "active",
      currency: "KES",
    },
  ];

  const mockRecentExpenses: ExpenseData[] = [
    {
      id: "EXP001",
      date: "2024-01-15",
      description: "Vehicle Fuel - Daily Operations",
      category: "Fuel",
      amount: 3500,
      floatId: "FL001",
      location: "Nairobi Central Branch",
      status: "approved",
      receipt: "receipt_001.jpg",
      currency: "KES",
      attachments: ["invoice_001.pdf"],
    },
    {
      id: "EXP002",
      date: "2024-01-15",
      description: "Equipment Maintenance",
      category: "Maintenance",
      amount: 12000,
      floatId: "FL003",
      location: "Engineering Department",
      status: "approved",
      currency: "KES",
    },
    {
      id: "EXP003",
      date: "2024-01-16",
      description: "International Conference - USD",
      category: "Travel",
      amount: 1200,
      floatId: "FL003",
      location: "SALES EXPORTS",
      status: "approved",
      currency: "USD",
      exchangeRate: 150,
      policyViolation: true,
      violationReason: "Exceeds travel allowance limit",
    },
  ];

  const currencies = [
    { code: "KES", name: "Kenyan Shilling" },
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
    { code: "GBP", name: "British Pound" },
  ];

  const locations = [
    "All Locations",
    "SALES - CORPORATE SALES",
    "HEAD OFFICE FINANCE LOCATION",
    "SALES EXPORTS",
    "ENGINEERING INSTALLATIONS - NAIROBI",
    "ENGINEERING INSTALLATIONS - MOMBASA",
    "BONDED WAREHOUSE RUIRU NO. 577 - BW3",
    "WAREHOUSE RUIRU - RHW1",
    "SALES - ONLINE SALES",
    "SHOWROOM SARIT CENTRE - SCR",
    "SHOWROOM LIKONI MALL MOMBASA - MSR",
    "CLEARANCE SALE",
    "SHOWROOM GARDEN CITY - GCS",
    "SHOWROOM VILLAGE MARKET - VMR",
    "SHOWROOM NYALI CENTRE MOMBASA - MSN",
    "SHOWROOM RUIRU D02 SALES - RHSR2",
    "SHOWROOM IMARA MALL - IMR",
    "SHOWROOM BINAA COMPLEX KAREN - KRN",
    "SHOWROOM CBD 680 HOTEL - CBD",
    "SHOWROOM ELDORET RUPAS MALL - ELD",
    "SHOWROOM YAYA CENTER - YCR",
    "SHOWROOM VICTORIA SQUARE RIARA - RSR",
    "SHOWROOM MEGA CITY KISUMU - KSM",
    "SERVICE CENTRE LIKONI MOMBASA - MSS",
    "SERVICE SARIT CENTRE - SCP",
    "SERVICE HEAD OFFICE RUIRU - SCS",
  ];

  const [floats, setFloats] = useState<FloatData[]>(mockFloats);
  const [expenses, setExpenses] = useState<ExpenseData[]>(mockRecentExpenses);

  // Calculate totals
  const totalFloats = floats.length;
  const totalValue = floats.reduce((sum, float) => sum + float.initialAmount, 0);
  const totalUsed = floats.reduce((sum, float) => sum + float.usedAmount, 0);
  const totalBalance = floats.reduce((sum, float) => sum + float.balance, 0);
  const approvedExpenses = expenses.filter(e => e.status === "approved");
  const totalApprovedAmount = approvedExpenses.reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0);
  const paidExpenses = expenses.filter(e => e.status === "paid");
  const totalPaidAmount = paidExpenses.reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0);
  const pendingPaymentCount = approvedExpenses.length - paidExpenses.length;

  // Handle file uploads
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleAdditionalFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAdditionalFiles([...additionalFiles, ...Array.from(e.target.files)]);
    }
  };

  // Handle float creation
  const handleCreateFloat = () => {
    const newFloatData: FloatData = {
      id: newFloat.code,
      description: newFloat.description,
      location: newFloat.location,
      initialAmount: newFloat.initialAmount,
      usedAmount: newFloat.usedAmount || 0,
      balance: newFloat.initialAmount - (newFloat.usedAmount || 0),
      status:
        newFloat.initialAmount - (newFloat.usedAmount || 0) <= 0
          ? "exhausted"
          : newFloat.initialAmount - (newFloat.usedAmount || 0) <
            newFloat.initialAmount * 0.2
          ? "low"
          : "active",
      currency: newFloat.currency,
    };

    setFloats([...floats, newFloatData]);
    setShowNewFloatDialog(false);
    setNewFloat({
      code: "",
      description: "",
      location: "",
      initialAmount: 0,
      usedAmount: 0,
      currency: "KES",
    });
  };

  // Handle float update
  const handleUpdateFloat = () => {
    if (!selectedFloat) return;

    const updatedFloats = floats.map((float) =>
      float.id === selectedFloat.id ? selectedFloat : float
    );
    setFloats(updatedFloats);
    setSelectedFloat(null);
  };

  // Handle float deletion
  const handleDeleteFloat = () => {
    if (!selectedFloat) return;

    setFloats(floats.filter((float) => float.id !== selectedFloat.id));
    setSelectedFloat(null);
  };

  // Handle expense creation
  const handleCreateExpense = () => {
    const newId = `EXP${(expenses.length + 1).toString().padStart(3, "0")}`;
    const expense: ExpenseData = {
      id: newId,
      ...newExpense,
      status: "approved", // Finance can auto-approve
      receipt: receiptFile?.name,
      attachments: additionalFiles.map((file) => file.name),
      approver: `${user.firstName} ${user.lastName}`,
    };

    setExpenses([...expenses, expense]);
    setShowNewExpenseDialog(false);
    resetExpenseForm();
  };

  // Mark expense as paid
  const markAsPaid = (expenseId: string) => {
    setExpenses(
      expenses.map(e => 
        e.id === expenseId ? { ...e, status: "paid" } : e
      )
    );
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  // Reset form
  const resetExpenseForm = () => {
    setNewExpense({
      date: new Date().toISOString().split("T")[0],
      description: "",
      category: "",
      amount: 0,
      floatId: "",
      location: "",
      currency: "KES",
      exchangeRate: 1,
    });
    setReceiptFile(null);
    setAdditionalFiles([]);
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Payment Processing" },
    { id: "floats", label: "Float Management" },
    { id: "expenses", label: "Expense Tracking" },
    { id: "reports", label: "Financial Reports" },
  ];

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
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
              <h1 className="text-xl font-bold">Finance Management System</h1>
              <p className="text-sm text-muted-foreground">
                Finance Department Dashboard
              </p>
            </div>
          </div>
          <div className="flex flex-wrap w-full md:w-auto justify-end gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <UserIcon className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">
                {user.firstName} {user.lastName}
              </span>
              <Badge variant="outline" className="text-xs">
                FINANCE
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="flex-1 md:flex-none">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>

            <Button size="sm" onClick={() => setShowNewFloatDialog(true)} className="flex-1 md:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              New Float
            </Button>

            <Button size="sm" onClick={() => setShowNewExpenseDialog(true)} className="flex-1 md:flex-none">
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </Button>

            <Button variant="outline" size="sm" onClick={onLogout} className="flex-1 md:flex-none">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 p-3">
        <Card className="bg-gradient-to-r from-primary to-primary-light text-primary-foreground p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Float Value
            </CardTitle>
            <Wallet className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs opacity-80">
              {totalFloats} floats • {formatCurrency(totalBalance)} available
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Expenses
            </CardTitle>
            <CheckCircle className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalApprovedAmount)}
            </div>
            <p className="text-xs opacity-80">
              {approvedExpenses.length} expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <Clock className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPaymentCount}</div>
            <p className="text-xs opacity-80">
              {pendingPaymentCount === 0 ? "All caught up!" : "Needs processing"}
            </p>
          </CardContent>
        </Card>

        <Card className="p-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Paid Amount
            </CardTitle>
            <CreditCard className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPaidAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {paidExpenses.length} processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filters */}
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
          <SelectTrigger className="w-full sm:w-[280px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.slice(1).map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content based on active tab */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
            </CardHeader>
            <CardContent>
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
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <TableCell>{expense.date}</TableCell>
                      <TableCell>{expense.description}</TableCell>
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
                              : "warning"
                          }
                        >
                          {expense.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setShowNewFloatDialog(true)}
                >
                  <Plus className="h-6 w-6 mb-2" />
                  <span className="text-sm">New Float</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setShowNewExpenseDialog(true)}
                >
                  <Receipt className="h-6 w-6 mb-2" />
                  <span className="text-sm">New Expense</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("payments")}
                >
                  <CreditCard className="h-6 w-6 mb-2" />
                  <span className="text-sm">Process Payments</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-20 flex-col"
                  onClick={() => setActiveTab("reports")}
                >
                  <PieChart className="h-6 w-6 mb-2" />
                  <span className="text-sm">Generate Report</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "payments" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Float</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses
                  .filter(e => e.status === "approved" || e.status === "paid")
                  .map((expense) => (
                    <TableRow
                      key={expense.id}
                      onClick={() => setSelectedExpense(expense)}
                    >
                      <TableCell>{expense.id}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>
                        {formatCurrency(expense.amount, expense.currency)}
                      </TableCell>
                      <TableCell>{expense.location}</TableCell>
                      <TableCell>{expense.floatId}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            expense.status === "paid" ? "secondary" : "default"
                          }
                        >
                          {expense.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.status === "approved" && (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsPaid(expense.id);
                            }}
                          >
                            Mark as Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "floats" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Float Management
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewFloatDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Float
            </Button>
          </CardHeader>
          <CardContent>
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
                {floats.map((float) => (
                  <TableRow key={float.id}>
                    <TableCell className="font-medium">{float.id}</TableCell>
                    <TableCell>{float.description}</TableCell>
                    <TableCell>{float.location}</TableCell>
                    <TableCell>{formatCurrency(float.initialAmount)}</TableCell>
                    <TableCell>{formatCurrency(float.usedAmount)}</TableCell>
                    <TableCell>
                      {formatCurrency(float.balance)}
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-green-600 h-1.5 rounded-full"
                          style={{
                            width: `${
                              (float.balance / float.initialAmount) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          float.status === "exhausted"
                            ? "destructive"
                            : float.status === "low"
                            ? "warning"
                            : "default"
                        }
                      >
                        {float.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFloat(float)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "expenses" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense History
            </CardTitle>
            <Button size="sm" onClick={() => setShowNewExpenseDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Float</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <TableCell>{expense.date}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell>
                      {formatCurrency(expense.amount, expense.currency)}
                      {expense.currency !== "KES" && expense.exchangeRate && (
                        <span className="text-xs text-muted-foreground block">
                          ≈{" "}
                          {formatCurrency(
                            expense.amount * expense.exchangeRate
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{expense.floatId}</TableCell>
                    <TableCell>{expense.location}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          expense.status === "approved"
                            ? "default"
                            : expense.status === "rejected"
                            ? "destructive"
                            : expense.status === "paid"
                            ? "secondary"
                            : "warning"
                        }
                      >
                        {expense.status.toUpperCase()}
                      </Badge>
                      {expense.policyViolation && (
                        <Badge variant="destructive" className="ml-1">
                          POLICY
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {expense.receipt ? (
                        <Badge variant="outline" className="cursor-pointer">
                          <FileImage className="h-3 w-3 mr-1" /> View
                        </Badge>
                      ) : (
                        <Badge variant="outline">Missing</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {activeTab === "reports" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Financial Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">By Category</h3>
                  <div className="space-y-4">
                    {["Travel", "Food", "Supplies", "Maintenance", "Fuel", "Other"].map((category) => (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{category}</span>
                          <span>
                            {formatCurrency(
                              expenses
                                .filter((e) => e.category === category)
                                .reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0)
                            )}
                          </span>
                        </div>
                        <Progress
                          value={
                            (expenses
                              .filter((e) => e.category === category)
                              .reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0) /
                              expenses.reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0)) *
                            100
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">By Location</h3>
                  <div className="space-y-4">
                    {locations.slice(0, 5).map((location) => (
                      <div key={location} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{location}</span>
                          <span>
                            {formatCurrency(
                              expenses
                                .filter((e) => e.location === location)
                                .reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0)
                            )}
                          </span>
                        </div>
                        <Progress
                          value={
                            (expenses
                              .filter((e) => e.location === location)
                              .reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0) /
                              expenses.reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0)) *
                            100
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Approved</span>
                    <span>{formatCurrency(totalApprovedAmount)}</span>
                  </div>
                  <Progress
                    value={(approvedExpenses.length / expenses.length) * 100}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Paid</span>
                    <span>{formatCurrency(totalPaidAmount)}</span>
                  </div>
                  <Progress
                    value={(paidExpenses.length / expenses.length) * 100}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Pending Payment</span>
                    <span>
                      {formatCurrency(totalApprovedAmount - totalPaidAmount)}
                    </span>
                  </div>
                  <Progress
                    value={
                      ((approvedExpenses.length - paidExpenses.length) /
                        expenses.length) *
                      100
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Float Dialog */}
      <Dialog open={showNewFloatDialog} onOpenChange={setShowNewFloatDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Float</DialogTitle>
            <DialogDescription>
              Add a new float account with initial funding
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="float-code">Float Code</Label>
                <Input
                  id="float-code"
                  placeholder="FL-001"
                  value={newFloat.code}
                  onChange={(e) =>
                    setNewFloat({ ...newFloat, code: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="float-location">Location</Label>
                <Select
                  value={newFloat.location}
                  onValueChange={(value) =>
                    setNewFloat({ ...newFloat, location: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.slice(1).map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="float-description">Description</Label>
              <Input
                id="float-description"
                placeholder="e.g. Marketing Team Float"
                value={newFloat.description}
                onChange={(e) =>
                  setNewFloat({ ...newFloat, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="float-initial">Initial Amount</Label>
                <Input
                  id="float-initial"
                  type="number"
                  value={newFloat.initialAmount}
                  onChange={(e) =>
                    setNewFloat({
                      ...newFloat,
                      initialAmount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="float-currency">Currency</Label>
                <Select
                  value={newFloat.currency}
                  onValueChange={(value) =>
                    setNewFloat({ ...newFloat, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewFloatDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateFloat}>Create Float</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Float Dialog */}
      {selectedFloat && (
        <Dialog
          open={!!selectedFloat}
          onOpenChange={(open) => !open && setSelectedFloat(null)}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Float</DialogTitle>
              <DialogDescription>
                Update float details and amounts
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Float Code</Label>
                  <p className="font-medium">{selectedFloat.id}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-float-location">Location</Label>
                  <Select
                    value={selectedFloat.location}
                    onValueChange={(value) =>
                      setSelectedFloat({ ...selectedFloat, location: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.slice(1).map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-float-description">Description</Label>
                <Input
                  id="edit-float-description"
                  value={selectedFloat.description}
                  onChange={(e) =>
                    setSelectedFloat({
                      ...selectedFloat,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-float-initial">Initial Amount</Label>
                  <Input
                    id="edit-float-initial"
                    type="number"
                    value={selectedFloat.initialAmount}
                    onChange={(e) =>
                      setSelectedFloat({
                        ...selectedFloat,
                        initialAmount: Number(e.target.value),
                        balance:
                          Number(e.target.value) - selectedFloat.usedAmount,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-float-used">Used Amount</Label>
                  <Input
                    id="edit-float-used"
                    type="number"
                    value={selectedFloat.usedAmount}
                    onChange={(e) =>
                      setSelectedFloat({
                        ...selectedFloat,
                        usedAmount: Number(e.target.value),
                        balance:
                          selectedFloat.initialAmount - Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedFloat(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateFloat}>Save Changes</Button>
              <Button
                variant="destructive"
                onClick={handleDeleteFloat}
                className="ml-auto"
              >
                Delete Float
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* New Expense Dialog */}
      <Dialog
        open={showNewExpenseDialog}
        onOpenChange={setShowNewExpenseDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit New Expense</DialogTitle>
            <DialogDescription>
              Fill in all required details for your expense submission
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-date">Date</Label>
                <Input
                  id="expense-date"
                  type="date"
                  value={newExpense.date}
                  onChange={(e) =>
                    setNewExpense({ ...newExpense, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-category">Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value) =>
                    setNewExpense({ ...newExpense, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Travel">Travel</SelectItem>
                    <SelectItem value="Food">Food</SelectItem>
                    <SelectItem value="Supplies">Office Supplies</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Fuel">Fuel</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-description">Description</Label>
              <Textarea
                id="expense-description"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
                placeholder="Detailed description of the expense"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense({
                      ...newExpense,
                      amount: Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-currency">Currency</Label>
                <Select
                  value={newExpense.currency}
                  onValueChange={(value) =>
                    setNewExpense({ ...newExpense, currency: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newExpense.currency !== "KES" && (
                <div className="space-y-2">
                  <Label htmlFor="expense-rate">Exchange Rate</Label>
                  <Input
                    id="expense-rate"
                    type="number"
                    value={newExpense.exchangeRate}
                    onChange={(e) =>
                      setNewExpense({
                        ...newExpense,
                        exchangeRate: Number(e.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expense-float">Float Account</Label>
                <Select
                  value={newExpense.floatId}
                  onValueChange={(value) =>
                    setNewExpense({ ...newExpense, floatId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select float account" />
                  </SelectTrigger>
                  <SelectContent>
                    {floats.map((float) => (
                      <SelectItem key={float.id} value={float.id}>
                        {float.id} - {float.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expense-location">Location</Label>
                <Select
                  value={newExpense.location}
                  onValueChange={(value) =>
                    setNewExpense({ ...newExpense, location: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.slice(1).map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Receipt</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReceiptUpload(true)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Receipt
                </Button>
              </div>
              {receiptFile && (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <FileImage className="h-5 w-5" />
                  <span className="text-sm">{receiptFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setReceiptFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label>Additional Documents</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("additional-files")?.click()
                  }
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
                <input
                  id="additional-files"
                  type="file"
                  multiple
                  onChange={handleAdditionalFilesUpload}
                  className="hidden"
                />
              </div>
              {additionalFiles.length > 0 && (
                <div className="space-y-2">
                  {additionalFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 border rounded"
                    >
                      <FileText className="h-5 w-5" />
                      <span className="text-sm">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto"
                        onClick={() =>
                          setAdditionalFiles(
                            additionalFiles.filter((_, i) => i !== index)
                          )
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNewExpenseDialog(false);
                resetExpenseForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateExpense}>Submit Expense</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Detail Dialog */}
      {selectedExpense && (
        <Dialog
          open={!!selectedExpense}
          onOpenChange={(open) => !open && setSelectedExpense(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
              <DialogDescription>
                {selectedExpense.id} • {selectedExpense.date}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Description</Label>
                  <p>{selectedExpense.description}</p>
                </div>
                <div>
                  <Label>Category</Label>
                  <p>{selectedExpense.category}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount</Label>
                  <p className="font-medium">
                    {formatCurrency(
                      selectedExpense.amount,
                      selectedExpense.currency
                    )}
                    {selectedExpense.currency !== "KES" &&
                      selectedExpense.exchangeRate && (
                        <span className="text-sm text-muted-foreground block">
                          ≈{" "}
                          {formatCurrency(
                            selectedExpense.amount *
                              selectedExpense.exchangeRate
                          )}
                        </span>
                      )}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedExpense.status === "approved"
                          ? "default"
                          : selectedExpense.status === "rejected"
                          ? "destructive"
                          : selectedExpense.status === "paid"
                          ? "secondary"
                          : "warning"
                      }
                    >
                      {selectedExpense.status.toUpperCase()}
                    </Badge>
                    {selectedExpense.policyViolation && (
                      <Badge variant="destructive">POLICY VIOLATION</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Float Account</Label>
                  <p>{selectedExpense.floatId}</p>
                </div>
                <div>
                  <Label>Location</Label>
                  <p>{selectedExpense.location}</p>
                </div>
              </div>
              {selectedExpense.policyViolation && (
                <div className="bg-destructive/10 p-4 rounded">
                  <Label className="text-destructive">Policy Violation</Label>
                  <p>{selectedExpense.violationReason}</p>
                </div>
              )}
              {selectedExpense.receipt && (
                <div>
                  <Label>Receipt</Label>
                  <div className="mt-2 border rounded p-4 flex items-center justify-center">
                    <Button variant="outline">
                      <FileImage className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                  </div>
                </div>
              )}
              {selectedExpense.attachments &&
                selectedExpense.attachments.length > 0 && (
                  <div>
                    <Label>Additional Documents</Label>
                    <div className="mt-2 space-y-2">
                      {selectedExpense.attachments.map((file, index) => (
                        <div
                          key={index}
                          className="border rounded p-3 flex items-center"
                        >
                          <FileText className="h-5 w-5 mr-2" />
                          <span>{file}</span>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {selectedExpense.approver && (
                <div>
                  <Label>Approval Details</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.status === "approved"
                      ? "Approved"
                      : "Rejected"}{" "}
                    by {selectedExpense.approver}
                  </p>
                  {selectedExpense.status === "rejected" &&
                    selectedExpense.violationReason && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Reason: {selectedExpense.violationReason}
                      </p>
                    )}
                </div>
              )}
            </div>
            <DialogFooter>
              {selectedExpense.status === "approved" && (
                <Button onClick={() => markAsPaid(selectedExpense.id)}>
                  Mark as Paid
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Receipt Upload Dialog */}
      <Dialog open={showReceiptUpload} onOpenChange={setShowReceiptUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Receipt</DialogTitle>
            <DialogDescription>
              Upload a clear photo or scan of your receipt
            </DialogDescription>
          </DialogHeader>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <div className="flex flex-col items-center justify-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your receipt here, or click to browse
              </p>
              <Input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                id="receipt-upload"
                onChange={handleReceiptUpload}
              />
              <Button
                variant="outline"
                className="mt-2"
                onClick={() =>
                  document.getElementById("receipt-upload")?.click()
                }
              >
                Select File
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            Accepted formats: JPG, PNG, PDF (Max 5MB)
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowReceiptUpload(false);
                if (receiptFile) {
                  setNewExpense({
                    ...newExpense,
                    receipt: receiptFile.name,
                  });
                }
              }}
            >
              Confirm Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FinanceDashboard;