import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import type { User } from "types";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building,
  Plus,
  Search,
  Filter,
  PieChart,
  BarChart3,
  Users,
  LogOut,
  X,
  FileImage,
  Upload,
  CheckCircle,
  Clock,
  AlertCircle,
  Globe,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [activeTab, setActiveTab] = useState("payments");
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);

  // Mock data
  const mockFloats: FloatData[] = [
    {
      id: "FL001",
      description: "B2B",
      location: "SALES - CORPORATE SALES",
      initialAmount: 50000,
      usedAmount: 32000,
      balance: 18000,
      status: "active",
      currency: "KES",
    },
    {
      id: "FL002",
      description: "Commercial",
      location: "HEAD OFFICE FINANCE LOCATION",
      initialAmount: 30000,
      usedAmount: 28500,
      balance: 1500,
      status: "low",
      currency: "KES",
    },
  ];

  const mockExpenses: ExpenseData[] = [
    {
      id: "EXP001",
      date: "2024-01-15",
      description: "Office Supplies",
      category: "Supplies",
      amount: 3500,
      floatId: "FL001",
      location: "Nairobi Central Branch",
      status: "approved",
      receipt: "receipt_001.jpg",
      currency: "KES",
    },
    {
      id: "EXP002",
      date: "2024-01-16",
      description: "Team Lunch",
      category: "Food",
      amount: 4500,
      floatId: "FL002",
      location: "Mombasa Branch",
      status: "approved",
      currency: "KES",
    },
    {
      id: "EXP003",
      date: "2024-01-17",
      description: "Travel Expenses",
      category: "Travel",
      amount: 12000,
      floatId: "FL001",
      location: "Nairobi Central Branch",
      status: "approved",
      currency: "KES",
    },
  ];

  const locations = [
    "All Locations",
    "Nairobi Central Branch",
    "Mombasa Branch",
    "Kisumu Branch",
    "Eldoret Branch",
  ];

  const [expenses, setExpenses] = useState<ExpenseData[]>(mockExpenses);
  const [floats, setFloats] = useState<FloatData[]>(mockFloats);

  // Filter expenses based on selected location
  const filteredExpenses = locationFilter === "all" 
    ? expenses 
    : expenses.filter(e => e.location === locationFilter);

  // Calculate totals
  const approvedExpenses = expenses.filter(e => e.status === "approved");
  const totalApprovedAmount = approvedExpenses.reduce((sum, e) => sum + e.amount, 0);
  const paidExpenses = expenses.filter(e => e.status === "paid");
  const totalPaidAmount = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingPaymentCount = approvedExpenses.length - paidExpenses.length;

  const formatCurrency = (amount: number, currency: string = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const markAsPaid = (expenseId: string) => {
    setExpenses(
      expenses.map(e => 
        e.id === expenseId ? { ...e, status: "paid" } : e
      )
    );
  };

  const tabs = [
    { id: "payments", label: "Payment Processing" },
    { id: "reports", label: "Financial Reports" },
    { id: "floats", label: "Float Monitoring" },
  ];

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg">
              <UserIcon className="h-4 w-4 text-secondary-foreground" />
              <span className="text-sm font-medium text-secondary-foreground">
                {user.name}
              </span>
              <Badge variant="outline" className="text-xs">
                FINANCE
              </Badge>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Expenses
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalApprovedAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {approvedExpenses.length} expenses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payments
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPaymentCount}</div>
            <p className="text-xs text-muted-foreground">
              {pendingPaymentCount === 0 ? "All caught up!" : "Needs processing"}
            </p>
          </CardContent>
        </Card>

        <Card>
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
        <TabsList className="grid w-full grid-cols-3">
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
            placeholder="Search expenses..."
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
                {filteredExpenses
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

      {activeTab === "reports" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">By Category</h3>
                  <div className="space-y-4">
                    {["Travel", "Food", "Supplies", "Other"].map((category) => (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{category}</span>
                          <span>
                            {formatCurrency(
                              expenses
                                .filter((e) => e.category === category)
                                .reduce((sum, e) => sum + e.amount, 0)
                            )}
                          </span>
                        </div>
                        <Progress
                          value={
                            (expenses
                              .filter((e) => e.category === category)
                              .reduce((sum, e) => sum + e.amount, 0) /
                              expenses.reduce((sum, e) => sum + e.amount, 0)) *
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
                    {locations.slice(1, 5).map((location) => (
                      <div key={location} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{location}</span>
                          <span>
                            {formatCurrency(
                              expenses
                                .filter((e) => e.location === location)
                                .reduce((sum, e) => sum + e.amount, 0)
                            )}
                          </span>
                        </div>
                        <Progress
                          value={
                            (expenses
                              .filter((e) => e.location === location)
                              .reduce((sum, e) => sum + e.amount, 0) /
                              expenses.reduce((sum, e) => sum + e.amount, 0)) *
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
              <CardTitle>Payment Status</CardTitle>
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

      {activeTab === "floats" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Float Accounts Monitoring
            </CardTitle>
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
                            width: `${(float.balance / float.initialAmount) * 100}%`,
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

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
                    {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge
                    variant={
                      selectedExpense.status === "paid" ? "secondary" : "default"
                    }
                  >
                    {selectedExpense.status.toUpperCase()}
                  </Badge>
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
                    Approved by {selectedExpense.approver}
                  </p>
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
    </div>
  );
};

export default FinanceDashboard;