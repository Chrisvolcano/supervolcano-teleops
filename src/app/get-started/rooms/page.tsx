'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebaseClient';
import { Plus, X, Bed, Bath, Utensils, Sofa, Warehouse } from 'lucide-react';

const ROOM_PRESETS = [
  { id: 'living_room', name: 'Living Room', icon: Sofa },
  { id: 'kitchen', name: 'Kitchen', icon: Utensils },
  { id: 'bedroom', name: 'Bedroom', icon: Bed },
  { id: 'bathroom', name: 'Bathroom', icon: Bath },
  { id: 'garage', name: 'Garage', icon: Warehouse },
];

export default function RoomsPage() {
  const router = useRouter();
  const [selectedRooms, setSelectedRooms] = useState<string[]>(['living_room', 'kitchen', 'bathroom']);
  const [customRooms, setCustomRooms] = useState<string[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleRoom = (roomId: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId) ? prev.filter((r) => r !== roomId) : [...prev, roomId]
    );
  };

  const addCustomRoom = () => {
    if (newRoom.trim() && !customRooms.includes(newRoom.trim())) {
      setCustomRooms([...customRooms, newRoom.trim()]);
      setNewRoom('');
    }
  };

  const removeCustomRoom = (room: string) => {
    setCustomRooms(customRooms.filter((r) => r !== room));
  };

  const handleContinue = async () => {
    const locationId = sessionStorage.getItem('onboarding_location_id');
    if (!locationId) {
      router.push('/get-started/property');
      return;
    }

    setLoading(true);
    try {
      const allRooms = [
        ...selectedRooms.map((id) => ({
          id,
          name: ROOM_PRESETS.find((r) => r.id === id)?.name || id,
          type: id,
        })),
        ...customRooms.map((name) => ({
          id: name.toLowerCase().replace(/\s+/g, '_'),
          name,
          type: 'custom',
        })),
      ];

      await updateDoc(doc(db, 'locations', locationId), {
        rooms: allRooms,
      });

      router.push('/get-started/upload');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Step 3 of 5</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className="h-1 bg-blue-600 rounded-full w-[60%]" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">What rooms need cleaning?</h1>
      <p className="text-gray-600 mb-6">Select all areas you want cleaned</p>

      {/* Preset rooms */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {ROOM_PRESETS.map((room) => (
          <button
            key={room.id}
            onClick={() => toggleRoom(room.id)}
            className={`p-4 rounded-xl border-2 text-left transition ${
              selectedRooms.includes(room.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <room.icon className={`w-6 h-6 mb-2 ${selectedRooms.includes(room.id) ? 'text-blue-600' : 'text-gray-400'}`} />
            <div className="font-medium text-gray-900">{room.name}</div>
          </button>
        ))}
      </div>

      {/* Custom rooms */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add custom area</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newRoom}
            onChange={(e) => setNewRoom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomRoom())}
            className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Patio, Office, etc."
          />
          <button
            onClick={addCustomRoom}
            className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {customRooms.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {customRooms.map((room) => (
              <span key={room} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                {room}
                <button onClick={() => removeCustomRoom(room)}>
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto">
        <button
          onClick={handleContinue}
          disabled={loading || (selectedRooms.length === 0 && customRooms.length === 0)}
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

