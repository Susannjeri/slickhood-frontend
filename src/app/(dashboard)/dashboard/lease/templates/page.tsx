"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useApi } from '@/hooks/useApi';
import { LeaseTemplatePayload } from '@/lib/api';
import { LeaseMode } from '@/types';
import { toast } from 'sonner';
import ProfileGateModal, {ProfileGateFields} from '@/components/auth/ProfileGateModal';

const LeaseTemplatesPage = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; templateId: number | null }>({ open: false, templateId: null });
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(3); // 3 columns x 2 rows, pagination shows with 7+ templates

  // Profile Gate State
  const [profileGate, setProfileGate] = useState<Record<string, boolean> | null>(null);

  const { 
    handleListLeaseTemplates, 
    handleCreateLeaseTemplate, 
    handleUpdateLeaseTemplate, 
    handleDeleteLeaseTemplate,
    handleViewLeaseTemplate 
  } = useApi();

  const [formData, setFormData] = useState({
    name: '',
    leaseMode: 'RENT' as LeaseMode,
    petsPolicy: '',
    selfRenew: false,
    selfRenewable: false,
    leaseDurationInMonths: 12,
    noticePeriodInMonths: 1,
    depositReturnDays: 30,
    rentDueDayOfMonth: 1,
    entryNoticeDays: 24,
    repairThreshold: 0
  });

  useEffect(() => {
    loadTemplates();
  }, [currentPage, pageSize]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response:any = await handleListLeaseTemplates({
        page: currentPage,
        size: pageSize,
        sort: 'id,desc'
      });

      if (response?.profileGate) {
        setProfileGate(response.fields)
        return
      }
      
      if (response.success) {
        setTemplates(response.data);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      toast.error("Failed to load lease templates");
    } finally {
      setLoading(false);
    }
  };

  const isDefaultTemplate = (name: string): boolean => {
    return name === 'DEFAULT_SALE' || name === 'DEFAULT_RENT';
  };

  const handleOpenForm = (template: any = null) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        leaseMode: template.leaseMode,
        petsPolicy: template.petsPolicy || '',
        selfRenew: template.selfRenew || false,
        selfRenewable: template.selfRenewable || false,
        leaseDurationInMonths: template.leaseDurationInMonths || 12,
        noticePeriodInMonths: template.noticePeriodInMonths || 1,
        depositReturnDays: template.depositReturnDays || 30,
        rentDueDayOfMonth: template.rentDueDayOfMonth || 1,
        entryNoticeDays: template.entryNoticeDays || 24,
        repairThreshold: template.repairThreshold || 0
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        leaseMode: 'RENT',
        petsPolicy: '',
        selfRenew: false,
        selfRenewable: false,
        leaseDurationInMonths: 12,
        noticePeriodInMonths: 1,
        depositReturnDays: 30,
        rentDueDayOfMonth: 1,
        entryNoticeDays: 24,
        repairThreshold: 0
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("Template name is required");
      return;
    }

    const payload: LeaseTemplatePayload = formData.leaseMode === 'SALE'
      ? {
          name: formData.name,
          leaseMode: 'SALE',
          selfRenew: formData.selfRenew,
          petsPolicy: formData.petsPolicy
        }
      : {
          name: formData.name,
          leaseMode: 'RENT',
          selfRenewable: formData.selfRenewable,
          leaseDurationInMonths: formData.leaseDurationInMonths,
          noticePeriodInMonths: formData.noticePeriodInMonths,
          depositReturnDays: formData.depositReturnDays,
          rentDueDayOfMonth: formData.rentDueDayOfMonth,
          entryNoticeDays: formData.entryNoticeDays,
          repairThreshold: formData.repairThreshold,
          petsPolicy: formData.petsPolicy
        };

    try {
      if (editingTemplate) {
        const response = await handleUpdateLeaseTemplate(editingTemplate.id.toString(), payload);
        if (response.success) {
          toast.success("Lease template updated successfully");
        }
      } else {
        const response:any = await handleCreateLeaseTemplate(payload);

        if (response.profileGate) {
          setProfileGate(response.fields)
          return;
        }

        if (response.success) {
          toast.success("Lease template created successfully");
        }
      }
      handleCloseForm();
      loadTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error("Failed to save lease template");
    }
  };

  const handleViewPdf = async (templateId: number) => {
    try {
      const response = await handleViewLeaseTemplate(templateId);
      console.log('View lease template response:', response);
      
      let blob;
      if (response instanceof Blob) {
        blob = response;
      } else {
        const pdfData = response.data || response;
        blob = new Blob([pdfData], { type: 'application/pdf' });
      }
      
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setIsPdfModalOpen(true);
    } catch (error) {
      console.error('Error viewing PDF:', error);
      toast.error("Failed to load lease template PDF");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await handleDeleteLeaseTemplate(deleteDialog.templateId!);
      if (response.success) {
        toast.success("Lease template deleted successfully");
      }
      setDeleteDialog({ open: false, templateId: null });
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error("Failed to delete lease template");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[#141130]">Lease Templates</h1>
              <p className="text-gray-600 mt-1">Manage your rental and sale lease agreements</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="pageSize" className="text-sm text-gray-600 whitespace-nowrap">
                  Show:
                </Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(0);
                  }}
                >
                  <SelectTrigger id="pageSize" className="w-[80px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="6">6</SelectItem>
                    <SelectItem value="9">9</SelectItem>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => handleOpenForm()}
                className="bg-[#EF4217] hover:bg-[#d63a14] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <Card className="h-[320px] bg-gray-200" />
              </div>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <Card className="p-12 text-center border-2 border-dashed">
            <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Lease Templates</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first lease template</p>
            <Button 
              onClick={() => handleOpenForm()}
              className="bg-[#EF4217] hover:bg-[#d63a14] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <Card 
                  key={template.id} 
                  className={`hover:shadow-lg transition-shadow flex flex-col ${
                    isDefaultTemplate(template.name) 
                      ? 'border-2 border-[#141130]/20 bg-gradient-to-br from-[#141130]/5 to-transparent' 
                      : 'border border-gray-200'
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-[#141130] mb-2">
                          {template.name.replace(/_/g, ' ')}
                        </CardTitle>
                        <div className="flex gap-2 flex-wrap">
                          <Badge 
                            variant={template.leaseMode === 'RENT' ? 'default' : 'secondary'}
                            className={
                              template.leaseMode === 'RENT' 
                                ? 'bg-[#EF4217] hover:bg-[#d63a14] text-white' 
                                : 'bg-[#141130] hover:bg-[#141130]/90 text-white'
                            }
                          >
                            {template.leaseMode}
                          </Badge>
                          {isDefaultTemplate(template.name) && (
                            <Badge variant="outline" className="border-[#141130] text-[#141130]">
                              Default
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 flex-grow">
                    {template.leaseMode === 'RENT' && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-medium text-[#141130]">
                            {template.leaseDurationInMonths} months
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Rent Due:</span>
                          <span className="font-medium text-[#141130]">
                            Day {template.rentDueDayOfMonth}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Notice Period:</span>
                          <span className="font-medium text-[#141130]">
                            {template.noticePeriodInMonths} months
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Self Renew:</span>
                      <span className="font-medium text-[#141130]">
                        {template.selfRenew || template.selfRenewable ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-gray-600 line-clamp-2">
                        <span className="font-medium">Pets Policy:</span> {template.petsPolicy || 'Not specified'}
                      </p>
                    </div>
                  </CardContent>

                  <CardFooter className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewPdf(template.id)}
                      className="flex-1 border-[#141130] text-[#141130] hover:bg-[#141130] hover:text-white"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {!isDefaultTemplate(template.name) && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenForm(template)}
                          className="flex-1 border-[#EF4217] text-[#EF4217] hover:bg-[#EF4217] hover:text-white"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteDialog({ open: true, templateId: template.id })}
                          className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-medium">{currentPage * pageSize + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * pageSize, totalElements)}
                  </span>{" "}
                  of <span className="font-medium">{totalElements}</span> templates
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                    className="hover:bg-gray-100 transition"
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 0}
                    className="hover:bg-gray-100 transition"
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i;
                      } else if (currentPage < 3) {
                        pageNum = i;
                      } else if (currentPage > totalPages - 4) {
                        pageNum = totalPages - 5 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage === pageNum ? "bg-[#EF4217] hover:bg-[#d63a14] text-white" : ""}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="hover:bg-gray-100 transition"
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="hover:bg-gray-100 transition"
                  >
                    Last
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Form Sheet */}
      <Sheet open={isFormOpen} onOpenChange={setIsFormOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-[#141130]">
              {editingTemplate ? 'Edit Lease Template' : 'Create Lease Template'}
            </SheetTitle>
            <SheetDescription>
              {formData.leaseMode === 'RENT' 
                ? 'Configure rental lease agreement details' 
                : 'Configure sale lease agreement details'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Standard Apartment Lease"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaseMode">Lease Type *</Label>
              <Select
                value={formData.leaseMode}
                onValueChange={(value) => setFormData({ ...formData, leaseMode: value as LeaseMode })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RENT">Rent</SelectItem>
                  <SelectItem value="SALE">Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.leaseMode === 'RENT' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="leaseDuration">Lease Duration (months) *</Label>
                    <Input
                      id="leaseDuration"
                      type="number"
                      value={formData.leaseDurationInMonths}
                      onChange={(e) => setFormData({ ...formData, leaseDurationInMonths: parseInt(e.target.value) || 0 })}
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="noticePeriod">Notice Period (months) *</Label>
                    <Input
                      id="noticePeriod"
                      type="number"
                      value={formData.noticePeriodInMonths}
                      onChange={(e) => setFormData({ ...formData, noticePeriodInMonths: parseInt(e.target.value) || 0 })}
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="depositReturn">Deposit Return (days) *</Label>
                    <Input
                      id="depositReturn"
                      type="number"
                      value={formData.depositReturnDays}
                      onChange={(e) => setFormData({ ...formData, depositReturnDays: parseInt(e.target.value) || 0 })}
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rentDue">Rent Due Day *</Label>
                    <Input
                      id="rentDue"
                      type="number"
                      value={formData.rentDueDayOfMonth}
                      onChange={(e) => setFormData({ ...formData, rentDueDayOfMonth: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="31"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entryNotice">Entry Notice (hours) *</Label>
                    <Input
                      id="entryNotice"
                      type="number"
                      value={formData.entryNoticeDays}
                      onChange={(e) => setFormData({ ...formData, entryNoticeDays: parseInt(e.target.value) || 0 })}
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="repairThreshold">Repair Threshold *</Label>
                    <Input
                      id="repairThreshold"
                      type="number"
                      value={formData.repairThreshold}
                      onChange={(e) => setFormData({ ...formData, repairThreshold: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <Label htmlFor="selfRenewable" className="cursor-pointer">
                    Self-Renewable Lease
                  </Label>
                  <Switch
                    id="selfRenewable"
                    checked={formData.selfRenewable}
                    onCheckedChange={(checked) => setFormData({ ...formData, selfRenewable: checked })}
                  />
                </div>
              </>
            )}

            {formData.leaseMode === 'SALE' && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <Label htmlFor="selfRenew" className="cursor-pointer">
                  Self-Renewing Agreement
                </Label>
                <Switch
                  id="selfRenew"
                  checked={formData.selfRenew}
                  onCheckedChange={(checked) => setFormData({ ...formData, selfRenew: checked })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="petsPolicy">Pets Policy</Label>
              <Textarea
                id="petsPolicy"
                value={formData.petsPolicy}
                onChange={(e) => setFormData({ ...formData, petsPolicy: e.target.value })}
                placeholder="Describe the pets policy for this lease..."
                rows={4}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseForm}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                className="flex-1 bg-[#EF4217] hover:bg-[#d63a14] text-white"
              >
                {editingTemplate ? 'Update Template' : 'Create Template'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <ProfileGateModal
        open={!!profileGate}
        fields={profileGate ?? {}}
        onClose={() => {}} 
      />

      {/* PDF Viewer Modal */}
      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-[#141130]">Lease Template Preview</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full h-full p-4">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border rounded"
                title="Lease Template PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading PDF...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, templateId: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#141130]">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lease template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

  );
};

export default LeaseTemplatesPage;