export const ROOM_TARGET_MAP: Record<string, string[]> = {
  kitchen: ['Appliances', 'Sink', 'Counter', 'Cabinet', 'Floor', 'Table', 'Window', 'Shelves'],
  bathroom: ['Toilet', 'Shower', 'Sink', 'Mirror', 'Cabinet', 'Floor', 'Window'],
  bedroom: ['Bed', 'Desk', 'Cabinet', 'Floor', 'Window', 'Furniture', 'Mirror', 'Shelves'],
  living_room: ['Furniture', 'Counter', 'Floor', 'Window', 'Cabinet', 'Shelves', 'Mirror', 'Table'],
  dining_room: ['Table', 'Furniture', 'Floor', 'Window', 'Cabinet', 'Shelves'],
  office: ['Desk', 'Cabinet', 'Floor', 'Window', 'Shelves', 'Furniture'],
  laundry_room: ['Appliances', 'Sink', 'Counter', 'Cabinet', 'Floor', 'Shelves'],
  garage: ['Floor', 'Shelves', 'Cabinet', 'Window'],
  yard: ['Yard', 'Patio'],
  basement: ['Floor', 'Furniture', 'Shelves', 'Cabinet', 'Appliances'],
  hallway: ['Floor', 'Window', 'Mirror'],
  entryway: ['Floor', 'Mirror', 'Cabinet'],
  patio: ['Patio', 'Floor', 'Furniture'],
  balcony: ['Floor', 'Furniture']
};

export const DEFAULT_TARGETS = ['Floor', 'Window', 'Cabinet', 'Counter', 'Furniture'];

export const getValidTargetsForRoom = (roomType: string | null | undefined): string[] => {
  if (!roomType) return DEFAULT_TARGETS;
  
  const roomKey = formatRoomKey(roomType);
  return ROOM_TARGET_MAP[roomKey] || DEFAULT_TARGETS;
};

export const formatRoomKey = (roomName: string): string => {
  return roomName.toLowerCase().trim().replace(/\s+/g, '_');
};



