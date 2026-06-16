"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  type: string;
  description: string | null;
  contactEmail: string;
  contactPhone: string | null;
  createdByUserId: number;
}

interface CreateDriveFormProps {
  userId: number;
  onSuccess: () => void;
}

export const CreateDriveForm = ({ userId, onSuccess }: CreateDriveFormProps) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrgForm, setShowOrgForm] = useState(false);

  const [formData, setFormData] = useState({
    organizationId: "",
    title: "",
    description: "",
    address: "",
    scheduledDate: "",
    durationHours: "",
    maxParticipants: "",
  });

  const [orgFormData, setOrgFormData] = useState({
    name: "",
    type: "citizen_group" as "ngo" | "school" | "citizen_group",
    description: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    fetchOrganizations();
  }, [userId]);

  const fetchOrganizations = async () => {
    setIsLoadingOrgs(true);
    try {
      const res = await fetch(`/api/organizations?createdBy=${userId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
    } finally {
      setIsLoadingOrgs(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...orgFormData,
          createdByUserId: userId,
        }),
      });

      if (res.ok) {
        const newOrg = await res.json();
        toast.success("Organization created successfully!");
        setOrganizations([...organizations, newOrg]);
        setFormData({ ...formData, organizationId: newOrg.id.toString() });
        setShowOrgForm(false);
        setOrgFormData({
          name: "",
          type: "citizen_group",
          description: "",
          contactEmail: "",
          contactPhone: "",
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create organization");
      }
    } catch (error) {
      console.error("Failed to create organization:", error);
      toast.error("Failed to create organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.organizationId) {
      toast.error("Please select or create an organization");
      return;
    }

    if (!formData.title || !formData.description || !formData.address || !formData.scheduledDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/cleanup-drives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: parseInt(formData.organizationId),
          title: formData.title,
          description: formData.description,
          location: {
            lat: 0,
            lng: 0,
            address: formData.address,
          },
          scheduledDate: new Date(formData.scheduledDate).toISOString(),
          durationHours: formData.durationHours ? parseInt(formData.durationHours) : null,
          maxParticipants: formData.maxParticipants ? parseInt(formData.maxParticipants) : null,
          createdByUserId: userId,
        }),
      });

      if (res.ok) {
        toast.success("Cleanup drive created successfully!");
        setFormData({
          organizationId: "",
          title: "",
          description: "",
          address: "",
          scheduledDate: "",
          durationHours: "",
          maxParticipants: "",
        });
        onSuccess();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create cleanup drive");
      }
    } catch (error) {
      console.error("Failed to create cleanup drive:", error);
      toast.error("Failed to create cleanup drive");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showOrgForm) {
    return (
      <form onSubmit={handleCreateOrganization} className="space-y-4">
        <div>
          <Label htmlFor="org-name">Organization Name *</Label>
          <Input
            id="org-name"
            value={orgFormData.name}
            onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="org-type">Type *</Label>
          <Select
            value={orgFormData.type}
            onValueChange={(value: any) => setOrgFormData({ ...orgFormData, type: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ngo">NGO</SelectItem>
              <SelectItem value="school">School</SelectItem>
              <SelectItem value="citizen_group">Citizen Group</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="org-description">Description</Label>
          <Textarea
            id="org-description"
            value={orgFormData.description}
            onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="org-email">Contact Email *</Label>
          <Input
            id="org-email"
            type="email"
            value={orgFormData.contactEmail}
            onChange={(e) => setOrgFormData({ ...orgFormData, contactEmail: e.target.value })}
            required
          />
        </div>

        <div>
          <Label htmlFor="org-phone">Contact Phone</Label>
          <Input
            id="org-phone"
            type="tel"
            value={orgFormData.contactPhone}
            onChange={(e) => setOrgFormData({ ...orgFormData, contactPhone: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Organization"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowOrgForm(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="organization">Organization *</Label>
        <div className="flex gap-2">
          <Select
            value={formData.organizationId}
            onValueChange={(value) => setFormData({ ...formData, organizationId: value })}
            disabled={isLoadingOrgs}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id.toString()}>
                  {org.name} ({org.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowOrgForm(true)}
            title="Create new organization"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Drive Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Beach Cleanup Drive"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the cleanup drive objectives and activities"
          rows={4}
          required
        />
      </div>

      <div>
        <Label htmlFor="address">Location Address *</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          placeholder="e.g., 123 Beach Road, City Name"
          required
        />
      </div>

      <div>
        <Label htmlFor="scheduledDate">Scheduled Date & Time *</Label>
        <Input
          id="scheduledDate"
          type="datetime-local"
          value={formData.scheduledDate}
          onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="duration">Duration (hours)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            value={formData.durationHours}
            onChange={(e) => setFormData({ ...formData, durationHours: e.target.value })}
            placeholder="e.g., 3"
          />
        </div>

        <div>
          <Label htmlFor="maxParticipants">Max Participants</Label>
          <Input
            id="maxParticipants"
            type="number"
            min="1"
            value={formData.maxParticipants}
            onChange={(e) => setFormData({ ...formData, maxParticipants: e.target.value })}
            placeholder="Leave empty for unlimited"
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating Drive..." : "Create Cleanup Drive"}
      </Button>
    </form>
  );
};
