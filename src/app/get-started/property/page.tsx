'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import AddressAutocomplete, { type AddressData } from '@/components/admin/AddressAutocomplete';

export default function PropertyPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        router.push('/get-started/auth');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const [formData, setFormData] = useState({
    address: '',
    addressData: null as AddressData | null,
    unit: '',
    propertyType: 'home',
    bedrooms: '',
    bathrooms: '',
    name: '',
  });

  const handleAddressChange = (addressData: AddressData) => {
    setFormData({
      ...formData,
      address: addressData.fullAddress,
      addressData,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const locationData: any = {
        ownerId: user.uid,
        organizationId: `owner:${user.uid}`,
        address: formData.address,
        unit: formData.unit || null,
        name: formData.name || formData.address,
        propertyType: formData.propertyType,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        createdAt: new Date(),
        status: 'setup',
        source: 'web_onboarding',
      };

      // Add coordinates if available from autocomplete
      if (formData.addressData?.coordinates) {
        locationData.coordinates = {
          lat: formData.addressData.coordinates.lat,
          lng: formData.addressData.coordinates.lng,
        };
        locationData.placeId = formData.addressData.placeId || null;
      }

      const locationRef = await addDoc(collection(db, 'locations'), locationData);

      // Store location ID for next steps
      sessionStorage.setItem('onboarding_location_id', locationRef.id);

      router.push('/get-started/rooms');
    } catch (err: any) {
      setError(err.message || 'Failed to save property');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span>Step 2 of 5</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className="h-1 bg-blue-600 rounded-full w-[40%]" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Add your property</h1>
      <p className="text-gray-600 mb-6">Where should cleaners go?</p>

      <form onSubmit={handleSubmit} className="space-y-4 flex-1">
        <div>
          <AddressAutocomplete
            value={formData.address}
            onChange={handleAddressChange}
            placeholder="Start typing address..."
            className="w-full pl-4 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            error={error && error.includes('address') ? error : undefined}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit/Apt (optional)</label>
          <input
            type="text"
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Apt 4B"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property type</label>
          <select
            value={formData.propertyType}
            onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
          >
            <option value="home">House</option>
            <option value="apartment">Apartment</option>
            <option value="condo">Condo</option>
            <option value="airbnb">Airbnb/Vacation Rental</option>
            <option value="office">Office</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrooms</label>
            <select
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              {[1, 2, 3, 4, 5, '6+'].map((n) => (
                <option key={n} value={n.toString()}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bathrooms</label>
            <select
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              {[1, 1.5, 2, 2.5, 3, '4+'].map((n) => (
                <option key={n} value={n.toString()}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Property nickname (optional)</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
            placeholder="Beach House, Main Office, etc."
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="mt-auto pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </form>
    </div>
  );
}

