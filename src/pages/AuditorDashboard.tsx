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

interface Policy {
  id: string;
  name: string;
  description: string;
  amountLimit?: number;
  category?: string;
  location?: string;
}

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

const AuditorDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("audit");
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [showPolicyDetails, setShowPolicyDetails] = useState(false);

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
      description: "International Conference",
      category: "Travel",
      amount: 1200,
      floatId: "FL001",
      location: "SALES EXPORTS",
      status: "approved",
      currency: "USD",
      exchangeRate: 150,
      policyViolation: true,
      violationReason: "Exceeds travel allowance limit",
    },
  ];

  const policies: Policy[] = [
    {
      id: "POL001",
      name: "Travel Expense Policy",
      description: "Maximum $1000 per international trip",
      amountLimit: 1000,
      category: "Travel",
    },
    {
      id: "POL002",
      name: "Meal Allowance",
      description: "Maximum KES 2000 per day for meals",
      amountLimit: 2000,
      category: "Food",
    },
  ];

  const locations = [
    "All Locations",
    "Nairobi Central Branch",
    "Mombasa Branch",
    "Kisumu Branch",
    "Eldoret Branch",
    "SALES - CORPORATE SALES",
    "HEAD OFFICE FINANCE LOCATION",
    "SALES EXPORTS",
  ];

  const statuses = [
    "All Statuses",
    "pending",
    "approved",
    "rejected",
    "paid",
  ];

  const [expenses, setExpenses] = useState<ExpenseData[]>(mockExpenses);
  const [floats, setFloats] = useState<FloatData[]>(mockFloats);

  // Filter expenses based on selected filters
  const filteredExpenses = expenses.filter((expense) => {
    const locationMatch = locationFilter === "all" || expense.location === locationFilter;
    const statusMatch = statusFilter === "all" || expense.status === statusFilter;
    return locationMatch && statusMatch;
  });

  // Calculate totals for audit
  const totalExpenses = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0);
  const policyViolations = expenses.filter(e => e.policyViolation).length;
  const violationAmount = expenses
    .filter(e => e.policyViolation)
    .reduce((sum, e) => sum + e.amount * (e.exchangeRate || 1), 0);

  const formatCurrency = (amount: number, currency: string = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const tabs = [
    { id: "audit", label: "Expense Audit" },
    { id: "violations", label: "Policy Violations" },
    { id: "reports", label: "Audit Reports" },
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
              <h1 className="text-xl font-bold">Audit & Compliance System</h1>
              <p className="text-sm text-muted-foreground">
                Internal Audit Dashboard
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
                AUDITOR
              </Badge>
            </div>
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
              Total Expenses
            </CardTitle>
            <DollarSign className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {totalExpenses} expenses reviewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Policy Violations
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policyViolations}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(violationAmount)} in violations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expense Policies
            </CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{policies.length}</div>
            <p className="text-xs text-muted-foreground">
              <Button
                variant="link"
                className="h-0 p-0 text-xs"
                onClick={() => setShowPolicyDetails(true)}
              >
                View all policies
              </Button>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[280px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content based on active tab */}
      {activeTab === "audit" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Audit Trail
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
                  <TableHead>Status</TableHead>
                  <TableHead>Policy</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow
                    key={expense.id}
                    onClick={() => setSelectedExpense(expense)}
                  >
                    <TableCell>{expense.id}</TableCell>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>
                      {formatCurrency(expense.amount, expense.currency)}
                      {expense.currency !== "KES" && expense.exchangeRate && (
                        <span className="text-xs text-muted-foreground block">
                          ≈ {formatCurrency(expense.amount * expense.exchangeRate)}
                        </span>
                      )}
                    </TableCell>
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
                    </TableCell>
                    <TableCell>
                      {expense.policyViolation ? (
                        <Badge variant="destructive">VIOLATION</Badge>
                      ) : (
                        <Badge variant="outline">CLEAR</Badge>
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

      {activeTab === "violations" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Policy Violations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {policyViolations === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No policy violations found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Violation Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses
                    .filter((e) => e.policyViolation)
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
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.location}</TableCell>
                        <TableCell className="text-red-500">
                          {expense.violationReason}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "reports" && (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">By Category</h3>
                  <div className="space-y-4">
                    {["Travel", "Food", "Supplies", "Other"].map((category) => {
                      const categoryExpenses = expenses.filter(
                        (e) => e.category === category
                      );
                      const categoryAmount = categoryExpenses.reduce(
                        (sum, e) => sum + e.amount * (e.exchangeRate || 1),
                        0
                      );
                      const categoryViolations = categoryExpenses.filter(
                        (e) => e.policyViolation
                      ).length;

                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{category}</span>
                            <span>{formatCurrency(categoryAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {categoryExpenses.length} expenses •{" "}
                              {categoryViolations} violations
                            </span>
                            <span>
                              {Math.round(
                                (categoryViolations / categoryExpenses.length) * 100
                              )}
                              % violation rate
                            </span>
                          </div>
                          <Progress
                            value={
                              (categoryAmount / totalAmount) * 100
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">By Location</h3>
                  <div className="space-y-4">
                    {locations.slice(1, 6).map((location) => {
                      const locationExpenses = expenses.filter(
                        (e) => e.location === location
                      );
                      const locationAmount = locationExpenses.reduce(
                        (sum, e) => sum + e.amount * (e.exchangeRate || 1),
                        0
                      );
                      const locationViolations = locationExpenses.filter(
                        (e) => e.policyViolation
                      ).length;

                      return (
                        <div key={location} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{location}</span>
                            <span>{formatCurrency(locationAmount)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {locationExpenses.length} expenses •{" "}
                              {locationViolations} violations
                            </span>
                            <span>
                              {Math.round(
                                (locationViolations / locationExpenses.length) * 100
                              )}
                              % violation rate
                            </span>
                          </div>
                          <Progress
                            value={
                              (locationAmount / totalAmount) * 100
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Violation Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">By Policy</h3>
                  <div className="space-y-4">
                    {policies.map((policy) => {
                      const policyViolations = expenses.filter(
                        (e) =>
                          e.policyViolation &&
                          e.category === policy.category
                      ).length;
                      
                      return (
                        <div key={policy.id} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{policy.name}</span>
                            <span>{policyViolations} violations</span>
                          </div>
                          <Progress
                            value={
                              (policyViolations / expenses.filter(e => e.category === policy.category).length) * 100
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">By Approver</h3>
                  <div className="space-y-4">
                    {["Manager A", "Manager B", "Admin"].map((approver) => {
                      const approverExpenses = expenses.filter(
                        (e) => e.approver === approver
                      );
                      const approverViolations = approverExpenses.filter(
                        (e) => e.policyViolation
                      ).length;

                      return (
                        <div key={approver} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>{approver}</span>
                            <span>
                              {approverViolations} / {approverExpenses.length}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {Math.round(
                              (approverViolations / approverExpenses.length) * 100
                            )}
                            % violation rate
                          </div>
                          <Progress
                            value={
                              (approverViolations / approverExpenses.length) * 100
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
                    {selectedExpense.currency !== "KES" && selectedExpense.exchangeRate && (
                      <span className="text-sm text-muted-foreground block">
                        ≈ {formatCurrency(selectedExpense.amount * selectedExpense.exchangeRate)}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <Label>Status</Label>
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
          </DialogContent>
        </Dialog>
      )}

      {/* Policy Details Dialog */}
      <Dialog open={showPolicyDetails} onOpenChange={setShowPolicyDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expense Policies</DialogTitle>
            <DialogDescription>
              Review company expense policies and limits
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="border rounded p-4">
                <h3 className="font-semibold">{policy.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {policy.description}
                </p>
                {policy.amountLimit && (
                  <div className="mt-2">
                    <Label>Limit</Label>
                    <p>{formatCurrency(policy.amountLimit)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPolicyDetails(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditorDashboard;