"use client";

/**
 * Create New Instruction Page
 * Form for creating a new location instruction with image upload
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

// Generate UUID for client-side
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function NewInstructionPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<Location | null>(null);
  const [instructionId] = useState(() => generateUUID()); // Generate ID for image upload path
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
    async function loadLocation() {
      if (!user || !locationId) return;

      try {
        setLoading(true);
        const token = await user.getIdToken();
        const response = await fetch(`/api/v1/locations/${locationId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 404) {
            router.push("/admin/locations");
            return;
          }
          throw new Error("Failed to load location");
        }

        const locationData: Location = await response.json();
        setLocation(locationData);
      } catch (error) {
        console.error("Failed to load location:", error);
        router.push("/admin/locations");
      } finally {
        setLoading(false);
      }
    }

    if (user && locationId) {
      loadLocation();
    }
  }, [user, locationId, router]);

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
      const response = await fetch(`/api/v1/locations/${locationId}/instructions`, {
        method: "POST",
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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create instruction");
      }

      // Redirect to instructions list
      router.push(`/admin/locations/${locationId}/instructions`);
    } catch (error: any) {
      console.error("Failed to create instruction:", error);
      setErrors({ submit: error.message || "Failed to create instruction" });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUploadComplete = useCallback((urls: string[]) => {
    // Separate images and videos
    const images: string[] = [];
    const videos: string[] = [];
    urls.forEach((url) => {
      if (/\.(mp4|mov|webm|avi)$/i.test(url) || url.includes("video")) {
        videos.push(url);
      } else {
        images.push(url);
      }
    });
    setImageUrls(images);
    setVideoUrls(videos);
  }, []);

  const handleImageUploadError = useCallback((error: Error) => {
    console.error("Image upload error:", error);
    setErrors({ images: error.message });
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-4xl">
        <p>Loading...</p>
      </div>
    );
  }

  if (!location) {
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
          <CardTitle>Create New Instruction: {location.name}</CardTitle>
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
                {saving ? "Saving..." : "Save Instruction"}
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

