import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { usePlans } from "@/hooks/use-plans";
import useSocket from "@/hooks/useSocket";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Search, Info, LogIn, Trash2, RefreshCw, Database, CheckSquare, Square } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { CompanyDeletionDialog } from "@/components/admin/CompanyDeletionDialog";
import { CompanyDataClearDialog } from "@/components/admin/CompanyDataClearDialog";
import { getPlanBillingPeriod } from "@/utils/plan-duration";
import { useCurrency } from "@/contexts/currency-context";

interface Company {
  id: number;
  name: string;
  slug: string;
  logo?: string;
  primaryColor: string;
  active: boolean;
  plan: string;
  planId?: number;
  maxUsers: number;
  createdAt: string;
  updatedAt: string;
}

function getCompanyInitials(name: string): string {
  return name
    ?.split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2) || 'CO';
}

export default function CompaniesPage() {
  const { user, isLoading, impersonateCompanyMutation } = useAuth();
  const { plans, isLoading: isLoadingPlans } = usePlans();
  const { formatCurrency } = useCurrency();
  const { onMessage } = useSocket('/ws');
  const [searchTerm, setSearchTerm] = useState("");
  const [companyToImpersonate, setCompanyToImpersonate] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [companyToClearData, setCompanyToClearData] = useState<Company | null>(null);
  const [showDataClearDialog, setShowDataClearDialog] = useState(false);
  

  const [selectedCompanies, setSelectedCompanies] = useState<Set<number>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  useEffect(() => {
    if (!isLoading && user && !user.isSuperAdmin) {
      window.location.href = "/";
    }
  }, [user, isLoading]);

  const { data: companies, isLoading: isLoadingCompanies, refetch: refetchCompanies } = useQuery<Company[]>({
    queryKey: ['/api/admin/companies'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
    enabled: !!user?.isSuperAdmin
  });


  useEffect(() => {
    if (!user?.isSuperAdmin) return;

    const handlePlanUpdate = (data: any) => {


      refetchCompanies();
    };

    const unsubscribe = onMessage('plan_updated', handlePlanUpdate);
    return unsubscribe;
  }, [user?.isSuperAdmin, onMessage, refetchCompanies]);


  useEffect(() => {
    if (!user?.isSuperAdmin) return;

    const interval = setInterval(() => {
      refetchCompanies();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.isSuperAdmin, refetchCompanies]);

  const getPlanDetails = (company: Company) => {

    if (company.planId) {
      const planById = plans.find(p => p.id === company.planId);
      if (planById) return planById;
    }


    if (company.plan) {
      return plans.find(p => p.name.toLowerCase() === company.plan.toLowerCase());
    }

    return null;
  };

  const handleImpersonateCompany = (company: Company) => {
    setCompanyToImpersonate(company);
  };

  const confirmImpersonation = () => {
    if (companyToImpersonate) {
      impersonateCompanyMutation.mutate(companyToImpersonate.id);
      setCompanyToImpersonate(null);
    }
  };

  const handleDeleteCompany = (company: Company) => {
    if (company.slug === 'system') {
      return;
    }
    setCompanyToDelete(company);
    setShowDeletionDialog(true);
  };

  const handleDeletionSuccess = () => {
    setCompanyToDelete(null);
    setShowDeletionDialog(false);
  };

  const handleDeletionClose = () => {
    setShowDeletionDialog(false);
    setCompanyToDelete(null);
  };

  const handleClearCompanyData = (company: Company) => {
    if (company.slug === 'system') {
      return;
    }
    setCompanyToClearData(company);
    setShowDataClearDialog(true);
  };

  const handleDataClearSuccess = () => {
    setCompanyToClearData(null);
    setShowDataClearDialog(false);
    refetchCompanies();
  };

  const handleDataClearClose = () => {
    setShowDataClearDialog(false);
    setCompanyToClearData(null);
  };


  const toggleCompanySelection = (companyId: number) => {
    setSelectedCompanies(prev => {
      const newSet = new Set(prev);
      const numericId = Number(companyId);
      if (newSet.has(numericId)) {
        newSet.delete(numericId);
      } else {
        newSet.add(numericId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedCompanies.size === filteredCompanies?.length) {
      setSelectedCompanies(new Set());
    } else {
      const allIds = new Set(filteredCompanies?.map(company => Number(company.id)) || []);
      setSelectedCompanies(allIds);
    }
  };

  const handleBulkDelete = () => {
    if (selectedCompanies.size > 0) {
      setShowBulkDeleteDialog(true);
    }
  };

  const confirmBulkDelete = async () => {
    if (selectedCompanies.size === 0) return;

    try {
      const companyIds = Array.from(selectedCompanies);
    
      
      const response = await apiRequest('DELETE', '/api/admin/companies/bulk', {
        companyIds
      });

      if (response.ok) {
        const result = await response.json();
        
        setSelectedCompanies(new Set());
        setShowBulkDeleteDialog(false);
        refetchCompanies();
        

        if (result.successCount > 0) {
          alert(`Successfully deleted ${result.successCount} companies${result.failureCount > 0 ? `, ${result.failureCount} failed` : ''}`);
        } else {
          alert('No companies were deleted. Please check the server logs for details.');
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete companies');
      }
    } catch (error) {
      console.error('Error deleting companies:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to delete companies: ${errorMessage}`);
    }
  };

  const handleBulkDeleteClose = () => {
    setShowBulkDeleteDialog(false);
  };

  const filteredCompanies = companies?.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user?.isSuperAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl">Companies</h1>
          <div className="flex gap-2">
            {selectedCompanies.size > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="destructive"
                className="bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected ({selectedCompanies.size})
              </Button>
            )}
            <Button
              onClick={() => refetchCompanies()}
              variant="outline"
              disabled={isLoadingCompanies}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingCompanies ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => window.location.href = "/admin/companies/new"}
              variant="brand"
              className="btn-brand-primary"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Company
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Manage Companies</CardTitle>
            <CardDescription>
              View and manage all companies in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search companies..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {isLoadingCompanies ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCompanies?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No companies match your search" : "No companies found. Create your first company to get started."}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedCompanies.size === filteredCompanies?.length && filteredCompanies?.length > 0}
                          onCheckedChange={toggleSelectAll}
                          className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies?.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedCompanies.has(Number(company.id))}
                            onCheckedChange={() => toggleCompanySelection(Number(company.id))}
                            className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {company.logo ? (
                                <AvatarImage src={company.logo} alt={company.name} />
                              ) : null}
                              <AvatarFallback
                                className="text-white font-medium text-sm"
                                style={{ backgroundColor: company.primaryColor }}
                              >
                                {getCompanyInitials(company.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{company.name}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{company.slug}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <span className="capitalize font-medium">{getPlanDetails(company)?.name || company.plan}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-1">
                                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="max-w-xs">
                                  {isLoadingPlans ? (
                                    <div className="flex items-center">
                                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                                      Loading plan details...
                                    </div>
                                  ) : (
                                    <div className="space-y-1 text-xs">
                                      <p className="font-semibold">{getPlanDetails(company)?.name || company.plan}</p>
                                      <p>{getPlanDetails(company)?.description || "No description available"}</p>
                                      <div className="mt-1 pt-1 border-t border-border">
                                        <p><span className="font-medium">Price:</span> {formatCurrency(getPlanDetails(company)?.price || 0)}{getPlanBillingPeriod(getPlanDetails(company) || {})}</p>
                                        <p><span className="font-medium">Max Users:</span> {getPlanDetails(company)?.maxUsers || company.maxUsers}</p>
                                        <p><span className="font-medium">Max Contacts:</span> {getPlanDetails(company)?.maxContacts?.toLocaleString() || "N/A"}</p>
                                        <p><span className="font-medium">Max Channels:</span> {getPlanDetails(company)?.maxChannels || "N/A"}</p>
                                      </div>
                                    </div>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell>{company.maxUsers}</TableCell>
                        <TableCell>
                          {company.active ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="brand"
                              size="sm"
                              onClick={() => window.location.href = `/admin/companies/${company.id}`}
                            >
                              Manage
                            </Button>
                            <Button
                              className="btn-brand-primary"
                              variant="secondary"
                              size="sm"
                              onClick={() => handleImpersonateCompany(company)}
                            >
                              <LogIn className="h-3.5 w-3.5 mr-1" />
                              Login As
                            </Button>
                            {company.slug !== 'system' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleClearCompanyData(company)}
                                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                >
                                  <Database className="h-3.5 w-3.5 mr-1" />
                                  Clear Data
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteCompany(company)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog
          open={!!companyToImpersonate}
          onOpenChange={(open) => !open && setCompanyToImpersonate(null)}
        >
          <AlertDialogContent className="max-w-md max-h-[90vh]">
            <AlertDialogHeader>
              <AlertDialogTitle>Impersonate Company</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to log in as an admin user for {companyToImpersonate?.name}.
                This will allow you to access the company dashboard and perform actions as a company admin.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="btn-brand-primary" onClick={confirmImpersonation}>
                {impersonateCompanyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Impersonating...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Login as Company Admin
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <CompanyDeletionDialog
          isOpen={showDeletionDialog}
          onClose={handleDeletionClose}
          companyId={companyToDelete?.id || null}
          companyName={companyToDelete?.name || ''}
          onSuccess={handleDeletionSuccess}
        />

        <CompanyDataClearDialog
          isOpen={showDataClearDialog}
          onClose={handleDataClearClose}
          companyId={companyToClearData?.id || null}
          companyName={companyToClearData?.name || ''}
          onSuccess={handleDataClearSuccess}
        />

        {/* Bulk Delete Confirmation Dialog */}
        <AlertDialog
          open={showBulkDeleteDialog}
          onOpenChange={(open) => !open && handleBulkDeleteClose()}
        >
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Multiple Companies</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to delete {selectedCompanies.size} companies and all their associated data. 
                This action cannot be undone. Are you sure you want to continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-red-600 hover:bg-red-700"
                onClick={confirmBulkDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedCompanies.size} Companies
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
