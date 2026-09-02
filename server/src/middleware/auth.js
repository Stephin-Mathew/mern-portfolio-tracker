import { getAuth, clerkClient } from '@clerk/express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

/**
 * Authentication Middleware with Clerk & JWT support
 * 
 * 1. Checks for Clerk Auth session via req.auth / getAuth(req)
 * 2. If Clerk userId is present, finds or creates the corresponding MongoDB User
 * 3. Falls back to legacy JWT token if provided
 * 4. Attaches the database user object to req.user
 */
const userCache = new Map();
const inFlightUserFetches = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes in-memory cache

export const authenticateToken = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    
    if (auth && auth.userId) {
      const clerkId = auth.userId;
      
      // Fast path: Check in-memory user cache
      const cached = userCache.get(clerkId);
      if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
        req.user = cached.user;
        req.clerkAuth = auth;
        return next();
      }

      // Deduplicate concurrent user lookups/creations for the same clerkId
      let userPromise = inFlightUserFetches.get(clerkId);
      if (!userPromise) {
        userPromise = (async () => {
          let user = await User.findOne({ clerkId });
          
          if (!user) {
            let email = '';
            let firstName = '';
            let lastName = '';
            let imageUrl = '';
            
            try {
              const clerkUser = await clerkClient.users.getUser(clerkId);
              email = clerkUser?.emailAddresses?.[0]?.emailAddress || '';
              firstName = clerkUser?.firstName || '';
              lastName = clerkUser?.lastName || '';
              imageUrl = clerkUser?.imageUrl || '';
            } catch (err) {
              console.warn('Could not fetch user details from Clerk API:', err.message);
            }
            
            // If user not found by clerkId, check if an existing user has the same email
            if (email) {
              user = await User.findOne({ email: email.toLowerCase() });
            }

            if (user) {
              user.clerkId = clerkId;
              if (firstName && !user.firstName) user.firstName = firstName;
              if (lastName && !user.lastName) user.lastName = lastName;
              if (imageUrl && !user.imageUrl) user.imageUrl = imageUrl;
              await user.save();
            } else {
              user = await User.create({
                clerkId,
                ...(email ? { email: email.toLowerCase() } : {}),
                firstName,
                lastName,
                imageUrl,
              });
            }
          }
          return user;
        })();

        inFlightUserFetches.set(clerkId, userPromise);
      }

      const user = await userPromise;
      inFlightUserFetches.delete(clerkId);

      // Store in memory cache
      userCache.set(clerkId, { user, cachedAt: Date.now() });

      req.user = user;
      req.clerkAuth = auth;
      return next();
    }

    // Fallback: Check for Authorization header (Legacy JWT support)
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Access denied: No authentication token provided' });
    }

    const secret = process.env.JWT_SECRET || 'fallback_jwt_secret_key_2026';
    
    try {
      const decoded = jwt.verify(token, secret);
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return res.status(401).json({ message: 'Invalid token: User no longer exists' });
      }
      req.user = user;
      return next();
    } catch (jwtErr) {
      return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
    }
  } catch (error) {
    console.error('Authentication Error:', error.message);
    return res.status(403).json({ message: 'Forbidden: Authentication failure' });
  }
};

