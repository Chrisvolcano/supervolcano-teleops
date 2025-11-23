"use client";

/**
 * Location Instructions List Page
 * Shows all instructions for a location with thumbnails
 */

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Edit, Trash2, Image as ImageIcon, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { format } from "date-fns";

interface Instruction {
  id: string;
  locationId: string;
  title: string;
  room: string;
  category: "cleaning" | "organization" | "maintenance" | "security";
  description: string;
  imageUrls: string[];
  videoUrls: string[];
  priority: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: string;
}

interface Location {
  locationId: string;
  name: string;
}

export default function LocationInstructionsPage() {
  const router = useRouter();
  const params = useParams();
  const locationId = params.id as string;
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<Location | null>(null);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadLocation = useCallback(async () => {
    if (!user || !locationId) return;

    try {
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
    }
  }, [user, locationId, router]);

  const loadInstructions = useCallback(async () => {
    if (!user || !locationId) return;

    try {
      setLoading(true);
      const token = await user.getIdToken();
      const response = await fetch(`/api/v1/locations/${locationId}/instructions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load instructions");
      }

      const data: Instruction[] = await response.json();
      setInstructions(data);
    } catch (error) {
      console.error("Failed to load instructions:", error);
    } finally {
      setLoading(false);
    }
  }, [user, locationId]);

  useEffect(() => {
    if (user && locationId) {
      loadLocation();
      loadInstructions();
    }
  }, [user, locationId, loadLocation, loadInstructions]);

  const handleDelete = async (instructionId: string) => {
    if (!user || !confirm("Are you sure you want to delete this instruction?")) {
      return;
    }

    try {
      setDeletingId(instructionId);
      const token = await user.getIdToken();
      const response = await fetch(
        `/api/v1/locations/${locationId}/instructions/${instructionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete instruction");
      }

      // Reload instructions
      await loadInstructions();
    } catch (error) {
      console.error("Failed to delete instruction:", error);
      alert("Failed to delete instruction. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !location) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <p>Loading location instructions...</p>
      </div>
    );
  }

  if (!location) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin/locations">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Locations
          </Button>
        </Link>
        <Link href={`/admin/locations/${locationId}/instructions/new`}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Instruction
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Location Instructions: {location.name}</CardTitle>
        </CardHeader>
      </Card>

      {loading ? (
        <p>Loading instructions...</p>
      ) : instructions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ImageIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">No instructions yet.</p>
            <Link href={`/admin/locations/${locationId}/instructions/new`}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Instruction
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {instructions.map((instruction) => (
            <Card key={instruction.id} className="overflow-hidden">
              <div className="relative">
                {(() => {
                  const firstImage = instruction.imageUrls?.[0];
                  const firstVideo = instruction.videoUrls?.[0];
                  const totalMedia = (instruction.imageUrls?.length || 0) + (instruction.videoUrls?.length || 0);
                  
                  if (firstVideo) {
                    return (
                      <video
                        src={firstVideo}
                        className="w-full h-48 object-cover"
                        controls={false}
                        muted
                      >
                        Your browser does not support video.
                      </video>
                    );
                  } else if (firstImage) {
                    return (
                      <Image
                        src={firstImage}
                        alt={instruction.title}
                        className="w-full h-48 object-cover"
                        width={400}
                        height={192}
                        unoptimized
                      />
                    );
                  } else {
                    return (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-gray-400" />
                      </div>
                    );
                  }
                })()}
                <div className="absolute top-2 right-2">
                  <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
                    {instruction.category}
                  </span>
                </div>
                {(instruction.videoUrls?.length || 0) > 0 && (
                  <div className="absolute top-2 left-2">
                    <span className="bg-black/50 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Video className="h-3 w-3" />
                      Video
                    </span>
                  </div>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-lg mb-1">{instruction.title}</h3>
                <p className="text-sm text-gray-600 mb-2">Room: {instruction.room}</p>
                <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                  {instruction.description}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>
                    {format(
                      new Date(instruction.createdAt),
                      "MMM d, yyyy",
                    )}
                  </span>
                  {((instruction.imageUrls?.length || 0) + (instruction.videoUrls?.length || 0)) > 0 && (
                    <span className="flex items-center gap-1">
                      {(instruction.imageUrls?.length || 0) > 0 && <ImageIcon className="h-3 w-3" />}
                      {(instruction.videoUrls?.length || 0) > 0 && <Video className="h-3 w-3" />}
                      {(instruction.imageUrls?.length || 0) + (instruction.videoUrls?.length || 0)}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/locations/${locationId}/instructions/${instruction.id}/edit`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700"
                    onClick={() => handleDelete(instruction.id)}
                    disabled={deletingId === instruction.id}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {deletingId === instruction.id ? "Deleting..." : "Delete"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
