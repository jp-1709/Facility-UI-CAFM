import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, DollarSign, Plus, RefreshCw, TrendingUp, Wallet } from 'lucide-react';

interface PettyCashFund {
  id: string;
  name: string;
  balance: number;
  custodian: string;
  department: string;
  status: 'Active' | 'Inactive';
}

interface PettyCashTransaction {
  id: string;
  date: string;
  voucherNumber: string;
  fund: string;
  type: 'Expense' | 'Fund Addition' | 'Adjustment';
  category: string;
  description: string;
  payee: string;
  amount: number;
  status: 'Pending' | 'Submitted' | 'Cancelled';
}

interface PettyCashReconciliation {
  id: string;
  date: string;
  fund: string;
  systemBalance: number;
  physicalBalance: number;
  difference: number;
  status: 'Matched' | 'Mismatch' | 'Pending';
}

const PettyCash: React.FC = () => {
  const [activeTab, setActiveTab] = useState('funds');
  const [funds, setFunds] = useState<PettyCashFund[]>([]);
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<PettyCashReconciliation[]>([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  
  // Form states
  const [transactionForm, setTransactionForm] = useState({
    transactionType: 'Expense',
    pettyCashFund: '',
    transactionDate: new Date().toISOString().split('T')[0],
    amount: '',
    category: '',
    payee: '',
    description: '',
    receiptNumber: ''
  });

  const [reconciliationForm, setReconciliationForm] = useState({
    fund: '',
    reconciliationDate: new Date().toISOString().split('T')[0],
    physicalBalance: ''
  });

  const [fundForm, setFundForm] = useState({
    fundName: '',
    custodian: '',
    department: '',
    initialAmount: '',
    location: ''
  });

  // Mock data - replace with API calls
  useEffect(() => {
    setFunds([
      { id: '1', name: 'Main Office Petty Cash', balance: 5000, custodian: 'John Doe', department: 'Administration', status: 'Active' },
      { id: '2', name: 'Warehouse Petty Cash', balance: 3000, custodian: 'Jane Smith', department: 'Operations', status: 'Active' },
      { id: '3', name: 'Sales Office Petty Cash', balance: 1500, custodian: 'Mike Johnson', department: 'Sales', status: 'Active' }
    ]);

    setTransactions([
      { id: '1', date: '2024-01-15', voucherNumber: 'PCTT-0001', fund: 'Main Office Petty Cash', type: 'Expense', category: 'Office Supplies', description: 'Stationery purchase', payee: 'Office Depot', amount: 150, status: 'Submitted' },
      { id: '2', date: '2024-01-14', voucherNumber: 'PCTT-0002', fund: 'Main Office Petty Cash', type: 'Fund Addition', category: 'Fund Transfer', description: 'Monthly fund replenishment', payee: 'Main Bank', amount: 2000, status: 'Submitted' },
      { id: '3', date: '2024-01-13', voucherNumber: 'PCTT-0003', fund: 'Warehouse Petty Cash', type: 'Expense', category: 'Maintenance', description: 'Tool purchase', payee: 'Hardware Store', amount: 75, status: 'Submitted' }
    ]);

    setReconciliations([
      { id: '1', date: '2024-01-15', fund: 'Main Office Petty Cash', systemBalance: 5000, physicalBalance: 4985, difference: -15, status: 'Mismatch' },
      { id: '2', date: '2024-01-14', fund: 'Warehouse Petty Cash', systemBalance: 3000, physicalBalance: 3000, difference: 0, status: 'Matched' },
      { id: '3', date: '2024-01-13', fund: 'Sales Office Petty Cash', systemBalance: 1500, physicalBalance: 1500, difference: 0, status: 'Matched' }
    ]);
  }, []);

  const totalBalance = funds.reduce((sum, fund) => sum + fund.balance, 0);
  const activeFunds = funds.filter(fund => fund.status === 'Active').length;
  const lowBalanceFunds = funds.filter(fund => fund.balance < 1000).length;

  const handleRecordTransaction = () => {
    console.log('Recording transaction:', transactionForm);
    setShowTransactionModal(false);
    // Reset form
    setTransactionForm({
      transactionType: 'Expense',
      pettyCashFund: '',
      transactionDate: new Date().toISOString().split('T')[0],
      amount: '',
      category: '',
      payee: '',
      description: '',
      receiptNumber: ''
    });
  };

  const handleReconcile = () => {
    console.log('Reconciling:', reconciliationForm);
    setShowReconciliationModal(false);
    // Reset form
    setReconciliationForm({
      fund: '',
      reconciliationDate: new Date().toISOString().split('T')[0],
      physicalBalance: ''
    });
  };

  const handleCreateFund = () => {
    console.log('Creating fund:', fundForm);
    setShowFundModal(false);
    // Reset form
    setFundForm({
      fundName: '',
      custodian: '',
      department: '',
      initialAmount: '',
      location: ''
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Petty Cash Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFundModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Fund
          </Button>
          <Button onClick={() => setShowTransactionModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Record Transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Funds</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeFunds}</div>
            <p className="text-xs text-muted-foreground">Total active funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Allocated</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalBalance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Allocated funds</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Balance</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowBalanceFunds}</div>
            <p className="text-xs text-muted-foreground">Funds below ₹1000</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="funds">Funds</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        {/* Funds Tab */}
        <TabsContent value="funds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Petty Cash Funds</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund Name</TableHead>
                    <TableHead>Custodian</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {funds.map((fund) => (
                    <TableRow key={fund.id}>
                      <TableCell className="font-medium">{fund.name}</TableCell>
                      <TableCell>{fund.custodian}</TableCell>
                      <TableCell>{fund.department}</TableCell>
                      <TableCell>₹{fund.balance.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={fund.status === 'Active' ? 'default' : 'secondary'}>
                          {fund.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Petty Cash Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Payee</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell className="font-medium">{transaction.voucherNumber}</TableCell>
                      <TableCell>{transaction.fund}</TableCell>
                      <TableCell>
                        <Badge variant={
                          transaction.type === 'Expense' ? 'destructive' :
                          transaction.type === 'Fund Addition' ? 'default' : 'secondary'
                        }>
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{transaction.category}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>{transaction.payee}</TableCell>
                      <TableCell>₹{transaction.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={transaction.status === 'Submitted' ? 'default' : 'secondary'}>
                          {transaction.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Tab */}
        <TabsContent value="reconciliation" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Petty Cash Reconciliation</h2>
            <Button onClick={() => setShowReconciliationModal(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconcile Fund
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Reconciliation History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Fund</TableHead>
                    <TableHead>System Balance</TableHead>
                    <TableHead>Physical Balance</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconciliations.map((reconciliation) => (
                    <TableRow key={reconciliation.id}>
                      <TableCell>{reconciliation.date}</TableCell>
                      <TableCell>{reconciliation.fund}</TableCell>
                      <TableCell>₹{reconciliation.systemBalance.toLocaleString()}</TableCell>
                      <TableCell>₹{reconciliation.physicalBalance.toLocaleString()}</TableCell>
                      <TableCell className={reconciliation.difference !== 0 ? 'text-red-600' : 'text-green-600'}>
                        ₹{reconciliation.difference.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          reconciliation.status === 'Matched' ? 'default' :
                          reconciliation.status === 'Mismatch' ? 'destructive' : 'secondary'
                        }>
                          {reconciliation.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Transaction Modal */}
      <Dialog open={showTransactionModal} onOpenChange={setShowTransactionModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Petty Cash Transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transactionType" className="text-right">
                Transaction Type
              </Label>
              <Select value={transactionForm.transactionType} onValueChange={(value: string) => setTransactionForm({...transactionForm, transactionType: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Expense">Expense</SelectItem>
                  <SelectItem value="Fund Addition">Fund Addition</SelectItem>
                  <SelectItem value="Adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pettyCashFund" className="text-right">
                Petty Cash Fund
              </Label>
              <Select value={transactionForm.pettyCashFund} onValueChange={(value: string) => setTransactionForm({...transactionForm, pettyCashFund: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.name}>{fund.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="transactionDate" className="text-right">
                Transaction Date
              </Label>
              <Input
                id="transactionDate"
                type="date"
                value={transactionForm.transactionDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, transactionDate: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                value={transactionForm.amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, amount: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">
                Category
              </Label>
              <Input
                id="category"
                value={transactionForm.category}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, category: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="payee" className="text-right">
                Payee
              </Label>
              <Input
                id="payee"
                value={transactionForm.payee}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, payee: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={transactionForm.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTransactionForm({...transactionForm, description: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="receiptNumber" className="text-right">
                Receipt/Reference Number
              </Label>
              <Input
                id="receiptNumber"
                value={transactionForm.receiptNumber}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionForm({...transactionForm, receiptNumber: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowTransactionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordTransaction}>
              Record Transaction
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Modal */}
      <Dialog open={showReconciliationModal} onOpenChange={setShowReconciliationModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Petty Cash Reconciliation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fund" className="text-right">
                Fund to Reconcile
              </Label>
              <Select value={reconciliationForm.fund} onValueChange={(value: string) => setReconciliationForm({...reconciliationForm, fund: value})}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select fund" />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((fund) => (
                    <SelectItem key={fund.id} value={fund.name}>{fund.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="reconciliationDate" className="text-right">
                Reconciliation Date
              </Label>
              <Input
                id="reconciliationDate"
                type="date"
                value={reconciliationForm.reconciliationDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReconciliationForm({...reconciliationForm, reconciliationDate: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="physicalBalance" className="text-right">
                Physical Balance
              </Label>
              <Input
                id="physicalBalance"
                type="number"
                value={reconciliationForm.physicalBalance}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReconciliationForm({...reconciliationForm, physicalBalance: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowReconciliationModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReconcile}>
              Reconcile
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Fund Modal */}
      <Dialog open={showFundModal} onOpenChange={setShowFundModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Petty Cash Fund</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="fundName" className="text-right">
                Fund Name
              </Label>
              <Input
                id="fundName"
                value={fundForm.fundName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundForm({...fundForm, fundName: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="custodian" className="text-right">
                Custodian
              </Label>
              <Input
                id="custodian"
                value={fundForm.custodian}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundForm({...fundForm, custodian: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Department
              </Label>
              <Input
                id="department"
                value={fundForm.department}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundForm({...fundForm, department: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="initialAmount" className="text-right">
                Initial Amount
              </Label>
              <Input
                id="initialAmount"
                type="number"
                value={fundForm.initialAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundForm({...fundForm, initialAmount: e.target.value})}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                value={fundForm.location}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundForm({...fundForm, location: e.target.value})}
                className="col-span-3"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowFundModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFund}>
              Create Fund
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PettyCash;
