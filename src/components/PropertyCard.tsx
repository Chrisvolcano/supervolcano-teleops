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

export type Property = {
  id: string;
  name: string;
  partnerOrgId: string;
  address?: string;
  status?: PropertyStatus;
  images?: string[];
  taskCount?: number;
};

export type PropertyStatus = "online" | "offline" | "maintenance";

type PropertyCardProps = {
  property: Property;
  className?: string;
};

const statusCopy: Record<PropertyStatus, string> = {
  online: "Online",
  offline: "Offline",
  maintenance: "Maintenance",
};

const statusVariant: Record<PropertyStatus, "default" | "secondary" | "destructive"> = {
  online: "default",
  offline: "destructive",
  maintenance: "secondary",
};

export function PropertyCard({ property, className }: PropertyCardProps) {
  const thumbnail = property.images?.[0];

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
      {thumbnail ? (
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={thumbnail}
            alt={`${property.name} thumbnail`}
            fill
            className="object-cover"
            sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 400px"
          />
        </div>
      ) : (
        <div className="mx-4 mb-4 h-40 rounded-lg bg-neutral-100" />
      )}
      <CardContent className="space-y-3 text-sm text-neutral-600">
        {property.address && <p className="font-medium">{property.address}</p>}
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Tasks assigned: {property.taskCount ?? 0}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild>
          <Link href={`/property/${property.id}`}>View Property</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

