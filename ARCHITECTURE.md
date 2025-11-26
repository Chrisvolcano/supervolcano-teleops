# SuperVolcano Architecture Documentation

**Last Updated:** 2025-01-26  
**Version:** 1.0

This document explains the core architecture of the SuperVolcano platform for engineers who are new to the codebase.

---

## Table of Contents

1. [Business Model Overview](#business-model-overview)
2. [Role-Based Access Control](#role-based-access-control)
3. [Data Model](#data-model)
4. [Permission System](#permission-system)
5. [API Architecture](#api-architecture)
6. [Mobile App Structure](#mobile-app-structure)
7. [Common Workflows](#common-workflows)
8. [Code Organization](#code-organization)

---

## Business Model Overview

SuperVolcano operates two parallel business models on a single platform:

### 1. OEM Partner Model (B2B)

- **Customer:** Robotics companies (e.g., Figure AI, Tesla Bot)
- **What they get:** Access to real-world test environments
- **Key point:** SuperVolcano curates and assigns test locations to partners
- **Partners CANNOT create locations** - they get access to locations we provide

### 2. Property Owner Model (B2C)

- **Customer:** Individual property owners (e.g., Airbnb hosts)
- **What they get:** Property management software + cleaner marketplace
- **Key point:** Property owners CREATE and manage their own properties
- **Full autonomy** over their locations

**Both models use the same codebase and database schema.**

---

## Role-Based Access Control

We have 4 distinct roles in the system:

### 1. `admin` - SuperVolcano Internal Team

**Purpose:** Platform operators  
**Access:** Web app only  
**Can do:**

- Create test environments for OEM partners
- Assign test locations to partner organizations
- View all data across all organizations
- Platform management and analytics

**Cannot do:**

- Nothing (they have full access)

**Example users:** Your engineering team, support team

---

### 2. `partner_manager` - OEM Partner Manager

**Purpose:** Robotics company employees who manage testing operations  
**Access:** Web + Mobile  
**Can do:**

- View test locations ASSIGNED to their organization by SuperVolcano
- Invite/manage their teleoperators
- Assign teleoperators to specific locations
- View their team's analytics

**Cannot do:**

- Create new locations (SuperVolcano curates test environments)
- Access other partners' data

**Example users:** "Head of Teleoperation at Figure AI"

---

### 3. `property_owner` - Individual Property Owner

**Purpose:** People who own properties and need cleaning management  
**Access:** Web + Mobile  
**Can do:**

- CREATE their own locations (properties)
- Build property structure (floors, rooms, tasks)
- Invite/manage cleaners
- Assign cleaners to their properties
- View cleaning analytics

**Cannot do:**

- Access other property owners' data
- Access test environments (different business model)

**Example users:** Airbnb host with 3 properties

---

### 4. `field_operator` - Worker in the Field

**Purpose:** Perform physical work at locations  
**Access:** Mobile only  
**Can do:**

- View locations assigned to them
- View and complete tasks
- Record videos
- Upload completion proof

**Cannot do:**

- Create or edit locations
- Invite other workers
- Access management features

**Example users:** 

- Teleoperators (work for OEM partners)
- Cleaners (work for property owners)

**Note:** Functionally identical, just working for different customers.

---

## Data Model

### Core Entities

```
organizations (OEM partners OR property owners)
  ├─ type: 'partner' | 'property_owner'
  └─ Determines business context

users (all user types)
  ├─ role: 'admin' | 'partner_manager' | 'property_owner' | 'field_operator'
  └─ organization_id: Which org they belong to

locations (test environments OR properties)
  ├─ owned_by: null (test env) OR user_id (property)
  ├─ is_test_environment: boolean flag
  └─ Hierarchy: Location → Floor → Room → Target → Action

location_assignments (which orgs can access which locations)
  ├─ organization_id
  └─ location_id
  └─ For test environments assigned to partners

user_location_assignments (which workers work where)
  ├─ user_id (field_operator)
  └─ location_id
  └─ For field operators assigned to specific locations

invite_codes (to onboard field operators)
  ├─ code: "ABC123"
  ├─ organization_id
  └─ Managers generate, field operators redeem
```

### Key Relationships

**Admin creates test location:**

```
locations
  ├─ owned_by: null
  ├─ created_by: admin_id
  └─ is_test_environment: true

location_assignments
  ├─ organization_id: partner_org_id
  └─ location_id: test_location_id
```

**Property owner creates property:**

```
locations
  ├─ owned_by: property_owner_id
  ├─ created_by: property_owner_id
  └─ is_test_environment: false

location_assignments
  ├─ organization_id: property_owner_org_id
  └─ location_id: property_id
  └─ (Auto-created)
```

---

## Permission System

Located in: `lib/auth/permissions.ts`

### How It Works

1. **Permissions are defined** as capabilities (e.g., `CREATE_LOCATIONS`)
2. **Each permission lists** which roles have it
3. **Middleware enforces** permissions in API routes

### Key Functions

```typescript
// Check if a role has permission (no DB access)
hasPermission(userRole, 'CREATE_LOCATIONS')

// Require user has permission (fetches user from DB)
await requirePermission(user, 'CREATE_LOCATIONS')

// Check location access (complex relationship check)
await canAccessLocation(user, locationId, location)
```

### Usage in API Routes

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession();
  
  // This will throw if user doesn't have permission
  await requirePermission(user, 'CREATE_LOCATIONS');
  
  // ... proceed with operation
}
```

### Critical Permissions

- `CREATE_TEST_LOCATIONS`: Admin only
- `CREATE_OWN_LOCATIONS`: Property owners only
- `VIEW_LOCATIONS`: Everyone (but scoped differently)
- `INVITE_FIELD_OPERATORS`: Both manager types
- `RECORD_VIDEOS`: Field operators only

---

## API Architecture

### Pattern: Role-Based Data Scoping

All GET endpoints filter data based on role:

```typescript
export async function GET(request: NextRequest) {
  const user = await getUser(session.user.id);
  
  switch (user.role) {
    case 'admin':
      // Return ALL records
      query = query(collection(db, 'locations'));
      break;
      
    case 'partner_manager':
      // Return only org's assigned locations
      query = query(
        collection(db, 'locations'),
        where('organization_id', '==', user.organization_id)
      );
      break;
      
    case 'property_owner':
      // Return only own properties
      query = query(
        collection(db, 'locations'),
        where('owned_by', '==', user.id)
      );
      break;
      
    case 'field_operator':
      // Return only assigned locations
      // (more complex - requires join via user_location_assignments)
      break;
  }
}
```

### Error Response Standards

```typescript
// 401 - Not authenticated
{ error: 'Unauthorized: No session found' }

// 403 - Authenticated but not allowed
{ error: 'Forbidden: Role X does not have permission Y' }

// 400 - Bad request
{ error: 'Validation error: field X is required' }

// 500 - Server error
{ error: 'Failed to create location', details: '...' }
```

---

## Mobile App Structure

### Role-Based Navigation

```
App Entry
  └─ Check user role
      ├─ partner_manager → PartnerManagerDashboard
      ├─ property_owner → PropertyOwnerDashboard
      └─ field_operator → FieldOperatorDashboard
```

### Shared Components

Most components are shared across roles with conditional rendering:

```typescript
<LocationCard
  location={location}
  userRole={user.role}  // Determines labels and actions
  onPress={handlePress}
/>
```

**Same component, different context:**

- Partner manager sees: "Test Location"
- Property owner sees: "My Property"
- Field operator sees: "Assigned Location"

### Dashboard Differences

**Manager Dashboards (partner_manager + property_owner):**

- List of locations (assigned vs owned)
- Invite code generation
- Team management
- Analytics

**Field Operator Dashboard:**

- List of assigned locations
- Task list
- Stats (homes cleaned, hours logged)
- Simple execution focus

---

## Common Workflows

### 1. OEM Partner Onboarding (Test Environment)

```
1. SuperVolcano admin creates test location
   POST /api/locations (admin)
   → owned_by: null

2. Admin assigns location to partner org
   POST /api/location-assignments (admin)
   → links location to organization

3. Partner manager generates invite code
   POST /api/invite-codes (partner_manager)

4. Teleoperator enters code
   POST /api/invite-codes/redeem (field_operator)
   → user.organization_id set
   → user.role set to 'field_operator'

5. Manager assigns operator to location
   POST /api/user-location-assignments (partner_manager)

6. Operator sees location in app
   GET /api/locations (field_operator)
   → Returns assigned locations

7. Operator records video
   POST /api/tasks/:id/video (field_operator)
```

### 2. Property Owner Onboarding (Property Management)

```
1. Property owner signs up
   POST /api/auth/signup
   → role: 'property_owner'
   → creates organization automatically

2. Owner creates property
   POST /api/locations (property_owner)
   → owned_by: owner.id
   → location_assignment created automatically

3. Owner builds property structure
   POST /api/locations/:id/floors
   POST /api/floors/:id/rooms
   (etc.)

4. Owner generates invite code
   POST /api/invite-codes (property_owner)

5. Cleaner enters code
   POST /api/invite-codes/redeem (field_operator)

6. Owner assigns cleaner to property
   POST /api/user-location-assignments (property_owner)

7. Cleaner sees property in app
   GET /api/locations (field_operator)

8. Cleaner completes tasks and uploads videos
   POST /api/tasks/:id/video (field_operator)
```

---

## Code Organization

```
/
├── app/
│   ├── api/                      # API routes
│   │   ├── locations/            # Location CRUD
│   │   ├── invite-codes/         # Invite code management
│   │   ├── organizations/        # Organization management
│   │   └── tasks/                # Task operations
│   │
│   ├── (mobile)/                 # Mobile app routes
│   │   ├── (partner-manager)/   # Partner manager screens
│   │   ├── (property-owner)/    # Property owner screens
│   │   └── (field-operator)/   # Field operator screens
│   │
│   └── (web)/                    # Web app routes (admin)
│
├── components/
│   ├── shared/                   # Shared components (role-agnostic)
│   ├── dashboards/               # Role-specific dashboards
│   └── modals/                   # Modal dialogs
│
├── lib/
│   ├── auth/
│   │   └── permissions.ts        # Permission system
│   ├── firebase/
│   │   ├── users.ts              # User operations
│   │   ├── locations.ts          # Location operations
│   │   └── ...
│   └── utils/
│
├── types/
│   └── database.ts               # TypeScript interfaces
│
└── ARCHITECTURE.md               # This file
```

### File Naming Conventions

- **API routes:** Use Next.js 13+ app router conventions
  - `route.ts` for endpoints
  - `[param]/route.ts` for dynamic routes

- **Components:** PascalCase
  - `LocationCard.tsx`
  - `InviteCodeModal.tsx`

- **Utilities:** camelCase
  - `permissions.ts`
  - `formatDate.ts`

### Import Patterns

Use path aliases defined in `tsconfig.json`:

```typescript
import { User } from '@/types/database';
import { requirePermission } from '@/lib/auth/permissions';
import { LocationCard } from '@/components/shared/LocationCard';
```

---

## Testing Checklist for Engineers

When making changes, verify:

### Permission Checks

- [ ] Admin can access all data
- [ ] Partner manager sees only assigned locations
- [ ] Property owner sees only owned locations
- [ ] Field operator sees only assigned locations
- [ ] Forbidden actions return 403

### Data Creation

- [ ] Admin creates test locations (owned_by = null)
- [ ] Property owner creates properties (owned_by = user.id)
- [ ] Partner manager CANNOT create locations (403 error)
- [ ] Location assignments created correctly

### Invite System

- [ ] Managers can generate codes
- [ ] Field operators can redeem codes
- [ ] Code expiration works
- [ ] Max uses enforced
- [ ] User assigned to correct organization

### Mobile Navigation

- [ ] Users route to correct dashboard based on role
- [ ] Shared components render appropriately
- [ ] Labels change based on role context

---

## Common Gotchas

### 1. "Why can't partner managers create locations?"

**Answer:** By design. SuperVolcano curates test environments for OEM partners. Partner managers receive locations assigned by SuperVolcano admins.

### 2. "What's the difference between location_assignments and user_location_assignments?"

**Answer:**

- `location_assignments`: Organization-level (which orgs can access which locations)
- `user_location_assignments`: User-level (which field operators work at which locations)

### 3. "Why do property owners have organizations?"

**Answer:** Architectural consistency. Every user belongs to an organization, even if it's a "personal" organization with just them. This keeps the data model simple and extensible.

### 4. "Can a field operator work for multiple organizations?"

**Answer:** Not currently. A user can only belong to one organization at a time. If needed in the future, this could be refactored to many-to-many.

---

## Contact

For questions about this architecture:

- **Technical Lead:** [Your Name]
- **Documentation:** This file
- **Code Review:** Required for all permission changes

---

**End of Documentation**

