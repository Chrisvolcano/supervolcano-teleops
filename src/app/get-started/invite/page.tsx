'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebaseClient';
import { Mail, Plus, X, UserPlus } from 'lucide-react';

export default function InvitePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
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

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase();
    if (email && !emails.includes(email) && email.includes('@')) {
      setEmails([...emails, email]);
      setNewEmail('');
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  const handleContinue = async () => {
    if (!user) return;

    const locationId = sessionStorage.getItem('onboarding_location_id');
    if (!locationId) {
      router.push('/get-started/property');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create invites for each email
      for (const email of emails) {
        await addDoc(collection(db, 'location_invites'), {
          locationId,
          invitedEmail: email,
          invitedBy: user.uid,
          invitedByEmail: user.email,
          role: 'location_cleaner',
          status: 'pending',
          createdAt: new Date(),
        });
      }

      router.push('/get-started/complete');
    } catch (err: any) {
      setError(err.message || 'Failed to send invites');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/get-started/complete');
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
          <span>Step 5 of 5</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full">
          <div className="h-1 bg-blue-600 rounded-full w-[100%]" />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Invite your cleaners</h1>
      <p className="text-gray-600 mb-6">
        They&apos;ll get an email to join and access your property details.
      </p>

      {/* Email input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Cleaner email</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500"
              placeholder="cleaner@email.com"
            />
          </div>
          <button
            onClick={addEmail}
            className="px-4 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
          >
            <Plus className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Email list */}
      {emails.length > 0 && (
        <div className="space-y-2 mb-6">
          {emails.map((email) => (
            <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-gray-400" />
                <span className="text-gray-900">{email}</span>
              </div>
              <button onClick={() => removeEmail(email)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="mt-auto space-y-3">
        {emails.length > 0 ? (
          <button
            onClick={handleContinue}
            disabled={loading}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Sending invites...' : `Send ${emails.length} invite${emails.length > 1 ? 's' : ''}`}
          </button>
        ) : (
          <button
            onClick={handleSkip}
            className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

