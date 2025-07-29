import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import type { User as BaseUser } from "@/types";

type User = BaseUser & {
  location?: string;
};

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

const BranchOfficerDashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("expenses");
  const [showNewExpenseDialog, setShowNewExpenseDialog] = useState(false);
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseData | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);

  const [newExpense, setNewExpense] = useState<
    Omit<ExpenseData, "id" | "status">
  >({
    date: new Date().toISOString().split("T")[0],
    description: "",
    category: "",
    amount: 0,
    floatId: "",
    location: user.location || "",
    currency: "KES",
    exchangeRate: 1,
  });

  // Mock data filtered by branch officer's location
  const mockFloats: FloatData[] = [
    {
      id: "FL001",
      description: "Branch Operations",
      location: user.location || "Nairobi Central Branch",
      initialAmount: 50000,
      usedAmount: 32000,
      balance: 18000,
      status: "active",
      currency: "KES",
    },
    {
      id: "FL002",
      description: "Customer Service",
      location: user.location || "Nairobi Central Branch",
      initialAmount: 30000,
      usedAmount: 28500,
      balance: 1500,
      status: "low",
      currency: "KES",
    },
  ];

  const mockRecentExpenses: ExpenseData[] = [
    {
      id: "EXP001",
      date: "2024-01-15",
      description: "Office Supplies",
      category: "Supplies",
      amount: 3500,
      floatId: "FL001",
      location: user.location || "Nairobi Central Branch",
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
      location: user.location || "Nairobi Central Branch",
      status: "pending",
      currency: "KES",
    },
  ];

  const [floats, setFloats] = useState<FloatData[]>(mockFloats);
  const [expenses, setExpenses] = useState<ExpenseData[]>(mockRecentExpenses);

  // Calculate totals for branch only
  const totalFloats = floats.length;
  const totalValue = floats.reduce((sum, float) => sum + float.initialAmount, 0);
  const totalUsed = floats.reduce((sum, float) => sum + float.usedAmount, 0);
  const totalBalance = floats.reduce((sum, float) => sum + float.balance, 0);
  const pendingApprovalCount = expenses.filter((e) => e.status === "pending").length;

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

  const handleCreateExpense = () => {
    const newId = `EXP${(expenses.length + 1).toString().padStart(3, "0")}`;
    const expense: ExpenseData = {
      id: newId,
      ...newExpense,
      status: "pending",
      receipt: receiptFile?.name,
      attachments: additionalFiles.map((file) => file.name),
    };

    setExpenses([...expenses, expense]);
    setShowNewExpenseDialog(false);
    resetExpenseForm();
  };

  const resetExpenseForm = () => {
    setNewExpense({
      date: new Date().toISOString().split("T")[0],
      description: "",
      category: "",
      amount: 0,
      floatId: "",
      location: user.location || "",
      currency: "KES",
      exchangeRate: 1,
    });
    setReceiptFile(null);
    setAdditionalFiles([]);
  };

  const formatCurrency = (amount: number, currency: string = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const tabs = [
    { id: "expenses", label: "My Expenses" },
    { id: "floats", label: "Branch Floats" },
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
              <h1 className="text-xl font-bold">Branch Expense System</h1>
              <p className="text-sm text-muted-foreground">
                {user.location || "Branch"} Dashboard
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
                BRANCH OFFICER
              </Badge>
            </div>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button size="sm" onClick={() => setShowNewExpenseDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Expense
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Branch Float Value
            </CardTitle>
            <Wallet className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalValue)}</div>
            <p className="text-xs text-muted-foreground">
              {totalFloats} floats • {formatCurrency(totalBalance)} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovalCount}</div>
            <p className="text-xs text-muted-foreground">
              {pendingApprovalCount === 0 ? "All submitted" : "Waiting approval"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Branch Location
            </CardTitle>
            <Building className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{user.location || "Branch"}</div>
            <p className="text-xs text-muted-foreground">
              Your assigned location
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search */}
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
      </div>

      {/* Content based on active tab */}
      {activeTab === "expenses" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              My Expense History
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
                    </TableCell>
                    <TableCell>{expense.floatId}</TableCell>
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

      {activeTab === "floats" && (
        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Branch Floats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
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

            <div className="grid grid-cols-2 gap-4">
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
                    {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
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
              <div>
                <Label>Float Account</Label>
                <p>{selectedExpense.floatId}</p>
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

export default BranchOfficerDashboard;