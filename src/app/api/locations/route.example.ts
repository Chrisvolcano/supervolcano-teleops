/**
 * LOCATIONS API - EXAMPLE IMPLEMENTATION
 * 
 * This is an example API route demonstrating the 4-role RBAC architecture.
 * 
 * Endpoints:
 * - GET /api/locations - List locations (role-scoped)
 * - POST /api/locations - Create location (permission-checked)
 * 
 * Access control:
 * - Different roles see different subsets of locations
 * - Creation rights depend on role (see permission checks)
 * 
 * Last updated: 2025-01-26
 * 
 * NOTE: This is an example file. To use it, rename to route.ts and implement
 * the helper functions (getUser, getLocation, etc.) in your firebase utils.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserClaims } from '@/lib/utils/auth';
import { requirePermission, canAccessLocation } from '@/lib/auth/permissions';
import { UserRole } from '@/types/database';
import { db } from '@/lib/firebaseClient';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
} from 'firebase/firestore';

// TODO: Implement these helper functions in lib/firebase/users.ts
async function getUser(userId: string) {
  // Implementation: Fetch user from Firestore
  // Return: { id, role, organization_id } or null
  throw new Error('Not implemented - see lib/firebase/users.ts');
}

// TODO: Implement in lib/firebase/locations.ts
async function getLocation(locationId: string) {
  // Implementation: Fetch location from Firestore
  throw new Error('Not implemented - see lib/firebase/locations.ts');
}

// TODO: Implement in lib/firebase/location-assignments.ts
async function getLocationAssignment(orgId: string, locationId: string): Promise<boolean> {
  // Implementation: Check if organization has access to location
  throw new Error('Not implemented - see lib/firebase/location-assignments.ts');
}

// TODO: Implement in lib/firebase/user-location-assignments.ts
async function getUserLocationAssignment(userId: string, locationId: string): Promise<boolean> {
  // Implementation: Check if user is assigned to location
  throw new Error('Not implemented - see lib/firebase/user-location-assignments.ts');
}

/**
 * GET /api/locations
 * 
 * Returns locations based on user's role:
 * - admin: ALL locations
 * - partner_manager: Locations assigned to their organization
 * - property_owner: Locations they created (owned_by = user.id)
 * - field_operator: Locations they're assigned to work at
 * 
 * Response:
 * {
 *   locations: Location[]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION CHECK
    // -----------------------------------------------------------------------
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: No session found' },
        { status: 401 }
      );
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. FETCH USER TO DETERMINE ROLE
    // -----------------------------------------------------------------------
    // TODO: Implement getUser function
    // const user = await getUser(claims.uid);
    // For now, use claims directly (assuming role is in claims)
    const userRole = claims.role as UserRole;
    
    if (!userRole) {
      return NextResponse.json(
        { error: 'Unauthorized: User role not found' },
        { status: 401 }
      );
    }

    // -----------------------------------------------------------------------
    // 3. BUILD QUERY BASED ON ROLE (Role-Based Data Access)
    // -----------------------------------------------------------------------
    const locationsRef = collection(db, 'locations');
    let locationsQuery;

    switch (userRole) {
      case 'admin':
        // Admin sees ALL locations (test environments + customer properties)
        console.log(`[GET Locations] Admin fetching all locations`);
        locationsQuery = query(locationsRef);
        break;

      case 'partner_manager':
        // Partner manager sees ONLY locations assigned to their organization
        console.log(`[GET Locations] Partner manager fetching org ${claims.organizationId} locations`);
        
        if (!claims.organizationId) {
          return NextResponse.json(
            { error: 'User not associated with an organization' },
            { status: 400 }
          );
        }

        // First get location assignments for this org
        const assignmentsSnapshot = await getDocs(
          query(
            collection(db, 'location_assignments'),
            where('organization_id', '==', claims.organizationId)
          )
        );

        const assignedLocationIds = assignmentsSnapshot.docs.map(
          doc => doc.data().location_id
        );

        if (assignedLocationIds.length === 0) {
          // No locations assigned yet
          return NextResponse.json({ locations: [] });
        }

        // Fetch those specific locations
        // Note: Firestore 'in' query limited to 10 items, handle pagination if needed
        locationsQuery = query(
          locationsRef,
          where('__name__', 'in', assignedLocationIds.slice(0, 10))
        );
        break;

      case 'property_owner':
        // Property owner sees ONLY locations they created
        console.log(`[GET Locations] Property owner fetching own locations`);
        locationsQuery = query(
          locationsRef,
          where('owned_by', '==', claims.uid)
        );
        break;

      case 'field_operator':
        // Field operator sees ONLY locations they're assigned to work at
        console.log(`[GET Locations] Field operator fetching assigned locations`);
        
        // First get their location assignments
        const userAssignmentsSnapshot = await getDocs(
          query(
            collection(db, 'user_location_assignments'),
            where('user_id', '==', claims.uid)
          )
        );

        const userLocationIds = userAssignmentsSnapshot.docs.map(
          doc => doc.data().location_id
        );

        if (userLocationIds.length === 0) {
          // No locations assigned yet
          return NextResponse.json({ locations: [] });
        }

        // Fetch those specific locations
        locationsQuery = query(
          locationsRef,
          where('__name__', 'in', userLocationIds.slice(0, 10))
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid user role' },
          { status: 400 }
        );
    }

    // -----------------------------------------------------------------------
    // 4. EXECUTE QUERY
    // -----------------------------------------------------------------------
    const locationsSnapshot = await getDocs(locationsQuery);
    
    const locations = locationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`[GET Locations] Returning ${locations.length} locations for ${userRole}`);

    // -----------------------------------------------------------------------
    // 5. RETURN RESULTS
    // -----------------------------------------------------------------------
    return NextResponse.json({ locations });

  } catch (error: any) {
    console.error('[GET Locations] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch locations',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/locations
 * 
 * Creates a new location.
 * 
 * Who can call this:
 * - admin: Creates test environments (owned_by = null)
 * - property_owner: Creates their own properties (owned_by = user.id)
 * 
 * Partner managers CANNOT create locations - they get assigned.
 * 
 * Request body:
 * {
 *   name: string;
 *   address: string;
 *   // ... other location fields
 * }
 * 
 * Response:
 * {
 *   success: true;
 *   location: Location;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // -----------------------------------------------------------------------
    // 1. AUTHENTICATION CHECK
    // -----------------------------------------------------------------------
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const claims = await getUserClaims(token);
    if (!claims) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // -----------------------------------------------------------------------
    // 2. PERMISSION CHECK
    // -----------------------------------------------------------------------
    // TODO: Implement getUser function
    // const user = await getUser(claims.uid);
    const userRole = claims.role as UserRole;
    
    // Determine which creation permission to check
    let canCreate = false;
    let isTestEnvironment = false;

    if (userRole === 'admin') {
      // Admin creates test environments
      // await requirePermission(user, 'CREATE_TEST_LOCATIONS');
      canCreate = true;
      isTestEnvironment = true;
    } else if (userRole === 'property_owner') {
      // Property owner creates their own properties
      // await requirePermission(user, 'CREATE_OWN_LOCATIONS');
      canCreate = true;
      isTestEnvironment = false;
    } else {
      // Partner managers and field operators cannot create locations
      return NextResponse.json(
        { 
          error: 'Forbidden: Your role cannot create locations',
          hint: userRole === 'partner_manager' 
            ? 'Partner managers receive locations assigned by SuperVolcano'
            : 'Field operators work at assigned locations only'
        },
        { status: 403 }
      );
    }

    // -----------------------------------------------------------------------
    // 3. PARSE REQUEST BODY
    // -----------------------------------------------------------------------
    const body = await request.json();
    const { name, address } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Location name is required' },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { error: 'Location address is required' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // 4. CREATE LOCATION
    // -----------------------------------------------------------------------
    const newLocation = {
      name: name.trim(),
      address: address.trim(),
      
      // Organization assignment
      organization_id: claims.organizationId || null,
      
      // Creator tracking
      created_by: claims.uid,
      
      // Ownership
      // - Test environments: owned_by = null (SuperVolcano owns)
      // - Properties: owned_by = user.id (property owner owns)
      owned_by: isTestEnvironment ? null : claims.uid,
      
      // Type flag for easier querying
      is_test_environment: isTestEnvironment,
      
      // Timestamps
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`[POST Location] Creating location for ${userRole}:`, newLocation);

    const docRef = await addDoc(collection(db, 'locations'), newLocation);

    // -----------------------------------------------------------------------
    // 5. CREATE LOCATION ASSIGNMENT (if applicable)
    // -----------------------------------------------------------------------
    if (claims.organizationId) {
      // Create an assignment record so organization can access this location
      await addDoc(collection(db, 'location_assignments'), {
        organization_id: claims.organizationId,
        location_id: docRef.id,
        assigned_by: claims.uid,
        assigned_at: new Date().toISOString(),
      });
      
      console.log(`[POST Location] Created assignment for org ${claims.organizationId}`);
    }

    // -----------------------------------------------------------------------
    // 6. RETURN SUCCESS
    // -----------------------------------------------------------------------
    return NextResponse.json({
      success: true,
      location: {
        id: docRef.id,
        ...newLocation,
      },
    });

  } catch (error: any) {
    console.error('[POST Location] Error:', error);
    
    // Return appropriate status based on error
    if (error.message.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create location',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

