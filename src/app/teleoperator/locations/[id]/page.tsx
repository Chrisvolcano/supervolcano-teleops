"use client";

/**
 * Teleoperator Location Detail Page
 * Shows location info, all tasks, and all instructions (read-only)
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Key,
  Car,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Video,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MediaGallery } from "@/components/teleoperator/MediaGallery";
import toast from "react-hot-toast";

interface Instruction {
  id: string;
  title: string;
  description: string;
  room?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  notes?: string;
  stepNumber?: number;
}

interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: number;
  estimatedDuration: number;
  assignmentType: string;
  assignedTeleoperatorName?: string;
  instructions: Instruction[];
}

interface Location {
  locationId: string;
  name: string;
  address: string;
  primaryContact?: {
    name: string;
    phone?: string;
    email?: string;
  };
  accessInstructions?: string;
  entryCode?: string;
  parkingInfo?: string;
  tasks: Task[];
}

export default function TeleoperatorLocationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const { user, claims } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [mediaGallery, setMediaGallery] = useState<{
    isOpen: boolean;
    media: Array<{ url: string; type: "image" | "video"; title?: string; room?: string }>;
    currentIndex: number;
  }>({
    isOpen: false,
    media: [],
    currentIndex: 0,
  });

  const loadLocation = useCallback(async () => {
    if (!user || !locationId) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/teleoperator/locations/${locationId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          toast.error("You do not have access to this location");
          router.push("/teleoperator/dashboard");
          return;
        }
        throw new Error("Failed to load location");
      }

      const data = await response.json();
      setLocation(data.location);
    } catch (error) {
      console.error("Failed to load location:", error);
      toast.error("Failed to load location");
    } finally {
      setLoading(false);
    }
  }, [user, locationId, router]);

  useEffect(() => {
    if (user && claims) {
      if (claims.role !== "oem_teleoperator") {
        router.push("/no-access");
        return;
      }
      loadLocation();
    }
  }, [user, claims, loadLocation, router]);

  const toggleTaskExpanded = (taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const openMediaGallery = (
    instruction: Instruction,
    startIndex: number = 0,
  ) => {
    const media: Array<{ url: string; type: "image" | "video"; title?: string; room?: string }> =
      [];

    (instruction.imageUrls || []).forEach((url) => {
      media.push({ url, type: "image", title: instruction.title, room: instruction.room });
    });

    (instruction.videoUrls || [] || []).forEach((url) => {
      media.push({ url, type: "video", title: instruction.title, room: instruction.room });
    });

    setMediaGallery({
      isOpen: true,
      media,
      currentIndex: startIndex,
    });
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-gray-500">Loading location...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-gray-500">Location not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/teleoperator/dashboard")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Locations
          </Button>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-bold">{location.name}</h1>
          </div>
          <p className="text-sm text-gray-600 mt-1">{location.address}</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Location Info Card */}
        {(location.primaryContact ||
          location.accessInstructions ||
          location.entryCode ||
          location.parkingInfo) && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-3">
                {location.primaryContact && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {location.primaryContact.name}
                      </p>
                      {location.primaryContact.phone && (
                        <p className="text-sm text-gray-600">
                          {location.primaryContact.phone}
                        </p>
                      )}
                      {location.primaryContact.email && (
                        <p className="text-sm text-gray-600">
                          {location.primaryContact.email}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {location.accessInstructions && (
                  <div className="flex items-start gap-3">
                    <Key className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Access Instructions</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {location.accessInstructions}
                      </p>
                      {location.entryCode && (
                        <p className="text-sm text-gray-600 mt-1">
                          Entry Code: <span className="font-mono">{location.entryCode}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {location.parkingInfo && (
                  <div className="flex items-start gap-3">
                    <Car className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Parking</p>
                      <p className="text-sm text-gray-600 whitespace-pre-line">
                        {location.parkingInfo}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tasks Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📋 Tasks ({location.tasks.length})
          </h2>

          {location.tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No tasks assigned at this location.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {location.tasks.map((task) => {
                const isExpanded = expandedTasks.has(task.id);
                const imageCount =
                  task.instructions.reduce(
                    (sum, inst) => sum + (inst.imageUrls?.length || 0),
                    0,
                  ) || 0;
                const videoCount =
                  task.instructions.reduce(
                    (sum, inst) => sum + (inst.videoUrls?.length || 0),
                    0,
                  ) || 0;

                return (
                  <Card key={task.id} className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Task Header */}
                      <div
                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleTaskExpanded(task.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {task.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                              <span>Priority: {getPriorityLabel(task.priority)}</span>
                              <span>•</span>
                              <span>{task.estimatedDuration} mins</span>
                              <span>•</span>
                              <span>
                                {task.instructions.length} instruction
                                {task.instructions.length !== 1 ? "s" : ""}
                              </span>
                              {(imageCount > 0 || videoCount > 0) && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {imageCount > 0 && `📷 ${imageCount}`}
                                    {imageCount > 0 && videoCount > 0 && " • "}
                                    {videoCount > 0 && `🎥 ${videoCount}`}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTaskExpanded(task.id);
                            }}
                            className="ml-4 flex-shrink-0"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5" />
                            ) : (
                              <ChevronDown className="h-5 w-5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Instructions (shown when expanded) */}
                      {isExpanded && (
                        <div className="border-t bg-gray-50">
                          <div className="p-6 space-y-4">
                            {task.instructions.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-4">
                                No instructions for this task.
                              </p>
                            ) : (
                              task.instructions.map((instruction, instIndex) => {
                                const allMedia = [
                                  ...(instruction.imageUrls || []).map((url) => ({
                                    url,
                                    type: "image" as const,
                                  })),
                                  ...(instruction.videoUrls || [] || []).map((url) => ({
                                    url,
                                    type: "video" as const,
                                  })),
                                ];

                                return (
                                  <Card key={instruction.id} className="bg-white">
                                    <CardContent className="p-4">
                                      <div className="flex items-start gap-3 mb-3">
                                        <span className="text-sm font-medium text-gray-500 min-w-[24px]">
                                          {instruction.stepNumber || instIndex + 1}.
                                        </span>
                                        <div className="flex-1">
                                          <h4 className="font-semibold text-gray-900 mb-2">
                                            {instruction.title}
                                          </h4>
                                          <p className="text-sm text-gray-700 whitespace-pre-line mb-3">
                                            {instruction.description}
                                          </p>
                                          {instruction.room && (
                                            <p className="text-xs text-gray-500 mb-3">
                                              Room: {instruction.room}
                                            </p>
                                          )}

                                          {/* Images */}
                                          {instruction.imageUrls && instruction.imageUrls.length > 0 && (
                                            <div className="mb-4">
                                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                                📷 Images ({instruction.imageUrls.length}):
                                              </p>
                                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                {instruction.imageUrls.map((url, idx) => (
                                                  <button
                                                    key={idx}
                                                    onClick={() =>
                                                      openMediaGallery(instruction, idx)
                                                    }
                                                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-500 transition-colors group"
                                                  >
                                                    <Image
                                                      src={url}
                                                      alt={`${instruction.title} - Image ${idx + 1}`}
                                                      className="w-full h-full object-cover"
                                                      width={200}
                                                      height={200}
                                                      unoptimized
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                      <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                  </button>
                                                ))}
                                              </div>
                                              <p className="text-xs text-gray-500 mt-2">
                                                Click images to view full size
                                              </p>
                                            </div>
                                          )}

                                          {/* Videos */}
                                          {instruction.videoUrls && instruction.videoUrls.length > 0 && (
                                            <div className="mb-4">
                                              <p className="text-sm font-semibold text-gray-700 mb-2">
                                                🎥 Videos ({(instruction.videoUrls || []).length}):
                                              </p>
                                              <div className="space-y-3">
                                                {(instruction.videoUrls || []).map((url, idx) => (
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
                                                      Video {idx + 1} of {(instruction.videoUrls || []).length}
                                                    </p>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Notes */}
                                          {instruction.notes && (
                                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                              <div className="flex items-start gap-2">
                                                <FileText className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                                <div>
                                                  <p className="text-xs font-medium text-blue-900 mb-1">
                                                    Note:
                                                  </p>
                                                  <p className="text-sm text-blue-800 whitespace-pre-line">
                                                    {instruction.notes}
                                                  </p>
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

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

