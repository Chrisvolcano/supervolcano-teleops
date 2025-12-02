"use client";

/**
 * Task Form Component
 * Form for creating or editing a task with instructions inline
 */

import { useState, useEffect, useCallback } from "react";
import { X, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/ImageUploader";
import type { Task, TaskInput } from "@/lib/types/tasks";
import type { Instruction, InstructionInput } from "@/lib/types/instructions";

interface InstructionFormData {
  id?: string; // For existing instructions
  title: string;
  description: string;
  room?: string;
  notes?: string;
  imageUrls: string[];
  videoUrls: string[];
  stepNumber?: number;
}

interface TaskFormProps {
  locationId: string;
  task?: Task | null;
  existingInstructions?: Instruction[];
  teleoperators: Array<{ teleoperatorId: string; displayName: string }>;
  onSave: (
    taskData: TaskInput,
    instructions: Array<{
      data: InstructionInput;
      imageUrls: string[];
      videoUrls: string[];
    }>,
  ) => Promise<void>;
  onCancel: () => void;
}

export function TaskForm({
  locationId,
  task,
  existingInstructions = [],
  teleoperators,
  onSave,
  onCancel,
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskInput>({
    title: task?.title || "",
    description: task?.description || "",
    category: task?.category || "cleaning",
    priority: (task?.priority || 3) as 1 | 2 | 3 | 4 | 5,
    estimatedDuration: task?.estimatedDuration || 30,
    assignmentType: task?.assignmentType || "unassigned",
    assignedTeleoperatorId: task?.assignedTeleoperatorId,
    assignedTeleoperatorName: task?.assignedTeleoperatorName,
    assignedHumanName: task?.assignedHumanName || "",
    status: task?.status || "active",
  });

  const [instructions, setInstructions] = useState<InstructionFormData[]>(() => {
    // Initialize with existing instructions if editing
    if (existingInstructions.length > 0) {
      return existingInstructions.map((inst) => ({
        id: inst.id,
        title: inst.title,
        description: inst.description,
        room: inst.room,
        notes: inst.notes,
        imageUrls: inst.imageUrls || [],
        videoUrls: inst.videoUrls || [],
        stepNumber: inst.stepNumber,
      }));
    }
    return [];
  });

  const [expandedInstructions, setExpandedInstructions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Generate temp IDs for new instructions
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addInstruction = () => {
    const newId = generateTempId();
    setInstructions([
      ...instructions,
      {
        title: "",
        description: "",
        room: "",
        notes: "",
        imageUrls: [],
        videoUrls: [],
      },
    ]);
    setExpandedInstructions((prev) => new Set([...prev, newId]));
  };

  const removeInstruction = (index: number) => {
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const updateInstruction = useCallback((index: number, updates: Partial<InstructionFormData>) => {
    setInstructions((prev) =>
      prev.map((inst, i) => (i === index ? { ...inst, ...updates } : inst)),
    );
  }, []);

  const toggleInstructionExpanded = (index: number) => {
    const inst = instructions[index];
    const key = inst.id || `temp-${index}`;
    setExpandedInstructions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleImageUploadComplete = useCallback(
    (index: number, imageUrls: string[], videoUrls: string[]) => {
      console.log("[TaskForm] handleImageUploadComplete", { index, imageUrls, videoUrls });
      setInstructions((prev) =>
        prev.map((inst, i) =>
          i === index ? { ...inst, imageUrls, videoUrls } : inst,
        ),
      );
    },
    [],
  );

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
    if (formData.estimatedDuration <= 0) {
      newErrors.estimatedDuration = "Duration must be greater than 0";
    }
    if (formData.assignmentType === "oem_teleoperator" && !formData.assignedTeleoperatorId) {
      newErrors.assignedTeleoperatorId = "Please select a teleoperator";
    }
    if (formData.assignmentType === "human" && !formData.assignedHumanName?.trim()) {
      newErrors.assignedHumanName = "Human worker name is required";
    }

    // Validate instructions
    instructions.forEach((inst, index) => {
      if (!inst.title.trim()) {
        newErrors[`instruction_${index}_title`] = "Instruction title is required";
      }
      if (!inst.description.trim()) {
        newErrors[`instruction_${index}_description`] = "Instruction description is required";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      // Set teleoperator name if teleoperator is selected
      if (formData.assignmentType === "oem_teleoperator" && formData.assignedTeleoperatorId) {
        const teleoperator = teleoperators.find(
          (t) => t.teleoperatorId === formData.assignedTeleoperatorId,
        );
        formData.assignedTeleoperatorName = teleoperator?.displayName;
      }

      // Prepare instructions data
      const instructionsData = instructions.map((inst, index) => ({
        data: {
          title: inst.title,
          description: inst.description,
          room: inst.room,
          notes: inst.notes,
          stepNumber: index + 1,
        },
        imageUrls: inst.imageUrls || [],
        videoUrls: inst.videoUrls || [],
        existingId: inst.id, // For updates (undefined for new instructions)
      }));

      await onSave(formData, instructionsData);
    } catch (error: any) {
      setErrors({ submit: error.message || "Failed to save task" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold">{task ? "Edit Task" : "Create Task"}</h2>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Details Section */}
          <div className="space-y-4 border-b pb-6">
            <h3 className="text-lg font-semibold">Task Details</h3>

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
                placeholder="Clean Kitchen"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => {
                  setFormData({ ...formData, description: e.target.value });
                  setErrors({ ...errors, description: "" });
                }}
                placeholder="Complete cleaning of kitchen area..."
                rows={3}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-sm text-red-500 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Category, Priority, Duration */}
            <div className="grid grid-cols-3 gap-4">
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
                      category: e.target.value as TaskInput["category"],
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="cleaning">Cleaning</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="inspection">Inspection</option>
                  <option value="delivery">Delivery</option>
                  <option value="security">Security</option>
                </select>
              </div>
              <div>
                <Label htmlFor="priority">
                  Priority <span className="text-red-500">*</span>
                </Label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5,
                    })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value={1}>1 - Highest</option>
                  <option value={2}>2 - High</option>
                  <option value={3}>3 - Medium</option>
                  <option value={4}>4 - Low</option>
                  <option value={5}>5 - Lowest</option>
                </select>
              </div>
              <div>
                <Label htmlFor="estimatedDuration">
                  Duration (mins) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="estimatedDuration"
                  type="number"
                  min="1"
                  value={formData.estimatedDuration}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      estimatedDuration: parseInt(e.target.value) || 0,
                    });
                    setErrors({ ...errors, estimatedDuration: "" });
                  }}
                  className={errors.estimatedDuration ? "border-red-500" : ""}
                />
                {errors.estimatedDuration && (
                  <p className="text-sm text-red-500 mt-1">{errors.estimatedDuration}</p>
                )}
              </div>
            </div>

            {/* Assignment */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Assignment</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignmentType"
                    value="unassigned"
                    checked={formData.assignmentType === "unassigned"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignmentType: e.target.value as TaskInput["assignmentType"],
                        assignedTeleoperatorId: undefined,
                        assignedHumanName: "",
                      })
                    }
                  />
                  <span>Unassigned</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignmentType"
                    value="oem_teleoperator"
                    checked={formData.assignmentType === "oem_teleoperator"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignmentType: e.target.value as TaskInput["assignmentType"],
                        assignedHumanName: "",
                      })
                    }
                  />
                  <span>Teleoperator</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="assignmentType"
                    value="human"
                    checked={formData.assignmentType === "human"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignmentType: e.target.value as TaskInput["assignmentType"],
                        assignedTeleoperatorId: undefined,
                      })
                    }
                  />
                  <span>Human Worker</span>
                </label>
              </div>

              {formData.assignmentType === "oem_teleoperator" && (
                <div>
                  <Label htmlFor="assignedTeleoperatorId">
                    Select Teleoperator <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="assignedTeleoperatorId"
                    value={formData.assignedTeleoperatorId || ""}
                    onChange={(e) => {
                      const teleoperator = teleoperators.find(
                        (t) => t.teleoperatorId === e.target.value,
                      );
                      setFormData({
                        ...formData,
                        assignedTeleoperatorId: e.target.value,
                        assignedTeleoperatorName: teleoperator?.displayName,
                      });
                      setErrors({ ...errors, assignedTeleoperatorId: "" });
                    }}
                    className={`flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      errors.assignedTeleoperatorId ? "border-red-500" : ""
                    }`}
                  >
                    <option value="">Select teleoperator...</option>
                    {teleoperators.map((t) => (
                      <option key={t.teleoperatorId} value={t.teleoperatorId}>
                        {t.displayName}
                      </option>
                    ))}
                  </select>
                  {errors.assignedTeleoperatorId && (
                    <p className="text-sm text-red-500 mt-1">{errors.assignedTeleoperatorId}</p>
                  )}
                </div>
              )}

              {formData.assignmentType === "human" && (
                <div>
                  <Label htmlFor="assignedHumanName">
                    Human Worker Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="assignedHumanName"
                    value={formData.assignedHumanName || ""}
                    onChange={(e) => {
                      setFormData({ ...formData, assignedHumanName: e.target.value });
                      setErrors({ ...errors, assignedHumanName: "" });
                    }}
                    placeholder="Sarah Johnson"
                    className={errors.assignedHumanName ? "border-red-500" : ""}
                  />
                  {errors.assignedHumanName && (
                    <p className="text-sm text-red-500 mt-1">{errors.assignedHumanName}</p>
                  )}
                </div>
              )}
            </div>

            {/* Status */}
            <div className="border-t pt-4">
              <Label>Status</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === "active"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TaskInput["status"],
                      })
                    }
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="draft"
                    checked={formData.status === "draft"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TaskInput["status"],
                      })
                    }
                  />
                  <span>Draft</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="status"
                    value="archived"
                    checked={formData.status === "archived"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as TaskInput["status"],
                      })
                    }
                  />
                  <span>Archived</span>
                </label>
              </div>
            </div>
          </div>

          {/* Instructions Section */}
          <div className="space-y-4 border-b pb-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Instructions ({instructions.length})
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={addInstruction}>
                <Plus className="h-4 w-4 mr-2" />
                Add Instruction
              </Button>
            </div>

            {instructions.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">
                No instructions yet. Add step-by-step instructions below.
              </p>
            ) : (
              <div className="space-y-4">
                {instructions.map((instruction, index) => {
                  const instKey = instruction.id || `temp-${index}`;
                  const isExpanded = expandedInstructions.has(instKey);

                  return (
                    <div key={instKey} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleInstructionExpanded(index)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <span className="font-medium">
                            Instruction {index + 1}
                            {instruction.title && `: ${instruction.title}`}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeInstruction(index)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="space-y-4 mt-4 pt-4 border-t">
                          {/* Title */}
                          <div>
                            <Label>
                              Title <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              value={instruction.title}
                              onChange={(e) =>
                                updateInstruction(index, { title: e.target.value })
                              }
                              placeholder="Where cleaning supplies are stored"
                              className={
                                errors[`instruction_${index}_title`] ? "border-red-500" : ""
                              }
                            />
                            {errors[`instruction_${index}_title`] && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors[`instruction_${index}_title`]}
                              </p>
                            )}
                          </div>

                          {/* Description */}
                          <div>
                            <Label>
                              Description <span className="text-red-500">*</span>
                            </Label>
                            <Textarea
                              value={instruction.description}
                              onChange={(e) =>
                                updateInstruction(index, { description: e.target.value })
                              }
                              placeholder="1. Locate the cleaning supplies...&#10;2. Place them in the designated area..."
                              rows={4}
                              className={
                                errors[`instruction_${index}_description`] ? "border-red-500" : ""
                              }
                            />
                            {errors[`instruction_${index}_description`] && (
                              <p className="text-sm text-red-500 mt-1">
                                {errors[`instruction_${index}_description`]}
                              </p>
                            )}
                          </div>

                          {/* Room */}
                          <div>
                            <Label>Room (optional)</Label>
                            <Input
                              value={instruction.room || ""}
                              onChange={(e) => updateInstruction(index, { room: e.target.value })}
                              placeholder="Kitchen"
                            />
                          </div>

                          {/* Media Upload */}
                          <div>
                            <Label>Upload Media</Label>
                            <ImageUploader
                              locationId={locationId}
                              instructionId={instKey}
                              onUploadComplete={(imageUrls, videoUrls) =>
                                handleImageUploadComplete(index, imageUrls, videoUrls)
                              }
                              existingImageUrls={instruction.imageUrls || []}
                              existingVideoUrls={instruction.videoUrls || []}
                              onRemoveExisting={(url, type) => {
                                if (type === "video") {
                                  updateInstruction(index, {
                                    videoUrls: (instruction.videoUrls || []).filter((u) => u !== url),
                                  });
                                } else {
                                  updateInstruction(index, {
                                    imageUrls: (instruction.imageUrls || []).filter((u) => u !== url),
                                  });
                                }
                              }}
                              allowVideos={true}
                            />
                          </div>

                          {/* Notes */}
                          <div>
                            <Label>Notes (optional)</Label>
                            <Textarea
                              value={instruction.notes || ""}
                              onChange={(e) => updateInstruction(index, { notes: e.target.value })}
                              placeholder="Additional context or special considerations..."
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
              {saving ? "Saving..." : task ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
