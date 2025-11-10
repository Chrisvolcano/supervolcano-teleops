"use client";

import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PropertyMediaItem, PropertyStatus as PropertyStatusType, SVProperty } from "@/lib/types";

export type Property = Pick<
  SVProperty,
  "id" | "name" | "partnerOrgId" | "address" | "status" | "media" | "images" | "taskCount" | "imageCount" | "videoCount"
>;

type PropertyStatus = PropertyStatusType;

type PropertyCardProps = {
  property: Property;
  className?: string;
};

const statusCopy: Record<PropertyStatus, string> = {
  scheduled: "Scheduled",
  unassigned: "Unassigned",
};

const statusVariant: Record<PropertyStatus, "default" | "secondary" | "destructive"> = {
  scheduled: "default",
  unassigned: "secondary",
};

export function PropertyCard({ property, className }: PropertyCardProps) {
  const primaryMedia = property.media?.[0] as PropertyMediaItem | undefined;
  const thumbnail = primaryMedia?.type === "image" ? primaryMedia.url : property.images?.[0];
  const hasVideo = Boolean(primaryMedia && primaryMedia.type === "video");
  const imageCount = property.imageCount ?? property.images?.length ?? 0;
  const videoCount = property.videoCount ?? property.media?.filter((item) => item.type === "video").length ?? 0;

  function renderMedia() {
    if (primaryMedia?.type === "image") {
      return (
        <Image
          src={primaryMedia.url}
          alt={`${property.name} media`}
          fill
          className="object-cover"
          sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 400px"
        />
      );
    }

    if (primaryMedia?.type === "video") {
      return (
        <video
          src={primaryMedia.url}
          className="h-full w-full object-cover"
          muted
          loop
          playsInline
          autoPlay
          controls={false}
        />
      );
    }

    if (thumbnail) {
      return (
        <Image
          src={thumbnail}
          alt={`${property.name} thumbnail`}
          fill
          className="object-cover"
          sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 400px"
        />
      );
    }

    return null;
  }

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{property.name}</CardTitle>
          {property.status && (
            <Badge variant={statusVariant[property.status]}>
              {statusCopy[property.status]}
            </Badge>
          )}
        </div>
        <CardDescription>
          Partner org: <span className="font-medium">{property.partnerOrgId}</span>
        </CardDescription>
      </CardHeader>
      {primaryMedia || thumbnail ? (
        <div className="relative h-40 w-full overflow-hidden">
          {renderMedia()}
          {hasVideo ? (
            <span className="absolute right-3 top-3 rounded-full bg-neutral-900/70 px-2 py-1 text-xs font-medium uppercase tracking-wide text-white">
              Video
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mx-4 mb-4 h-40 rounded-lg bg-neutral-100" />
      )}
      <CardContent className="space-y-3 text-sm text-neutral-600">
        {property.address && <p className="font-medium">{property.address}</p>}
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Tasks assigned: {property.taskCount ?? 0}
        </p>
        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-neutral-500">
          <span>{imageCount} images</span>
          <span>•</span>
          <span>{videoCount} videos</span>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={`/property/${property.id}`}>View Property</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

