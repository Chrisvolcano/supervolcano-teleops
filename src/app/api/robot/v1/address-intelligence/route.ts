/**
 * GET /api/robot/v1/address-intelligence
 * 
 * Public API for robots to get location-specific intelligence
 * Requires API key authentication
 * Returns access info, storage map, preferences, restrictions, and reference media
 */

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// Validate API key
async function validateApiKey(request: NextRequest): Promise<boolean> {
  const apiKey = 
    request.headers.get('x-api-key') || 
    request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) return false;
  
  // Check against env var
  if (process.env.ROBOT_API_KEY && apiKey === process.env.ROBOT_API_KEY) {
    return true;
  }
  
  // Future: Check Firestore apiKeys collection if needed
  // const keyDoc = await adminDb.collection('apiKeys').doc(apiKey).get();
  // return keyDoc.exists && keyDoc.data()?.active;
  
  return false;
}

// Calculate completeness score
function calculateCompleteness(intelligence: any): number {
  let score = 0;
  const weights = {
    accessInfo: 20,      // Has entry code or instructions
    storageMap: 20,      // Has at least one storage item
    preferences: 20,     // Has at least one preference
    restrictions: 10,    // Has at least one restriction (optional)
    referenceMedia: 30   // Has at least one reference media (most valuable)
  };
  
  if (intelligence?.accessInfo) {
    const ai = intelligence.accessInfo;
    if (ai.entryCode || ai.entryDetails || ai.entryInstructions || ai.entryMethod) {
      score += weights.accessInfo;
    }
  }
  
  const storageItems = [
    ...(intelligence?.storageMap || []),
    ...(intelligence?.storageLocations || [])
  ];
  if (Array.isArray(storageItems) && storageItems.length > 0) {
    score += weights.storageMap;
  }
  
  if (intelligence?.preferences && Array.isArray(intelligence.preferences) && intelligence.preferences.length > 0) {
    score += weights.preferences;
  }
  
  if (intelligence?.restrictions && Array.isArray(intelligence.restrictions) && intelligence.restrictions.length > 0) {
    score += weights.restrictions;
  }
  
  if (intelligence?.referenceMedia && Array.isArray(intelligence.referenceMedia) && intelligence.referenceMedia.length > 0) {
    score += weights.referenceMedia;
  }
  
  return Math.min(score, 100);
}

// Extract rooms from location structure
function extractRooms(location: any): Array<{ id: string; name: string; floor: string }> {
  const rooms: Array<{ id: string; name: string; floor: string }> = [];
  
  const floors = location.floors || location.structure?.floors || [];
  
  for (const floor of floors) {
    const floorName = floor.name || floor.floorName || 'Unknown Floor';
    for (const room of floor.rooms || []) {
      if (room.id && room.name) {
        rooms.push({
          id: room.id,
          name: room.name,
          floor: floorName
        });
      }
    }
  }
  
  return rooms;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Validate API key
    const isValid = await validateApiKey(request);
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: apiKey ? 'Invalid API key' : 'API key required' },
        { status: apiKey ? 403 : 401 }
      );
    }
    
    // 2. Get location_id from query params
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('location_id');
    
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'location_id parameter required' },
        { status: 400 }
      );
    }
    
    // 3. Fetch location from Firestore
    const locationDoc = await adminDb.collection('locations').doc(locationId).get();
    
    if (!locationDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Location not found' },
        { status: 404 }
      );
    }
    
    const location = locationDoc.data()!;
    
    // 4. Extract intelligence (check both nested and flat structures)
    const intelligence = location.intelligence || {};
    
    const accessInfo = intelligence.accessInfo || location.accessInfo || {};
    const storageMap = intelligence.storageMap || location.storageMap || [];
    const storageLocations = intelligence.storageLocations || location.storageLocations || [];
    const preferences = intelligence.preferences || location.preferences || [];
    const restrictions = intelligence.restrictions || location.restrictions || [];
    const referenceMedia = intelligence.referenceMedia || location.referenceMedia || [];
    
    // Combine storageMap and storageLocations (handle both formats)
    const allStorageItems = [
      ...(Array.isArray(storageMap) ? storageMap : []),
      ...(Array.isArray(storageLocations) ? storageLocations : [])
    ];
    
    // 5. Extract room structure
    const rooms = extractRooms(location);
    
    // 6. Calculate completeness
    const completenessScore = calculateCompleteness({
      accessInfo,
      storageMap: allStorageItems,
      preferences,
      restrictions,
      referenceMedia
    });
    
    // 7. Determine last updated
    let lastUpdated: string | null = null;
    if (location.updatedAt) {
      if (location.updatedAt.toDate) {
        lastUpdated = location.updatedAt.toDate().toISOString();
      } else if (typeof location.updatedAt === 'string') {
        lastUpdated = location.updatedAt;
      } else if (location.updatedAt instanceof Date) {
        lastUpdated = location.updatedAt.toISOString();
      }
    } else if (location.updated_at) {
      if (location.updated_at.toDate) {
        lastUpdated = location.updated_at.toDate().toISOString();
      } else if (typeof location.updated_at === 'string') {
        lastUpdated = location.updated_at;
      }
    }
    
    // 8. Format access info
    const emergencyContact = accessInfo.emergencyContact;
    const emergencyContactName = typeof emergencyContact === 'object' 
      ? emergencyContact?.name || null 
      : null;
    const emergencyContactPhone = typeof emergencyContact === 'object' 
      ? emergencyContact?.phone || null 
      : typeof emergencyContact === 'string' 
        ? emergencyContact 
        : null;
    
    // 9. Format storage map
    const formattedStorageMap = allStorageItems.map((item: any) => ({
      item: item.item || item.itemType || item.customItemName || item.name || '',
      location: item.location || item.place || item.notes || '',
      photoUrl: item.photoUrl || item.photo || null,
      roomId: item.roomId || null,
      roomName: item.roomName || null
    }));
    
    // 10. Format preferences
    const formattedPreferences = preferences.map((pref: any) => ({
      category: pref.category || pref.area || null,
      preference: pref.preference || pref.text || pref.description || ''
    }));
    
    // 11. Format restrictions
    const formattedRestrictions = restrictions.map((r: any) => ({
      type: r.type || r.severity || 'general',
      description: r.description || r.text || ''
    }));
    
    // 12. Format reference media
    const formattedReferenceMedia = referenceMedia.map((media: any) => ({
      id: media.id || '',
      url: media.url || '',
      type: media.type === 'video' ? 'video' : 'photo',
      mediaType: media.mediaType || 'reference',
      description: media.description || '',
      roomId: media.roomId || null,
      roomName: media.roomName || null
    }));
    
    // 13. Build response
    const response = {
      success: true,
      locationId,
      name: location.name || '',
      address: location.address || '',
      
      accessInfo: {
        entryCode: accessInfo.entryCode || accessInfo.entry || accessInfo.entryDetails || null,
        alarmCode: accessInfo.alarmCode || accessInfo.alarm || null,
        wifiNetwork: accessInfo.wifiNetwork || accessInfo.wifi || null,
        wifiPassword: accessInfo.wifiPassword || null,
        emergencyContact: emergencyContactName,
        emergencyPhone: emergencyContactPhone || accessInfo.emergencyPhone || null,
        entryInstructions: accessInfo.entryInstructions || accessInfo.instructions || accessInfo.parkingInstructions || null
      },
      
      storageMap: formattedStorageMap,
      preferences: formattedPreferences,
      restrictions: formattedRestrictions,
      referenceMedia: formattedReferenceMedia,
      rooms,
      completenessScore,
      lastUpdated
    };
    
    // 14. Log usage (fire and forget)
    if (apiKey) {
      adminDb.collection('apiUsage').add({
        endpoint: 'address-intelligence',
        locationId,
        timestamp: new Date(),
        apiKeyPrefix: apiKey.substring(0, 8) + '...'
      }).catch(err => console.error('[Address Intelligence API] Failed to log usage:', err));
    }
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('[Address Intelligence API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}

