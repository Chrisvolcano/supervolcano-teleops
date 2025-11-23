"use client";

/**
 * Edit Instruction Page
 * Form for editing an existing location instruction with image management
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { ImageUploader } from "@/components/ImageUploader";

interface Location {
  locationId: string;
  name: string;
}

interface Instruction {
  id: string;
  locationId: string;
  title: string;
  room: string;
  category: "cleaning" | "organization" | "maintenance" | "security";
  description: string;
  imageUrls: string[];
  videoUrls?: string[];
  priority: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

export default function EditInstructionPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const instructionId = params.instructionId as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [instruction, setInstruction] = useState<Instruction | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    room: "",
    category: "organization" as "cleaning" | "organization" | "maintenance" | "security",
    description: "",
    priority: 3,
  });
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadData() {
      if (!user || !locationId || !instructionId) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();

        // Load location
        const locationResponse = await fetch(`/api/v1/locations/${locationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!locationResponse.ok) {
          if (locationResponse.status === 404) {
            router.push("/admin/locations");
            return;
          }
          throw new Error("Failed to load location");
        }

        const locationData: Location = await locationResponse.json();
        setLocation(locationData);

        // Load instruction
        const instructionResponse = await fetch(
          `/api/v1/locations/${locationId}/instructions/${instructionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!instructionResponse.ok) {
          if (instructionResponse.status === 404) {
            router.push(`/admin/locations/${locationId}/instructions`);
            return;
          }
          throw new Error("Failed to load instruction");
        }

        const instructionData: Instruction = await instructionResponse.json();
        setInstruction(instructionData);
        setFormData({
          title: instructionData.title,
          room: instructionData.room,
          category: instructionData.category,
          description: instructionData.description,
          priority: instructionData.priority,
        });
        setImageUrls(instructionData.imageUrls || []);
        setVideoUrls(instructionData.videoUrls || []);
      } catch (error) {
        console.error("Failed to load data:", error);
        router.push("/admin/locations");
      } finally {
        setLoading(false);
      }
    }

    if (user && locationId && instructionId) {
      loadData();
    }
  }, [user, locationId, instructionId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!formData.room.trim()) {
      newErrors.room = "Room is required";
    }
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const token = await user.getIdToken();
      const response = await fetch(
        `/api/v1/locations/${locationId}/instructions/${instructionId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: formData.title,
            room: formData.room,
            category: formData.category,
            description: formData.description,
            imageUrls,
            videoUrls,
            priority: formData.priority,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update instruction");
      }

      // Redirect to instructions list
      router.push(`/admin/locations/${locationId}/instructions`);
    } catch (error: any) {
      console.error("Failed to update instruction:", error);
      setErrors({ submit: error.message || "Failed to update instruction" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUploadComplete = useCallback((imageUrls: string[], videoUrls: string[]) => {
    setImageUrls(imageUrls);
    setVideoUrls(videoUrls);
  }, []);

  const handleImageUploadError = useCallback((error: Error) => {
    console.error("Image upload error:", error);
    setErrors({ images: error.message });
  }, []);

  const handleRemoveExisting = useCallback((url: string, type: "image" | "video") => {
    if (type === "video") {
      setVideoUrls((prev) => prev.filter((u) => u !== url));
    } else {
      setImageUrls((prev) => prev.filter((u) => u !== url));
    }
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  if (!location || !instruction) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href={`/admin/locations/${locationId}/instructions`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Instructions
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Instruction: {location.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  setErrors({ ...errors, title: "" });
                }}
                placeholder="Where to store TV remote"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Room */}
            <div>
              <Label htmlFor="room">
                Room <span className="text-red-500">*</span>
              </Label>
              <Input
                id="room"
                value={formData.room}
                onChange={(e) => {
                  setFormData({ ...formData, room: e.target.value });
                  setErrors({ ...errors, room: "" });
                }}
                placeholder="Living Room"
                className={errors.room ? "border-red-500" : ""}
              />
              {errors.room && <p className="text-sm text-red-500 mt-1">{errors.room}</p>}
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as typeof formData.category,
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="cleaning">Cleaning</option>
                <option value="organization">Organization</option>
                <option value="maintenance">Maintenance</option>
                <option value="security">Security</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">
                Description (Step-by-step instructions) <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  setErrors({ ...errors, description: "" });
                }}
                placeholder="1. Locate the TV remote...&#10;2. Place it in the designated drawer..."
                rows={6}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Priority */}
            <div>
              <Label htmlFor="priority">Priority (1-5)</Label>
              <Input
                id="priority"
                type="number"
                min="1"
                max="5"
                value={formData.priority}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    priority: parseInt(e.target.value) || 3,
                  })
                }
              />
            </div>

            {/* Media Upload */}
            <div>
              <Label>Media (Images & Videos)</Label>
              <ImageUploader
                locationId={locationId}
                instructionId={instructionId}
                onUploadComplete={handleImageUploadComplete}
                onUploadError={handleImageUploadError}
                existingImageUrls={imageUrls}
                existingVideoUrls={videoUrls}
                onRemoveExisting={handleRemoveExisting}
                allowVideos={true}
              />
              {errors.images && (
                <p className="text-sm text-red-500 mt-1">{errors.images}</p>
              )}
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Link href={`/admin/locations/${locationId}/instructions`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

