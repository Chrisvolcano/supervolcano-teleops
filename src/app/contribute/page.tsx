'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebaseClient';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Upload, Clock, CheckCircle } from 'lucide-react';

export default function ContributeLanding() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Verify they're a contributor
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data()?.role === 'contributor') {
          router.push('/contribute/dashboard');
        }
      }
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let userCredential;
      
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create contributor user document
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email,
          name: name.trim(),
          role: 'contributor',
          source: 'web_contribute',
          createdAt: serverTimestamp(),
          stats: {
            totalUploads: 0,
            totalDurationSeconds: 0,
            pendingCount: 0,
            approvedCount: 0,
            rejectedCount: 0
          }
        });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Verify they're a contributor
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        if (!userDoc.exists() || userDoc.data()?.role !== 'contributor') {
          setError('This account is not registered as a contributor.');
          await auth.signOut();
          setLoading(false);
          return;
        }
      }
      
      router.push('/contribute/dashboard');
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Try signing in.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return null; // Layout shows loading spinner
  }

  return (
    <div className="max-w-md mx-auto space-y-8">
      {/* Hero */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-gray-900">Upload Your Footage</h1>
        <p className="text-gray-600">
          Record on your own camera, upload from SD card, track your contributions.
        </p>
      </div>

      {/* Value props */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Upload className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-gray-600">Drag & drop upload</p>
        </div>
        <div className="space-y-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-gray-600">Track your hours</p>
        </div>
        <div className="space-y-2">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-xs text-gray-600">See approvals</p>
        </div>
      </div>

      {/* Auth form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-center mb-6">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required={isSignUp}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="Your name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Please wait...
              </span>
            ) : (
              isSignUp ? 'Get Started' : 'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-blue-600 font-medium hover:underline"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

