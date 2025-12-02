"use client";

/**
 * Task Section Component
 * Expandable task card showing task details and instructions
 */

import { useState } from "react";
import Image from "next/image";
import { Edit, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Video, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaGallery } from "@/components/teleoperator/MediaGallery";
import type { Task } from "@/lib/types/tasks";
import type { Instruction } from "@/lib/types/instructions";

interface TaskSectionProps {
  task: Task;
  instructions: Instruction[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function TaskSection({
  task,
  instructions,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: TaskSectionProps) {
  const [expandedInstructionId, setExpandedInstructionId] = useState<string | null>(null);
  const [mediaGallery, setMediaGallery] = useState<{
    isOpen: boolean;
    media: Array<{ url: string; type: "image" | "video"; title?: string; room?: string }>;
    currentIndex: number;
  }>({
    isOpen: false,
    media: [],
    currentIndex: 0,
  });
  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1:
        return "Highest";
      case 2:
        return "High";
      case 3:
        return "Medium";
      case 4:
        return "Low";
      case 5:
        return "Lowest";
      default:
        return "Medium";
    }
  };

  const getAssignmentDisplay = () => {
    if (task.assignmentType === "oem_teleoperator" && task.assignedTeleoperatorName) {
      return (
        <span className="font-medium">
          🤖 {task.assignedTeleoperatorName} <span className="text-gray-500">(Teleoperator)</span>
        </span>
      );
    }
    if (task.assignmentType === "human" && task.assignedHumanName) {
      return (
        <span className="font-medium">
          👤 {task.assignedHumanName} <span className="text-gray-500">(Human)</span>
        </span>
      );
    }
    return (
      <span className="font-medium text-orange-600">⚠️ Not Assigned</span>
    );
  };

  return (
    <div className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
      {/* Task Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{task.title}</h3>
          <p className="text-sm text-gray-600 mb-3">{task.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
            <span>Assigned to: {getAssignmentDisplay()}</span>
            <span>•</span>
            <span>Priority: {getPriorityLabel(task.priority)}</span>
            <span>•</span>
            <span>{task.estimatedDuration} mins</span>
            <span>•</span>
            <span>{instructions.length} instruction{instructions.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-3 w-3 mr-1" />
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="h-3 w-3 mr-1" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onToggleExpand}>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Instructions (shown when expanded) */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-medium mb-3">Instructions:</h4>
          {instructions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              No instructions yet. Click &quot;Edit&quot; to add instructions.
            </p>
          ) : (
            <div className="space-y-3">
              {instructions.map((instruction, index) => {
                const imageCount = instruction.imageUrls?.length || 0;
                const videoCount = instruction.videoUrls?.length || 0;
                const isInstructionExpanded = expandedInstructionId === instruction.id;

                const openMediaGallery = (startIndex: number = 0) => {
                  const media: Array<{ url: string; type: "image" | "video"; title?: string; room?: string }> = [];
                  (instruction.imageUrls || []).forEach((url) => {
                    media.push({ url, type: "image", title: instruction.title, room: instruction.room });
                  });
                  (instruction.videoUrls || []).forEach((url) => {
                    media.push({ url, type: "video", title: instruction.title, room: instruction.room });
                  });
                  setMediaGallery({
                    isOpen: true,
                    media,
                    currentIndex: startIndex,
                  });
                };

                return (
                  <div key={instruction.id} className="border rounded-lg bg-white">
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() =>
                        setExpandedInstructionId(
                          isInstructionExpanded ? null : instruction.id,
                        )
                      }
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-500">
                              {instruction.stepNumber || index + 1}.
                            </span>
                            <span className="font-semibold">{instruction.title}</span>
                          </div>
                          {instruction.room && (
                            <p className="text-xs text-gray-500 mb-2">Room: {instruction.room}</p>
                          )}
                          {(imageCount > 0 || videoCount > 0) && (
                            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                              {imageCount > 0 && (
                                <span>📷 {imageCount} image{imageCount !== 1 ? "s" : ""}</span>
                              )}
                              {videoCount > 0 && (
                                <span>🎥 {videoCount} video{videoCount !== 1 ? "s" : ""}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedInstructionId(
                              isInstructionExpanded ? null : instruction.id,
                            );
                          }}
                        >
                          {isInstructionExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Instruction View */}
                    {isInstructionExpanded && (
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <div className="pt-4 space-y-4">
                          {/* Full Description */}
                          <div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Description:</p>
                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                              {instruction.description}
                            </p>
                          </div>

                          {/* Images */}
                          {instruction.imageUrls && instruction.imageUrls.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                Images ({instruction.imageUrls.length}):
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {instruction.imageUrls.map((url, idx) => (
                                  <div
                                    key={idx}
                                    className="relative aspect-square cursor-pointer group"
                                    onClick={() => openMediaGallery(idx)}
                                  >
                                    <Image
                                      src={url}
                                      alt={`${instruction.title} - image ${idx + 1}`}
                                      className="w-full h-full object-cover rounded border-2 border-gray-200 group-hover:border-blue-500 transition-colors"
                                      width={200}
                                      height={200}
                                      unoptimized
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Videos */}
                          {instruction.videoUrls && instruction.videoUrls.length > 0 && (
                            <div>
                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                Videos ({instruction.videoUrls.length}):
                              </p>
                              <div className="space-y-3">
                                {instruction.videoUrls.map((url, idx) => (
                                  <div key={idx} className="relative">
                                    <video
                                      src={url}
                                      controls
                                      className="w-full max-h-96 rounded shadow-sm"
                                      preload="metadata"
                                      playsInline
                                    >
                                      Your browser does not support video playback.
                                    </video>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Video {idx + 1} of {instruction.videoUrls.length}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Notes */}
                          {instruction.notes && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-start gap-2">
                                <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-blue-900 mb-1">Note:</p>
                                  <p className="text-sm text-blue-800 whitespace-pre-wrap">
                                    {instruction.notes}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Media Gallery Modal */}
      {mediaGallery.isOpen && (
        <MediaGallery
          media={mediaGallery.media}
          currentIndex={mediaGallery.currentIndex}
          onClose={() =>
            setMediaGallery({
              isOpen: false,
              media: [],
              currentIndex: 0,
            })
          }
          onNavigate={(index) =>
            setMediaGallery((prev) => ({ ...prev, currentIndex: index }))
          }
        />
      )}
    </div>
  );
}

