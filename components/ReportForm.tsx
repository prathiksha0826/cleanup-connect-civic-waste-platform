"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, MapPin, Loader2, Camera, Leaf, Brain } from "lucide-react";
import { toast } from "sonner";
import { getWasteClassifier } from "@/lib/hybrid-waste-classifier";

interface ReportFormProps {
  userId: number;
  onSuccess: () => void;
}

const wasteTypes = [
  { value: "plastic", label: "Plastic", biodegradable: "non-biodegradable" },
  { value: "organic", label: "Organic", biodegradable: "biodegradable" },
  { value: "metal", label: "Metal", biodegradable: "non-biodegradable" },
  { value: "electronic", label: "Electronic", biodegradable: "non-biodegradable" },
  { value: "glass", label: "Glass", biodegradable: "non-biodegradable" },
  { value: "paper", label: "Paper", biodegradable: "biodegradable" },
];

const severityLevels = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export function ReportForm({ userId, onSuccess }: ReportFormProps) {
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [estimatedCO2, setEstimatedCO2] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    wasteType: "",
    biodegradable: "",
    severity: "",
    description: "",
    latitude: "",
    longitude: "",
    address: "",
    estimatedWeightKg: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const classifierRef = useRef(getWasteClassifier());

  // Preload the AI model when component mounts
  useEffect(() => {
    const initClassifier = async () => {
      try {
        await classifierRef.current.initialize();
        console.log('Hybrid waste classifier initialized');
      } catch (error) {
        console.error('Failed to initialize classifier:', error);
      }
    };
    initClassifier();
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        setPhotoPreview(preview);
        
        // Classify the image using client-side AI
        classifyWasteClientSide(preview);
      };
      reader.readAsDataURL(file);
    }
  };

  const classifyWasteClientSide = async (imageDataUrl: string) => {
    setClassifying(true);
    
    try {
      // Create image element for classification
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageDataUrl;
      });

      // Run hybrid AI classification (COCO-SSD + advanced mapping)
      const result = await classifierRef.current.classify(img);

      // Map biodegradability
      const biodegradable = result.biodegradable ? "biodegradable" : "non-biodegradable";

      // Update form with AI results
      setFormData(prev => ({
        ...prev,
        wasteType: result.wasteType,
        biodegradable,
        severity: result.severity,
      }));

      const confidencePercent = Math.round(result.confidence * 100);
      const methodLabel = 
        result.processingMethod === 'detection' ? 'Object Detection' :
        result.processingMethod === 'hybrid' ? 'Hybrid Analysis' :
        'Visual Analysis';
      
      let description = `Classified as ${result.wasteType} (${confidencePercent}% confidence)`;
      if (result.detectedObjects.length > 0) {
        const topObjects = result.detectedObjects.slice(0, 3).map(o => o.class).join(', ');
        description += ` - Detected: ${topObjects}`;
      }
      
      toast.success(`🎯 ${methodLabel} Complete`, {
        description,
        duration: 5000,
      });

      console.log('Classification result:', {
        wasteType: result.wasteType,
        confidence: result.confidence,
        detectedObjects: result.detectedObjects,
        method: result.processingMethod
      });

    } catch (error) {
      console.error("Classification failed:", error);
      
      // Fallback to safe defaults
      setFormData(prev => ({
        ...prev,
        wasteType: 'plastic',
        biodegradable: 'non-biodegradable',
        severity: 'medium',
      }));
      
      toast.warning("Classification Error", {
        description: "Using fallback classification. Please verify waste type manually.",
      });
    } finally {
      setClassifying(false);
    }
  };

  // Calculate estimated CO2 based on weight and waste type
  const calculateEstimatedCO2 = (weightKg: string, wasteType: string) => {
    const emissionFactors: Record<string, number> = {
      plastic: 0.54,
      metal: 6.0,
      glass: 0.09,
      organic: 0.40,
      electronic: 6.5,
      mixed: 0.15,
      hazardous: 0.30,
    };
    
    const weight = parseFloat(weightKg);
    if (!isNaN(weight) && weight > 0 && emissionFactors[wasteType]) {
      const co2 = weight * emissionFactors[wasteType];
      setEstimatedCO2(co2);
    } else {
      setEstimatedCO2(null);
    }
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Use reverse geocoding to get address (simplified)
          const address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          
          setFormData(prev => ({
            ...prev,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            address,
          }));
          
          setGettingLocation(false);
          toast.success("Location captured successfully");
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Could not get location. Please enter manually.");
          setGettingLocation(false);
        }
      );
    } else {
      toast.error("Geolocation is not supported by your browser");
      setGettingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!photoPreview) {
      toast.error("Please upload a photo");
      return;
    }
    
    if (!formData.wasteType || !formData.severity || !formData.biodegradable) {
      toast.error("Please wait for AI classification to complete");
      return;
    }
    
    if (!formData.latitude || !formData.longitude || !formData.address) {
      toast.error("Please provide location information");
      return;
    }

    if (!formData.estimatedWeightKg || parseFloat(formData.estimatedWeightKg) <= 0) {
      toast.error("Please provide estimated waste weight");
      return;
    }

    setLoading(true);

    try {
      const priorityScore = 
        formData.severity === "critical" ? 90 + Math.floor(Math.random() * 10) :
        formData.severity === "high" ? 70 + Math.floor(Math.random() * 20) :
        formData.severity === "medium" ? 50 + Math.floor(Math.random() * 20) :
        30 + Math.floor(Math.random() * 20);

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          photoUrl: photoPreview,
          location: {
            lat: parseFloat(formData.latitude),
            lng: parseFloat(formData.longitude),
            address: formData.address,
          },
          wasteType: formData.wasteType,
          biodegradable: formData.biodegradable,
          severity: formData.severity,
          description: formData.description,
          priorityScore,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit report");
      }

      const newReport = await response.json();

      // Auto-assign to nearest municipality team
      let assignedMunicipalityName = null;
      try {
        const assignRes = await fetch("/api/geospatial/nearest-team", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: newReport.id,
            latitude: parseFloat(formData.latitude),
            longitude: parseFloat(formData.longitude),
          }),
        });

        if (assignRes.ok) {
          const assignData = await assignRes.json();
          assignedMunicipalityName = assignData.teamName;
          toast.success("Report assigned to nearest team!", {
            description: `Assigned to ${assignData.teamName} (${assignData.distance.toFixed(1)}km away)`,
          });
        }
      } catch (assignError) {
        console.error("Auto-assignment failed:", assignError);
        // Continue even if assignment fails
      }

      // Calculate carbon footprint
      const carbonRes = await fetch(`/api/reports/${newReport.id}/carbon?id=${newReport.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estimatedWeightKg: parseFloat(formData.estimatedWeightKg),
        }),
      });

      let carbonData = null;
      if (carbonRes.ok) {
        carbonData = await carbonRes.json();
      }

      // Get user email to send confirmation
      try {
        const userRes = await fetch(`/api/auth/me?id=${userId}`);
        if (userRes.ok) {
          const userData = await userRes.json();
          
          // Send confirmation email
          await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: userData.email,
              subject: "Report Submitted Successfully - CleanUp Connect",
              municipalityName: assignedMunicipalityName,
              reportDetails: {
                id: newReport.id,
                wasteType: formData.wasteType,
                severity: formData.severity,
                address: formData.address,
                carbonFootprint: carbonData?.carbonFootprintKg?.toFixed(2),
              },
            }),
          });
        }
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
        // Don't fail the whole operation if email fails
      }

      // Award points for creating report
      await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          reportId: newReport.id,
          actionType: "report_created",
          pointsEarned: 10,
        }),
      });

      const co2Message = carbonData?.carbonFootprintKg 
        ? ` You'll avoid ${carbonData.carbonFootprintKg.toFixed(2)} kg CO₂e! 🌱`
        : "";

      toast.success("Report submitted successfully!", {
        description: `You earned 10 points for reporting waste.${co2Message}`,
      });

      // Reset form
      setPhotoPreview("");
      setPhotoFile(null);
      setEstimatedCO2(null);
      setFormData({
        wasteType: "",
        biodegradable: "",
        severity: "",
        description: "",
        latitude: "",
        longitude: "",
        address: "",
        estimatedWeightKg: "",
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Failed to submit report", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photo Upload/Camera Section */}
      <div className="space-y-2">
        <Label>Photo of Waste *</Label>
        
        {!photoPreview && (
          <div className="space-y-3">
            {/* Camera and Upload Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-green-600" />
                <span className="text-sm font-medium">Take Photo</span>
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 border-2 border-dashed hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/20 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-green-600" />
                <span className="text-sm font-medium">Upload Photo</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              AI will automatically classify the waste (no API needed)
            </p>
          </div>
        )}

        {/* Photo Preview */}
        {photoPreview && (
          <div className="border-2 border-dashed rounded-lg p-4">
            <div className="relative">
              <img src={photoPreview} alt="Preview" className="max-h-64 mx-auto rounded-lg" />
              <div className="mt-4 flex gap-2 justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => cameraInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take New Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Different Photo
                </Button>
              </div>
              {classifying && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-green-600">
                  <Brain className="h-4 w-4 animate-pulse" />
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Client-side AI analyzing image...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hidden file input for camera (opens native camera app) */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoChange}
          className="hidden"
        />

        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="hidden"
        />
      </div>

      {/* Waste Type (AI Classified) */}
      <div className="space-y-2">
        <Label htmlFor="waste-type">Waste Type *</Label>
        <Select value={formData.wasteType} onValueChange={(value) => {
          const wasteType = wasteTypes.find(w => w.value === value);
          setFormData(prev => ({ 
            ...prev, 
            wasteType: value,
            biodegradable: wasteType?.biodegradable || ""
          }));
          calculateEstimatedCO2(formData.estimatedWeightKg, value);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="AI will classify automatically" />
          </SelectTrigger>
          <SelectContent>
            {wasteTypes.map(type => (
              <SelectItem key={type.value} value={type.value}>
                {type.label} ({type.biodegradable})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Biodegradable Classification */}
      {formData.biodegradable && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm font-medium">
            Classification: <span className={formData.biodegradable === "biodegradable" ? "text-green-600" : "text-orange-600"}>
              {formData.biodegradable === "biodegradable" ? "Biodegradable ♻️" : "Non-Biodegradable ⚠️"}
            </span>
          </p>
        </div>
      )}

      {/* Severity (AI Classified) */}
      <div className="space-y-2">
        <Label htmlFor="severity">Severity Level *</Label>
        <Select value={formData.severity} onValueChange={(value) => setFormData(prev => ({ ...prev, severity: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="AI will determine severity" />
          </SelectTrigger>
          <SelectContent>
            {severityLevels.map(level => (
              <SelectItem key={level.value} value={level.value}>
                {level.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Estimated Weight */}
      <div className="space-y-2">
        <Label htmlFor="weight">Estimated Weight (kg) *</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          min="0.1"
          placeholder="e.g., 2.5"
          value={formData.estimatedWeightKg}
          onChange={(e) => {
            setFormData(prev => ({ ...prev, estimatedWeightKg: e.target.value }));
            calculateEstimatedCO2(e.target.value, formData.wasteType);
          }}
          required
        />
        <p className="text-xs text-muted-foreground">
          Estimate the total weight of waste to calculate carbon impact
        </p>
        {estimatedCO2 !== null && (
          <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600 dark:text-green-400" />
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Estimated Carbon Impact: {estimatedCO2.toFixed(2)} kg CO₂e avoided
              </p>
            </div>
            <p className="text-xs text-green-600 dark:text-green-500 mt-1">
              This is equivalent to {(estimatedCO2 / 21.77).toFixed(2)} tree-years or {(estimatedCO2 * 2.42).toFixed(0)} car miles
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe the waste issue in detail..."
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
          rows={4}
        />
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Location *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={getCurrentLocation}
            disabled={gettingLocation}
          >
            {gettingLocation ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Getting location...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Use Current Location
              </>
            )}
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="40.7128"
              value={formData.latitude}
              onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              placeholder="-74.0060"
              value={formData.longitude}
              onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            type="text"
            placeholder="123 Main St, City, State"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            required
          />
        </div>
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={loading || classifying}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Submitting Report...
          </>
        ) : classifying ? (
          <>
            <Brain className="h-4 w-4 mr-2 animate-pulse" />
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            AI Classifying...
          </>
        ) : (
          "Submit Report"
        )}
      </Button>
    </form>
  );
}