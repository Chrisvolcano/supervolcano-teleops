"use client";

/**
 * Location Info Section Component
 * Displays location details, contact info, access instructions, and organization assignment
 */

import { Edit, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Location } from "@/lib/types";
import Link from "next/link";

interface LocationInfoSectionProps {
  location: Location;
  onEdit: () => void;
  organizationName?: string;
  organizationId?: string;
}

export function LocationInfoSection({
  location,
  onEdit,
  organizationName,
  organizationId,
}: LocationInfoSectionProps) {
  return (
    <div className="space-y-6">
      {/* Location Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">📍 {location.name}</h1>
              <p className="text-gray-600 mb-3">{location.address}</p>

              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant={location.status === "active" ? "default" : "secondary"}>
                  {location.status}
                </Badge>

                {location.assignedOrganizationId && organizationName && (
                  organizationId ? (
                    <Link href={`/admin/organizations/${organizationId}`}>
                      <Badge
                        variant="outline"
                        className="bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200"
                      >
                        <Building2 className="h-3 w-3 mr-1" />
                        {organizationName}
                      </Badge>
                    </Link>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-blue-100 text-blue-800"
                    >
                      <Building2 className="h-3 w-3 mr-1" />
                      {organizationName}
                    </Badge>
                  )
                )}

                {!location.assignedOrganizationId && (
                  <Badge variant="outline" className="bg-orange-100 text-orange-800">
                    ⚠️ Not Assigned
                  </Badge>
                )}
              </div>
            </div>

            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Location
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        {location.primaryContact && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>📞</span> Contact Information
              </h3>
              <div className="space-y-2 text-sm">
                {location.primaryContact.name && (
                  <p className="font-medium text-gray-800">{location.primaryContact.name}</p>
                )}
                {location.primaryContact.phone && (
                  <p className="text-gray-600">{location.primaryContact.phone}</p>
                )}
                {location.primaryContact.email && (
                  <p className="text-gray-600">{location.primaryContact.email}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Instructions */}
        {(location.accessInstructions || location.entryCode || location.parkingInfo) && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>🔑</span> Access Instructions
              </h3>
              <div className="space-y-2 text-sm">
                {location.accessInstructions && (
                  <p className="text-gray-700 whitespace-pre-wrap">{location.accessInstructions}</p>
                )}
                {location.entryCode && (
                  <p className="text-gray-700">
                    <span className="font-medium">Entry Code:</span> {location.entryCode}
                  </p>
                )}
                {location.parkingInfo && (
                  <p className="text-gray-700">
                    <span className="font-medium">Parking:</span> {location.parkingInfo}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Assignment Info */}
        {location.assignedOrganizationId && organizationName && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Assigned Organization
              </h3>
              <div className="space-y-2">
                <p className="text-gray-800 font-medium">{organizationName}</p>
                {organizationId && (
                  <Link
                    href={`/admin/organizations/${organizationId}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Organization Dashboard →
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not Assigned Warning */}
        {!location.assignedOrganizationId && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span>⚠️</span> Not Assigned
              </h3>
              <div className="space-y-2">
                <p className="text-gray-600 mb-2">This location is not assigned to any organization.</p>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  Assign to Organization →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
