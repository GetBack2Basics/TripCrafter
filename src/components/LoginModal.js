import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';

export default function LoginModal({ isOpen, onClose, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      if (onLoginSuccess) onLoginSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">{isLoginMode ? 'Login' : 'Sign Up'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border rounded px-3 py-2"
            required
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
            {isLoginMode ? 'Login' : 'Sign Up'}
          </button>
        </form>
        <div className="mt-3 text-sm text-center">
          {isLoginMode ? (
            <>
              Don't have an account?{' '}
              <button className="text-indigo-600 hover:underline" onClick={() => setIsLoginMode(false)}>Sign Up</button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="text-indigo-600 hover:underline" onClick={() => setIsLoginMode(true)}>Login</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
