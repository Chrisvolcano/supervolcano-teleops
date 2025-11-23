"use client";

/**
 * Instruction Form Modal Component
 * Modal for creating or editing an instruction with image/video upload
 */

import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/ImageUploader";
import type { Instruction, InstructionInput } from "@/lib/types/instructions";

interface InstructionFormModalProps {
  locationId: string;
  taskId: string;
  instruction?: Instruction | null;
  onSave: (
    data: InstructionInput,
    imageUrls: string[],
    videoUrls: string[],
  ) => Promise<void>;
  onCancel: () => void;
}

export function InstructionFormModal({
  locationId,
  taskId,
  instruction,
  onSave,
  onCancel,
}: InstructionFormModalProps) {
  const [formData, setFormData] = useState<InstructionInput>({
    title: instruction?.title || "",
    description: instruction?.description || "",
    room: instruction?.room || "",
    stepNumber: instruction?.stepNumber,
    notes: instruction?.notes || "",
  });

  const [imageUrls, setImageUrls] = useState<string[]>(instruction?.imageUrls || []);
  const [videoUrls, setVideoUrls] = useState<string[]>(instruction?.videoUrls || []);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [instructionId] = useState(() => {
    // Generate UUID for new instructions, use existing ID for edits
    if (instruction?.id) return instruction.id;
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return `temp-${Date.now()}`;
  });

  const handleImageUploadComplete = useCallback((imageUrls: string[], videoUrls: string[]) => {
    setImageUrls(imageUrls);
    setVideoUrls(videoUrls);
  }, []);

  const handleImageUploadError = useCallback((error: Error) => {
    console.error("Image upload error:", error);
    setErrors({ media: error.message });
  }, []);

  const handleRemoveExisting = useCallback((url: string, type: "image" | "video") => {
    if (type === "video") {
      setVideoUrls((prev) => prev.filter((u) => u !== url));
    } else {
      setImageUrls((prev) => prev.filter((u) => u !== url));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
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
      await onSave(formData, imageUrls, videoUrls);
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to save instruction" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {instruction ? "Edit Instruction" : "Add Instruction"}
          </h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              placeholder="Where cleaning supplies are stored"
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
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
              placeholder="1. Locate the cleaning supplies...&#10;2. Place them in the designated area..."
              rows={6}
              className={errors.description ? "border-red-500" : ""}
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Room (optional) */}
          <div>
            <Label htmlFor="room">Room (optional)</Label>
            <Input
              id="room"
              value={formData.room || ""}
              onChange={(e) => setFormData({ ...formData, room: e.target.value })}
              placeholder="Kitchen"
            />
          </div>

          {/* Step Number (optional, auto-calculated if not provided) */}
          {instruction && (
            <div>
              <Label htmlFor="stepNumber">Step Number</Label>
              <Input
                id="stepNumber"
                type="number"
                min="1"
                value={formData.stepNumber || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stepNumber: parseInt(e.target.value) || undefined,
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to auto-calculate based on existing instructions
              </p>
            </div>
          )}

          {/* Media Upload */}
          <div>
            <Label>Images & Videos</Label>
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
            {errors.media && (
              <p className="text-sm text-red-500 mt-1">{errors.media}</p>
            )}
          </div>

          {/* Notes (optional) */}
          <div>
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional context or special considerations..."
              rows={3}
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : instruction ? "Save Changes" : "Add Instruction"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

